import axios from "axios";
import { useEffect, useRef, useState } from "react";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const REFRESH_MS = 30000;

/* ═══════════════════════════════════════════
   Booking Management — Admin Panel

   FLOW:
   1. Customer submits booking → status="pending", driver=null
   2. Admin sees it here in the table
   3. Admin opens "Assign" modal, picks a driver from the dropdown
      (dropdown only shows drivers who are ONLINE + payactive="Active")
   4. Admin clicks "Assign Driver" → booking gets driver=<driverId>, status="assigned"
   5. That specific driver's app polls and sees ONLY their assigned ride
   ═══════════════════════════════════════════ */
const Booking = () => {
  const [bookings, setBookings] = useState([]);
  const [drivers,  setDrivers]  = useState([]);   // only online+active drivers for dropdown
  const [search,   setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  /* Read-only booking fields shown in modal */
  const [name,   setName]   = useState("");
  const [mobile, setMobile] = useState("");
  const [pickup, setPickup] = useState("");
  const [drop,   setDrop]   = useState("");

  /* Editable fields */
  const [status,   setStatus]   = useState("pending");
  const [driver,   setDriver]   = useState("");
  const [saving,   setSaving]   = useState(false);

  /* ── Auto-refresh ── */
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(REFRESH_MS / 1000);
  const intervalRef  = useRef(null);
  const countdownRef = useRef(REFRESH_MS / 1000);

  const fetchAll = async () => {
    await Promise.all([fetchBookings(), fetchDrivers()]);
    setLastUpdated(new Date());
    countdownRef.current = REFRESH_MS / 1000;
    setCountdown(REFRESH_MS / 1000);
  };

  useEffect(() => { fetchAll(); }, []);

  /* Auto-set status to "assigned" when a driver is selected */
  useEffect(() => {
    if (driver !== "") setStatus("Assigned");
    else setStatus("pending");
  }, [driver]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!autoRefresh) return;
    intervalRef.current = setInterval(() => fetchAll(), REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return; }
    const tick = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown(countdownRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh]);

  /* ── Fetch only ONLINE + ACTIVE drivers for the dropdown ── */
  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const all = Array.isArray(res.data) ? res.data : [];
      // ✅ Only show drivers who are online AND have active payment/duty status
      const available = all.filter(
        (d) =>
          d.status?.toLowerCase() === "online" &&
          d.payactive?.toLowerCase() === "active"
      );
      setDrivers(available);
    } catch (e) {
      console.warn("Failed to fetch drivers:", e);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn("Failed to fetch bookings:", e);
    }
  };

  const openEdit = (b) => {
    setEditId(b.id);
    setName(b.name);
    setMobile(b.mobile);
    setPickup(b.pickup);
    setDrop(b.drop || b.drop_location || "");
    setStatus(b.status || "pending");
    setDriver(b.driver || "");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setDriver("");
    setStatus("pending");
  };

  const filtered = bookings.filter(
    (b) =>
      (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(b.mobile || "").includes(search)
  );

  /* ── Assign driver to booking ── */
  const submitForm = async () => {
    if (!driver) {
      alert("Please select a driver before assigning.");
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${BASE_URL}/api/bookings/${editId}`, {
        driver,
        status: "Assigned",
      });
      closeForm();
      fetchBookings(); // refresh table
    } catch (e) {
      alert("Failed to assign driver: " + (e?.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── Stats ── */
  const totalBookings     = bookings.length;
  const assignedBookings  = bookings.filter((b) => b.status?.toLowerCase() === "assigned").length;
  const pendingBookings   = bookings.filter((b) => !b.driver || b.driver === "").length;
  const completedBookings = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;

  const radius = 10, circ = 2 * Math.PI * radius;
  const dash   = circ * (autoRefresh ? countdown / (REFRESH_MS / 1000) : 0);

  /* ── Find driver name by ID for table display ── */
  const getDriverName = (driverId) => {
    if (!driverId) return null;
    // Check in our already-loaded drivers list first
    const found = drivers.find((d) => String(d.id) === String(driverId));
    return found ? found.name || found.NAME : `Driver #${driverId}`;
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.mainTitle}>Booking Management</h1>
          <p style={styles.subtitle}>Track and manage all customer bookings</p>
        </div>

        {/* ── Refresh Controls ── */}
        <div style={rf.bar}>
          {lastUpdated && (
            <div style={rf.timestamp}>
              <span style={rf.dot} />
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
          {autoRefresh && (
            <div style={rf.ringWrap} title={`Next refresh in ${countdown}s`}>
              <svg width="28" height="28" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="14" cy="14" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="14" cy="14" r={radius} fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 1s linear" }} />
              </svg>
              <span style={rf.ringLabel}>{countdown}s</span>
            </div>
          )}
          <button
            onClick={() => {
              setAutoRefresh((v) => !v);
              countdownRef.current = REFRESH_MS / 1000;
              setCountdown(REFRESH_MS / 1000);
            }}
            style={{ ...rf.toggleBtn, ...(autoRefresh ? rf.toggleOn : rf.toggleOff) }}
          >
            {autoRefresh ? "🔄 Auto ON" : "⏸ Auto OFF"}
          </button>
          <button onClick={fetchAll} style={rf.manualBtn}>↻ Refresh</button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        {[
          { icon: "📋", label: "Total Bookings", value: totalBookings,     grad: "linear-gradient(135deg,#2563eb,#1d4ed8)" },
          { icon: "✓",  label: "Assigned",        value: assignedBookings,  grad: "linear-gradient(135deg,#10b981,#059669)" },
          { icon: "⏳", label: "Pending",          value: pendingBookings,   grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { icon: "🎉", label: "Completed",        value: completedBookings, grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, background: s.grad }}>
              <span style={styles.statIcon}>{s.icon}</span>
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>{s.label}</p>
              <h3 style={styles.statValue}>{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={styles.searchSection}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            placeholder="Search by name or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.resultCount}>
          Showing <strong>{filtered.length}</strong> of <strong>{totalBookings}</strong> bookings
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Bookings</h3>
          <div style={styles.tableBadge}>{filtered.length} Records</div>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["ID","Customer","Mobile","Pickup","Drop","Assigned Driver","Status","Action"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={styles.noData}>
                    <div style={styles.noDataContent}>
                      <span style={styles.noDataIcon}>📭</span>
                      <p>No bookings found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((b, index) => (
                <tr key={b.id} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                  <td style={styles.td}>
                    <span style={styles.idBadge}>{b.id}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <div style={styles.avatar}>{(b.name || "?").charAt(0).toUpperCase()}</div>
                      <span style={styles.nameText}>{b.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{b.mobile}</td>
                  <td style={styles.td}>
                    <div style={styles.locationCell}>
                      <span style={styles.locationIcon}>📍</span>
                      <span style={styles.locationText}>{b.pickup}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.locationCell}>
                      <span style={styles.locationIcon}>🎯</span>
                      <span style={styles.locationText}>{b.drop || b.drop_location}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {b.driver ? (
                      <span style={styles.driverAssigned}>
                        ✓ {getDriverName(b.driver)}
                      </span>
                    ) : (
                      <span style={styles.driverNotAssigned}>Not Assigned</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={getStatusStyle(b.status)}>{b.status || "Pending"}</span>
                  </td>
                  <td style={styles.td}>
                    {/* Show Assign button only for non-completed bookings */}
                    {b.status?.toLowerCase() !== "completed" ? (
                      <button style={styles.editBtn} onClick={() => openEdit(b)}>
                        {b.driver ? "✏️ Reassign" : "✏️ Assign"}
                      </button>
                    ) : (
                      <span style={styles.doneBadge}>✅ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assign Driver Modal ── */}
      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modalForm}>
            {/* Modal Header */}
            <div style={styles.modalHeaderForm}>
              <div style={styles.headerContent}>
                <span style={styles.headerIcon}>🚗</span>
                <span style={styles.headerText}>Assign Driver to Booking #{editId}</span>
              </div>
              <span style={styles.closeIconForm} onClick={closeForm}>✖</span>
            </div>

            <div style={styles.formGrid}>
              {/* Booking Details (read-only) */}
              <div style={styles.sectionHeader}>📋 Booking Details</div>
              <div style={styles.sectionDivider} />

              {[
                ["Customer Name",    name],
                ["Mobile Number",    mobile],
                ["Pickup Location",  pickup],
                ["Drop Location",    drop],
              ].map(([label, value]) => (
                <div key={label} style={styles.inputWrapper}>
                  <label style={styles.label}>{label}</label>
                  <input value={value} readOnly style={styles.formInputReadOnly} />
                </div>
              ))}

              {/* Driver Assignment */}
              <div style={styles.sectionHeader}>🧑‍✈️ Driver Assignment</div>
              <div style={styles.sectionDivider} />

              <div style={{ ...styles.inputWrapper, gridColumn: "1 / -1" }}>
                <label style={styles.label}>
                  Select Driver *
                  <span style={styles.driverCountBadge}>
                    {drivers.length} online &amp; active
                  </span>
                </label>

                {drivers.length === 0 ? (
                  <div style={styles.noDriversBox}>
                    ⚠️ No drivers are currently online and active.
                    Drivers must be online and have an active pay status to appear here.
                  </div>
                ) : (
                  <select
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    style={styles.formSelect}
                  >
                    <option value="">— Choose an available driver —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.NAME} — {d.car_type || d.vehicle || "N/A"} (ID: {d.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Booking Status</label>
                <input
                  value={driver ? "Assigned" : "Pending"}
                  readOnly
                  style={{
                    ...styles.formInputReadOnly,
                    color: driver ? "#15803d" : "#b91c1c",
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={styles.btnRowForm}>
              <button style={styles.cancelBtnForm} onClick={closeForm}>
                Cancel
              </button>
              <button
                style={{
                  ...styles.saveBtnForm,
                  opacity: (saving || !driver) ? 0.6 : 1,
                  cursor: (saving || !driver) ? "not-allowed" : "pointer",
                }}
                onClick={submitForm}
                disabled={saving || !driver}
              >
                {saving ? "⏳ Assigning..." : "✅ Assign Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getStatusStyle = (status) => {
  const s = status?.toLowerCase() || "pending";
  if (s === "completed")   return styles.statusCompleted;
  if (s === "assigned")    return styles.statusAssigned;
  if (s === "accepted")    return styles.statusAccepted;
  if (s === "in progress") return styles.statusInProgress;
  return styles.statusPending;
};

/* ── Refresh bar styles ── */
const rf = {
  bar:       { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  timestamp: { display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "7px 14px", borderRadius: "20px", fontSize: "13px", color: "#475569", fontWeight: 500 },
  dot:       { width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px #bbf7d0", display: "inline-block" },
  ringWrap:  { display: "flex", alignItems: "center", gap: "5px" },
  ringLabel: { fontSize: "12px", color: "#2563eb", fontWeight: 700, minWidth: "22px" },
  toggleBtn: { border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
  toggleOn:  { background: "#dcfce7", color: "#15803d" },
  toggleOff: { background: "#fee2e2", color: "#b91c1c" },
  manualBtn: { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
};

const styles = {
  container:  { marginLeft: "260px", padding: "40px", background: "linear-gradient(135deg,#f0f4f8,#e2e8f0)", minHeight: "100vh" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px", flexWrap: "wrap", gap: "20px" },
  mainTitle:  { fontSize: "32px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.5px" },
  subtitle:   { fontSize: "15px", color: "#64748b", margin: "5px 0 0 0", fontWeight: 400 },

  statsGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "25px", marginBottom: "35px" },
  statCard:       { background: "#fff", borderRadius: "16px", padding: "24px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.8)" },
  statIconWrapper:{ width: "60px", height: "60px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(37,99,235,0.25)" },
  statIcon:       { fontSize: "28px" },
  statContent:    { flex: 1 },
  statLabel:      { fontSize: "13px", color: "#64748b", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue:      { fontSize: "28px", color: "#1e293b", margin: "4px 0 0 0", fontWeight: 800 },

  searchSection:  { background: "#fff", borderRadius: "16px", padding: "20px 24px", marginBottom: "25px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", flexWrap: "wrap", gap: "15px" },
  searchWrapper:  { position: "relative", flex: "1", minWidth: "300px", maxWidth: "500px" },
  searchIcon:     { position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", opacity: 0.5 },
  searchInput:    { width: "100%", padding: "12px 16px 12px 45px", borderRadius: "10px", border: "2px solid #e2e8f0", outline: "none", fontSize: "15px", background: "#f8fafc", fontFamily: "inherit" },
  resultCount:    { fontSize: "14px", color: "#64748b", fontWeight: 500 },

  tableCard:      { background: "#fff", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05)", overflow: "hidden" },
  tableHeader:    { padding: "24px 28px", borderBottom: "2px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" },
  tableTitle:     { fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: 0 },
  tableBadge:     { background: "#eff6ff", color: "#2563eb", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 },
  tableWrapper:   { overflowX: "auto" },
  table:          { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th:             { background: "#f8fafc", textAlign: "left", padding: "16px 20px", fontWeight: 700, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "2px solid #e2e8f0" },
  td:             { padding: "14px 20px", borderBottom: "1px solid #f1f5f9", color: "#334155", fontSize: "14px" },
  evenRow:        { background: "#fff" },
  oddRow:         { background: "#f9fafb" },
  idBadge:        { background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#475569" },
  nameCell:       { display: "flex", alignItems: "center", gap: "12px" },
  avatar:         { width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 },
  nameText:       { fontWeight: 600, color: "#1e293b" },
  locationCell:   { display: "flex", alignItems: "flex-start", gap: "6px" },
  locationIcon:   { fontSize: "14px", flexShrink: 0, marginTop: 1 },
  locationText:   { fontSize: "13px", color: "#475569", lineHeight: 1.4 },

  driverAssigned:    { background: "#dcfce7", color: "#15803d", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  driverNotAssigned: { background: "#fee2e2", color: "#b91c1c", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  statusCompleted:   { background: "#dcfce7", color: "#15803d", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  statusAssigned:    { background: "#dbeafe", color: "#1e40af", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  statusAccepted:    { background: "#fef3c7", color: "#b45309", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  statusInProgress:  { background: "#fef3c7", color: "#b45309", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  statusPending:     { background: "#fee2e2", color: "#b91c1c", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },

  editBtn:  { background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
  doneBadge:{ background: "#dcfce7", color: "#15803d", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 },

  noData:        { padding: "60px 20px", textAlign: "center" },
  noDataContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#94a3b8" },
  noDataIcon:    { fontSize: "48px", opacity: 0.5 },

  /* Modal */
  overlay:         { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalForm:       { width: "700px", maxWidth: "95vw", maxHeight: "90vh", borderRadius: "20px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)", background: "#fff", display: "flex", flexDirection: "column" },
  modalHeaderForm: { background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerContent:   { display: "flex", alignItems: "center", gap: "12px" },
  headerIcon:      { fontSize: "26px" },
  headerText:      { fontSize: "20px", fontWeight: 700 },
  closeIconForm:   { cursor: "pointer", fontSize: "22px", fontWeight: 700, opacity: 0.9 },

  formGrid:       { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "20px", padding: "28px 32px", background: "#fafafa", overflowY: "auto" },
  sectionHeader:  { gridColumn: "1/-1", fontSize: "15px", fontWeight: 700, color: "#1e40af", marginTop: "8px", marginBottom: "-8px" },
  sectionDivider: { gridColumn: "1/-1", height: "2px", background: "linear-gradient(90deg,#2563eb,transparent)", marginBottom: "4px" },
  inputWrapper:   { display: "flex", flexDirection: "column", gap: "8px" },
  label:          { fontSize: "13px", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 8 },

  formInputReadOnly: { padding: "12px 16px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "14px", outline: "none", background: "#f3f4f6", color: "#374151", fontFamily: "inherit" },
  formSelect:        { padding: "12px 16px", borderRadius: "10px", border: "2px solid #2563eb", fontSize: "14px", outline: "none", background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "#1e293b" },

  noDriversBox: { background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: "#92400e", fontWeight: 500, lineHeight: 1.5 },
  driverCountBadge: { background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 },

  btnRowForm:    { display: "flex", justifyContent: "flex-end", gap: "14px", padding: "20px 32px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" },
  saveBtnForm:   { background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", padding: "13px 28px", borderRadius: "10px", fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 6px rgba(37,99,235,0.3)" },
  cancelBtnForm: { background: "#fff", color: "#6b7280", border: "2px solid #e5e7eb", padding: "13px 28px", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "15px" },
};

export default Booking;
