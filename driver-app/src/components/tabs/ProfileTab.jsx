import React, { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ═══════════════════════════════════════════
   ProfileTab — Driver or Customer profile
   ═══════════════════════════════════════════ */
const ProfileTab = () => {
  const [profile, setProfile]      = useState(null);
  const [cust,    setCust]         = useState(null);
  const [role,    setRole]         = useState(null);
  const [loading, setLoading]      = useState(true);
  const [avgRating, setAvgRating]  = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  /* Edit name */
  const [showEditName, setShowEditName] = useState(false);
  const [tempName,     setTempName]     = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
    fetchProfile(storedRole);
    if (storedRole === "driver") fetchDriverRating();
  }, []);

  const fetchDriverRating = async () => {
    try {
      const driverId = localStorage.getItem("driverId");
      const res = await axios.get(`${BASE_URL}/api/driver-rating/${driverId}`);
      setAvgRating(Number(res.data?.avg_rating) || 0);
      setTotalRatings(Number(res.data?.total_ratings) || 0);
    } catch {}
  };

  const fetchProfile = async (storedRole) => {
    try {
      const driverId = localStorage.getItem("driverId");
      const phone    = localStorage.getItem("customerPhone");

      if (storedRole === "driver" && driverId) {
        const res = await axios.get(`${BASE_URL}/api/drivers/profile?driverId=${driverId}`);
        setProfile(res.data[0] || null);
      }
      if (storedRole === "customer" && phone) {
        const res = await axios.get(`${BASE_URL}/api/customers/profile?phone=${phone}`);
        setCust(res.data[0] || null);
      }
    } catch (err) {
      console.warn("Profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) { alert("Please enter a valid name"); return; }
    try {
      const phone = localStorage.getItem("customerPhone");
      await axios.put(`${BASE_URL}/api/customers/update-name`, {
        phone,
        name: tempName.trim(),
      });
      setCust({ ...cust, NAME: tempName.trim() });
      setShowEditName(false);
      alert("Name updated successfully");
    } catch {
      alert("Failed to update name");
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: "#F6B100", marginTop: 12 }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* ── Edit Name Modal ── */}
      {showEditName && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={modalTitle}>Edit Name</h3>
            <input
              style={input}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
            />
            <div style={modalBtns}>
              <button style={cancelBtn} onClick={() => setShowEditName(false)}>Cancel</button>
              <button style={saveBtn} onClick={handleSaveName}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRIVER PROFILE ─── */}
      {role === "driver" && profile && (
        <>
          {/* Avatar card */}
          <div style={styles.profileCard}>
            <div style={styles.avatar}>
              <span style={styles.avatarText}>{profile.NAME?.charAt(0) || "D"}</span>
            </div>
            <h2 style={styles.name}>{profile.NAME}</h2>
            <span style={styles.roleBadge}>🚗 Driver</span>
            {/* Star rating */}
            <div style={styles.starRow}>
              {[1,2,3,4,5].map((s) => (
                <span key={s} style={{ fontSize: 20 }}>
                  {s <= Math.round(avgRating) ? "⭐" : "☆"}
                </span>
              ))}
              <span style={styles.ratingText}>
                {avgRating.toFixed(1)} ({totalRatings})
              </span>
            </div>
          </div>

          {/* Info cards */}
          <InfoCard label="📞 Mobile"      value={profile.MOBILE} />
          <InfoCard label="🩸 Blood Group" value={profile.BLOODGRP || "—"} />
          <InfoCard label="🪪 Licence No"  value={profile.LICENCENO || "—"} />

          {/* Rides */}
          <div style={styles.ridesCard}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>My Rides</h3>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#2563EB" }}>
              {profile.total_rides || 0}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>rides completed</p>
          </div>
        </>
      )}

      {/* ─── CUSTOMER PROFILE ─── */}
      {role === "customer" && (
        <>
          <div style={styles.profileCard}>
            <div style={{ ...styles.avatar, backgroundColor: "#72bafd" }}>
              <span style={{ fontSize: 32 }}>👤</span>
            </div>

            {/* Editable name */}
            <button
              style={styles.nameBtn}
              onClick={() => { setTempName(cust?.NAME || ""); setShowEditName(true); }}
            >
              <span style={styles.name}>{cust?.NAME || cust?.PHONE}</span>
              <span style={{ fontSize: 14, opacity: 0.6 }}>✏️</span>
            </button>

            <span style={{ ...styles.roleBadge, backgroundColor: "#D1FAE5", color: "#065F46" }}>
              👤 Customer
            </span>
          </div>

          <InfoCard label="📞 Mobile" value={cust?.PHONE} />
        </>
      )}

      {/* Fallback */}
      {!profile && !cust && (
        <div style={styles.center}>
          <span style={{ fontSize: 48 }}>🔍</span>
          <p style={{ fontWeight: 700, color: "#1E293B" }}>No profile data found</p>
        </div>
      )}
    </div>
  );
};

/* ── InfoCard sub-component ── */
const InfoCard = ({ label, value }) => (
  <div style={infoCard}>
    <p style={infoLabel}>{label}</p>
    <p style={infoValue}>{value || "—"}</p>
  </div>
);

export default ProfileTab;

/* ─────── Styles ─────── */
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
    padding: 16,
    minHeight: "100vh",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50vh",
    textAlign: "center",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #fde68a",
    borderTopColor: "#F6B100",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 20px",
    marginBottom: 16,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    backgroundColor: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, color: "#fff", fontWeight: 700 },
  nameBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 14px",
    borderRadius: 8,
  },
  name: { fontSize: 20, fontWeight: 700, color: "#1E293B" },
  roleBadge: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    padding: "4px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  starRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: 600,
    color: "#333",
  },
  ridesCard: {
    backgroundColor: "#c8e4fe",
    borderRadius: 18,
    padding: 20,
    textAlign: "center",
    marginBottom: 16,
  },
};

const infoCard = {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: "14px 16px",
  marginBottom: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
};
const infoLabel = { margin: "0 0 6px", fontSize: 13, color: "#888", letterSpacing: 0.5 };
const infoValue = { margin: 0, fontSize: 16, fontWeight: 700, color: "#222" };

/* Edit modal */
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};
const modalBox = {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 24,
  width: "100%",
  maxWidth: 360,
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
};
const modalTitle = { margin: "0 0 16px", fontSize: 20, fontWeight: 700, textAlign: "center", color: "#222" };
const input = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #DDD",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 16,
  marginBottom: 20,
  color: "#222",
  outline: "none",
};
const modalBtns = { display: "flex", gap: 12 };
const cancelBtn = {
  flex: 1,
  padding: 14,
  borderRadius: 12,
  backgroundColor: "#F0F0F0",
  border: "none",
  color: "#666",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};
const saveBtn = {
  flex: 1,
  padding: 14,
  borderRadius: 12,
  backgroundColor: "#72bafd",
  border: "none",
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};
