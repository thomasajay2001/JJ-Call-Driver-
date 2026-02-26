import React from "react";
import { getStatusConfig, formatBookingDate } from "../utils/constants";

/* ─────────────────────────────────────────
   BookingCard — shared between Home & Ride tabs
   ───────────────────────────────────────── */
const BookingCard = ({ item }) => {
  const sc = getStatusConfig(item.status);

  return (
    <div style={styles.card}>
      {/* Top Row */}
      <div style={styles.topRow}>
        <div style={styles.iconBox}>
          <span style={styles.carIcon}>🚗</span>
        </div>
        <div style={styles.topInfo}>
          <p style={styles.customerName}>
            {item.customer_name || item.name || "—"}
          </p>
          <p style={styles.dateText}>{formatBookingDate(item.created_at)}</p>
        </div>
        <div style={{ ...styles.statusBadge, backgroundColor: sc.bg }}>
          <span style={{ ...styles.statusText, color: sc.color }}>{sc.label}</span>
        </div>
      </div>

      {/* Route Box */}
      <div style={styles.routeBox}>
        <div style={styles.routeRow}>
          <div style={{ ...styles.dot, backgroundColor: "#10B981" }} />
          <p style={styles.routeText}>{item.pickup}</p>
        </div>
        <div style={styles.routeLine} />
        <div style={styles.routeRow}>
          <div style={{ ...styles.dot, backgroundColor: "#EF4444" }} />
          <p style={styles.routeText}>{item.drop_location || item.drop}</p>
        </div>
      </div>

      {/* Trip Type Pill */}
      {item.triptype && (
        <div style={styles.typePill}>
          <span style={styles.typeText}>{item.triptype.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};

export default BookingCard;

const styles = {
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  carIcon: { fontSize: 20 },
  topInfo: { flex: 1, minWidth: 0 },
  customerName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#1E293B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dateText: { margin: "2px 0 0", fontSize: 11, color: "#64748B" },
  statusBadge: {
    padding: "4px 9px",
    borderRadius: 10,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: 700 },
  routeBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
  },
  routeRow: { display: "flex", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  routeLine: {
    width: 2,
    height: 10,
    backgroundColor: "#CBD5E1",
    marginLeft: 3,
    marginTop: 2,
    marginBottom: 2,
  },
  routeText: {
    margin: 0,
    fontSize: 12,
    color: "#1E293B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  typePill: {
    display: "inline-flex",
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    padding: "3px 10px",
    borderRadius: 8,
  },
  typeText: { fontSize: 10, fontWeight: 700, color: "#2563EB" },
};
