import React from "react";
import BookingCard from "../BookingCard";

/* ─────────────────────────────────────────
   RecentBookings — driver's last 4 bookings
   ───────────────────────────────────────── */
const RecentBookings = ({ trips, loading, onSeeAll }) => {
  return (
    <section style={styles.section}>
      {/* Section Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.heading}>Recent Bookings</h2>
        <button style={styles.seeAllBtn} onClick={onSeeAll}>
          See All →
        </button>
      </div>

      {/* Loading */}
      {loading && trips.length === 0 && (
        <div style={styles.waitingBox}>
          <div style={styles.spinner} />
          <span style={styles.waitingText}>Loading recent bookings...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && trips.length === 0 && (
        <div style={styles.emptyBox}>
          <span style={styles.emptyIcon}>🚖</span>
          <p style={styles.emptyTitle}>No bookings yet</p>
          <p style={styles.emptySub}>Your completed rides will appear here.</p>
        </div>
      )}

      {/* Cards */}
      {trips.map((item) => (
        <BookingCard key={String(item.id)} item={item} />
      ))}

      {/* View All Button */}
      {trips.length > 0 && (
        <button style={styles.viewAllBtn} onClick={onSeeAll}>
          View All Bookings →
        </button>
      )}
    </section>
  );
};

export default RecentBookings;

const styles = {
  section: {
    padding: "0 0 16px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 16px 8px",
  },
  heading: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1E293B",
  },
  seeAllBtn: {
    padding: "6px 12px",
    backgroundColor: "#EFF6FF",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    color: "#2563EB",
    fontWeight: 700,
    cursor: "pointer",
  },
  waitingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "0 16px 14px",
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    padding: 18,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2.5px solid #bfdbfe",
    borderTopColor: "#2563EB",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  waitingText: { fontSize: 14, color: "#2563EB", fontWeight: 600 },
  emptyBox: {
    margin: "0 16px 12px",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1E293B" },
  emptySub: { margin: 0, fontSize: 13, color: "#64748B", textAlign: "center" },
  viewAllBtn: {
    display: "block",
    width: "calc(100% - 32px)",
    margin: "4px 16px 0",
    padding: "14px 0",
    backgroundColor: "#EFF6FF",
    border: "none",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 700,
    color: "#2563EB",
    cursor: "pointer",
    textAlign: "center",
  },
};
