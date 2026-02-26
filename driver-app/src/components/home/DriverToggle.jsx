import React from "react";

/* ─────────────────────────────────────────
   DriverToggle — Online / Offline status card
   ───────────────────────────────────────── */
const DriverToggle = ({ isOnline, onToggle }) => {
  return (
    <div
      style={{
        ...styles.card,
        backgroundColor: isOnline ? "#2563EB" : "#334155",
      }}
    >
      <div>
        <p style={styles.label}>{isOnline ? "You're Online" : "You're Offline"}</p>
        <p style={styles.sub}>
          {isOnline ? "Waiting for ride requests..." : "Go online to receive rides"}
        </p>
      </div>

      <button
        style={{
          ...styles.toggleBtn,
          ...(isOnline ? styles.toggleOnline : styles.toggleOffline),
        }}
        onClick={onToggle}
      >
        <span
          style={{
            ...styles.statusDot,
            backgroundColor: isOnline ? "#34d399" : "#94a3b8",
          }}
        />
        {isOnline ? "Go Offline" : "Go Online"}
      </button>
    </div>
  );
};

export default DriverToggle;

const styles = {
  card: {
    margin: 16,
    borderRadius: 22,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "background-color 0.3s",
  },
  label: {
    margin: "0 0 4px",
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
  },
  sub: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 16px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    transition: "background-color 0.2s",
  },
  toggleOnline: {
    backgroundColor: "rgba(255,255,255,0.18)",
    border: "1.5px solid rgba(255,255,255,0.35)",
  },
  toggleOffline: {
    backgroundColor: "#2563EB",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
};
