import React from "react";

/* ─────────────────────────────────────────
   DriverStats — Today / Total Trips / This Week
   ───────────────────────────────────────── */
const DriverStats = ({ todayEarnings, totalTrips, weekEarnings, loading }) => {
  const stats = [
    { label: "Today",      value: `₹${todayEarnings}` },
    { label: "Total Trips", value: loading ? "..." : String(totalTrips) },
    { label: "This Week",  value: `₹${weekEarnings.toLocaleString()}` },
  ];

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Your Earnings</h2>
      <div style={styles.row}>
        {stats.map((s) => (
          <div key={s.label} style={styles.card}>
            <span style={styles.value}>{s.value}</span>
            <span style={styles.label}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DriverStats;

const styles = {
  section: {
    padding: "0 16px 8px",
  },
  heading: {
    margin: "0 0 10px",
    fontSize: 16,
    fontWeight: 700,
    color: "#1E293B",
  },
  row: {
    display: "flex",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: "14px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  value: {
    fontSize: 15,
    fontWeight: 800,
    color: "#1E293B",
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: 500,
  },
};
