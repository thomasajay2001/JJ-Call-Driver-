import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { PaginationBar, usePagination } from "../hooks/Usepagination";

const BASE_URL   = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = "http://localhost:3000";

const CSV_COLUMNS = [
  "name","mobile","location","experience","feeDetails",
  "dob","bloodgrp","age","gender","car_type",
  "licenceNo","paymentmode","payactive",
];
const SAMPLE_CSV = [
  "name,mobile,location,experience,feeDetails,dob,bloodgrp,age,gender,car_type,licenceNo,paymentmode,payactive",
  "Ravi Kumar,9876543210,Chennai,5,Paid,1990-05-15,O+,34,Male,Automatic,TN01-20190001234,Online,Active",
  "Priya Devi,9123456789,Tambaram,3,Pending,1995-08-22,B+,29,Female,Manual,TN01-20210005678,Offline,Active",
];

/* ── status helpers ── */
const STATUS_BADGE = {
  active:    "badge badge-green",
  inactive:  "badge badge-amber",
  "on duty": "badge badge-blue",
  suspend:   "badge badge-red",
  offline:   "badge badge-gray",
  online:    "badge badge-teal",
};
const STATUS_LABEL = {
  active:"🟢 Active", inactive:"🟡 Inactive", "on duty":"🔵 On Duty",
  suspend:"⛔ Suspended", offline:"⚫ Offline", online:"🟢 Online",
};
const statusBadgeClass = (s) => STATUS_BADGE[s?.toLowerCase()] || "badge badge-gray";
const statusLabel      = (s) => STATUS_LABEL[s?.toLowerCase()] || s || "N/A";

/* ── payactive ── */
const payBadge = (v) =>
  v?.toLowerCase() === "active"   ? "badge badge-green" :
  v?.toLowerCase() === "deactive" ? "badge badge-red"   : "badge badge-gray";
const payLabel = (v) =>
  v?.toLowerCase() === "active"   ? "✅ Active" :
  v?.toLowerCase() === "deactive" ? "🚫 Deactive" : "— N/A";

/* ── fee ── */
const feeBadge = (v) =>
  v === "Paid"    ? "badge badge-green" :
  v === "Pending" ? "badge badge-amber" : "badge badge-red";
const feeLabel = (v) =>
  v === "Paid" ? "✅ Paid" : v === "Pending" ? "⏳ Pending" : "❌ Not Paid";

/* ── car type ── */
const carBadge = (v) =>
  v?.toLowerCase() === "automatic" ? "badge badge-blue" :
  v?.toLowerCase() === "manual"    ? "badge badge-purple" : "badge badge-teal";

/* ── payment mode ── */
const pmBadge = (v) =>
  v?.toLowerCase() === "online"  ? "badge badge-green" :
  v?.toLowerCase() === "offline" ? "badge badge-red"   : "badge badge-teal";

