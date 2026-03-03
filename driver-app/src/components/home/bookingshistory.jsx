import React, { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL, getStatusConfig, formatBookingDate } from "../../utils/constants";

/* ─────────────────────────────────────────
   DriverHistoryModal — full booking history
   with filter tabs: All / Today / Week / Month
   ───────────────────────────────────────── */
const FILTERS = [
  { key: "all",       label: "All" },
  { key: "today",     label: "Today" },
  { key: "thisweek",  label: "This Week" },
  { key: "thismonth", label: "This Month" },
];

const DriverHistoryModal = ({ visible, onClose }) => {
  const [filter,   setFilter]   = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!visible) return;
    fetchHistory(filter);
  }, [visible, filter]);

  const fetchHistory = async (f) => {
    const driverId = localStorage.getItem("driverId");
    if (!driverId) return;
    setLoading(true);
    try {
      const res  = await axios.get(`${BASE_URL}/api/bookings/driver/all?driverId=${driverId}&filter=${f}`);
      const list = Array.isArray(res.data?.data) ? res.data.data
                 : Array.isArray(res.data)        ? res.data
                 : [];
      setBookings(list);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>Booking History</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Filter tabs */}
        <div style={s.filterRow}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              style={{ ...s.filterBtn, ...(filter === f.key ? s.filterActive : {}) }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={s.body}>
          {loading ? (
            <div style={s.center}>
              <div style={s.spinner} />
              <p style={s.loadingText}>Loading...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div style={s.center}>
              <span style={{ fontSize: 48 }}>📭</span>
              <p style={s.emptyTitle}>No bookings found</p>
              <p style={s.emptySub}>No rides for this period yet.</p>
            </div>
          ) : (
            <>
              <p style={s.countText}>{bookings.length} ride{bookings.length !== 1 ? "s" : ""}</p>
              {bookings.map((item) => {
                const sc = getStatusConfig(item.status);
                return (
                  <div key={item.id} style={s.card}>
                    {/* Top row */}
                    <div style={s.cardTop}>
                      <div style={s.iconBox}>
                        <span style={{ fontSize: 20 }}>🚗</span>
                      </div>
                      <div style={s.cardInfo}>
                        <p style={s.cardName}>{item.customer_name || item.name || "—"}</p>
                        <p style={s.cardDate}>{formatBookingDate(item.created_at)}</p>
                      </div>
                      <div style={{ ...s.badge, backgroundColor: sc.bg }}>
                        <span style={{ ...s.badgeText, color: sc.color }}>{sc.label}</span>
                      </div>
                    </div>

                    {/* Route */}
                    <div style={s.routeBox}>
                      <div style={s.routeRow}>
                        <div style={{ ...s.dot, backgroundColor: "#10B981" }} />
                        <p style={s.routeText}>{item.pickup || "—"}</p>
                      </div>
                      <div style={s.routeLine} />
                      <div style={s.routeRow}>
                        <div style={{ ...s.dot, backgroundColor: "#EF4444" }} />
                        <p style={s.routeText}>{item.drop_location || item.drop || "—"}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={s.cardFooter}>
                      <span style={s.tripPill}>
                        {item.triptype?.toUpperCase() || "LOCAL"}
                      </span>
                      {item.customer_mobile && (
                        <span style={s.mobilePill}>📞 {item.customer_mobile}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverHistoryModal;

const s = {
  overlay: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 1000,
  },
  sheet: {
    width: "100%", maxWidth: 480,
    backgroundColor: "#F8FAFC",
    borderRadius: "24px 24px 0 0",
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 20px 12px",
    backgroundColor: "#fff",
    borderRadius: "24px 24px 0 0",
    borderBottom: "1px solid #E2E8F0",
    flexShrink: 0,
  },
  title:    { margin: 0, fontSize: 18, fontWeight: 800, color: "#1E293B" },
  closeBtn: {
    width: 36, height: 36, borderRadius: "50%",
    backgroundColor: "#F1F5F9", border: "none",
    fontSize: 16, fontWeight: 700, cursor: "pointer", color: "#64748B",
  },
  filterRow: {
    display: "flex", gap: 8, padding: "12px 16px",
    backgroundColor: "#fff", flexShrink: 0,
    overflowX: "auto",
  },
  filterBtn: {
    padding: "7px 16px", borderRadius: 20, border: "1.5px solid #E2E8F0",
    backgroundColor: "#fff", fontSize: 13, fontWeight: 600,
    color: "#64748B", cursor: "pointer", whiteSpace: "nowrap",
  },
  filterActive: {
    backgroundColor: "#2563EB", borderColor: "#2563EB", color: "#fff",
  },
  body: {
    flex: 1, overflowY: "auto", padding: "12px 16px 32px",
  },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 0", gap: 8,
  },
  spinner: {
    width: 36, height: 36,
    border: "3px solid #bfdbfe", borderTopColor: "#2563EB",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
    marginBottom: 8,
  },
  loadingText: { color: "#2563EB", fontWeight: 600, fontSize: 14, margin: 0 },
  emptyTitle:  { margin: "8px 0 4px", fontSize: 16, fontWeight: 700, color: "#1E293B" },
  emptySub:    { margin: 0, fontSize: 13, color: "#64748B" },
  countText:   { margin: "0 0 10px", fontSize: 13, color: "#64748B", fontWeight: 600 },

  card: {
    backgroundColor: "#fff", borderRadius: 18,
    padding: 14, marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  cardTop:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  iconBox:  {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#EFF6FF",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: {
    margin: 0, fontSize: 14, fontWeight: 700, color: "#1E293B",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  cardDate:  { margin: "2px 0 0", fontSize: 11, color: "#64748B" },
  badge:     { padding: "4px 9px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: 700 },

  routeBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10 },
  routeRow: { display: "flex", alignItems: "center", gap: 8 },
  dot:      { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  routeLine:{ width: 2, height: 10, backgroundColor: "#CBD5E1", marginLeft: 3, marginTop: 2, marginBottom: 2 },
  routeText:{
    margin: 0, fontSize: 12, color: "#1E293B",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  cardFooter:  { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  tripPill:    {
    backgroundColor: "#EFF6FF", padding: "3px 10px", borderRadius: 8,
    fontSize: 11, fontWeight: 700, color: "#2563EB",
  },
  mobilePill:  {
    backgroundColor: "#F8FAFC", padding: "3px 10px", borderRadius: 8,
    fontSize: 11, fontWeight: 600, color: "#64748B",
  },
};