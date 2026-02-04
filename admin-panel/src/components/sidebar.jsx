import { useLocation, useNavigate } from "react-router-dom";

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Bookings", path: "/booking" },
    { label: "Drivers", path: "/driver-dashboard" },
    { label: "Users", path: "/users" },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Glowing Brand */}
      <div style={styles.brandBox}>
        <div style={styles.brand}>ADMIN</div>
        <div style={styles.brandGlow} />
      </div>

      {/* Menu Items */}
      <div style={styles.menu}>
        {menu.map((item) => {
          const active = location.pathname === item.path;
          return (
            <div
              key={item.path}
              style={{
                ...styles.menuItem,
                ...(active && styles.menuItemActive),
              }}
              onClick={() => navigate(item.path)}
            >
              {item.label}
              {active && <div style={styles.activeGlow} />}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button style={styles.logout} onClick={onLogout}>
          LOGOUT
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "280px",
    height: "100vh",
    background: "rgba(12, 12, 40, 0.9)", // deep navy background
    backdropFilter: "blur(14px)",
    boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    color: "#e5e7eb",
    position: "fixed",
    left: 0,
    top: 0,
    overflow: "hidden",
    fontFamily: "Inter, sans-serif",
  },

  brandBox: {
    position: "relative",
    padding: "28px 20px 22px",
    textAlign: "center",
    marginBottom: "30px",
  },
  brand: {
    fontSize: "30px",
    fontWeight: "800",
    letterSpacing: "1.5px",
    color: "#1e40af", // solid professional blue
    textAlign: "center",
    textShadow: "0 1px 2px rgba(0,0,0,0.15)", // subtle depth
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "0 16px",
  },
  menuItem: {
    position: "relative",
    padding: "14px 18px",
    fontSize: "14px",
    fontWeight: "500",
    borderRadius: "14px",
    cursor: "pointer",
    color: "#cbd5f5",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    backdropFilter: "blur(6px)",
    transition: "all 0.25s ease",
  },
  menuItemActive: {
    background: "rgba(59, 130, 246, 0.15)", // soft bluish frosted overlay
    color: "#2563eb", // crisp blue text
    fontWeight: "600",
    transform: "scale(1.03)", // slight pop for active
    borderLeft: "4px solid #2563eb", // subtle side indicator
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.12)", // subtle depth shadow
    backdropFilter: "blur(6px)", // soft frosted effect
    transition: "all 0.25s ease",
    position: "relative",
  },

  footer: {
    marginTop: "auto",
    padding: "20px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  logout: {
    width: "100%",
    padding: "12px",
    borderRadius: "16px",
    backgroundColor: "#1e293b", // solid dark button
    border: "1px solid #3b82f6", // neon accent border
    color: "#60a5fa",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};
