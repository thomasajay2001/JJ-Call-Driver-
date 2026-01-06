import { navigate } from "expo-router/build/global-state/routing";
import React from "react";

interface Props {
  onLogout: () => void;
}

const Sidebar: React.FC<Props> = ({ onLogout }) => {
  return (
    <div style={styles.sidebar}>
      <h2 style={styles.logo}>Admin Panel</h2>

      <ul style={styles.menu}>
        <li style={styles.menuItem} onClick={()=>navigate('')}>📊 Dashboard</li>
        <li style={styles.menuItem}>📖 Bookings</li>
        <li style={styles.menuItem} onClick={()=>navigate('/driver-dashboard')}>🚗 Drivers</li>
        <li style={styles.menuItem}>👥 Users</li>

        <li style={{ ...styles.menuItem, ...styles.logout }} onClick={onLogout}>
          Logout
        </li>
      </ul>
    </div>
  );
};

const styles = {
  sidebar: {
    width: "240px",
    height: "100vh",
    background: "linear-gradient(180deg, #1f2933, #111827)",
    color: "#fff",
    padding: "20px",
    position: "fixed" as const,
    left: 0,
    top: 0,
    boxSizing: "border-box" as const,
  },

  logo: {
    textAlign: "center" as const,
    marginBottom: "30px",
    fontSize: "22px",
    fontWeight: "bold",
  },

  menu: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },

  menuItem: {
    padding: "12px 15px",
    marginBottom: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
  },

  logout: {
    marginTop: "30px",
    backgroundColor: "#7f1d1d",
    textAlign: "center" as const,
    fontWeight: "bold",
  },
};

export default Sidebar;
