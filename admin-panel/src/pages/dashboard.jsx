import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";


const BASE_URL = "http://192.168.0.87:3000";
const SOCKET_URL = "http://192.168.0.87:3000";

export default function Dashboard() {
  const navigate = useNavigate();
  const socketRef = useRef(null);

const [bookings, setBookings] = useState([]);
  const logout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/");
  };
  const [notifications, setNotifications] = useState([]);

  // ✅ useEffect BEFORE return
  useEffect(() => {
    const role = localStorage.getItem("role");
    //if (role !== "admin") return;

    const socket = io(BASE_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Admin socket connected", socket.id);
      socket.emit("joinAdminRoom");
    });

    socket.on("newBooking", (data) => {
  console.log("📥 New booking received:", data);

  setBookings((prev) => [data, ...prev]);

  setNotifications((prev) => [
    {
      id: Date.now(),
      ...data,
    },
    ...prev,
  ]);

  // Auto remove after 5 seconds
  setTimeout(() => {
    setNotifications((prev) =>
      prev.filter((n) => n.id !== data.id)
    );
  }, 5000);
});


    socket.on("bookingConfirmed", (data) => {
      console.log("📌 Booking confirmed:", data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ JSX render
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
            <div key={n.id} style={styles.notificationCard}>
              <div style={styles.notificationHeader}>
                🚖 New Booking Alert
              </div>

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
    fontFamily: "Inter, system-ui, sans-serif",
  },

  pageHeader: {
    marginBottom: "28px",
  },

  pageTitle: {
    fontSize: "26px",
    fontWeight: 600,
    margin: 0,
    color: "#111827",
  },

  pageSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "6px",
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
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    textAlign: "center",
  },

  cardTitle: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "8px",
  },

  cardValue: {
    fontSize: "32px",
    fontWeight: 600,
    color: "#111827",
  },

  /* ===== Notifications ===== */

notificationWrapper: {
  position: "fixed",
  bottom: "28px",
  left: "240px",            // right after sidebar
  zIndex: 9999,
  display: "flex",
  width: "calc(100% - 240px - 32px)", // full width minus sidebar & padding
  overflowX: "auto",       // horizontal scroll
  gap: "18px",
  padding: "0 16px",       // some breathing room
  scrollbarWidth: "thin",  // Firefox
},

notificationRow: {
  display: "flex",
  gap: "22px",
  flexWrap: "nowrap",       // ensure side-by-side
},

// Optional: style scrollbar for Chrome, Edge, Safari
notificationWrapperScrollbar: `
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0,0,0,0.25);
    border-radius: 4px;
  }
`,


  notificationCard: {
    minWidth: "520px",
    maxWidth: "520px",
    background: "#ffffff",
    borderRadius: "18px",
    boxShadow: "0 30px 70px rgba(0,0,0,0.28)",
    overflow: "hidden",
    flexShrink: 0,
  },

  notificationHeader: {
    background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
    color: "#ffffff",
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
    alignItems: "center",
  },

  label: {
    minWidth: "90px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },

  value: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#1f2937",
  },

  routeBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "16px",
    background: "#f9fafb",
    padding: "16px",
    borderRadius: "12px",
    marginTop: "8px",
    alignItems: "center",
  },

  routeLabel: {
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: "6px",
    color: "#374151",
  },

  routeValue: {
    fontSize: "14px",
    color: "#111827",
    lineHeight: "1.5",
  },

  arrow: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#2563eb",
  },
};
