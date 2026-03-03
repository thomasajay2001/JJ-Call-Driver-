/**
 * Dashboard.jsx
 * Uses the shared useDrivers() hook so stat cards update in real-time
 * whenever any driver toggles online/offline from the mobile app.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import { useDrivers } from "../hooks/useDrivers";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

export default function Dashboard() {
  const { drivers, loading: driversLoading } = useDrivers();
  const [bookings,  setBookings]  = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bLoading,  setBLoading]  = useState(true);

  useEffect(() => {
    fetchBookings();
    fetchCustomers();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch {}
    finally { setBLoading(false); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/customer`);
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  /* ── Live driver stats ── */
  // Driver toggle sends "online" when active; treat both "online" and "active" as online
  const onlineDrivers  = drivers.filter((d) =>
    ["online", "active"].includes(d.status?.toLowerCase())
  );
  // const offlineDrivers = drivers.filter((d) =>
  //   ["offline", "inactive"].includes(d.status?.toLowerCase())
  // );
  const inRideDrivers  = drivers.filter((d) =>
    ["inride", "on duty", "assigned", "accepted"].includes(d.status?.toLowerCase())
  );

  /* ── Booking stats ── */
  // const totalBookings     = bookings.length;
  const pendingBookings   = bookings.filter((b) => !b.driver || b.status?.toLowerCase() === "pending").length;
  const assignedBookings  = bookings.filter((b) => b.status?.toLowerCase() === "assigned").length;
  const completedBookings = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;

  const STATS = [
    /* ── Drivers (live) ── */
    {
      icon: "👥", label: "Total Drivers",
      value: driversLoading ? "…" : drivers.length,
      sub: "All registered",
      cls: "stat-icon-box-blue", live: true,
    },
    {
      icon: "🟢", label: "Online Drivers",
      value: driversLoading ? "…" : onlineDrivers.length,
      sub: "Available now",
      cls: "stat-icon-box-green", live: true,
    },
    {
      icon: "🚗", label: "In Ride",
      value: driversLoading ? "…" : inRideDrivers.length,
      sub: "Currently on trip",
      cls: "stat-icon-box-amber", live: true,
    },
    // {
    //   icon: "⚫", label: "Offline Drivers",
    //   value: driversLoading ? "…" : offlineDrivers.length,
    //   sub: "Not available",
    //   cls: "stat-icon-box-gray", live: true,
    // },
    /* ── Bookings ── */
    // {
    //   icon: "📋", label: "Total Bookings",
    //   value: bLoading ? "…" : totalBookings,
    //   sub: "All time",
    //   cls: "stat-icon-box-blue",
    // },
    {
      icon: "⏳", label: "Pending",
      value: bLoading ? "…" : pendingBookings,
      sub: "Needs assignment",
      cls: "stat-icon-box-red",
    },

    {
      icon: "🎉", label: "Completed",
      value: bLoading ? "…" : completedBookings,
      sub: "Trips done",
      cls: "stat-icon-box-green",
    },
  
  ];

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live overview of your fleet and bookings</p>
        </div>
        {/* Live indicator */}
        <div className="live-badge">
          <span className="live-badge-dot" />
          Live
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon-box ${s.cls}`}>
              <span>{s.icon}</span>
            </div>
            <div>
              <p className="stat-label">
                {s.label}
                {s.live && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#10b981",
                    background: "#d1fae5",
                    padding: "1px 6px",
                    borderRadius: 20,
                    verticalAlign: "middle",
                    letterSpacing: 0.5,
                  }}>
                    LIVE
                  </span>
                )}
              </p>
              <h3 className="stat-value">{s.value}</h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Live Driver Status Breakdown ── */}
      <div className="table-card" style={{ marginTop: 24 }}>
        <div className="table-card-header">
          <h3 className="table-card-title">
            Driver Status
            <span style={{
              marginLeft: 10, fontSize: 10, fontWeight: 700, color: "#10b981",
              background: "#d1fae5", padding: "2px 8px", borderRadius: 20,
            }}>
              LIVE
            </span>
          </h3>
          <span className="table-record-badge">{drivers.length} Drivers</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["ID", "Name", "Mobile", "Status", "Car Type", "Region", "Pay Active"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driversLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Loading drivers...
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <span className="empty-state-icon">📭</span>
                      <p className="empty-state-title">No drivers found</p>
                    </div>
                  </td>
                </tr>
              ) : drivers.map((d) => {
                const st = d.status?.toLowerCase();
                const badgeCls =
                  st === "online"  || st === "active"   ? "badge badge-green"  :
                  st === "inride"  || st === "on duty"  ? "badge badge-blue"   :
                  st === "offline" || st === "inactive" ? "badge badge-gray"   :
                  st === "suspend"                      ? "badge badge-red"    : "badge badge-amber";
                const badgeLabel =
                  st === "online"  ? "🟢 Online"   :
                  st === "offline" ? "⚫ Offline"  :
                  st === "inride"  ? "🚗 In Ride"  :
                  st === "active"  ? "🟢 Active"   :
                  st === "suspend" ? "⛔ Suspended" : d.status || "—";

                return (
                  <tr key={d.id}>
                    <td><span className="cell-id">{d.id}</span></td>
                    <td>
                      <div className="cell-name">
                        <div className="avatar">{d.name?.charAt(0)?.toUpperCase()}</div>
                        <span className="cell-name-text">{d.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{d.mobile}</td>
                    <td><span className={badgeCls}>{badgeLabel}</span></td>
                    <td>{d.car_type || "—"}</td>
                    <td>{d.region || "—"}</td>
                    <td>
                      <span className={
                        d.payactive?.toLowerCase() === "active" ? "badge badge-green" : "badge badge-red"
                      }>
                        {d.payactive?.toLowerCase() === "active" ? "✅ Active" : "🚫 Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
