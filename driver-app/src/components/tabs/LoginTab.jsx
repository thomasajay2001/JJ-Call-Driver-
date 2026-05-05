import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL, DEFAULT_DRIVER_PASSWORD } from "../../utils/constants";

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
  const [driverPhone,      setDriverPhone]      = useState("");
  const [driverPassword,         setDriverPassword]         = useState("");
  const [driverResetMode,        setDriverResetMode]        = useState(false);
  const [driverCurrentPassword,  setDriverCurrentPassword]  = useState("");
  const [driverNewPassword,      setDriverNewPassword]      = useState("");
  const [driverConfirmPassword,  setDriverConfirmPassword]  = useState("");
  const [driverPreview,          setDriverPreview]          = useState(null);
  const [driverLookupLoading,    setDriverLookupLoading]    = useState(false);
  const [driverLookupError,      setDriverLookupError]      = useState("");
  const [showDriverPassword,     setShowDriverPassword]     = useState(false);
  const [showDriverCurrentPassword, setShowDriverCurrentPassword] = useState(false);
  const [showDriverNewPassword,  setShowDriverNewPassword]  = useState(false);
  const [showDriverConfirmPassword, setShowDriverConfirmPassword] = useState(false);

  useEffect(() => {
    if (driverPhone.length !== 10) {
      setDriverPreview(null);
      setDriverLookupError("");
      return;
    }

    let cancelled = false;
    const lookupDriver = async () => {
      setDriverLookupLoading(true);
      setDriverLookupError("");
      try {
        const res = await axios.get(`${BASE_URL}/api/drivers/lookup`, {
          params: { phone: driverPhone },
        });
        if (cancelled) return;
        if (res.data?.success) {
          setDriverPreview(res.data.driver);
        } else {
          setDriverPreview(null);
          setDriverLookupError(res.data?.message || "Driver not found");
        }
      } catch (err) {
        if (cancelled) return;
        setDriverPreview(null);
        setDriverLookupError(err.response?.data?.message || "Driver not found");
      } finally {
        if (!cancelled) setDriverLookupLoading(false);
      }
    };

    lookupDriver();
    return () => { cancelled = true; };
  }, [driverPhone]);

  /* Feedback */
  const [message,      setMessage]      = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* Timer */
  const RESEND_SECONDS = 30;
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const loginDriver = async () => {
    clear();
    if (driverPhone.length !== 10) { setErrorMessage("Please enter a valid 10-digit phone number"); return; }
    if (!driverPassword.trim()) { setErrorMessage("Please enter your password"); return; }
    try {
      const res = await axios.post(`${BASE_URL}/api/drivers/login`, { phone: driverPhone, password: driverPassword });
      if (res.data.success) {
        localStorage.setItem("role", "driver");
        localStorage.setItem("driverId", res.data.driver.id);
        localStorage.setItem("driverName", res.data.driver.name || "");
        onLogin && onLogin("driver");
      } else {
        setErrorMessage(res.data.message || "Invalid phone or password");
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Login failed. Check your connection.");
    }
  };

  const resetDriverPassword = async () => {
    clear();
    const normalizedPhone = String(driverPhone).replace(/\D/g, "");
    const newPassword = driverNewPassword.trim();
    const currentPassword = driverCurrentPassword.trim();

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit phone number");
      return;
    }
    if (!currentPassword) {
      setErrorMessage("Enter your current password");
      return;
    }
    if (!newPassword) {
      setErrorMessage("Enter your new password");
      return;
    }
    if (newPassword !== driverConfirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/drivers/change-password`, {
        phone: normalizedPhone,
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        clear();
        setDriverResetMode(false);
        setDriverCurrentPassword("");
        setDriverNewPassword("");
        setDriverConfirmPassword("");
        setMessage("Password updated successfully. Please login with your new password.");
      } else {
        setErrorMessage(res.data.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Change password error:", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || "Password update failed. Check your connection.");
    }
  };

  const handleChangePhone = () => {
    setOtpSent(false); setOtp(""); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clear();
  };

  const handleChangeDriverPhone = () => {
    setDriverPhone(""); setDriverCurrentPassword(""); setDriverNewPassword(""); setDriverConfirmPassword("");
    setDriverPreview(null);
    setDriverLookupError("");
    clear();
  };

  const switchToUser = () => {
    setLoginType("user"); setOtpSent(false); setOtp(""); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clear();
  };

  const switchToDriver = () => {
    setLoginType("driver");
    setDriverPhone("");
    setDriverPassword("");
    setDriverResetMode(false);
    setDriverCurrentPassword("");
    setDriverNewPassword("");
    setDriverConfirmPassword("");
    setDriverPreview(null);
    setDriverLookupError("");
    clear();
  };

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
            Customer Login
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
            {!driverResetMode ? (
              <>
                <label style={lbl}>Phone Number</label>
                <div style={inputWrap}>
                  <span>📞</span>
                  <input
                    style={inp}
                    placeholder="Enter phone number"
                    maxLength={10}
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
             
                <label style={lbl}>Password</label>
                <div style={{ ...inputWrap, position: "relative" }}>
                  <span>🔒</span>
                  <input
                    type={showDriverPassword ? "text" : "password"}
                    style={{ ...inp, paddingRight: 38 }}
                    placeholder="Enter your password"
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowDriverPassword((v) => !v)}
                  >
                    {showDriverPassword ? "" : "👁️"}
                  </button>
                </div>
                <button style={styles.primaryBtn} onClick={loginDriver}>Login</button>
                
              </>
            ) : (
              <>
                <label style={lbl}>Phone Number</label>
                <div style={inputWrap}>
                  <span>📞</span>
                  <input
                    style={inp}
                    placeholder="Enter phone number"
                    maxLength={10}
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <label style={lbl}>Current Password</label>
                <div style={{ ...inputWrap, position: "relative" }}>
                  <span>🔐</span>
                  <input
                    type={showDriverCurrentPassword ? "text" : "password"}
                    style={{ ...inp, paddingRight: 38 }}
                    placeholder="Enter current password"
                    value={driverCurrentPassword}
                    onChange={(e) => setDriverCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowDriverCurrentPassword((v) => !v)}
                  >
                    {showDriverCurrentPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <label style={lbl}>New Password</label>
                <div style={{ ...inputWrap, position: "relative" }}>
                  <span>🔑</span>
                  <input
                    type={showDriverNewPassword ? "text" : "password"}
                    style={{ ...inp, paddingRight: 38 }}
                    placeholder="Enter new password"
                    value={driverNewPassword}
                    onChange={(e) => setDriverNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowDriverNewPassword((v) => !v)}
                  >
                    {showDriverNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <label style={lbl}>Confirm Password</label>
                <div style={{ ...inputWrap, position: "relative" }}>
                  <span>🔑</span>
                  <input
                    type={showDriverConfirmPassword ? "text" : "password"}
                    style={{ ...inp, paddingRight: 38 }}
                    placeholder="Confirm new password"
                    value={driverConfirmPassword}
                    onChange={(e) => setDriverConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowDriverConfirmPassword((v) => !v)}
                  >
                    {showDriverConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button style={styles.successBtn} onClick={resetDriverPassword}>Reset Password</button>
                <button style={{ ...styles.resendLink, width: "100%", textAlign: "center", marginTop: 10 }} onClick={() => { setDriverResetMode(false); clear(); }}>
                  Back to login
                </button>
              </>
            )}
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
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "none",
    color: "#475569",
    fontSize: 18,
    cursor: "pointer",
    padding: 4,
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
  hintMsg:    { color: "#334155", textAlign: "left", marginTop: 8, marginBottom: 0, fontSize: 13, lineHeight: 1.4 },
  footer: { textAlign: "center", marginTop: 16, color: "#666", fontSize: 12 },
  driverPreviewCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    marginBottom: 10,
    border: "1px solid #D1D5DB",
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    backgroundColor: "#2563EB",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
  },
  driverName: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
  },
  driverSubtitle: {
    margin: 0,
    fontSize: 13,
    color: "#475569",
  },
};
