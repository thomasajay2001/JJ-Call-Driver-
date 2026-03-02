import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { PaginationBar, usePagination } from "../hooks/Usepagination";

const BASE_URL   = import.meta.env.VITE_BASE_URL;
const REFRESH_MS = 30000;

/* ── status helpers ── */
const STATUS_CLASS = {
  completed:    "badge badge-green",
  assigned:     "badge badge-blue",
  accepted:     "badge badge-amber",
  "in progress":"badge badge-orange",
  inride:       "badge badge-orange",
  pending:      "badge badge-red",
};
const STATUS_LABEL = {
  completed:"✓ Completed", assigned:"✓ Assigned", accepted:"⏳ Accepted",
  "in progress":"🔄 In Progress", inride:"🚗 In Ride", pending:"⏳ Pending",
};
const getStatusClass = (s) => STATUS_CLASS[s?.toLowerCase()] || "badge badge-gray";
const getStatusLabel = (s) => STATUS_LABEL[s?.toLowerCase()] || s || "Pending";

export default function Booking() {
  const [bookings,    setBookings]    = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [search,      setSearch]      = useState("");
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [name,        setName]        = useState("");
  const [mobile,      setMobile]      = useState("");
  const [pickup,      setPickup]      = useState("");
  const [drop,        setDrop]        = useState("");
  const [status,      setStatus]      = useState("pending");
  const [driver,      setDriver]      = useState("");
  const [saving,      setSaving]      = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(REFRESH_MS / 1000);
  const ivRef = useRef(null);
  const cdRef = useRef(REFRESH_MS / 1000);

  const fetchAll = async () => {
    await Promise.all([fetchBookings(), fetchDrivers()]);
    setLastUpdated(new Date());
    cdRef.current = REFRESH_MS / 1000;
    setCountdown(REFRESH_MS / 1000);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => { setStatus(driver ? "Assigned" : "pending"); }, [driver]);

  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current);
    if (!autoRefresh) return;
    ivRef.current = setInterval(() => fetchAll(), REFRESH_MS);
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

  const openEdit = (b) => {
    setEditId(b.id); setName(b.name); setMobile(b.mobile);
    setPickup(b.pickup); setDrop(b.drop || b.drop_location || "");
    setStatus(b.status || "pending"); setDriver(b.driver || "");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setDriver(""); setStatus("pending"); };

  const submitForm = async () => {
    if (!driver) { alert("Please select a driver."); return; }
    setSaving(true);
    try {
      await axios.put(`${BASE_URL}/api/bookings/${editId}`, { driver, status: "Assigned" });
      closeForm(); fetchBookings();
    } catch (e) {
      alert("Failed to assign: " + (e?.response?.data?.message || e.message));
    } finally { setSaving(false); }
  };

  const getDriverName = (id) => {
    if (!id) return null;
    const d = drivers.find((d) => String(d.id) === String(id));
    return d ? d.name || d.NAME : `Driver #${id}`;
  };

  /* ── Filter + paginate ── */
  const filtered = bookings.filter((b) =>
    (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(b.mobile || "").includes(search)
  );
  const pg = usePagination(filtered, 10);

  /* ── Stats ── */
  const totalB     = bookings.length;
  const assignedB  = bookings.filter((b) => b.status?.toLowerCase() === "assigned").length;
  const pendingB   = bookings.filter((b) => !b.driver).length;
  const completedB = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;

  /* countdown ring */
  const R = 10, circ = 2 * Math.PI * R;
  const dash = circ * (autoRefresh ? countdown / (REFRESH_MS / 1000) : 0);

  const STATS = [
    { icon:"📋", label:"Total Bookings", value:totalB,     cls:"stat-icon-box-blue"   },
    { icon:"✓",  label:"Assigned",       value:assignedB,  cls:"stat-icon-box-green"  },
    { icon:"⏳", label:"Pending",         value:pendingB,   cls:"stat-icon-box-amber"  },
    { icon:"🎉", label:"Completed",       value:completedB, cls:"stat-icon-box-purple" },
  ];

  return (
    <div>
      {/* ── Page Header ── */}
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
          <button
            className={autoRefresh ? "refresh-toggle-on" : "refresh-toggle-off"}
            onClick={() => { setAutoRefresh((v)=>!v); cdRef.current=REFRESH_MS/1000; setCountdown(REFRESH_MS/1000); }}
          >
            {autoRefresh ? "🔄 Auto ON" : "⏸ Auto OFF"}
          </button>
          <button className="refresh-manual-btn" onClick={() => fetchAll()}>↻ Refresh</button>
          <div className="live-badge"><span className="live-badge-dot" />Live</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon-box ${s.cls}`}><span>{s.icon}</span></div>
            <div>
              <p className="stat-label">{s.label}</p>
              <h3 className="stat-value">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="search-bar">
        <div className="search-wrap">
          <span className="search-icon-pos">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }}
          />
        </div>
        <span className="search-result-count">
          Showing <strong>{pg.startDisplay}–{pg.endDisplay}</strong> of <strong>{pg.total}</strong>
        </span>
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        <div className="table-card-header">
          <h3 className="table-card-title">All Bookings</h3>
          <span className="table-record-badge">{filtered.length} Records</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["ID","Customer","Mobile","Pickup","Drop","Assigned Driver","Trip Type","Status","Action"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <span className="empty-state-icon">📭</span>
                      <p className="empty-state-title">No bookings found</p>
                      <p className="empty-state-sub">Try adjusting your search</p>
                    </div>
                  </td>
                </tr>
              ) : pg.slice.map((b) => (
                <tr key={b.id}>
                  <td><span className="cell-id">{b.id}</span></td>
                  <td>
                    <div className="cell-name">
                      <div className="avatar">{(b.name||"?").charAt(0).toUpperCase()}</div>
                      <span className="cell-name-text">{b.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{b.mobile}</td>
                  <td>
                    <div className="cell-loc">
                      <span>📍</span>
                      <span className="cell-loc-text">{b.pickup}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-loc">
                      <span>🎯</span>
                      <span className="cell-loc-text">{b.drop || b.drop_location}</span>
                    </div>
                  </td>
                  <td>
                    {b.driver
                      ? <span className="badge badge-green">✓ {getDriverName(b.driver)}</span>
                      : <span className="badge badge-red">Not Assigned</span>}
                  </td>
                  <td>
                    {b.triptype
                      ? <span className={`badge ${b.triptype === "outstation" ? "badge-purple" : "badge-blue"}`}>{b.triptype}</span>
                      : "—"}
                  </td>
                  <td>
                    <span className={getStatusClass(b.status)}>{getStatusLabel(b.status)}</span>
                  </td>
                  <td>
                    {b.status?.toLowerCase() !== "completed" ? (
                      <button className="action-edit" onClick={() => openEdit(b)}>
                        ✏️ {b.driver ? "Reassign" : "Assign"}
                      </button>
                    ) : (
                      <span className="badge badge-green">✅ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {filtered.length > 0 && (
          <PaginationBar
            pg={pg}
            onPageChange={pg.setPage}
            onSizeChange={(size) => { pg.setPageSize(size); pg.setPage(1); }}
          />
        )}
      </div>

      {/* ── Assign Modal ── */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>🚗</span>
                <span className="modal-title">Assign Driver — Booking #{editId}</span>
              </div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-section-label">📋 Booking Details</div>
                <div className="form-section-divider" />

                {[["Customer Name",name],["Mobile Number",mobile],["Pickup Location",pickup],["Drop Location",drop]].map(([lbl,val]) => (
                  <div key={lbl} className="form-field">
                    <label className="form-label">{lbl}</label>
                    <input value={val} readOnly className="form-input form-input-readonly" />
                  </div>
                ))}

                <div className="form-section-label">🧑‍✈️ Driver Assignment</div>
                <div className="form-section-divider" />

                <div className="form-field form-full">
                  <label className="form-label">
                    Select Driver <span className="form-required">*</span>
                    <span className="badge badge-green" style={{ marginLeft:8 }}>
                      {drivers.length} available
                    </span>
                  </label>
                  {drivers.length === 0 ? (
                    <div style={{ padding:"14px", background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:"var(--radius-sm)", fontSize:13, color:"#92400e", fontWeight:500, lineHeight:1.5 }}>
                      ⚠️ No drivers online & active right now.
                    </div>
                  ) : (
                    <select className="form-select" value={driver} onChange={(e) => setDriver(e.target.value)}>
                      <option value="">— Choose a driver —</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.NAME} — {d.car_type || "N/A"} (ID: {d.id})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Status (auto)</label>
                  <input
                    value={driver ? "Assigned" : "Pending"}
                    readOnly
                    className="form-input form-input-readonly"
                    style={{ color: driver ? "#15803d" : "#b91c1c", fontWeight:700 }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button
                className="btn btn-primary"
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
}