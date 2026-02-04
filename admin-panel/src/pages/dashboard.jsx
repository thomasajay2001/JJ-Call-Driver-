import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://192.168.0.9:3000";


export default function Dashboard() {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const logout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/");
  };

  useEffect(() => {
    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Admin socket connected", socket.id);
      socket.emit("joinAdminRoom");
    });

    socket.on("newBooking", (data) => {
      setBookings((prev) => [data, ...prev]);
      const id = Date.now();

      setNotifications((prev) => [{ id, ...data, fade: false }, ...prev]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, fade: true } : n)),
        );
      }, 6000);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6500);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Dashboard</h2>
        <p style={styles.subtitle}>Live system overview</p>
      </div>

      <div style={styles.cards}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Bookings</p>
          <h3 style={styles.cardValue}>{bookings.length}</h3>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Active Drivers</p>
          <h3 style={styles.cardValue}>35</h3>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Live Trips</p>
          <h3 style={styles.cardValue}>8</h3>
        </div>
      </div>

      {/* ================= Notifications ================= */}
      <div style={styles.notificationWrapper}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              ...styles.notificationCard,
              ...(n.fade ? styles.fadeOut : {}),
            }}
          >
            <div style={styles.notificationHeader}>🚖 New Booking Alert</div>

            <div style={styles.notificationBody}>
              <div style={styles.row}>
                <span style={styles.label}>Customer</span>
                <span style={styles.value}>{n.name}</span>
              </div>

              <div style={styles.row}>
                <span style={styles.label}>Phone</span>
                <span style={styles.value}>{n.phone}</span>
              </div>

              <div style={styles.routeBox}>
                <div>
                  <span style={styles.routeLabel}>Pickup</span>
                  <div style={styles.routeValue}>{n.pickup}</div>
                </div>

                <div style={styles.arrow}>→</div>

                <div>
                  <span style={styles.routeLabel}>Drop</span>
                  <div style={styles.routeValue}>{n.drop}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginLeft: "260px",
    padding: "50px 32px 32px",
    background: "#f3f4f6", // soft gray, matches our professional look
    minHeight: "100vh",
  },

  header: {
    marginBottom: "28px",
  },

  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
  },

  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
  },

  card: {
    background: "#ffffff",
    padding: "28px",
    borderRadius: "14px",
    boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
    textAlign: "center",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },

  cardLabel: {
    fontSize: "14px",
    color: "#6b7280",
  },

  cardValue: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#1e3a8a", // deep blue accent
  },

  cardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 16px 32px rgba(0,0,0,0.1)",
  },

  notificationWrapper: {
    position: "fixed",
    bottom: "28px",
    left: "260px",
    zIndex: 9999,
    width: "calc(100% - 260px)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  notificationCard: {
    minWidth: "480px",
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.15)",
    overflow: "hidden",
    transition: "all 0.5s ease",
    opacity: 1,
    transform: "translateY(0)",
  },

  fadeOut: {
    opacity: 0,
    transform: "translateY(20px)",
  },

  notificationHeader: {
    background: "#1e3a8a", // sidebar blue accent
    color: "#fff",
    padding: "16px 20px",
    fontSize: "16px",
    fontWeight: 600,
  },

  notificationBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  row: {
    display: "flex",
    gap: "12px",
  },

  label: {
    minWidth: "80px",
    fontSize: "13px",
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#374151",
  },

  value: {
    fontSize: "14px",
    color: "#111827",
  },

  routeBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "12px",
    background: "#f9fafb",
    padding: "12px",
    borderRadius: "10px",
  },

  routeLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#4b5563",
  },

  routeValue: {
    fontSize: "14px",
    color: "#111827",
  },

  arrow: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
