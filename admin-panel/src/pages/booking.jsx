import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { PaginationBar, usePagination } from "../hooks/Usepagination";

const BASE_URL   = import.meta.env.VITE_BASE_URL;
const REFRESH_MS = 30000;

const STATUS_CLASS = {
  completed:       "badge badge-green",
  assigned:        "badge badge-blue",
  accepted:        "badge badge-amber",
  inride:          "badge badge-orange",
  pending:         "badge badge-red",
  allbusy:         "badge badge-red",
  wait5:           "badge badge-amber",
  wait10:          "badge badge-amber",
  wait30:          "badge badge-amber",
  cancelled:       "badge badge-gray",
  preferred_query: "badge badge-amber",
};
const STATUS_LABEL = {
  completed:       "✓ Completed",
  assigned:        "✓ Assigned",
  accepted:        "⏳ Accepted",
  inride:          "🚗 In Ride",
  pending:         "⏳ Pending",
  allbusy:         "🚫 All Busy",
  wait5:           "⏱ Wait 5 min",
  wait10:          "⏱ Wait 10 min",
  wait30:          "⏱ Wait 30 min",
  cancelled:       "🚫 Cancelled",
  preferred_query: "⏳ Awaiting Customer",
};
const getStatusClass = (s) => STATUS_CLASS[s?.toLowerCase()] || "badge badge-gray";
const getStatusLabel = (s) => STATUS_LABEL[s?.toLowerCase()] || s || "Pending";

const ASSIGN_MODES = [
  { value: "assign",  label: "🚗 Assign a Driver",       desc: "Pick a driver from the list" },
  { value: "wait5",   label: "⏱ Ask to Wait — 5 mins",  desc: "Notify customer to wait ~5 min" },
  { value: "wait10",  label: "⏱ Ask to Wait — 10 mins", desc: "Notify customer to wait ~10 min" },
  { value: "wait30",  label: "⏱ Ask to Wait — 30 mins", desc: "Notify customer to wait ~30 min" },
  { value: "allbusy", label: "🚫 All Drivers Busy",      desc: "Mark booking — no driver available" },
];

