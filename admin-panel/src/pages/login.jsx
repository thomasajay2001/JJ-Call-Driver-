import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const Login = () => {
  const navigate = useNavigate();

  /* OTP Login state */
  const [phone,    setPhone]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [otpSent,  setOtpSent]  = useState(false);
  const [message,  setMessage]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  /* Timer */
  const RESEND_SECONDS = 30;
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    setTimer(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const clear = () => { setMessage(""); setError(""); };

  /* ─── Send OTP ─── */
  const sendOtp = async () => {
    clear();
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/send-otp`, { phone });
      if (res.data.success) {
        setOtpSent(true);
        startTimer();
        setMessage(res.data.otp ? `OTP: ${res.data.otp}` : "OTP sent to your mobile number!");
      } else {
        setError(res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Failed to send OTP. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Resend OTP ─── */
  const resendOtp = async () => {
    if (timer > 0) return;
    clear();
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/send-otp`, { phone });
      if (res.data.success) {
        setOtp("");
        startTimer();
        setMessage(res.data.otp ? `OTP: ${res.data.otp}` : "New OTP sent!");
      } else {
        setError(res.data.message || "Failed to resend OTP");
      }
    } catch {
      setError("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Verify OTP & Login ─── */
  const verifyOtp = async () => {
    clear();
    if (otp.length !== 6) {
      setError("Enter a valid 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/verify-otp`, { phone, otp });
      if (res.data.success) {
        if (timerRef.current) clearInterval(timerRef.current);
        /* Store admin credentials */
        localStorage.setItem("adminPhone", phone);
        localStorage.setItem("role", "support");
        navigate("/driver-dashboard");
      } else {
        setError(res.data.message || "Invalid OTP");
      }
    } catch (err) {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = () => {
    setOtpSent(false);
    setOtp("");
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clear();
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
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <p style={{ fontSize: 13, color: "#166534", fontWeight: 600, margin: 0 }}>{message}</p>
            </div>
          )}

          {!otpSent ? (
            /* ─── Phone Input ─── */
            <>
              <div className="login-field">
                <label className="login-label">Phone Number</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">📞</span>
                  <input
                    type="tel"
                    className="login-input"
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); clear(); }}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                className="login-btn"
                onClick={sendOtp}
                disabled={loading || phone.length !== 10}
                style={{ opacity: (loading || phone.length !== 10) ? 0.6 : 1 }}
              >
                {loading ? <span className="login-spinner" /> : "Send OTP"}
              </button>
            </>
          ) : (
            /* ─── OTP Verification ─── */
            <>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📞</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#1E40AF" }}>+91 {phone}</span>
                </div>
                <button
                  style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 600, textDecoration: "underline" }}
                  onClick={handleChangePhone}
                >
                  Change
                </button>
              </div>

              <div className="login-field">
                <label className="login-label">Enter OTP</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">🔐</span>
                  <input
                    type="tel"
                    className="login-input"
                    placeholder="6-digit OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clear(); }}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                className="login-btn"
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                style={{ opacity: (loading || otp.length !== 6) ? 0.6 : 1 }}
              >
                {loading ? <span className="login-spinner" /> : "Verify & Login"}
              </button>

              {/* Resend OTP */}
              <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#64748B" }}>
                {timer > 0 ? (
                  <>
                    <span>Resend OTP in </span>
                    <span style={{ fontWeight: 700, color: "#2563EB" }}>00:{String(timer).padStart(2, "0")}</span>
                  </>
                ) : (
                  <>
                    <span>Didn't receive OTP? </span>
                    <button
                      style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontWeight: 700 }}
                      onClick={resendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;