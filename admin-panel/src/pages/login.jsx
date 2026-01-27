import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("adminLoggedIn", "true");
      navigate("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Admin Login</h2>
        <p style={styles.subtitle}>Welcome back 👋</p>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleLogin} style={styles.button}>
          Login
        </button>
      </div>
    </div>
  );
};

const styles = {
  page: {
    height: "100vh",
    background: "linear-gradient(135deg, #111827, #1f2933)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "15px",
  },

  card: {
    width: "100%",
    maxWidth: "340px",
    background: "#fff",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
    textAlign: "center",
  },

  title: {
    marginBottom: "5px",
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginBottom: "25px",
    fontSize: "14px",
    color: "#6b7280",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    outline: "none",
  },

  button: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "10px",
  },
};

export default Login;
