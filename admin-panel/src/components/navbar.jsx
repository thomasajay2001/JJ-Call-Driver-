
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
    background: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 25px",
    position: "fixed",
    top: 0,
    left: 240, // same as sidebar width
    right: 0,
    zIndex: 1000,
    boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
  },

  logo: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  user: {
    fontSize: "14px",
    color: "#d1d5db",
  },

  logout: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
