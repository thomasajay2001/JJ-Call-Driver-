import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ═══════════════════════════════════════════
   LoginTab — User OTP login + Driver ID login
   ═══════════════════════════════════════════ */
const LoginTab = ({ onLogin }) => {
  const [loginType, setLoginType] = useState("user");

  /* User login */
  const [phone,    setPhone]    = useState("");
  const [otp,     setOtp]      = useState("");
  const [otpSent, setOtpSent]  = useState(false);

  /* Driver login */
  const [driverId,     setDriverId]     = useState("");
  const [driverPhone,  setDriverPhone]  = useState("");

  /* Feedback */
  const [message,      setMessage]      = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  const clear = () => { setMessage(""); setErrorMessage(""); };

  /* ─── User OTP ─── */
  const sendOtp = async () => {
    clear();
    if (phone.length !== 10) { setErrorMessage("Please enter a valid 10-digit phone number"); return; }
    try {
      const res = await axios.post(`${BASE_URL}/api/send-otp`, { phone });
      if (res.data.success) {
        setOtpSent(true);
        startTimer();
        setMessage(res.data.otp ? `OTP: ${res.data.otp}` : "OTP sent to your mobile number!");
      } else {
        setErrorMessage(res.data.message || "Failed to send OTP");
      }
    } catch {
      setErrorMessage("Failed to send OTP. Check your connection.");
    }
  };

  const resendOtp = async () => {
    if (timer > 0) return;
    clear();
    try {
      const res = await axios.post(`${BASE_URL}/api/send-otp`, { phone });
      if (res.data.success) {
        setOtp(""); startTimer();
        setMessage(res.data.otp ? `OTP: ${res.data.otp}` : "New OTP sent!");
      } else {
        setErrorMessage(res.data.message || "Failed to resend OTP");
      }
    } catch { setErrorMessage("Failed to resend OTP"); }
  };

  const verifyOtp = async () => {
    clear();
    if (otp.length !== 6) { setErrorMessage("Enter a valid 6-digit OTP"); return; }
    try {
      const res = await axios.post(`${BASE_URL}/api/verify-otp`, { phone, otp });
      if (res.data.success) {
        if (timerRef.current) clearInterval(timerRef.current);
       // After OTP verified successfully:
localStorage.setItem("customerPhone", phone); // ← must match exactly
localStorage.setItem("role", "customer");
        onLogin && onLogin("customer");
      } else {
        setErrorMessage(res.data.message || "Invalid OTP");
      }
    } catch { setErrorMessage("Verification failed"); }
  };

  /* ─── Driver Login ─── */
  const driverLogin = async () => {
    clear();
    if (!driverId.trim())        { setErrorMessage("Enter Driver ID"); return; }
    if (driverPhone.length !== 10) { setErrorMessage("Enter 10-digit phone number"); return; }
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const list = res.data || [];
      const driver = list.find((d) => String(d.id) === String(driverId.trim()));
      if (!driver) { setErrorMessage("Driver ID not found"); return; }
      if (String(driver.mobile) !== String(driverPhone)) { setErrorMessage("Phone number does not match"); return; }
      localStorage.setItem("role",       "driver");
      localStorage.setItem("driverId",   driverId);
      localStorage.setItem("driverName", driver.name || driver.NAME || "");
      onLogin && onLogin("driver");
    } catch { setErrorMessage("Failed to login driver"); }
  };

  const handleChangePhone = () => {
    setOtpSent(false); setOtp(""); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clear();
  };

  const switchToUser = () => {
    setLoginType("user"); setOtpSent(false); setOtp(""); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clear();
  };

  const switchToDriver = () => { setLoginType("driver"); setDriverId(""); setDriverPhone(""); clear(); };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>👤</div>
        <h1 style={styles.appName}>JJ Call Driver</h1>

        {/* Toggle */}
        <div style={styles.toggleRow}>
          <button
            style={{ ...styles.toggleBtn, ...(loginType === "user" ? styles.toggleActive : {}) }}
            onClick={switchToUser}
          >
            User Login
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(loginType === "driver" ? styles.toggleActive : {}) }}
            onClick={switchToDriver}
          >
            Driver Login
          </button>
        </div>

        {/* ── USER LOGIN ── */}
        {loginType === "user" && (
          <>
            {!otpSent ? (
              <>
                <label style={lbl}>Phone Number</label>
                <div style={inputWrap}>
                  <span>📞</span>
                  <input
                    style={inp}
                    placeholder="Enter phone number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <button style={styles.primaryBtn} onClick={sendOtp}>Send OTP</button>
              </>
            ) : (
              <>
                {/* Phone display */}
                <div style={styles.phoneRow}>
                  <span>📞</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#333" }}>+91 {phone}</span>
                  <button style={styles.changeLink} onClick={handleChangePhone}>Change</button>
                </div>

                <label style={lbl}>Enter OTP</label>
                <div style={inputWrap}>
                  <span>🔒</span>
                  <input
                    style={inp}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <button style={styles.successBtn} onClick={verifyOtp}>Verify & Login</button>

                {/* Resend */}
                <div style={styles.resendRow}>
                  {timer > 0 ? (
                    <>
                      <span style={styles.resendLabel}>Resend OTP in </span>
                      <span style={styles.timerBadge}>00:{String(timer).padStart(2, "0")}</span>
                    </>
                  ) : (
                    <>
                      <span style={styles.resendLabel}>Didn't receive? </span>
                      <button style={styles.resendLink} onClick={resendOtp}>Resend OTP</button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── DRIVER LOGIN ── */}
        {loginType === "driver" && (
          <>
            <label style={lbl}>Driver ID</label>
            <div style={inputWrap}>
              <span>🪪</span>
              <input
                style={inp}
                placeholder="Enter Driver ID"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              />
            </div>
            <label style={lbl}>Phone Number</label>
            <div style={inputWrap}>
              <span>📞</span>
              <input
                style={inp}
                placeholder="10-digit number"
                maxLength={10}
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button style={styles.successBtn} onClick={driverLogin}>Login as Driver</button>
          </>
        )}

        {message      && <p style={styles.successMsg}>{message}</p>}
        {errorMessage && <p style={styles.errorMsg}>{errorMessage}</p>}

        <p style={styles.footer}>By continuing, you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
};

export default LoginTab;

const lbl      = { display: "block", fontWeight: 600, fontSize: 13, color: "#444", margin: "12px 0 5px" };
const inputWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "1.5px solid #bbb",
  borderRadius: 10,
  padding: "0 12px",
  marginBottom: 6,
  backgroundColor: "#fafafa",
};
const inp = {
  flex: 1,
  border: "none",
  outline: "none",
  height: 46,
  fontSize: 15,
  backgroundColor: "transparent",
  color: "#1E293B",
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FA",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
    margin: "0 auto 12px",
  },
  appName: {
    margin: "0 0 20px",
    fontSize: 22,
    fontWeight: 800,
    textAlign: "center",
    color: "#1E293B",
  },
  toggleRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#ddd",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    color: "#000",
    transition: "all 0.2s",
  },
  toggleActive: {
    backgroundColor: "#007bff",
    color: "#fff",
  },
  primaryBtn: {
    width: "100%",
    padding: "13px 0",
    backgroundColor: "#007bff",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 10,
  },
  successBtn: {
    width: "100%",
    padding: "13px 0",
    backgroundColor: "green",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 10,
  },
  phoneRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F4FF",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 4,
  },
  changeLink: {
    background: "none",
    border: "none",
    color: "#007bff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  resendRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 14,
    flexWrap: "wrap",
  },
  resendLabel: { fontSize: 13, color: "#555" },
  timerBadge: {
    backgroundColor: "#FFF3CD",
    padding: "3px 10px",
    borderRadius: 20,
    border: "1px solid #F59E0B",
    fontSize: 13,
    fontWeight: 800,
    color: "#92400E",
  },
  resendLink: {
    background: "none",
    border: "none",
    color: "#007bff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  successMsg: { color: "green",  textAlign: "center", marginTop: 10, fontSize: 14 },
  errorMsg:   { color: "red",    textAlign: "center", marginTop: 10, fontSize: 14 },
  footer: { textAlign: "center", marginTop: 16, color: "#666", fontSize: 12 },
};
