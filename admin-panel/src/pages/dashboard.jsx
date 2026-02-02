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
      console.log("📥 New booking received:", data);

      setBookings((prev) => [data, ...prev]);

      const id = Date.now();

      setNotifications((prev) => [
        {
          id,
          ...data,
          fade: false,
        },
        ...prev,
      ]);

      // Start fade after 6 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, fade: true } : n)),
        );
      }, 6000);

      // Remove after fade animation
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6500);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      

      {/* ================= CONTENT ================= */}
      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>Dashboard</h2>
          <p style={styles.pageSubtitle}>Live system overview</p>
        </div>

        <div style={styles.cards}>
          <div style={styles.card}>
            <p style={styles.cardTitle}>Total Bookings</p>
            <h3 style={styles.cardValue}>{bookings.length}</h3>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>Active Drivers</p>
            <h3 style={styles.cardValue}>35</h3>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>Live Trips</p>
            <h3 style={styles.cardValue}>8</h3>
          </div>
        </div>
      </div>

      {/* ================= NOTIFICATIONS ================= */}
      <div style={styles.notificationWrapper}>
        <div style={styles.notificationRow}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                ...styles.notificationCard,
                ...(n.fade ? styles.fadeOut : {}),
              }}
            >
              <div style={styles.notificationHeader}> New Booking Alert</div>

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
    </div>
  );
}

/* ===================== STYLES ===================== */

const styles = {
  content: {
    marginLeft: "240px",
    padding: "90px 32px 32px",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  pageHeader: {
    marginBottom: "28px",
  },

  pageTitle: {
    fontSize: "26px",
    fontWeight: 600,
  },

  pageSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
  },

  card: {
    background: "#fff",
    padding: "28px",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    textAlign: "center",
  },

  cardTitle: {
    fontSize: "14px",
    color: "#6b7280",
  },

  cardValue: {
    fontSize: "32px",
    fontWeight: 600,
  },

  notificationWrapper: {
    position: "fixed",
    bottom: "28px",
    left: "240px",
    zIndex: 9999,
    width: "calc(100% - 240px)",
    overflowX: "auto",
  },

  notificationRow: {
    display: "flex",
    gap: "22px",
    padding: "0 16px",
  },

  notificationCard: {
    minWidth: "520px",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 30px 70px rgba(0,0,0,0.28)",
    overflow: "hidden",

    transition: "opacity 0.5s ease, transform 0.5s ease",
    opacity: 1,
    transform: "translateY(0)",
  },

  fadeOut: {
    opacity: 0,
    transform: "translateY(20px)",
  },

  notificationHeader: {
    background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
    color: "#fff",
    padding: "20px 24px",
    fontSize: "18px",
    fontWeight: 600,
  },

  notificationBody: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  row: {
    display: "flex",
    gap: "12px",
  },

  label: {
    minWidth: "90px",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  value: {
    fontSize: "15px",
  },

  routeBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "16px",
    background: "#f9fafb",
    padding: "16px",
    borderRadius: "12px",
  },

  routeLabel: {
    fontSize: "13px",
    fontWeight: 700,
  },

  routeValue: {
    fontSize: "14px",
  },

  arrow: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#2563eb",
  },
};
