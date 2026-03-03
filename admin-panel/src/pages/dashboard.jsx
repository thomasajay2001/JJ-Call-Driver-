import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const BASE_URL   = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://13.60.174.204:3000";
const REFRESH_MS = 30000;

/* ── time helper ── */
const timeAgo = (ts) => {
  if (!ts) return "Just now";
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Dashboard() {
  const navigate   = useNavigate();
  const socketRef  = useRef(null);
  const ivRef      = useRef(null);
  const cdRef      = useRef(REFRESH_MS / 1000);

  const [bookings,     setBookings]     = useState([]);
  const [drivers,      setDrivers]      = useState([]);
  const [activities,   setActivities]   = useState([]);
  const [notifs,       setNotifs]       = useState([]);
  const [autoRefresh,  setAutoRefresh]  = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [countdown,    setCountdown]    = useState(REFRESH_MS / 1000);

  const fetchAll = async () => {
    await Promise.all([fetchBookings(), fetchDrivers()]);
    setLastUpdated(new Date());
    cdRef.current = REFRESH_MS / 1000;
    setCountdown(REFRESH_MS / 1000);
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      const data = res.data || [];
      setBookings(data);
      setActivities(
        data.slice(0, 3).map((b) => ({
          id: b.id,
          type:
            b.status?.toLowerCase() === "completed" ? "completed" :
            b.driver ? "assigned" : "new",
          title:
            b.status?.toLowerCase() === "completed" ? `Booking #${b.id} completed` :
            b.driver ? `Driver assigned to #${b.id}` : `New booking #${b.id}`,
          time: timeAgo(b.created_at),
        }))
      );
    } catch {}
  };

  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      setDrivers(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  /* auto-refresh interval */
  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current);
    if (!autoRefresh) return;
    ivRef.current = setInterval(() => fetchAll(), REFRESH_MS);
    return () => clearInterval(ivRef.current);
  }, [autoRefresh]);

  /* countdown tick */
  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return; }
    const t = setInterval(() => {
      cdRef.current = Math.max(0, cdRef.current - 1);
      setCountdown(cdRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  /* socket */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("joinAdminRoom"));
    socket.on("newBooking", (data) => {
      setBookings((prev) => [data, ...prev]);
      setActivities((prev) => [
        { id: data.id || Date.now(), type: "new", title: `New booking #${data.id || ""}`, time: "Just now" },
        ...prev.slice(0, 2),
      ]);
      const id = Date.now();
      setNotifs((prev) => [{ id, ...data }, ...prev]);
      setTimeout(() => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, fade: true } : n)), 6000);
      setTimeout(() => setNotifs((prev) => prev.filter((n) => n.id !== id)), 6500);
    });
    return () => socket.disconnect();
  }, []);

  /* ── Stats ── */
  const totalBookings     = bookings.length;
  const activeDrivers     = drivers.filter((d) => ["active","online"].includes(d.status?.toLowerCase())).length;
  const liveTrips         = bookings.filter((b) => ["assigned","in progress"].includes(b.status?.toLowerCase())).length;
  const completedBookings = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;
  const todayRevenue      = completedBookings * 350;

  /* ── Top drivers ── */
  const topDrivers = (() => {
    const map = {};
    bookings.forEach((b) => {
      if (b.driver && b.status?.toLowerCase() === "completed")
        map[b.driver] = (map[b.driver] || 0) + 1;
    });
    const sorted = Object.entries(map)
      .map(([name, trips]) => ({ name, trips, rating: (4.5 + Math.random() * 0.5).toFixed(1) }))
      .sort((a, b) => b.trips - a.trips).slice(0, 3);
    if (sorted.length === 0)
      return drivers.slice(0, 3).map((d) => ({
        name: d.name, trips: Math.floor(Math.random() * 10) + 3,
        rating: (4.5 + Math.random() * 0.5).toFixed(1),
      }));
    return sorted;
  })();

  /* ── Countdown ring ── */
  const R    = 10;
  const circ = 2 * Math.PI * R;
  const dash = circ * (autoRefresh ? countdown / (REFRESH_MS / 1000) : 0);

  const STATS = [
    { icon:"📋", label:"Total Bookings",  value:totalBookings,              grad:"stat-icon-box-blue",   change:"+12% from last week" },
    { icon:"🚗", label:"Active Drivers",  value:activeDrivers,              grad:"stat-icon-box-green",  change:"Online now" },
    { icon:"🚖", label:"Live Trips",       value:liveTrips,                  grad:"stat-icon-box-amber",  change:"In progress" },
    { icon:"💰", label:"Revenue Today",   value:`₹${todayRevenue.toLocaleString()}`, grad:"stat-icon-box-purple", change:"+8% from yesterday" },
  ];

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time system overview and analytics</p>
        </div>

        <div className="refresh-bar">
          {lastUpdated && (
            <div className="refresh-timestamp">
              <span className="refresh-live-dot" />
              {lastUpdated.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
            </div>
          )}
          {autoRefresh && (
            <div className="refresh-ring-wrap" title={`Refreshes in ${countdown}s`}>
              <svg width="28" height="28" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="14" cy="14" r={R} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="14" cy="14" r={R} fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  style={{ transition:"stroke-dasharray 1s linear" }} />
              </svg>
              <span className="refresh-ring-label">{countdown}s</span>
            </div>
          )}
          <button
            className={autoRefresh ? "refresh-toggle-on" : "refresh-toggle-off"}
            onClick={() => { setAutoRefresh((v) => !v); cdRef.current = REFRESH_MS/1000; setCountdown(REFRESH_MS/1000); }}
          >
            {autoRefresh ? "🔄 Auto ON" : "⏸ Auto OFF"}
          </button>
          <button className="refresh-manual-btn" onClick={() => fetchAll()}>↻ Refresh</button>
          <div className="live-badge">
            <span className="live-badge-dot" />
            Live
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon-box ${s.grad}`}>
              <span>{s.icon}</span>
            </div>
            <div>
              <p className="stat-label">{s.label}</p>
              <h3 className="stat-value">{s.value}</h3>
              <p className="stat-change">{s.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick cards ── */}
      <div className="quick-grid">
        {/* Recent Activity */}
        <div className="quick-card">
          <div className="quick-card-header">
            <h3 className="quick-card-title">Recent Activity</h3>
            <span className="quick-card-link" onClick={() => navigate("/booking")}>View All →</span>
          </div>
          <div className="activity-list">
            {activities.length > 0 ? activities.map((a) => (
              <div key={a.id} className="activity-item">
                <div
                  className="activity-icon"
                  style={{
                    background:
                      a.type === "completed" ? "#dcfce7" :
                      a.type === "assigned"  ? "#dbeafe" : "#fef3c7",
                    color:
                      a.type === "completed" ? "#15803d" :
                      a.type === "assigned"  ? "#1e40af" : "#b45309",
                  }}
                >
                  {a.type === "completed" ? "✓" : a.type === "assigned" ? "🚗" : "⏳"}
                </div>
                <div>
                  <p className="activity-title">{a.title}</p>
                  <p className="activity-time">{a.time}</p>
                </div>
              </div>
            )) : (
              <div className="empty-state">
                <span className="empty-state-icon">📭</span>
                <p className="empty-state-title">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Drivers */}
        <div className="quick-card">
          <div className="quick-card-header">
            <h3 className="quick-card-title">Top Drivers Today</h3>
            <span className="quick-card-link" onClick={() => navigate("/driver-dashboard")}>View All →</span>
          </div>
          <div className="driver-list">
            {topDrivers.length > 0 ? topDrivers.map((d, i) => (
              <div key={i} className="driver-item">
                <div
                  className="avatar avatar-lg"
                  style={{
                    background:
                      i === 0 ? "linear-gradient(135deg,#2563eb,#1d4ed8)" :
                      i === 1 ? "linear-gradient(135deg,#10b981,#059669)" :
                               "linear-gradient(135deg,#f59e0b,#d97706)",
                  }}
                >
                  {d.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <p className="driver-item-name">{d.name}</p>
                  <p className="driver-item-trips">{d.trips} trips completed</p>
                </div>
                <span className="driver-rating">⭐ {d.rating}</span>
              </div>
            )) : (
              <div className="empty-state">
                <span className="empty-state-icon">🚗</span>
                <p className="empty-state-title">No driver data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Notification toasts ── */}
      <div className="notification-stack">
        {notifs.map((n) => (
          <div key={n.id} className={`notification-card${n.fade ? " fade-out" : ""}`}>
            <div className="notif-header">
              <span className="notif-header-icon">🚖</span>
              <span className="notif-header-title">New Booking Alert</span>
              <span className="notif-new-badge">NEW</span>
            </div>
            <div className="notif-body">
              <div className="notif-customer">
                <div className="avatar avatar-lg">
                  {n.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="notif-cust-name">{n.name}</p>
                  <p className="notif-cust-phone">{n.phone || n.mobile}</p>
                </div>
              </div>
              <div className="notif-route">
                <div className="notif-route-point">
                  <span>📍</span>
                  <div>
                    <span className="notif-route-label">Pickup</span>
                    <div className="notif-route-value">{n.pickup}</div>
                  </div>
                </div>
                <div className="notif-arrow">→</div>
                <div className="notif-route-point">
                  <span>🎯</span>
                  <div>
                    <span className="notif-route-label">Drop</span>
                    <div className="notif-route-value">{n.drop}</div>
                  </div>
                </div>
              </div>
              <div className="notif-actions">
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/booking")}>Assign Driver</button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate("/booking")}>View Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}