import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const Login = () => {
  const navigate = useNavigate();

  /* Username/Password Login state */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clear = () => { setMessage(""); setError(""); };

  /* ─── Login ─── */
  const login = async () => {
    clear();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/login`, { username: username.trim(), password: password.trim() });
      if (res.data.success) {
        /* Store admin credentials */
        localStorage.setItem("supportUsername", username.trim());
        localStorage.setItem("role", res.data.user?.role || "admin");
        navigate("/driver-dashboard");
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Login failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />
      <div className="login-bg-glow-2" />

      <div className="login-card">
        {/* Header */}
        <div className="login-card-header">
          <div className="login-card-icon">🚖</div>
          <h1 className="login-card-title">Admin Login</h1>
          <p className="login-card-subtitle">JJ Call Drivers — Control Panel</p>
        </div>

        {/* Form */}
        <div className="login-card-body">
          {error && (
            <div className="login-error">
              <span>⚠️</span>
              <p className="login-error-text">{error}</p>
            </div>
          )}

          {message && (
            <div className="login-success">
              <span>✓</span>
              <p className="login-success-text">{message}</p>
            </div>
          )}

          <div className="login-field">
            <label className="login-label">Username</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">👤</span>
              <input
                type="text"
                className="login-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clear(); }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clear(); }}
                disabled={loading}
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            className="login-btn"
            onClick={login}
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? <span className="login-spinner" /> : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;