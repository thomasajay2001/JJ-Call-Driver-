export default function Navbar({ onLogout }) {
  return (
    <div style={styles.navbar}>
      <h3 style={styles.logo}></h3>

      <div style={styles.right}>
        <span style={styles.user}>👤 Admin</span>
        <button style={styles.logout} onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

const styles = {
  navbar: {
    height: "60px",
    background: "#111827", // same as sidebar for cohesion
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 25px",
    position: "fixed",
    top: 0,
    left: "280px", // matches sidebar width
    right: 0,
    zIndex: 1000,
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)", // subtle shadow for depth
    backdropFilter: "blur(4px)", // slight frosted effect for elegance
    fontFamily: "Inter, sans-serif",
  },

  logo: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
    color: "#2563eb", // sidebar accent color
    letterSpacing: "1px",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  user: {
    fontSize: "14px",
    color: "#cbd5f5", // matches sidebar menu text
    fontWeight: "500",
  },

  logout: {
    background: "#2563eb", // sidebar accent color
    border: "none",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.25s ease",
    boxShadow: "0 2px 6px rgba(37,99,235,0.3)", // subtle depth
  },
};
