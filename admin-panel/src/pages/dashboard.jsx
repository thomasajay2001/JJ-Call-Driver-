import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/sidebar";

export default function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/");
  };

  return (
    <div>
      <Sidebar onLogout={logout} />
      <Navbar onLogout={logout} />

      <div style={styles.content}>
        <h2>Welcome Admin 👋</h2>

        <div style={styles.cards}>
          <div style={styles.card}>
            <p>Total Bookings</p>
            <h3>120</h3>
          </div>

          <div style={styles.card}>
            <p>Active Drivers</p>
            <h3>35</h3>
          </div>

          <div style={styles.card}>
            <p>Live Trips</p>
            <h3>8</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
const styles = {
  content: {
    marginLeft: "240px",
    padding: "100px 30px 30px",
    background: "#f3f4f6",
    minHeight: "100vh",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginTop: "30px",
  },

  card: {
    background: "#fff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
};
