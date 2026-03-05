import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const NAV_ITEMS = [
  { path: "/dashboard",        label: "Dashboard", icon: "📊" },
  { path: "/booking",          label: "Bookings",  icon: "📋" },
  { path: "/driver-dashboard", label: "Drivers",   icon: "🚗" },
  {path:"/driver-status",label:"Driver Status"}
];

const AdminLayout = () => {
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);

  /* profile form state */
  const [newUsername,  setNewUsername]  = useState("");
  const [currentPass,  setCurrentPass]  = useState("");
  const [newPass,      setNewPass]      = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [profileMsg,   setProfileMsg]   = useState({ type: "", text: "" });
  const [formErrors,   setFormErrors]   = useState({});

  const location    = useLocation();
  const navigate    = useNavigate();
  const dropdownRef = useRef(null);

  const username  = localStorage.getItem("supportUsername") || "Admin";
  const supportId = localStorage.getItem("supportId");

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const closeMenu = () => setSidebarOpen(false);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const openProfile = () => {
    setDropdownOpen(false);
    setNewUsername(username);
    setCurrentPass(""); setNewPass(""); setConfirmPass("");
    setProfileMsg({ type: "", text: "" });
    setFormErrors({});
    setShowProfile(true);
  };

  const validate = () => {
    const e = {};
    if (!newUsername.trim() || newUsername.trim().length < 3)
      e.username = "Username must be at least 3 characters";
    if (!currentPass.trim())
      e.currentPass = "Current password is required to save changes";
    if (newPass && newPass.length < 6)
      e.newPass = "New password must be at least 6 characters";
    if (newPass && newPass !== confirmPass)
      e.confirmPass = "Passwords do not match";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const payload = {
        id:              supportId,
        username:        newUsername.trim(),
        currentPassword: currentPass,
      };
      if (newPass) payload.newPassword = newPass;

      const res = await axios.put(`${BASE_URL}/api/admin/update-profile`, payload);

      if (res.data.success) {
        localStorage.setItem("supportUsername", newUsername.trim());
        setProfileMsg({ type: "success", text: "Profile updated successfully!" });
        setTimeout(() => setShowProfile(false), 1400);
      } else {
        setProfileMsg({ type: "error", text: res.data.message || "Update failed" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Network error. Please try again.";
      setProfileMsg({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  /* password strength */
  const passStrength =
    newPass.length === 0  ? null :
    newPass.length < 6    ? "weak" :
    newPass.length < 10   ? "medium" : "strong";
  const passStrengthWidth =
    passStrength === "weak"   ? "33%" :
    passStrength === "medium" ? "66%" :
    passStrength === "strong" ? "100%" : "0%";

  return (
    <div className="admin-layout">

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚖</div>
          JJ CallDrivers
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>

          {NAV_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`sidebar-link${location.pathname === item.path ? " active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
                closeMenu();
              }}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-text">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-profile-btn" onClick={openProfile}>
            <span>👤</span> Edit Profile
          </button>
          <button className="sidebar-logout" onClick={logout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={closeMenu} />
      )}

      {/* ── Main area ── */}
      <div className="admin-main">

        {/* Navbar */}
        <header className="navbar">
          <button className="menu-btn" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? "✕" : "☰"}
          </button>

          <div className="navbar-brand">
            <div className="navbar-brand-icon">🚖</div>
            JJ Call Drivers
          </div>

          <div className="navbar-spacer" />

          {/* User dropdown */}
          <div className="navbar-user-wrap" ref={dropdownRef}>
            <button
              className="navbar-user"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <div className="navbar-avatar">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="navbar-user-name">{username}</span>
              <span className="navbar-caret">{dropdownOpen ? "▲" : "▼"}</span>
            </button>

            {dropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="profile-dropdown-name">{username}</p>
                    <p className="profile-dropdown-role">Administrator</p>
                  </div>
                </div>
                <div className="profile-dropdown-divider" />
                <button className="profile-dropdown-item" onClick={openProfile}>
                  <span>✏️</span> Edit Profile
                </button>
                <div className="profile-dropdown-divider" />
                <button className="profile-dropdown-item profile-dropdown-logout" onClick={logout}>
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* ══════════════════════════════
          EDIT PROFILE MODAL
      ══════════════════════════════ */}
      {showProfile && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize: 24 }}>👤</span>
                <span className="modal-title">Edit Profile</span>
              </div>
              <button className="modal-close" onClick={() => setShowProfile(false)}>✕</button>
            </div>

            <div className="modal-body">

              {profileMsg.text && (
                <div className={`profile-msg profile-msg-${profileMsg.type}`}>
                  <span>{profileMsg.type === "success" ? "✅" : "⚠️"}</span>
                  <span>{profileMsg.text}</span>
                </div>
              )}

              {/* Username */}
              <div className="form-field profile-field">
                <label className="form-label">
                  Username <span className="form-required">*</span>
                </label>
                <input
                  className={`form-input${formErrors.username ? " form-input-error" : ""}`}
                  placeholder="Enter new username"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    setFormErrors((p) => ({ ...p, username: "" }));
                  }}
                />
                {formErrors.username && <span className="form-error">⚠ {formErrors.username}</span>}
              </div>

              <div className="profile-section-divider">
                <span className="profile-section-label">Change Password</span>
              </div>
              <p className="profile-hint">Leave new password blank to keep it unchanged</p>

              {/* Current password */}
              <div className="form-field profile-field">
                <label className="form-label">
                  Current Password <span className="form-required">*</span>
                </label>
                <div className={`profile-input-wrap${formErrors.currentPass ? " profile-input-wrap-error" : ""}`}>
                  <span className="profile-input-icon">🔒</span>
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="profile-pass-input"
                    placeholder="Enter current password"
                    value={currentPass}
                    onChange={(e) => {
                      setCurrentPass(e.target.value);
                      setFormErrors((p) => ({ ...p, currentPass: "" }));
                    }}
                  />
                  <button type="button" className="profile-eye-btn" onClick={() => setShowCurrent((v) => !v)}>
                    {showCurrent ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {formErrors.currentPass && <span className="form-error">⚠ {formErrors.currentPass}</span>}
              </div>

              {/* New password */}
              <div className="form-field profile-field">
                <label className="form-label">New Password</label>
                <div className={`profile-input-wrap${formErrors.newPass ? " profile-input-wrap-error" : ""}`}>
                  <span className="profile-input-icon">🔑</span>
                  <input
                    type={showNew ? "text" : "password"}
                    className="profile-pass-input"
                    placeholder="Min 6 characters"
                    value={newPass}
                    onChange={(e) => {
                      setNewPass(e.target.value);
                      setFormErrors((p) => ({ ...p, newPass: "", confirmPass: "" }));
                    }}
                  />
                  <button type="button" className="profile-eye-btn" onClick={() => setShowNew((v) => !v)}>
                    {showNew ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {formErrors.newPass && <span className="form-error">⚠ {formErrors.newPass}</span>}
                {passStrength && (
                  <div className="pass-strength-bar">
                    <div
                      className={`pass-strength-fill pass-strength-${passStrength}`}
                      style={{ width: passStrengthWidth }}
                    />
                    <span className={`pass-strength-label pass-strength-label-${passStrength}`}>
                      {passStrength.charAt(0).toUpperCase() + passStrength.slice(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="form-field">
                <label className="form-label">Confirm New Password</label>
                <div className={`profile-input-wrap${formErrors.confirmPass ? " profile-input-wrap-error" : ""}`}>
                  <span className="profile-input-icon">✅</span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="profile-pass-input"
                    placeholder="Re-enter new password"
                    value={confirmPass}
                    onChange={(e) => {
                      setConfirmPass(e.target.value);
                      setFormErrors((p) => ({ ...p, confirmPass: "" }));
                    }}
                  />
                  <button type="button" className="profile-eye-btn" onClick={() => setShowConfirm((v) => !v)}>
                    {showConfirm ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {formErrors.confirmPass && <span className="form-error">⚠ {formErrors.confirmPass}</span>}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowProfile(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;