/* ════════════════════════════════════════════ */
export default function DriverDashboard() {
  const [drivers,          setDrivers]          = useState([]);
  const [search,           setSearch]           = useState("");
  const [showForm,         setShowForm]         = useState(false);
  const [editId,           setEditId]           = useState(null);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [deleteId,         setDeleteId]         = useState(null);
  const [deleteName,       setDeleteName]       = useState("");
  const [showCsvModal,     setShowCsvModal]     = useState(false);
  const [csvRows,          setCsvRows]          = useState([]);
  const [csvError,         setCsvError]         = useState("");
  const [csvUploading,     setCsvUploading]     = useState(false);
  const [csvResult,        setCsvResult]        = useState(null);
  const csvRef = useRef(null);

  /* form fields */
  const [name,        setName]        = useState("");
  const [mobile,      setMobile]      = useState("");
  const [location,    setLocation]    = useState("");
  const [bloodgrp,    setBloodgrp]    = useState("");
  const [dob,         setDob]         = useState("");
  const [age,         setAge]         = useState("");
  const [gender,      setGender]      = useState("");
  const [licenceNo,   setLicenceNo]   = useState("");
  const [feeDetails,  setFeeDetails]  = useState("");
  const [experience,  setExperience]  = useState("");
  const [car_type,    setCarType]     = useState("");
  const [paymentmode, setPaymentmode] = useState("");
  const [payactive,   setPayActive]   = useState("");
  const [status,      setStatus]      = useState("offline");
  const [formErrors,  setFormErrors]  = useState({});

  useEffect(() => {
    fetchDrivers();
    const socket = io(SOCKET_URL);
    socket.on("newbooking", (d) => alert(`New Booking: ${d.name}`));
    return () => socket.disconnect();
  }, []);

  const fetchDrivers = async () => {
    const res = await axios.get(`${BASE_URL}/api/drivers`);
    setDrivers(res.data || []);
  };

  const resetForm = () => {
    setEditId(null); setName(""); setMobile(""); setLocation(""); setAge("");
    setDob(""); setGender(""); setBloodgrp(""); setLicenceNo(""); setFeeDetails("");
    setExperience(""); setCarType(""); setPaymentmode(""); setPayActive("");
    setStatus("offline"); setFormErrors({});
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (d) => {
    setEditId(d.id); setName(d.name); setMobile(d.mobile); setLocation(d.location);
    setBloodgrp(d.bloodgrp); setDob(d.dob ? d.dob.split("T")[0] : ""); setAge(d.age);
    setGender(d.gender); setCarType(d.car_type); setLicenceNo(d.licenceNo);
    setFeeDetails(d.feeDetails); setExperience(d.experience);
    setPaymentmode(d.paymentmode); setStatus(d.status || "offline");
    setPayActive(d.payactive || ""); setFormErrors({}); setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name      = "Full name required (min 2 chars)";
    if (!/^[6-9]\d{9}$/.test(mobile))           e.mobile    = "Valid 10-digit mobile required";
    if (!gender)                                 e.gender    = "Please select gender";
    if (!payactive)                              e.payactive = "Please select pay activity";
    if (!car_type)                               e.car_type  = "Please select car type";
    if (!paymentmode)                            e.paymentmode="Please select payment mode";
    if (!feeDetails)                             e.feeDetails = "Please select fee status";
    if (dob && new Date(dob) >= new Date())      e.dob       = "DOB must be in the past";
    if (age && (isNaN(+age) || +age < 18 || +age > 80)) e.age = "Age must be 18–80";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitForm = async () => {
    if (!validate()) return;
    const body = { name, mobile, location, experience, feeDetails, dob, bloodgrp,
                   age, gender, car_type, licenceNo, paymentmode, payactive,
                   status: editId ? status : "offline" };
    if (editId) await axios.put(`${BASE_URL}/api/updatedriver/${editId}`, body);
    else        await axios.post(`${BASE_URL}/api/adddrivers`, body);
    setShowForm(false); resetForm(); fetchDrivers();
  };

  const confirmDelete = (id, n) => { setDeleteId(id); setDeleteName(n); setShowDeleteModal(true); };
  const deleteDriver = async () => {
    await axios.delete(`${BASE_URL}/api/deletedriver/${deleteId}`);
    setShowDeleteModal(false); setDeleteId(null); setDeleteName(""); fetchDrivers();
  };

  /* ── CSV ── */
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV.join("\n")], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "drivers_sample.csv"; a.click();
  };

  const parseCSVLine = (line) => {
    const result = []; let cur = ""; let inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { result.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    result.push(cur.trim());
    return result;
  };

  const handleCsvFile = (e) => {
    setCsvError(""); setCsvRows([]); setCsvResult(null);
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setCsvError("Please upload a .csv file"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setCsvError("CSV is empty"); return; }
      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g,""));
      const missing = ["name","mobile"].filter((c) => !headers.includes(c));
      if (missing.length) { setCsvError(`Missing columns: ${missing.join(", ")}`); return; }
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = parseCSVLine(lines[i]);
        const obj  = {};
        headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
        obj.status = "offline";
        rows.push(obj);
      }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const uploadCsv = async () => {
    if (!csvRows.length) return;
    setCsvUploading(true);
    let added = 0, failed = 0;
    for (const row of csvRows) {
      try {
        await axios.post(`${BASE_URL}/api/adddrivers`, {
          name: row.name, mobile: row.mobile,
          location: row.location || "", experience: row.experience || "",
          feeDetails: row.feedetails || row.feeDetails || "",
          dob: row.dob || "", bloodgrp: row.bloodgrp || "",
          age: row.age || "", gender: row.gender || "",
          car_type: row.car_type || "", licenceNo: row.licenceno || row.licenceNo || "",
          paymentmode: row.paymentmode || "", payactive: row.payactive || "",
          status: "offline",
        });
        added++;
      } catch { failed++; }
    }
    setCsvUploading(false);
    setCsvResult({ added, failed });
    fetchDrivers();
  };

  const closeCsv = () => {
    setShowCsvModal(false); setCsvRows([]); setCsvError(""); setCsvResult(null);
    if (csvRef.current) csvRef.current.value = "";
  };

  /* ── Filter + paginate ── */
  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    String(d.mobile).includes(search)
  );
  const pg = usePagination(filtered, 10);

  /* ── Stats ── */
  const totalD    = drivers.length;
  const activeD   = drivers.filter((d) => d.status?.toLowerCase() === "active").length;
  const paidFees  = drivers.filter((d) => d.feeDetails === "Paid").length;
  const autoD     = drivers.filter((d) => d.car_type?.toLowerCase().includes("automatic")).length;

  const ErrMsg = ({ k }) => formErrors[k]
    ? <span className="form-error">⚠ {formErrors[k]}</span> : null;

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Driver Management</h1>
          <p className="page-subtitle">Manage and monitor all your drivers in one place</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-ghost btn-sm" onClick={downloadSample}>⬇ Sample CSV</button>
          <button className="btn btn-success btn-sm" onClick={() => setShowCsvModal(true)}>📂 Import CSV</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add New Driver</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        {[
          { icon:"👥", label:"Total Drivers",  value:totalD,   cls:"stat-icon-box-blue"   },
          { icon:"✓",  label:"Active Drivers", value:activeD,  cls:"stat-icon-box-green"  },
          { icon:"💳", label:"Fees Paid",       value:paidFees, cls:"stat-icon-box-purple" },
          { icon:"🚗", label:"Automatic Cars", value:autoD,    cls:"stat-icon-box-amber"  },
        ].map((s) => (
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
          <h3 className="table-card-title">All Drivers</h3>
          <span className="table-record-badge">{filtered.length} Records</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["ID","Name","Mobile","Gender","Status","Pay Active","DOB · Age","Car Type","Licence","Payment","Fee Status","Location","Actions"]
                  .map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr>
                  <td colSpan="13">
                    <div className="empty-state">
                      <span className="empty-state-icon">📭</span>
                      <p className="empty-state-title">No drivers found</p>
                      <p className="empty-state-sub">Try a different search term</p>
                    </div>
                  </td>
                </tr>
              ) : pg.slice.map((d) => (
                <tr key={d.id}>
                  <td><span className="cell-id">{d.id}</span></td>
                  <td>
                    <div className="cell-name">
                      <div className="avatar">{d.name?.charAt(0).toUpperCase()}</div>
                      <span className="cell-name-text">{d.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{d.mobile}</td>
                  <td>{d.gender || "—"}</td>
                  <td><span className={statusBadgeClass(d.status)}>{statusLabel(d.status)}</span></td>
                  <td><span className={payBadge(d.payactive)}>{payLabel(d.payactive)}</span></td>
                  <td style={{ whiteSpace:"nowrap" }}>
                    {d.dob ? new Date(d.dob).toLocaleDateString("en-GB") : "—"}{" · "}{d.age || "—"}
                  </td>
                  <td><span className={carBadge(d.car_type)}>{d.car_type || "N/A"}</span></td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{d.licenceNo || "—"}</td>
                  <td><span className={pmBadge(d.paymentmode)}>{d.paymentmode || "N/A"}</span></td>
                  <td><span className={feeBadge(d.feeDetails)}>{feeLabel(d.feeDetails)}</span></td>
                  <td>
                    <div className="cell-loc">
                      <span>📍</span>
                      <span className="cell-loc-text">{d.location || "—"}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="action-edit" onClick={() => openEdit(d)}>✏️ Edit</button>
                      <button className="action-delete" onClick={() => confirmDelete(d.id, d.name)}>🗑️</button>
                    </div>
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

      {/* ══════════════════════════════
          CSV IMPORT MODAL
      ══════════════════════════════ */}
      {showCsvModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header modal-header-success">
              <div className="modal-header-inner">
                <span style={{ fontSize:26 }}>📂</span>
                <span className="modal-title">Import Drivers via CSV</span>
              </div>
              <button className="modal-close" onClick={closeCsv}>✕</button>
            </div>

            <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:22 }}>
              {/* Step 1 */}
              <div className="csv-step">
                <div className="csv-step-num">1</div>
                <div style={{ flex:1 }}>
                  <p className="csv-step-title">Download Sample CSV</p>
                  <p className="csv-step-desc">Use this template to fill in driver details.</p>
                  <button className="btn btn-outline btn-sm" onClick={downloadSample}>⬇ Download Sample</button>
                  <div className="col-chips">
                    {CSV_COLUMNS.map((c) => <span key={c} className="col-chip">{c}</span>)}
                  </div>
                  <p className="col-note">⚠ Status is always set to <strong>offline</strong> automatically.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="csv-step">
                <div className="csv-step-num">2</div>
                <div style={{ flex:1 }}>
                  <p className="csv-step-title">Upload CSV File</p>
                  <label>
                    <input ref={csvRef} type="file" accept=".csv" onChange={handleCsvFile} style={{ display:"none" }} />
                    <span className="file-drop-zone">📁 Choose CSV File</span>
                  </label>
                  {csvError && <p style={{ color:"var(--danger)", fontSize:13, marginTop:8 }}>⚠ {csvError}</p>}
                </div>
              </div>

              {/* Step 3: Preview */}
              {csvRows.length > 0 && !csvResult && (
                <div className="csv-step">
                  <div className="csv-step-num">3</div>
                  <div style={{ flex:1 }}>
                    <p className="csv-step-title">Preview ({csvRows.length} driver{csvRows.length !== 1 ? "s" : ""})</p>
                    <div className="csv-preview-wrap">
                      <table>
                        <thead>
                          <tr style={{ background:"var(--surface-2)" }}>
                            {["Name","Mobile","Gender","Car Type","Fee","Pay Active"].map((h) => (
                              <th key={h} className="csv-preview-th">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 10).map((r, i) => (
                            <tr key={i}>
                              <td className="csv-preview-td">{r.name || "—"}</td>
                              <td className="csv-preview-td">{r.mobile || "—"}</td>
                              <td className="csv-preview-td">{r.gender || "—"}</td>
                              <td className="csv-preview-td">{r.car_type || "—"}</td>
                              <td className="csv-preview-td">{r.feedetails || r.feeDetails || "—"}</td>
                              <td className="csv-preview-td">{r.payactive || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvRows.length > 10 && (
                        <p style={{ textAlign:"center", color:"var(--text-muted)", fontSize:12, padding:"6px 0" }}>
                          + {csvRows.length - 10} more rows
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-success"
                      style={{ width:"100%", opacity: csvUploading ? .65 : 1 }}
                      onClick={uploadCsv}
                      disabled={csvUploading}
                    >
                      {csvUploading ? "Importing..." : `✅ Import ${csvRows.length} Driver${csvRows.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Result */}
              {csvResult && (
                <div className="csv-result-box">
                  <span className="csv-result-emoji">{csvResult.failed === 0 ? "🎉" : "⚠️"}</span>
                  <p className="csv-result-title">Import Complete</p>
                  <div className="csv-result-counts">
                    <span className="csv-added">✅ {csvResult.added} Added</span>
                    {csvResult.failed > 0 && <span className="csv-failed">❌ {csvResult.failed} Failed</span>}
                  </div>
                  <button className="btn btn-primary" style={{ marginTop:8 }} onClick={closeCsv}>Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          ADD / EDIT DRIVER MODAL
      ══════════════════════════════ */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:26 }}>{editId ? "✏️" : "➕"}</span>
                <span className="modal-title">{editId ? "Edit Driver Details" : "Add New Driver"}</span>
              </div>
              <button className="modal-close" onClick={() => { setShowForm(false); resetForm(); }}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                {/* ── Personal ── */}
                <div className="form-section-label">👤 Personal Information</div>
                <div className="form-section-divider" />

                <div className="form-field">
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input className={`form-input${formErrors.name ? " form-input-error" : ""}`}
                    placeholder="Enter full name" value={name}
                    onChange={(e) => { setName(e.target.value); setFormErrors((p) => ({ ...p, name:"" })); }} />
                  <ErrMsg k="name" />
                </div>

                <div className="form-field">
                  <label className="form-label">Mobile Number <span className="form-required">*</span></label>
                  <input className={`form-input${formErrors.mobile ? " form-input-error" : ""}`}
                    placeholder="10-digit mobile" value={mobile} maxLength={10}
                    onChange={(e) => { setMobile(e.target.value.replace(/\D/g,"")); setFormErrors((p) => ({ ...p, mobile:"" })); }} />
                  <ErrMsg k="mobile" />
                </div>

                <div className="form-field">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={bloodgrp} onChange={(e) => setBloodgrp(e.target.value)}>
                    <option value="">Select Blood Group</option>
                    {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className={`form-input${formErrors.dob ? " form-input-error" : ""}`}
                    value={dob} max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => { setDob(e.target.value); setFormErrors((p) => ({ ...p, dob:"" })); }} />
                  <ErrMsg k="dob" />
                </div>

                <div className="form-field">
                  <label className="form-label">Age</label>
                  <input className={`form-input${formErrors.age ? " form-input-error" : ""}`}
                    placeholder="18–80" value={age} maxLength={2}
                    onChange={(e) => { setAge(e.target.value.replace(/\D/g,"")); setFormErrors((p) => ({ ...p, age:"" })); }} />
                  <ErrMsg k="age" />
                </div>

                <div className="form-field">
                  <label className="form-label">Gender <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.gender ? " form-input-error" : ""}`}
                    value={gender} onChange={(e) => { setGender(e.target.value); setFormErrors((p) => ({ ...p, gender:"" })); }}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  <ErrMsg k="gender" />
                </div>

                {/* ── Professional ── */}
                <div className="form-section-label">🚗 Professional Details</div>
                <div className="form-section-divider" />

                <div className="form-field">
                  <label className="form-label">Licence Number</label>
                  <input className="form-input" placeholder="Enter licence number" value={licenceNo}
                    onChange={(e) => setLicenceNo(e.target.value)} />
                </div>

                <div className="form-field">
                  <label className="form-label">Experience (Years)</label>
                  <input className="form-input" placeholder="Years of experience" value={experience}
                    onChange={(e) => setExperience(e.target.value.replace(/\D/g,""))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Car Type <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.car_type ? " form-input-error" : ""}`}
                    value={car_type} onChange={(e) => { setCarType(e.target.value); setFormErrors((p) => ({ ...p, car_type:"" })); }}>
                    <option value="">Select Car Type</option>
                    <option>Automatic</option><option>Manual</option><option>Both</option>
                  </select>
                  <ErrMsg k="car_type" />
                </div>

                <div className="form-field">
                  <label className="form-label">Location</label>
                  <input className="form-input" placeholder="Current location" value={location}
                    onChange={(e) => setLocation(e.target.value)} />
                </div>

                {/* ── Status ── */}
                <div className="form-section-label">⚙️ Status & Activity</div>
                <div className="form-section-divider" />

                <div className="form-field">
                  <label className="form-label">
                    Status
                    {!editId && <span className="form-hint" style={{ marginLeft:6 }}>🔒 Auto: Offline</span>}
                  </label>
                  {editId ? (
                    <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="offline">⚫ Offline</option>
                      <option value="active">🟢 Active</option>
                      <option value="inactive">🟡 Inactive</option>
                      <option value="on Duty">🔵 On Duty</option>
                      <option value="suspend">⛔ Suspended</option>
                    </select>
                  ) : (
                    <div className="readonly-display">
                      <span className="badge badge-gray">⚫ Offline</span>
                      <span className="readonly-note">Set automatically</span>
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Pay Active <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.payactive ? " form-input-error" : ""}`}
                    value={payactive} onChange={(e) => { setPayActive(e.target.value); setFormErrors((p) => ({ ...p, payactive:"" })); }}>
                    <option value="">Select Pay Activity</option>
                    <option value="Active">✅ Active</option>
                    <option value="Deactive">🚫 Deactive</option>
                  </select>
                  <ErrMsg k="payactive" />
                </div>

                {/* ── Payment ── */}
                <div className="form-section-label">💳 Payment Information</div>
                <div className="form-section-divider" />

                <div className="form-field">
                  <label className="form-label">Payment Mode <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.paymentmode ? " form-input-error" : ""}`}
                    value={paymentmode} onChange={(e) => { setPaymentmode(e.target.value); setFormErrors((p) => ({ ...p, paymentmode:"" })); }}>
                    <option value="">Select Payment Mode</option>
                    <option>Online</option><option>Offline</option><option>Both</option>
                  </select>
                  <ErrMsg k="paymentmode" />
                </div>

                <div className="form-field">
                  <label className="form-label">Fee Status <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.feeDetails ? " form-input-error" : ""}`}
                    value={feeDetails} onChange={(e) => { setFeeDetails(e.target.value); setFormErrors((p) => ({ ...p, feeDetails:"" })); }}>
                    <option value="">Select Fee Status</option>
                    <option value="Paid">✅ Paid</option>
                    <option value="Not Paid">❌ Not Paid</option>
                    <option value="Pending">⏳ Pending</option>
                  </select>
                  <ErrMsg k="feeDetails" />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={submitForm}>
                {editId ? "Update Driver" : "Add Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header modal-header-danger">
              <div className="modal-header-inner">
                <span style={{ fontSize:22 }}>🗑️</span>
                <span className="modal-title">Delete Driver</span>
              </div>
              <button className="modal-close" onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign:"center" }}>
              <div className="delete-icon-ring">🗑️</div>
              <p className="delete-modal-text">Are you sure?</p>
              <p className="delete-modal-subtext">
                You are about to delete <strong>"{deleteName}"</strong>. This cannot be undone.
              </p>
              <span className="delete-warning-pill">⚠ Irreversible Action</span>
            </div>
            <div className="modal-footer" style={{ justifyContent:"center", gap:14 }}>
              <button className="btn btn-ghost" onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteDriver}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}