export default function Booking() {
  const [bookings,    setBookings]    = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [allDrivers,  setAllDrivers]  = useState([]);
  const [search,      setSearch]      = useState("");

  // ── Assign modal ──
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [assignMode,  setAssignMode]  = useState("assign");
  const [driver,      setDriver]      = useState("");
  const [saving,      setSaving]      = useState(false);

  // ── Preferred different-driver warning ──
  const [showPrefWarn, setShowPrefWarn] = useState(false);

  // ── Popup shown to ADMIN only AFTER customer clicks YES ──
  const [showAcceptedPopup,   setShowAcceptedPopup]   = useState(false);
  const [acceptedBooking,     setAcceptedBooking]     = useState(null);
  const [acceptedDriver,      setAcceptedDriver]      = useState("");
  const [acceptedSaving,      setAcceptedSaving]      = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(REFRESH_MS / 1000);
  const ivRef = useRef(null);
  const cdRef = useRef(REFRESH_MS / 1000);

  /* ───────── fetch ───────── */
  const fetchAll = async () => {
    await Promise.all([fetchBookings(), fetchDrivers()]);
    setLastUpdated(new Date());
    cdRef.current = REFRESH_MS / 1000;
    setCountdown(REFRESH_MS / 1000);
  };

  useEffect(() => { fetchAll(); }, []);

  /* ───────── Socket ─────────
     Backend must emit  "customerAcceptedAlternate"  to the admin room
     when the customer POSTs /preferred-response with { accept: true }
  ─────────────────────────── */
  useEffect(() => {
    const SOCK = import.meta.env.VITE_SOCKET_URL || BASE_URL;
    if (!SOCK) return;
    let socket;
    import("socket.io-client").then(({ io }) => {
      socket = io(SOCK);
      socket.emit("joinAdminRoom");

      // Customer said YES → show admin the "now assign a driver" popup
      socket.on("customerAcceptedAlternate", ({ bookingId }) => {
        // Find the booking from current list
        setBookings((prev) => {
          const b = prev.find((x) => String(x.id) === String(bookingId));
          if (b) {
            setAcceptedBooking(b);
            setAcceptedDriver("");
            setShowAcceptedPopup(true);
          }
          return prev;
        });
        fetchBookings(); // also refresh so status updates
      });

      // Customer said NO → just refresh (row will be cancelled in DB)
      socket.on("bookingCancelled", () => fetchBookings());
    });
    return () => { if (socket) socket.disconnect(); };
  }, []);

  /* ───────── auto-refresh ───────── */
  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current);
    if (!autoRefresh) return;
    ivRef.current = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(ivRef.current);
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return; }
    const t = setInterval(() => {
      cdRef.current = Math.max(0, cdRef.current - 1);
      setCountdown(cdRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const all = Array.isArray(res.data) ? res.data : [];
      setAllDrivers(all);
      setDrivers(all.filter((d) =>
        d.status?.toLowerCase() === "online" &&
        d.payactive?.toLowerCase() === "active"
      ));
    } catch {}
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  /* ───────── open assign modal ───────── */
  const openEdit = (b) => {
    setEditId(b.id); setEditBooking(b);
    setAssignMode("assign"); setDriver("");
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false); setEditId(null);
    setEditBooking(null); setDriver(""); setAssignMode("assign");
  };

  /* ───────── submit assign ───────── */
  const submitForm = async () => {
    if (assignMode === "assign" && !driver) { alert("Please select a driver."); return; }
    if (
      assignMode === "assign" &&
      editBooking?.recommended_driver_id &&
      String(driver) !== String(editBooking.recommended_driver_id)
    ) { setShowPrefWarn(true); return; }
    await doSubmit();
  };

  const doSubmit = async (overrideId, overrideDriver) => {
    setSaving(true);
    const bid = overrideId || editId;
    try {
      if (assignMode === "assign" || overrideDriver) {
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: overrideDriver || driver, status: "assigned" });
      } else if (assignMode === "allbusy") {
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: null, status: "allbusy" });
      } else {
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: null, status: assignMode });
      }
      closeForm();
      fetchBookings();
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.message || e.message));
    } finally { setSaving(false); }
  };

  /* ───────── "Not Available" on preferred driver ─────────
     Just call the API — backend sets status = 'preferred_query'
     and emits socket to customer. Row disables via DB status.
  ─────────────────────────────────────────────────────────── */
  const handleNotAvailable = async (booking) => {
    closeForm();
    try {
      await axios.post(`${BASE_URL}/api/bookings/${booking.id}/preferred-unavailable`);
      // Optimistically update status in local state so row locks immediately
      setBookings((prev) =>
        prev.map((b) => b.id === booking.id ? { ...b, status: "preferred_query" } : b)
      );
    } catch (e) {
      alert("Failed to notify customer: " + (e?.response?.data?.message || e.message));
    }
  };

  /* ───────── preferred warning handlers ───────── */
  const handlePrefWarnYes = async () => { setShowPrefWarn(false); await doSubmit(); };
  const handlePrefWarnNo  = async () => {
    setShowPrefWarn(false); setSaving(true);
    try {
      await axios.put(`${BASE_URL}/api/bookings/${editId}`, { driver: null, status: "cancelled" });
      closeForm(); fetchBookings();
    } catch (e) { alert("Failed: " + (e?.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  /* ───────── assign from "customer accepted" popup ───────── */
  const handleAcceptedAssign = async () => {
    if (!acceptedDriver) { alert("Please select a driver."); return; }
    setAcceptedSaving(true);
    try {
      await axios.put(`${BASE_URL}/api/bookings/${acceptedBooking.id}`, { driver: acceptedDriver, status: "assigned" });
      setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver("");
      fetchBookings();
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.message || e.message));
    } finally { setAcceptedSaving(false); }
  };

  /* ───────── helpers ───────── */
  const getDriverName = (id) => {
    if (!id) return null;
    const d = allDrivers.find((d) => String(d.id) === String(id));
    return d ? (d.name || d.NAME) : `Driver #${id}`;
  };

  /* ───────── filter + paginate ───────── */
  const filtered = bookings.filter((b) =>
    (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(b.mobile || "").includes(search)
  );
  const pg = usePagination(filtered, 10);

  /* ───────── stats ───────── */
  const totalB     = bookings.length;
  const assignedB  = bookings.filter((b) => b.status?.toLowerCase() === "assigned").length;
  const pendingB   = bookings.filter((b) => !b.driver).length;
  const completedB = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;

  const R = 10, circ = 2 * Math.PI * R;
  const dash = circ * (autoRefresh ? countdown / (REFRESH_MS / 1000) : 0);
  const STATS = [
    { icon:"📋", label:"Total Bookings", value:totalB,     cls:"stat-icon-box-blue"   },
    { icon:"✓",  label:"Assigned",       value:assignedB,  cls:"stat-icon-box-green"  },
    { icon:"⏳", label:"Pending",         value:pendingB,   cls:"stat-icon-box-amber"  },
    { icon:"🎉", label:"Completed",       value:completedB, cls:"stat-icon-box-purple" },
  ];
  const selMode = ASSIGN_MODES.find((m) => m.value === assignMode);

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Booking Management</h1>
          <p className="page-subtitle">Track and manage all customer bookings</p>
        </div>
        <div className="refresh-bar">
          {lastUpdated && (
            <div className="refresh-timestamp">
              <span className="refresh-live-dot" />
              {lastUpdated.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
            </div>
          )}
          {autoRefresh && (
            <div className="refresh-ring-wrap">
              <svg width="28" height="28" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="14" cy="14" r={R} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="14" cy="14" r={R} fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  style={{ transition:"stroke-dasharray 1s linear" }} />
              </svg>
              <span className="refresh-ring-label">{countdown}s</span>
            </div>
          )}
          <button className={autoRefresh ? "refresh-toggle-on" : "refresh-toggle-off"}
            onClick={() => { setAutoRefresh((v) => !v); cdRef.current = REFRESH_MS/1000; setCountdown(REFRESH_MS/1000); }}>
            {autoRefresh ? "🔄 Auto ON" : "⏸ Auto OFF"}
          </button>
          <button className="refresh-manual-btn" onClick={fetchAll}>↻ Refresh</button>
          <div className="live-badge"><span className="live-badge-dot" />Live</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon-box ${s.cls}`}><span>{s.icon}</span></div>
            <div><p className="stat-label">{s.label}</p><h3 className="stat-value">{s.value}</h3></div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="search-bar">
        <div className="search-wrap">
          <span className="search-icon-pos">🔍</span>
          <input className="search-input" placeholder="Search by name or mobile..."
            value={search} onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }} />
        </div>
        <span className="search-result-count">
          Showing <strong>{pg.startDisplay}–{pg.endDisplay}</strong> of <strong>{pg.total}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-card-header">
          <h3 className="table-card-title">All Bookings</h3>
          <span className="table-record-badge">{filtered.length} Records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["ID","Customer","Mobile","Pickup","Drop","Preferred Driver","Assigned Driver","Trip","Status","Action"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr><td colSpan="10">
                  <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <p className="empty-state-title">No bookings found</p>
                  </div>
                </td></tr>
              ) : pg.slice.map((b) => {
                const s             = b.status?.toLowerCase();
                const isCancelled   = s === "cancelled";
                const isDone        = s === "completed";
                // ─ Disabled when status is preferred_query (waiting for customer) ─
                const isLocked      = s === "preferred_query";

                return (
                  <tr key={b.id} style={{
                    ...(isCancelled ? { opacity:0.6, backgroundColor:"#FFF8F8" } : {}),
                    ...(isLocked    ? { opacity:0.55, backgroundColor:"#FFFBEB" } : {}),
                  }}>
                    <td><span className="cell-id">{b.id}</span></td>
                    <td>
                      <div className="cell-name">
                        <div className="avatar">{(b.name||"?").charAt(0).toUpperCase()}</div>
                        <span className="cell-name-text">{b.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{b.mobile}</td>
                    <td><div className="cell-loc"><span>📍</span><span className="cell-loc-text">{b.pickup}</span></div></td>
                    <td><div className="cell-loc"><span>🎯</span><span className="cell-loc-text">{b.drop||b.drop_location}</span></div></td>

                    <td>
                      {b.recommended_driver_id
                        ? <span className="badge badge-purple" style={{ display:"inline-flex", gap:4 }}>⭐ {getDriverName(b.recommended_driver_id)}</span>
                        : <span style={{ color:"#94A3B8", fontSize:12 }}>—</span>}
                    </td>

                    <td>
                      {b.driver
                        ? <span className="badge badge-green">✓ {getDriverName(b.driver)}</span>
                        : <span className="badge badge-red">Not Assigned</span>}
                    </td>

                    <td>
                      {b.triptype
                        ? <span className={`badge ${b.triptype==="outstation"?"badge-purple":"badge-blue"}`}>{b.triptype}</span>
                        : "—"}
                    </td>

                    <td><span className={getStatusClass(b.status)}>{getStatusLabel(b.status)}</span></td>

                    <td>
                      {isDone ? (
                        <span className="badge badge-green">✅ Done</span>

                      ) : isCancelled ? (
                        <span className="badge badge-gray" style={{ backgroundColor:"#FFF1F2", color:"#9F1239", border:"1px solid #FECDD3" }}>
                          🚫 Cancelled
                        </span>

                      ) : isLocked ? (
                        /* ─── ROW DISABLED — waiting for customer to respond ─── */
                        <div style={S.lockedCell}>
                          <div style={S.lockedDot} />
                          <div>
                            <div style={S.lockedTitle}>Waiting for customer…</div>
                            <div style={S.lockedSub}>Locked until customer responds</div>
                          </div>
                        </div>

                      ) : (
                        <button className="action-edit" onClick={() => openEdit(b)}>
                          ✏️ {b.driver ? "Reassign" : "Assign"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <PaginationBar pg={pg} onPageChange={pg.setPage}
            onSizeChange={(size) => { pg.setPageSize(size); pg.setPage(1); }} />
        )}
      </div>

      {/* ═══════════════════════════════════
          ASSIGN MODAL
          ═══════════════════════════════════ */}
      {showForm && editBooking && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>🚗</span>
                <span className="modal-title">Assign — Booking #{editId}</span>
              </div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-section-label">📋 Booking Details</div>
                <div className="form-section-divider" />
                {[["Customer",editBooking.name],["Mobile",editBooking.mobile],["Pickup",editBooking.pickup],["Drop",editBooking.drop||editBooking.drop_location]].map(([lbl,val]) => (
                  <div key={lbl} className="form-field">
                    <label className="form-label">{lbl}</label>
                    <input value={val||"—"} readOnly className="form-input form-input-readonly" />
                  </div>
                ))}

                {/* Preferred driver banner */}
                {editBooking.recommended_driver_id && (
                  <div className="form-field form-full">
                    <div style={S.prefBanner}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:20 }}>⭐</span>
                        <div>
                          <p style={S.prefLabel}>Customer's Preferred Driver</p>
                          <p style={S.prefName}>{getDriverName(editBooking.recommended_driver_id)}</p>
                        </div>
                      </div>
                      {/* Clicking this disables the row and notifies customer — no admin popup yet */}
                      <button style={S.notAvailBtn} onClick={() => handleNotAvailable(editBooking)}>
                        🚫 Not Available
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-section-label" style={{ marginTop:8 }}>🧑‍✈️ Choose Action</div>
                <div className="form-section-divider" />

                <div className="form-field form-full">
                  <label className="form-label">What would you like to do?</label>
                  <select className="form-select" value={assignMode}
                    onChange={(e) => { setAssignMode(e.target.value); setDriver(""); }}>
                    {ASSIGN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {selMode && <p style={{ margin:"6px 0 0", fontSize:12, color:"#64748B", fontStyle:"italic" }}>{selMode.desc}</p>}
                </div>

                {assignMode === "assign" && (
                  <div className="form-field form-full">
                    <label className="form-label">
                      Select Driver <span className="form-required">*</span>
                      <span className="badge badge-green" style={{ marginLeft:8 }}>{drivers.length} online</span>
                    </label>
                    {drivers.length === 0 ? (
                      <div style={{ padding:14, background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:10, fontSize:13, color:"#92400e" }}>
                        ⚠️ No drivers online right now.
                      </div>
                    ) : (
                      <select className="form-select" value={driver} onChange={(e) => setDriver(e.target.value)}>
                        <option value="">— Choose a driver —</option>
                        {drivers.map((d) => {
                          const isPref = String(d.id) === String(editBooking.recommended_driver_id);
                          return <option key={d.id} value={d.id}>{isPref?"⭐ ":""}{d.name||d.NAME} — {d.car_type||"N/A"} (ID:{d.id})</option>;
                        })}
                      </select>
                    )}
                  </div>
                )}

                {assignMode !== "assign" && (
                  <div className="form-field form-full">
                    <div style={{ padding:"12px 14px", backgroundColor:assignMode==="allbusy"?"#FFF1F2":"#FFFBEB", border:`1.5px solid ${assignMode==="allbusy"?"#FECDD3":"#FDE68A"}`, borderRadius:10, fontSize:13, color:assignMode==="allbusy"?"#9F1239":"#92400E", lineHeight:1.6 }}>
                      {assignMode==="allbusy"
                        ? "🚫 All drivers busy — customer will be notified."
                        : `⏱ Customer will be asked to wait ${assignMode==="wait5"?"5":assignMode==="wait10"?"10":"30"} minutes.`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={submitForm} disabled={saving||(assignMode==="assign"&&!driver)}>
                {saving ? "⏳ Saving..." : assignMode==="assign" ? "✅ Assign Driver" : "✅ Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          PREFERRED DRIVER WARNING
          ═══════════════════════════════════ */}
      {showPrefWarn && editBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <div className="modal-header-inner"><span style={{ fontSize:22 }}>⚠️</span><span className="modal-title">Different Driver Selected</span></div>
            </div>
            <div className="modal-body" style={{ textAlign:"center", padding:"16px 0 8px" }}>
              <div style={{ fontSize:50, marginBottom:12 }}>🚕</div>
              <p style={{ fontSize:15, fontWeight:700, color:"#1E293B", margin:"0 0 12px" }}>Customer has a preferred driver</p>
              <div style={{ backgroundColor:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:12, padding:"10px 14px", textAlign:"left", margin:"0 0 12px" }}>
                <p style={{ margin:0, fontSize:13, color:"#92400E", fontWeight:600 }}>⭐ Preferred: <strong>{getDriverName(editBooking.recommended_driver_id)}</strong></p>
                <p style={{ margin:"5px 0 0", fontSize:13, color:"#92400E", fontWeight:600 }}>🚗 You selected: <strong>{getDriverName(driver)}</strong></p>
              </div>
              <p style={{ fontSize:14, color:"#475569", margin:0 }}>Assign a different driver anyway?</p>
            </div>
            <div className="modal-footer" style={{ gap:10 }}>
              <button style={{ flex:1, padding:"12px 0", backgroundColor:"#FEE2E2", color:"#9F1239", border:"1.5px solid #FECDD3", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer" }}
                onClick={handlePrefWarnNo} disabled={saving}>❌ Cancel Order</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handlePrefWarnYes} disabled={saving}>✅ Assign Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CUSTOMER ACCEPTED POPUP
          ─ Only appears when customer clicks YES on their device ─
          Admin now picks an alternate driver and assigns
          ═══════════════════════════════════════════════════════════ */}
      {showAcceptedPopup && acceptedBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:22 }}>✅</span>
                <span className="modal-title">Customer Accepted — Assign a Driver</span>
              </div>
            </div>

            <div className="modal-body">
              {/* Green success banner */}
              <div style={S.acceptedBanner}>
                <span style={{ fontSize:28 }}>🎉</span>
                <div>
                  <p style={S.acceptedBannerTitle}>Customer agreed to an alternate driver!</p>
                  <p style={S.acceptedBannerSub}>Please assign an available driver now.</p>
                </div>
              </div>

              {/* Booking card */}
              <div style={S.bookingCard}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={S.cardMeta}>Booking #{acceptedBooking.id}</span>
                  <span style={S.cardMeta}>{acceptedBooking.name}</span>
                </div>
                <div style={S.routeRow}><span>📍</span><span style={S.routeTxt}>{acceptedBooking.pickup}</span></div>
                <div style={{ width:2, height:8, backgroundColor:"#CBD5E1", marginLeft:6 }} />
                <div style={S.routeRow}><span>🎯</span><span style={S.routeTxt}>{acceptedBooking.drop||acceptedBooking.drop_location}</span></div>
                {acceptedBooking.recommended_driver_id && (
                  <div style={S.prefNote}>
                    ⭐ Preferred (unavailable): {getDriverName(acceptedBooking.recommended_driver_id)}
                  </div>
                )}
              </div>

              {/* Driver picker */}
              <div className="form-field" style={{ marginBottom:0 }}>
                <label className="form-label">
                  Select Alternate Driver <span className="form-required">*</span>
                  <span className="badge badge-green" style={{ marginLeft:8 }}>{drivers.length} online</span>
                </label>
                {drivers.length === 0 ? (
                  <div style={{ padding:14, background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:10, fontSize:13, color:"#92400e" }}>
                    ⚠️ No drivers online right now.
                  </div>
                ) : (
                  <select className="form-select" value={acceptedDriver} onChange={(e) => setAcceptedDriver(e.target.value)}>
                    <option value="">— Choose a driver —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name||d.NAME} — {d.car_type||"N/A"} (ID:{d.id})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ gap:10 }}>
              <button className="btn btn-ghost"
                onClick={() => { setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver(""); }}>
                Later
              </button>
              <button className="btn btn-primary" style={{ flex:2 }}
                onClick={handleAcceptedAssign} disabled={acceptedSaving||!acceptedDriver}>
                {acceptedSaving ? "⏳ Assigning…" : "🚗 Assign Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  );
}

/* ── Inline styles ── */
const S = {
  lockedCell:  { display:"flex", alignItems:"center", gap:8 },
  lockedDot:   { width:8, height:8, borderRadius:"50%", backgroundColor:"#F59E0B", flexShrink:0, animation:"pulse 1.2s ease infinite" },
  lockedTitle: { fontSize:12, fontWeight:700, color:"#92400E" },
  lockedSub:   { fontSize:11, color:"#B45309", marginTop:2 },

  prefBanner:  { display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, backgroundColor:"#F0F9FF", border:"1.5px solid #BFDBFE", borderRadius:10, padding:"10px 14px" },
  prefLabel:   { margin:0, fontSize:11, fontWeight:700, color:"#1E40AF" },
  prefName:    { margin:"2px 0 0", fontSize:13, color:"#1E293B", fontWeight:600 },
  notAvailBtn: { padding:"6px 12px", backgroundColor:"#FEE2E2", color:"#9F1239", border:"1.5px solid #FECDD3", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 },

  acceptedBanner:      { display:"flex", alignItems:"center", gap:12, backgroundColor:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:14, padding:"14px 16px", marginBottom:16 },
  acceptedBannerTitle: { margin:0, fontSize:14, fontWeight:800, color:"#15803D" },
  acceptedBannerSub:   { margin:"3px 0 0", fontSize:12, color:"#166534" },

  bookingCard: { backgroundColor:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:12, padding:"12px 14px", marginBottom:16 },
  cardMeta:    { fontSize:11, color:"#94A3B8", fontWeight:700, textTransform:"uppercase" },
  routeRow:    { display:"flex", alignItems:"flex-start", gap:6 },
  routeTxt:    { fontSize:12, color:"#475569", lineHeight:1.4 },
  prefNote:    { marginTop:10, padding:"6px 10px", backgroundColor:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, fontSize:12, color:"#92400E", fontWeight:600 },
};
