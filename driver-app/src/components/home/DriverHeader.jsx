import React from "react";

/* ─────────────────────────────────────────
   DriverHeader — Avatar, name, ID, help button
   ───────────────────────────────────────── */
const DriverHeader = ({ driverName, driverNo, onHelpClick }) => {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.avatarRing}>
          <div style={styles.avatarInner}>
            <span style={styles.avatarInitial}>
              {driverName ? driverName.charAt(0).toUpperCase() : "D"}
            </span>
          </div>
        </div>
        <div>
          <p style={styles.greet}>Welcome back!</p>
          <p style={styles.name}>{driverName}</p>
          {driverNo && (
            <p style={styles.driverNo}>Driver ID: {driverNo}</p>
          )}
        </div>
      </div>
      <button style={styles.helpBtn} onClick={onHelpClick} title="Help">
        🎧
      </button>
    </header>
  );
};

export default DriverHeader;

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: "16px",
    borderBottom: "1px solid #CBD5E1",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "2.5px solid #2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
    flexShrink: 0,
  },
  avatarInner: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    backgroundColor: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 800,
    color: "#fff",
  },
  greet: { margin: 0, fontSize: 12, color: "#64748B", fontWeight: 500 },
  name:  { margin: "2px 0", fontSize: 17, fontWeight: 800, color: "#1E293B" },
  driverNo: { margin: "2px 0", fontSize: 13, fontWeight: 600, color: "#2563EB" },
  idBadge: {
    display: "inline-block",
    marginTop: 3,
    backgroundColor: "#EFF6FF",
    padding: "2px 8px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    color: "#2563EB",
  },
  helpBtn: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    backgroundColor: "#EFF6FF",
    border: "1.5px solid #CBD5E1",
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
