import React from "react";

/* ─────────────────────────────────────────
   QuickActions — 2×2 feature grid for customers
   ───────────────────────────────────────── */
const features = [
  { id: "1", title: "Local Ride",  icon: "🚖" },
  { id: "2", title: "Outstation",  icon: "🛣️" },
  { id: "3", title: "History",     icon: "📜" },
  { id: "4", title: "Help",        icon: "🎧" },
];

const QuickActions = ({ onFeatureClick }) => {
  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Quick Actions</h2>
      <div style={styles.grid}>
        {features.map((f) => (
          <button
            key={f.id}
            style={styles.card}
            onClick={() => onFeatureClick(f.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(37,99,235,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)";
            }}
          >
            <span style={styles.icon}>{f.icon}</span>
            <span style={styles.label}>{f.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickActions;

const styles = {
  section: {
    backgroundColor: "#fff",
    padding: "16px 16px 20px",
    marginBottom: 12,
  },
  heading: {
    margin: "0 0 14px",
    fontSize: 18,
    fontWeight: 700,
    color: "#1E293B",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    border: "none",
    borderRadius: 16,
    padding: "20px 12px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  icon: { fontSize: 36 },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1E293B",
    textAlign: "center",
  },
};
