import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://13.60.174.204:3000";

export default function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const adminUsername = localStorage.getItem("supportUsername") || "Admin";

  /* ── Handle Change Password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (newPassword.length < 4) {
      setError("New password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/api/support/update-credentials`,
        {
          username: adminUsername,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        },
      );

      if (response.data.success) {
        setSuccess("✅ Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setSuccess("");
        }, 2000);
      } else {
        setError(response.data.message || "Failed to change password");
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || "Failed to change password");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle Logout ── */
  const handleLogout = () => {
    setShowLogoutModal(true);
    setShowDropdown(false);
  };
  const confirmLogout = () => {
    // 1️⃣ Navigate first
    navigate("/", { replace: true });

    // 2️⃣ Then clear storage
    localStorage.removeItem("supportId");
    localStorage.removeItem("supportUsername");
    localStorage.removeItem("role");

    // 3️⃣ Then notify parent
    if (onLogout) {
      onLogout();
    }
  };
  return (
    <>
      <div style={styles.navbar}>
        <div style={styles.right}>
          <div style={styles.profileContainer}>
            <button
              style={styles.profileBtn}
              onClick={() => setShowDropdown(!showDropdown)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            >
              <span style={styles.profileIcon}>👤</span>
              <span style={styles.profileName}>{adminUsername}</span>
              <span style={styles.dropdownArrow}>
                {showDropdown ? "▲" : "▼"}
              </span>
            </button>

            {showDropdown && (
              <div style={styles.dropdown}>
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    setShowPasswordModal(true);
                    setShowDropdown(false);
                    setError("");
                    setSuccess("");
                  }}
                >
                  🔑 Change Password
                </button>

                <div style={styles.dropdownDivider} />

                <button
                  style={{ ...styles.dropdownItem, ...styles.dropdownLogout }}
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {showPasswordModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowPasswordModal(false)}
        >
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div style={styles.modalIconBox}>
                <span style={{ fontSize: "28px" }}>🔑</span>
              </div>
              <h2 style={styles.modalTitle}>Change Password</h2>
              <p style={styles.modalSubtitle}>Update your account password</p>
              <button
                style={styles.modalClose}
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form style={styles.modalForm} onSubmit={handleChangePassword}>
              {error && (
                <div style={styles.errorBox}>
                  <span style={styles.errorIcon}>⚠️</span>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {success && (
                <div style={styles.successBox}>
                  <p style={styles.successText}>{success}</p>
                </div>
              )}

              {/* Current Password */}
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Current Password</label>
                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showCurrentPwd ? "text" : "password"}
                    style={styles.input}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  >
                    <span style={styles.eyeIcon}>
                      {showCurrentPwd ? "👁️" : "👁️‍🗨️"}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={styles.inputWrapper}>
                <label style={styles.label}>New Password</label>
                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>✏️</span>
                  <input
                    type={showNewPwd ? "text" : "password"}
                    style={styles.input}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowNewPwd(!showNewPwd)}
                  >
                    <span style={styles.eyeIcon}>
                      {showNewPwd ? "👁️" : "👁️‍🗨️"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Confirm New Password</label>
                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>✔️</span>
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    style={styles.input}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  >
                    <span style={styles.eyeIcon}>
                      {showConfirmPwd ? "👁️" : "👁️‍🗨️"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div style={styles.modalBtnRow}>
                <button
                  type="button"
                  style={styles.modalCancelBtn}
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.modalSaveBtn,
                    ...(loading && styles.modalSaveBtnDisabled),
                  }}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowLogoutModal(false)}
        >
          <div style={styles.logoutModal} onClick={(e) => e.stopPropagation()}>
            {/* Icon */}
            <div style={styles.logoutIconWrapper}>
              <span style={styles.logoutIcon}>🚪</span>
            </div>

            {/* Content */}
            <h2 style={styles.logoutTitle}>Logout</h2>
            <p style={styles.logoutMessage}>Are you sure you want to logout?</p>

            {/* Buttons */}
            <div style={styles.logoutBtnRow}>
              <button
                style={styles.logoutCancelBtn}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button style={styles.logoutConfirmBtn} onClick={confirmLogout}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  navbar: {
    height: "60px",
    background: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    padding: "0 25px",
    position: "fixed",
    top: 0,
    left: "280px", // sidebar width
    right: 0,
    zIndex: 1000,
  },

  logo: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: "1px",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginLeft: "auto", // ✅ pushes admin button to right end
  },

  /* ── Profile Dropdown ── */
  profileContainer: {
    position: "relative",
  },

  profileBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(37, 99, 235, 0.15)",
    border: "1px solid rgba(37, 99, 235, 0.3)",
    color: "#cbd5e1",
    padding: "8px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: "500",
    fontSize: "14px",
  },

  profileIcon: {
    fontSize: "16px",
  },

  profileName: {
    fontWeight: "600",
    color: "#fff",
  },

  dropdownArrow: {
    fontSize: "10px",
    marginLeft: "4px",
    color: "#94a3b8",
  },

  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "#1f2937",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    minWidth: "200px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
    zIndex: 9999,
  },

  dropdownItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
  },

  dropdownIcon: {
    fontSize: "16px",
  },

  dropdownDivider: {
    height: "1px",
    background: "rgba(255,255,255,0.1)",
    margin: "4px 0",
  },

  dropdownLogout: {
    color: "#f87171",
  },

  /* ── Modal ── */
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "16px",
  },

  modalCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },

  modalHeader: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    padding: "28px 24px",
    textAlign: "center",
    color: "#fff",
    position: "relative",
  },

  modalIconBox: {
    width: "56px",
    height: "56px",
    margin: "0 auto 12px",
    background: "rgba(255,255,255,0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid rgba(255,255,255,0.3)",
  },

  modalTitle: {
    fontSize: "22px",
    fontWeight: "800",
    margin: "0 0 6px 0",
  },

  modalSubtitle: {
    fontSize: "13px",
    margin: "0",
    opacity: "0.9",
  },

  modalClose: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "#fff",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700",
    transition: "all 0.2s ease",
  },

  modalForm: {
    padding: "24px",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    background: "#fee",
    border: "1px solid #fcc",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  errorIcon: {
    fontSize: "18px",
  },

  errorText: {
    margin: "0",
    color: "#c33",
    fontSize: "13px",
    fontWeight: "500",
  },

  successBox: {
    padding: "12px 14px",
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "10px",
    marginBottom: "16px",
    textAlign: "center",
  },

  successText: {
    margin: "0",
    color: "#15803d",
    fontSize: "14px",
    fontWeight: "600",
  },

  inputWrapper: {
    marginBottom: "16px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "6px",
  },

  inputContainer: {
    display: "flex",
    alignItems: "center",
    background: "#f9fafb",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    padding: "0 12px",
    transition: "all 0.2s ease",
  },

  inputIcon: {
    fontSize: "18px",
    marginRight: "10px",
  },

  input: {
    flex: "1",
    border: "none",
    outline: "none",
    padding: "12px 0",
    fontSize: "14px",
    color: "#111827",
    background: "transparent",
    fontWeight: "500",
  },

  eyeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px",
  },

  eyeIcon: {
    fontSize: "18px",
  },

  modalBtnRow: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
  },

  modalCancelBtn: {
    flex: "1",
    padding: "14px",
    background: "#fff",
    color: "#6b7280",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },

  modalSaveBtn: {
    flex: "1",
    padding: "14px",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
    transition: "all 0.2s ease",
  },

  modalSaveBtnDisabled: {
    opacity: "0.6",
    cursor: "not-allowed",
  },

  /* ── Logout Modal ── */
  logoutModal: {
    background: "#fff",
    borderRadius: "20px",
    padding: "36px 32px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
    textAlign: "center",
  },

  logoutIconWrapper: {
    width: "72px",
    height: "72px",
    margin: "0 auto 20px",
    background: "#fee2e2",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutIcon: {
    fontSize: "36px",
  },

  logoutTitle: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#1e293b",
    margin: "0 0 12px 0",
  },

  logoutMessage: {
    fontSize: "15px",
    color: "#64748b",
    margin: "0 0 24px 0",
    lineHeight: "1.5",
  },

  logoutBtnRow: {
    display: "flex",
    gap: "12px",
  },

  logoutCancelBtn: {
    flex: "1",
    padding: "14px",
    background: "#fff",
    color: "#6b7280",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },

  logoutConfirmBtn: {
    flex: "1",
    padding: "14px",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)",
    transition: "all 0.2s ease",
  },
};
