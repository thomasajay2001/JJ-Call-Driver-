import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://192.168.0.7:3000";
const REFRESH_MS = 30000; // 30 seconds

export default function Dashboard() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  // ── Auto-refresh state ──
  const [autoRefresh, setAutoRefresh]   = useState(true);
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [countdown,   setCountdown]     = useState(REFRESH_MS / 1000);
  const countdownRef = useRef(REFRESH_MS / 1000);

  const logout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/");
  };

  const fetchAll = async (silent = false) => {
    await Promise.all([fetchBookings(silent), fetchDrivers(silent)]);
    setLastUpdated(new Date());
    countdownRef.current = REFRESH_MS / 1000;
    setCountdown(REFRESH_MS / 1000);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Interval for data fetch ──
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!autoRefresh) return;
    intervalRef.current = setInterval(() => fetchAll(true), REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  // ── Countdown tick (every 1s) ──
  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return; }
    const tick = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown(countdownRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh]);

  const fetchBookings = async (silent = false) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      setBookings(res.data || []);
      const activities = (res.data || []).slice(0, 3).map((booking) => ({
        id: booking.id,
        type: booking.status?.toLowerCase() === "completed" ? "completed" : booking.driver ? "assigned" : "new",
        title: booking.status?.toLowerCase() === "completed"
          ? `Booking #${booking.id} completed`
          : booking.driver ? `Driver assigned to #${booking.id}` : `New booking received #${booking.id}`,
        time: calculateTimeAgo(booking.created_at || new Date()),
      }));
      setRecentActivities(activities);
    } catch (error) { console.error("Error fetching bookings:", error); }
  };

  const fetchDrivers = async (silent = false) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      setDrivers(res.data || []);
    } catch (error) { console.error("Error fetching drivers:", error); }
  };

  const calculateTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
    const diffMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diffMins < 1)  return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  useEffect(() => {
    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => { socket.emit("joinAdminRoom"); });
    socket.on("newBooking", (data) => {
      setBookings((prev) => [data, ...prev]);
      setRecentActivities((prev) => [{
        id: data.id || Date.now(), type: "new",
        title: `New booking received #${data.id || "New"}`, time: "Just now",
      }, ...prev.slice(0, 2)]);
      const id = Date.now();
      setNotifications((prev) => [{ id, ...data, fade: false }, ...prev]);
      setTimeout(() => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, fade: true } : n)), 6000);
      setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 6500);
    });
    return () => socket.disconnect();
  }, []);

  const totalBookings    = bookings.length;
  const activeDrivers    = drivers.filter((d) => d.status?.toLowerCase() === "active" || d.status?.toLowerCase() === "online").length;
  const liveTrips        = bookings.filter((b) => b.status?.toLowerCase() === "assigned" || b.status?.toLowerCase() === "in progress").length;
  const completedBookings= bookings.filter((b) => b.status?.toLowerCase() === "completed").length;
  const todayRevenue     = completedBookings * 350;
  const bookingGrowth    = totalBookings > 0 ? "+12%" : "+0%";
  const revenueGrowth    = todayRevenue   > 0 ? "+8%"  : "+0%";

  const getTopDrivers = () => {
    const driverTrips = {};
    bookings.forEach((booking) => {
      if (booking.driver && booking.status?.toLowerCase() === "completed") {
        driverTrips[booking.driver] = (driverTrips[booking.driver] || 0) + 1;
      }
    });
    const sorted = Object.entries(driverTrips)
      .map(([name, trips]) => ({ name, trips, rating: (4.5 + Math.random() * 0.5).toFixed(1) }))
      .sort((a, b) => b.trips - a.trips).slice(0, 3);
    if (sorted.length === 0)
      return drivers.slice(0, 3).map((d) => ({ name: d.name, trips: Math.floor(Math.random() * 10) + 5, rating: (4.5 + Math.random() * 0.5).toFixed(1) }));
    return sorted;
  };
  const topDrivers = getTopDrivers();

  // ── Countdown ring math ──
  const radius = 10;
  const circ   = 2 * Math.PI * radius;
  const pct    = autoRefresh ? countdown / (REFRESH_MS / 1000) : 0;
  const dash   = circ * pct;

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.mainTitle}>Dashboard</h1>
          <p style={styles.subtitle}>Real-time system overview and analytics</p>
        </div>

        {/* ── Refresh Controls ── */}
        <div style={rf.bar}>
          {/* Last updated */}
          {lastUpdated && (
            <div style={rf.timestamp}>
              <span style={rf.dot} />
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}

          {/* Countdown ring */}
          {autoRefresh && (
            <div style={rf.ringWrap} title={`Next refresh in ${countdown}s`}>
              <svg width="28" height="28" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="14" cy="14" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="14" cy="14" r={radius} fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 1s linear" }} />
              </svg>
              <span style={rf.ringLabel}>{countdown}s</span>
            </div>
          )}

          {/* Toggle */}
          <button onClick={() => { setAutoRefresh((v) => !v); countdownRef.current = REFRESH_MS / 1000; setCountdown(REFRESH_MS / 1000); }}
            style={{ ...rf.toggleBtn, ...(autoRefresh ? rf.toggleOn : rf.toggleOff) }}>
            {autoRefresh ? "🔄 Auto ON" : "⏸ Auto OFF"}
          </button>

          {/* Manual refresh */}
          <button onClick={() => fetchAll()} style={rf.manualBtn}>↻ Refresh</button>

          {/* Live badge */}
          <div style={styles.statusBadge}>
            <span style={styles.statusDot} />Live
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper}><span style={styles.statIcon}>📋</span></div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Total Bookings</p>
            <h3 style={styles.statValue}>{totalBookings}</h3>
            <p style={styles.statChange}>{bookingGrowth} from last week</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, background: "linear-gradient(135deg,#10b981,#059669)" }}><span style={styles.statIcon}>🚗</span></div>
          <div style={styles.statContent}><p style={styles.statLabel}>Active Drivers</p><h3 style={styles.statValue}>{activeDrivers}</h3><p style={styles.statChange}>Online now</p></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}><span style={styles.statIcon}>🚖</span></div>
          <div style={styles.statContent}><p style={styles.statLabel}>Live Trips</p><h3 style={styles.statValue}>{liveTrips}</h3><p style={styles.statChange}>In progress</p></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}><span style={styles.statIcon}>💰</span></div>
          <div style={styles.statContent}><p style={styles.statLabel}>Revenue Today</p><h3 style={styles.statValue}>₹{todayRevenue.toLocaleString()}</h3><p style={styles.statChange}>{revenueGrowth} from yesterday</p></div>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div style={styles.quickStatsSection}>
        <div style={styles.quickStatCard}>
          <div style={styles.quickStatHeader}>
            <h3 style={styles.quickStatTitle}>Recent Activity</h3>
            <span style={styles.viewAllLink} onClick={() => navigate("/admin/bookings")}>View All →</span>
          </div>
          <div style={styles.activityList}>
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div key={activity.id} style={styles.activityItem}>
                <div style={{ ...styles.activityIcon,
                  background: activity.type === "completed" ? "#dcfce7" : activity.type === "assigned" ? "#dbeafe" : "#fef3c7",
                  color: activity.type === "completed" ? "#15803d" : activity.type === "assigned" ? "#1e40af" : "#b45309" }}>
                  {activity.type === "completed" ? "✓" : activity.type === "assigned" ? "🚗" : "⏳"}
                </div>
                <div style={styles.activityContent}>
                  <p style={styles.activityTitle}>{activity.title}</p>
                  <p style={styles.activityTime}>{activity.time}</p>
                </div>
              </div>
            )) : <div style={styles.emptyState}><p>No recent activity</p></div>}
          </div>
        </div>

        <div style={styles.quickStatCard}>
          <div style={styles.quickStatHeader}>
            <h3 style={styles.quickStatTitle}>Top Drivers Today</h3>
            <span style={styles.viewAllLink} onClick={() => navigate("/admin/drivers")}>View All →</span>
          </div>
          <div style={styles.driverList}>
            {topDrivers.length > 0 ? topDrivers.map((driver, index) => (
              <div key={index} style={styles.driverItem}>
                <div style={{ ...styles.driverAvatar,
                  background: index === 0 ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : index === 1 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                  {driver.name?.charAt(0).toUpperCase()}
                </div>
                <div style={styles.driverInfo}>
                  <p style={styles.driverName}>{driver.name}</p>
                  <p style={styles.driverTrips}>{driver.trips} trips completed</p>
                </div>
                <div style={styles.driverBadge}>⭐ {driver.rating}</div>
              </div>
            )) : <div style={styles.emptyState}><p>No driver data available</p></div>}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={styles.notificationWrapper}>
        {notifications.map((n) => (
          <div key={n.id} style={{ ...styles.notificationCard, ...(n.fade ? styles.fadeOut : {}) }}>
            <div style={styles.notificationHeader}>
              <span style={styles.notificationIcon}>🚖</span>
              <span style={styles.notificationTitle}>New Booking Alert</span>
              <span style={styles.notificationBadge}>NEW</span>
            </div>
            <div style={styles.notificationBody}>
              <div style={styles.customerSection}>
                <div style={styles.customerAvatar}>{n.name?.charAt(0).toUpperCase()}</div>
                <div style={styles.customerInfo}>
                  <p style={styles.customerName}>{n.name}</p>
                  <p style={styles.customerPhone}> {n.phone || n.mobile}</p>
                </div>
              </div>
              <div style={styles.routeBox}>
                <div style={styles.routePoint}><span style={styles.routeIcon}>📍</span><div><span style={styles.routeLabel}>Pickup</span><div style={styles.routeValue}>{n.pickup}</div></div></div>
                <div style={styles.routeArrow}><div style={styles.arrowLine} /><span style={styles.arrowIcon}>→</span></div>
                <div style={styles.routePoint}><span style={styles.routeIcon}>🎯</span><div><span style={styles.routeLabel}>Drop</span><div style={styles.routeValue}>{n.drop}</div></div></div>
              </div>
              <div style={styles.notificationActions}>
                <button style={styles.assignBtn} onClick={() => navigate("/admin/bookings")}>Assign Driver</button>
                <button style={styles.viewBtn}   onClick={() => navigate("/admin/bookings")}>View Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Refresh bar styles ── */
const rf = {
  bar:       { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  timestamp: { display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "7px 14px", borderRadius: "20px", fontSize: "13px", color: "#475569", fontWeight: 500 },
  dot:       { width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px #bbf7d0", display: "inline-block" },
  ringWrap:  { display: "flex", alignItems: "center", gap: "5px", cursor: "default" },
  ringLabel: { fontSize: "12px", color: "#2563eb", fontWeight: 700, minWidth: "22px" },
  toggleBtn: { border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
  toggleOn:  { background: "#dcfce7", color: "#15803d" },
  toggleOff: { background: "#fee2e2", color: "#b91c1c" },
  manualBtn: { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
};

const styles = {
  container: { marginLeft: "260px", padding: "40px", background: "linear-gradient(135deg,#f0f4f8,#e2e8f0)", minHeight: "100vh" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px", flexWrap: "wrap", gap: "20px" },
  mainTitle:  { fontSize: "32px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.5px" },
  subtitle:   { fontSize: "15px", color: "#64748b", margin: "5px 0 0 0", fontWeight: 400 },
  statusBadge:{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" },
  statusDot:  { width: "8px", height: "8px", borderRadius: "50%", background: "#fff" },
  statsGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "25px", marginBottom: "35px" },
  statCard:   { background: "#fff", borderRadius: "16px", padding: "24px", display: "flex", alignItems: "flex-start", gap: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.8)" },
  statIconWrapper: { width: "60px", height: "60px", borderRadius: "14px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(37,99,235,0.25)", flexShrink: 0 },
  statIcon:   { fontSize: "28px" },
  statContent:{ flex: 1 },
  statLabel:  { fontSize: "13px", color: "#64748b", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue:  { fontSize: "28px", color: "#1e293b", margin: "4px 0", fontWeight: 800 },
  statChange: { fontSize: "12px", color: "#10b981", fontWeight: 600, margin: 0 },
  quickStatsSection: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(400px,1fr))", gap: "25px", marginBottom: "35px" },
  quickStatCard: { background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05)" },
  quickStatHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: "2px solid #f1f5f9" },
  quickStatTitle: { fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: 0 },
  viewAllLink: { fontSize: "13px", color: "#2563eb", fontWeight: 600, cursor: "pointer" },
  activityList: { display: "flex", flexDirection: "column", gap: "15px" },
  activityItem: { display: "flex", alignItems: "center", gap: "15px", padding: "12px", borderRadius: "10px", background: "#f8fafc" },
  activityIcon: { width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, flexShrink: 0 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: "14px", fontWeight: 600, color: "#1e293b", margin: 0 },
  activityTime:  { fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" },
  driverList:    { display: "flex", flexDirection: "column", gap: "15px" },
  driverItem:    { display: "flex", alignItems: "center", gap: "15px", padding: "12px", borderRadius: "10px", background: "#f8fafc" },
  driverAvatar:  { width: "45px", height: "45px", borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, flexShrink: 0 },
  driverInfo:    { flex: 1 },
  driverName:    { fontSize: "14px", fontWeight: 600, color: "#1e293b", margin: 0 },
  driverTrips:   { fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" },
  driverBadge:   { background: "#fef3c7", color: "#b45309", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 },
  emptyState:    { textAlign: "center", padding: "30px", color: "#94a3b8", fontSize: "14px" },
  notificationWrapper: { position: "fixed", bottom: "30px", right: "30px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "16px", maxWidth: "500px" },
  notificationCard:    { background: "#fff", borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", overflow: "hidden", transition: "all 0.5s ease", opacity: 1, transform: "translateX(0)", border: "1px solid #e5e7eb" },
  fadeOut:             { opacity: 0, transform: "translateX(100%)" },
  notificationHeader:  { background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", padding: "16px 20px", display: "flex", alignItems: "center", gap: "10px" },
  notificationIcon:    { fontSize: "20px" },
  notificationTitle:   { fontSize: "15px", fontWeight: 700, flex: 1 },
  notificationBadge:   { background: "rgba(255,255,255,0.3)", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 },
  notificationBody:    { padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  customerSection:     { display: "flex", alignItems: "center", gap: "12px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" },
  customerAvatar:      { width: "45px", height: "45px", borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700 },
  customerInfo:        { flex: 1 },
  customerName:        { fontSize: "15px", fontWeight: 700, color: "#1e293b", margin: 0 },
  customerPhone:       { fontSize: "13px", color: "#64748b", margin: "2px 0 0 0" },
  routeBox:            { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "15px", background: "#f8fafc", padding: "16px", borderRadius: "12px" },
  routePoint:          { display: "flex", gap: "10px", alignItems: "flex-start" },
  routeIcon:           { fontSize: "18px", marginTop: "2px" },
  routeLabel:          { fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" },
  routeValue:          { fontSize: "14px", color: "#1e293b", fontWeight: 600, lineHeight: "1.4" },
  routeArrow:          { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" },
  arrowLine:           { width: "2px", height: "20px", background: "linear-gradient(180deg,#2563eb,transparent)" },
  arrowIcon:           { fontSize: "24px", fontWeight: 700, color: "#2563eb" },
  notificationActions: { display: "flex", gap: "10px" },
  assignBtn:  { flex: 1, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", padding: "12px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 6px rgba(37,99,235,0.3)" },
  viewBtn:    { flex: 1, background: "#fff", color: "#64748b", border: "2px solid #e5e7eb", padding: "12px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
};