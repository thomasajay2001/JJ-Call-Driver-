import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const Login = () => {
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/login`, {
        username: username.trim(),
        password: password.trim(),
      });
      if (res.data.success) {
        localStorage.setItem("supportId",       res.data.user.ID.toString());
        localStorage.setItem("supportUsername", res.data.user.USERNAME);
        localStorage.setItem("role",            "support");
        navigate("/driver-dashboard");
      } else {
        setError(res.data.message || "Invalid username or password");
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || err.response.data?.error || "Login failed");
      } else {
        setError("Network error. Please try again.");
      }
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
          <form onSubmit={handleLogin}>
            {error && (
              <div className="login-error">
                <span>⚠️</span>
                <p className="login-error-text">{error}</p>
              </div>
            )}

            {/* Username */}
            <div className="login-field">
              <label className="login-label">Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">👤</span>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? <span className="login-spinner" /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;