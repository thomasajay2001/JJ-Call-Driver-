import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { PaginationBar, usePagination } from "../hooks/Usepagination";
import { useDrivers } from "../hooks/useDrivers";

const SOCKET_URL = "http://localhost:3000";
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const CSV_COLUMNS = [
  "driver_no", "name", "father_name", "driver_dob", "qualification", "blood_group",
  "expr", "badge_no", "join_date", "mobile", "alt_no", "cur_address", "per_address",
  "region", "bike_status", "driver_status", "status", "remarks", "engaged",
  "license_expiry_date", "location", "experience", "feeDetails", "bloodgrp", "age",
  "gender", "car_type", "licenceNo", "paymentmode", "payactive",
];
const SAMPLE_CSV = [
  "driver_no,name,father_name,driver_dob,qualification,blood_group,expr,badge_no,join_date,mobile,alt_no,cur_address,per_address,region,bike_status,driver_status,status,remarks,engaged,license_expiry_date,location,experience,feeDetails,bloodgrp,age,gender,car_type,licenceNo,paymentmode,payactive",
  "DRV001,Ravi Kumar,Suresh Kumar,1990-05-15,10th,O+,5,B1234,2020-01-10,9876543210,9876500000,12 Main St Chennai,45 Park Ave Chennai,South,Active,Active,active,,No,2028-05-15,Chennai,5,Paid,O+,34,Male,Automatic,TN01-20190001234,Online,Active",
  "DRV002,Priya Devi,Murugan,1995-08-22,12th,B+,3,B5678,2021-06-01,9123456789,9123400000,7 Anna Nagar Tambaram,7 Anna Nagar Tambaram,North,Inactive,Active,active,,No,2027-08-22,Tambaram,3,Pending,B+,29,Female,Manual,TN01-20210005678,Offline,Active",
];

/* ── status helpers ── */
const STATUS_BADGE = {
  active: "badge badge-green", inactive: "badge badge-amber",
  "on duty": "badge badge-blue", suspend: "badge badge-red",
  offline: "badge badge-gray", online: "badge badge-teal",
};
const STATUS_LABEL = {
  active: "🟢 Active", inactive: "🟡 Inactive", "on duty": "🔵 On Duty",
  suspend: "⛔ Suspended", offline: "⚫ Offline", online: "🟢 Online",
};
const statusBadgeClass = (s) => STATUS_BADGE[s?.toLowerCase()] || "badge badge-gray";
const statusLabel      = (s) => STATUS_LABEL[s?.toLowerCase()] || s || "N/A";

const payBadge  = (v) => v?.toLowerCase() === "active" ? "badge badge-green" : v?.toLowerCase() === "deactive" ? "badge badge-red" : "badge badge-gray";
const payLabel  = (v) => v?.toLowerCase() === "active" ? "✅ Active" : v?.toLowerCase() === "deactive" ? "🚫 Deactive" : "— N/A";
const feeBadge  = (v) => v === "Paid" ? "badge badge-green" : v === "Pending" ? "badge badge-amber" : "badge badge-red";
const feeLabel  = (v) => v === "Paid" ? "✅ Paid" : v === "Pending" ? "⏳ Pending" : "❌ Not Paid";
const carBadge  = (v) => v?.toLowerCase() === "automatic" ? "badge badge-blue" : v?.toLowerCase() === "manual" ? "badge badge-purple" : "badge badge-teal";
const pmBadge   = (v) => v?.toLowerCase() === "online" ? "badge badge-green" : v?.toLowerCase() === "offline" ? "badge badge-red" : "badge badge-teal";
const bikeBadge = (v) => v?.toLowerCase() === "active" ? "badge badge-green" : v?.toLowerCase() === "inactive" ? "badge badge-amber" : "badge badge-gray";
const engagedBadge = (v) => v?.toLowerCase() === "yes" ? "badge badge-blue" : "badge badge-gray";

const fmt = (date) => date ? new Date(date).toLocaleDateString("en-GB") : "—";

/* ════════════════════════════════════════════ */
export default function DriverDashboard() {
  const { drivers, refresh: fetchDrivers } = useDrivers();

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

  // ── View modal ──
  const [viewDriver, setViewDriver] = useState(null);

  /* ── form fields ── */
  const [name, setName] = useState(""); const [mobile, setMobile] = useState(""); const [location, setLocation] = useState("");
  const [bloodgrp, setBloodgrp] = useState(""); const [dob, setDob] = useState(""); const [age, setAge] = useState("");
  const [gender, setGender] = useState(""); const [licenceNo, setLicenceNo] = useState(""); const [feeDetails, setFeeDetails] = useState("");
  const [experience, setExperience] = useState(""); const [car_type, setCarType] = useState(""); const [paymentmode, setPaymentmode] = useState("");
  const [payactive, setPayActive] = useState(""); const [status, setStatus] = useState("offline");
  const [driverNo, setDriverNo] = useState(""); const [fatherName, setFatherName] = useState(""); const [qualification, setQualification] = useState("");
  const [badgeNo, setBadgeNo] = useState(""); const [joinDate, setJoinDate] = useState(""); const [altNo, setAltNo] = useState("");
  const [curAddress, setCurAddress] = useState(""); const [perAddress, setPerAddress] = useState(""); const [region, setRegion] = useState("");
  const [bikeStatus, setBikeStatus] = useState(""); const [driverStatus, setDriverStatus] = useState(""); const [remarks, setRemarks] = useState("");
  const [engaged, setEngaged] = useState(""); const [licenseExpiryDate, setLicenseExpiryDate] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const resetForm = () => {
    setEditId(null);
    setName(""); setMobile(""); setLocation(""); setAge(""); setDob(""); setGender(""); setBloodgrp("");
    setLicenceNo(""); setFeeDetails(""); setExperience(""); setCarType(""); setPaymentmode(""); setPayActive(""); setStatus("offline");
    setDriverNo(""); setFatherName(""); setQualification(""); setBadgeNo(""); setJoinDate(""); setAltNo("");
    setCurAddress(""); setPerAddress(""); setRegion(""); setBikeStatus(""); setDriverStatus(""); setRemarks("");
    setEngaged(""); setLicenseExpiryDate(""); setPassword(""); setShowPassword(false); setFormErrors({});
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit   = (d) => {
    setEditId(d.id);
    setName(d.name); setMobile(d.mobile); setLocation(d.location); setBloodgrp(d.bloodgrp);
    setDob(d.dob ? d.dob.split("T")[0] : ""); setAge(d.age); setGender(d.gender); setCarType(d.car_type);
    setLicenceNo(d.licenceNo); setFeeDetails(d.feeDetails); setExperience(d.experience);
    setPaymentmode(d.paymentmode); setStatus(d.status || "offline"); setPayActive(d.payactive || "");
    setDriverNo(d.driver_no || ""); setFatherName(d.father_name || ""); setQualification(d.qualification || "");
    setBadgeNo(d.badge_no || ""); setJoinDate(d.join_date ? d.join_date.split("T")[0] : "");
    setAltNo(d.alt_no || ""); setCurAddress(d.cur_address || ""); setPerAddress(d.per_address || "");
    setRegion(d.region || ""); setBikeStatus(d.bike_status || ""); setDriverStatus(d.driver_status || "");
    setRemarks(d.remarks || ""); setEngaged(d.engaged || "");
    setLicenseExpiryDate(d.license_expiry_date ? d.license_expiry_date.split("T")[0] : "");
    setPassword("");
    setFormErrors({}); setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Full name required (min 2 chars)";
    if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = "Valid 10-digit mobile required";
    if (!gender) e.gender = "Please select gender";
    if (!payactive) e.payactive = "Please select pay activity";
    if (!car_type) e.car_type = "Please select car type";
    if (!paymentmode) e.paymentmode = "Please select payment mode";
    if (!feeDetails) e.feeDetails = "Please select fee status";
    if (dob && new Date(dob) >= new Date()) e.dob = "DOB must be in the past";
    if (age && (isNaN(+age) || +age < 18 || +age > 80)) e.age = "Age must be 18–80";
    if (altNo && !/^\d{10}$/.test(altNo)) e.altNo = "Alternate number must be 10 digits";
    if (password && password.trim().length < 4) e.password = "Password must be at least 4 characters";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitForm = async () => {
    if (!validate()) return;
    const body = {
      name, mobile, location, experience, feeDetails, dob, bloodgrp, age, gender, car_type,
      licenceNo, paymentmode, payactive, status: editId ? status : "offline",
      driver_no: driverNo, father_name: fatherName, qualification, badge_no: badgeNo,
      join_date: joinDate, alt_no: altNo, cur_address: curAddress, per_address: perAddress,
      region, bike_status, driver_status, remarks, engaged,
      license_expiry_date: licenseExpiryDate,
      password,
    };
    if (editId) await axios.put(`${BASE_URL}/api/updatedriver/${editId}`, body);
    else        await axios.post(`${BASE_URL}/api/adddrivers`, body);
    setShowForm(false); resetForm(); fetchDrivers();
  };

  const confirmDelete = (id, n) => { setDeleteId(id); setDeleteName(n); setShowDeleteModal(true); };
  const deleteDriver  = async () => {
    await axios.delete(`${BASE_URL}/api/deletedriver/${deleteId}`);
    setShowDeleteModal(false); setDeleteId(null); setDeleteName(""); fetchDrivers();
  };

  /* ── CSV ── */
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV.join("\n")], { type: "text/csv" });
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
    result.push(cur.trim()); return result;
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
      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
      const missing = ["name", "mobile"].filter((c) => !headers.includes(c));
      if (missing.length) { setCsvError(`Missing columns: ${missing.join(", ")}`); return; }
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = parseCSVLine(lines[i]);
        const obj = {}; headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
        obj.status = "offline"; rows.push(obj);
      }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };
  const uploadCsv = async () => {
    if (!csvRows.length) return;
    setCsvUploading(true); let added = 0, failed = 0;
    for (const row of csvRows) {
      try {
        await axios.post(`${BASE_URL}/api/adddrivers`, {
          name: row.name, mobile: row.mobile, location: row.location || "",
          experience: row.experience || row.expr || "", feeDetails: row.feedetails || row.feeDetails || "",
          dob: row.dob || row.driver_dob || "", bloodgrp: row.bloodgrp || row.blood_group || "",
          age: row.age || "", gender: row.gender || "", car_type: row.car_type || "",
          licenceNo: row.licenceno || row.licenceNo || "", paymentmode: row.paymentmode || "",
          payactive: row.payactive || "", status: "offline",
          driver_no: row.driver_no || "", father_name: row.father_name || "",
          qualification: row.qualification || "", badge_no: row.badge_no || "",
          join_date: row.join_date || "", alt_no: row.alt_no || "",
          cur_address: row.cur_address || "", per_address: row.per_address || "",
          region: row.region || "", bike_status: row.bike_status || "",
          driver_status: row.driver_status || "", remarks: row.remarks || "",
          engaged: row.engaged || "", license_expiry_date: row.license_expiry_date || "",
        });
        added++;
      } catch { failed++; }
    }
    setCsvUploading(false); setCsvResult({ added, failed }); fetchDrivers();
  };
  const calculateAge = (date) => {
    if (!date) return "";
    const today = new Date(), birthDate = new Date(date);
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a >= 0 ? a : "";
  };
  const closeCsv = () => {
    setShowCsvModal(false); setCsvRows([]); setCsvError(""); setCsvResult(null);
    if (csvRef.current) csvRef.current.value = "";
  };

  /* ── Filter + paginate ── */
  const filtered = drivers.filter((d) =>
    (d.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    String(d.mobile ?? "").includes(search) ||
    (d.driver_no ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.region ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const pg = usePagination(filtered, 10);

  /* ── Stats ── */
  const totalD    = drivers.length;
  const activeD   = drivers.filter((d) => d.driver_status?.toLowerCase() === "active").length;
  const paidFees  = drivers.filter((d) => d.feeDetails === "Paid").length;
  const autoD     = drivers.filter((d) => d.car_type?.toLowerCase().includes("automatic") || d.car_type?.toLowerCase().includes("both")).length;
  const engagedD  = drivers.filter((d) => d.engaged?.toLowerCase() === "yes").length;

  const ErrMsg = ({ k }) => formErrors[k] ? <span className="form-error">⚠ {formErrors[k]}</span> : null;

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header page-header-mobile">
        <div className="page-header-left">
          <h1 className="page-title">Driver Management</h1>
          <p className="page-subtitle">Manage and monitor all your drivers in one place</p>
        </div>
        <div className="page-header-right page-header-right-mobile">
          <button className="btn btn-ghost btn-sm" onClick={downloadSample}>⬇ Sample CSV</button>
          <button className="btn btn-success btn-sm" onClick={() => setShowCsvModal(true)}>📂 Import CSV</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add New Driver</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        {[
          { icon:"👥", label:"Total Drivers",      value:totalD,   cls:"stat-icon-box-blue"   },
          { icon:"✓",  label:"Active Drivers",      value:activeD,  cls:"stat-icon-box-green"  },
          { icon:"🚗", label:"Automatic Cars",      value:autoD,    cls:"stat-icon-box-amber"  },
          { icon:"🔵", label:"Currently Engaged",   value:engagedD, cls:"stat-icon-box-blue"   },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon-box ${s.cls}`}><span>{s.icon}</span></div>
            <div><p className="stat-label">{s.label}</p><h3 className="stat-value">{s.value}</h3></div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="search-bar">
        <div className="search-wrap">
          <span className="search-icon-pos">🔍</span>
          <input className="search-input" placeholder="Search by name, mobile, driver no or region..."
            value={search} onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }} />
        </div>
        <span className="search-result-count">
          Showing <strong>{pg.startDisplay}–{pg.endDisplay}</strong> of <strong>{pg.total}</strong>
        </span>
      </div>

      {/* ── Table (slim) ── */}
      <div className="table-card">
        <div className="table-card-header">
          <h3 className="table-card-title">All Drivers</h3>
          <span className="table-record-badge">{filtered.length} Records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["ID", "Driver No", "Name", "Mobile", "Region", "Driver Status", "Actions"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <p className="empty-state-title">No drivers found</p>
                    <p className="empty-state-sub">Try a different search term</p>
                  </div>
                </td></tr>
              ) : pg.slice.map((d) => (
                <tr key={d.id}>
                  <td><span className="cell-id">{d.id}</span></td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{d.driver_no || "—"}</td>
                  <td>
                    <div className="cell-name">
                      <div className="avatar">{d.name?.charAt(0).toUpperCase()}</div>
                      <span className="cell-name-text">{d.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{d.mobile}</td>
                  <td>{d.region || "—"}</td>
                  <td><span className={statusBadgeClass(d.driver_status)}>{statusLabel(d.driver_status)}</span></td>
                  <td>
                    <div style={{ display:"flex", gap:6 }}>
                      <button style={{padding:"5px 10px",background:"#EFF6FF",color:"#2563EB",border:"1.5px solid #BFDBFE",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}} onClick={() => setViewDriver(d)}>👁 View</button>
                      <button className="action-edit" onClick={() => openEdit(d)}>✏️ Edit</button>
                      <button className="action-delete" onClick={() => confirmDelete(d.id, d.name)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <PaginationBar pg={pg} onPageChange={pg.setPage}
            onSizeChange={(size) => { pg.setPageSize(size); pg.setPage(1); }} />
        )}
      </div>

      {/* ══════════════════════════════════════════════
          VIEW DRIVER FULL DETAILS MODAL
      ══════════════════════════════════════════════ */}
      {viewDriver && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-lg" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <div style={V.avatarLg}>{viewDriver.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <span className="modal-title">{viewDriver.name}</span>
                  <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    <span className={statusBadgeClass(viewDriver.status)}>{statusLabel(viewDriver.status)}</span>
                    <span className={statusBadgeClass(viewDriver.driver_status)}>{statusLabel(viewDriver.driver_status)}</span>
                    {viewDriver.driver_no && <span className="badge badge-gray" style={{ fontFamily:"monospace" }}>#{viewDriver.driver_no}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button className="action-edit" onClick={() => { setViewDriver(null); openEdit(viewDriver); }}>✏️ Edit</button>
                <button className="modal-close" onClick={() => setViewDriver(null)}>✕</button>
              </div>
            </div>

            <div className="modal-body">

              {/* ── Personal ── */}
              <div className="form-section-label">👤 Personal Information</div>
              <div className="form-section-divider" />
              <div style={V.grid}>
                <V.Field label="Driver No"     value={viewDriver.driver_no} mono />
                <V.Field label="Full Name"     value={viewDriver.name} />
                <V.Field label="Father's Name" value={viewDriver.father_name} />
                <V.Field label="Mobile"        value={viewDriver.mobile} mono />
                <V.Field label="Alternate No"  value={viewDriver.alt_no} mono />
                <V.Field label="Blood Group"   value={viewDriver.bloodgrp} />
                <V.Field label="Date of Birth" value={fmt(viewDriver.dob)} />
                <V.Field label="Age"           value={viewDriver.age} />
                <V.Field label="Gender"        value={viewDriver.gender} />
                <V.Field label="Qualification" value={viewDriver.qualification} />
              </div>

              {/* ── Address ── */}
              <div className="form-section-label" style={{ marginTop:16 }}>🏠 Address</div>
              <div className="form-section-divider" />
              <div style={V.grid}>
                <V.Field label="Region"           value={viewDriver.region} />
                <V.Field label="Location"         value={viewDriver.location} />
                <V.Field label="Current Address"  value={viewDriver.cur_address}  full />
                <V.Field label="Permanent Address" value={viewDriver.per_address} full />
              </div>

              {/* ── Professional ── */}
              <div className="form-section-label" style={{ marginTop:16 }}>🚗 Professional Details</div>
              <div className="form-section-divider" />
              <div style={V.grid}>
                <V.Field label="Badge No"        value={viewDriver.badge_no} mono />
                <V.Field label="Join Date"       value={fmt(viewDriver.join_date)} />
                <V.Field label="Licence No"      value={viewDriver.licenceNo} mono />
                <V.Field label="Licence Expiry"  value={fmt(viewDriver.license_expiry_date)} />
                <V.Field label="Experience"      value={viewDriver.experience ? `${viewDriver.experience} yrs` : null} />
                <V.Field label="Car Type"        value={viewDriver.car_type} badge={viewDriver.car_type ? <span className={carBadge(viewDriver.car_type)}>{viewDriver.car_type}</span> : null} />
                <V.Field label="Bike Status"     value={viewDriver.bike_status} badge={viewDriver.bike_status ? <span className={bikeBadge(viewDriver.bike_status)}>{viewDriver.bike_status}</span> : null} />
                <V.Field label="Engaged"         value={viewDriver.engaged} badge={<span className={engagedBadge(viewDriver.engaged)}>{viewDriver.engaged?.toLowerCase() === "yes" ? "🔵 Yes" : viewDriver.engaged || "—"}</span>} />
              </div>

              {/* ── Status & Payment ── */}
              <div className="form-section-label" style={{ marginTop:16 }}>⚙️ Status & Payment</div>
              <div className="form-section-divider" />
              <div style={V.grid}>
                <V.Field label="Status"         badge={<span className={statusBadgeClass(viewDriver.status)}>{statusLabel(viewDriver.status)}</span>} />
                <V.Field label="Driver Status"  badge={<span className={statusBadgeClass(viewDriver.driver_status)}>{statusLabel(viewDriver.driver_status)}</span>} />
                <V.Field label="Pay Active"     badge={<span className={payBadge(viewDriver.payactive)}>{payLabel(viewDriver.payactive)}</span>} />
                <V.Field label="Payment Mode"   badge={<span className={pmBadge(viewDriver.paymentmode)}>{viewDriver.paymentmode || "—"}</span>} />
                <V.Field label="Fee Status"     badge={<span className={feeBadge(viewDriver.feeDetails)}>{feeLabel(viewDriver.feeDetails)}</span>} />
              </div>

              {/* ── Remarks ── */}
              {viewDriver.remarks && (
                <>
                  <div className="form-section-label" style={{ marginTop:16 }}>📝 Remarks</div>
                  <div className="form-section-divider" />
                  <div style={V.remarksBox}>{viewDriver.remarks}</div>
                </>
              )}

            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewDriver(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setViewDriver(null); openEdit(viewDriver); }}>✏️ Edit Driver</button>
            </div>
          </div>
        </div>
      )}

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
              <div className="csv-step">
                <div className="csv-step-num">1</div>
                <div style={{ flex:1 }}>
                  <p className="csv-step-title">Download Sample CSV</p>
                  <p className="csv-step-desc">Use this template to fill in driver details.</p>
                  <button className="btn btn-outline btn-sm" onClick={downloadSample}>⬇ Download Sample</button>
                  <div className="col-chips">{CSV_COLUMNS.map((c) => <span key={c} className="col-chip">{c}</span>)}</div>
                  <p className="col-note">⚠ Status is always set to <strong>offline</strong> automatically.</p>
                </div>
              </div>
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
              {csvRows.length > 0 && !csvResult && (
                <div className="csv-step">
                  <div className="csv-step-num">3</div>
                  <div style={{ flex:1 }}>
                    <p className="csv-step-title">Preview ({csvRows.length} driver{csvRows.length !== 1 ? "s" : ""})</p>
                    <div className="csv-preview-wrap">
                      <table>
                        <thead>
                          <tr style={{ background:"var(--surface-2)" }}>
                            {["Driver No","Name","Father Name","Mobile","Region","Badge No","Engaged","Fee"].map((h) => (
                              <th key={h} className="csv-preview-th">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 10).map((r, i) => (
                            <tr key={i}>
                              <td className="csv-preview-td">{r.driver_no || "—"}</td>
                              <td className="csv-preview-td">{r.name || "—"}</td>
                              <td className="csv-preview-td">{r.father_name || "—"}</td>
                              <td className="csv-preview-td">{r.mobile || "—"}</td>
                              <td className="csv-preview-td">{r.region || "—"}</td>
                              <td className="csv-preview-td">{r.badge_no || "—"}</td>
                              <td className="csv-preview-td">{r.engaged || "—"}</td>
                              <td className="csv-preview-td">{r.feedetails || r.feeDetails || "—"}</td>
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
                    <button className="btn btn-success" style={{ width:"100%", opacity:csvUploading ? .65 : 1 }}
                      onClick={uploadCsv} disabled={csvUploading}>
                      {csvUploading ? "Importing..." : `✅ Import ${csvRows.length} Driver${csvRows.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              )}
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
                <div className="form-section-label">👤 Personal Information</div>
                <div className="form-section-divider" />

                <div className="form-field">
                  <label className="form-label">Driver No</label>
                  <input className="form-input" placeholder="e.g. DRV001" value={driverNo} onChange={(e) => setDriverNo(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input className={`form-input${formErrors.name ? " form-input-error" : ""}`} placeholder="Enter full name" value={name}
                    onChange={(e) => { setName(e.target.value); setFormErrors((p) => ({ ...p, name:"" })); }} />
                  <ErrMsg k="name" />
                </div>
                <div className="form-field">
                  <label className="form-label">Father's Name</label>
                  <input className="form-input" placeholder="Father's full name" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Mobile Number <span className="form-required">*</span></label>
                  <input className={`form-input${formErrors.mobile ? " form-input-error" : ""}`} placeholder="10-digit mobile" value={mobile} maxLength={10}
                    onChange={(e) => { setMobile(e.target.value.replace(/\D/g,"")); setFormErrors((p) => ({ ...p, mobile:"" })); }} />
                  <ErrMsg k="mobile" />
                </div>
                <div className="form-field">
                  <label className="form-label">Alternate Number</label>
                  <input className={`form-input${formErrors.altNo ? " form-input-error" : ""}`} placeholder="10-digit alternate number" value={altNo} maxLength={10}
                    onChange={(e) => { setAltNo(e.target.value.replace(/\D/g,"")); setFormErrors((p) => ({ ...p, altNo:"" })); }} />
                  <ErrMsg k="altNo" />
                </div>
                <div className="form-field">
                  <label className="form-label">Password {editId ? <span className="form-hint">Leave blank to keep current password</span> : <span className="form-hint">Default is 123456 if left blank</span>}</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} className={`form-input${formErrors.password ? " form-input-error" : ""}`} placeholder={editId ? "Enter new password to update" : "Set initial password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); setFormErrors((p) => ({ ...p, password:"" })); }} style={{ paddingRight: 42 }} />
                    <button type="button" className="profile-eye-btn" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  <ErrMsg k="password" />
                </div>
                <div className="form-field">                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={bloodgrp} onChange={(e) => setBloodgrp(e.target.value)}>
                    <option value="">Select Blood Group</option>
                    {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className={`form-input${formErrors.dob ? " form-input-error" : ""}`} value={dob}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => { setDob(e.target.value); setAge(calculateAge(e.target.value)); setFormErrors((p) => ({ ...p, dob:"" })); }} />
                  <ErrMsg k="dob" />
                </div>
                <div className="form-field">
                  <label className="form-label">Age</label>
                  <input className="form-input" value={age} readOnly placeholder="Auto calculated" />
                  <ErrMsg k="age" />
                </div>
                <div className="form-field">
                  <label className="form-label">Gender <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.gender ? " form-input-error" : ""}`} value={gender}
                    onChange={(e) => { setGender(e.target.value); setFormErrors((p) => ({ ...p, gender:"" })); }}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  <ErrMsg k="gender" />
                </div>
                <div className="form-field">
                  <label className="form-label">Qualification</label>
                  <select className="form-select" value={qualification} onChange={(e) => setQualification(e.target.value)}>
                    <option value="">Select Qualification</option>
                    {["8th","10th","12th","Diploma","Graduate","Post Graduate","Other"].map((q) => <option key={q}>{q}</option>)}
                  </select>
                </div>

                <div className="form-section-label">🏠 Address Information</div>
                <div className="form-section-divider" />
                <div className="form-field" style={{ gridColumn:"1 / -1" }}>
                  <label className="form-label">Current Address</label>
                  <textarea className="form-input" rows={2} placeholder="Current residential address" value={curAddress}
                    onChange={(e) => setCurAddress(e.target.value)} style={{ resize:"vertical" }} />
                </div>
                <div className="form-field" style={{ gridColumn:"1 / -1" }}>
                  <label className="form-label">Permanent Address</label>
                  <textarea className="form-input" rows={2} placeholder="Permanent residential address" value={perAddress}
                    onChange={(e) => setPerAddress(e.target.value)} style={{ resize:"vertical" }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Region</label>
                  <input className="form-input" placeholder="e.g. South, North, East" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Location</label>
                  <input className="form-input" placeholder="Current city/area" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>

                <div className="form-section-label">🚗 Professional Details</div>
                <div className="form-section-divider" />
                <div className="form-field">
                  <label className="form-label">Badge Number</label>
                  <input className="form-input" placeholder="e.g. B1234" value={badgeNo} onChange={(e) => setBadgeNo(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Join Date</label>
                  <input type="date" className="form-input" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Licence Number</label>
                  <input className="form-input" placeholder="Enter licence number" value={licenceNo} onChange={(e) => setLicenceNo(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Licence Expiry Date</label>
                  <input type="date" className="form-input" value={licenseExpiryDate} onChange={(e) => setLicenseExpiryDate(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Experience (Years)</label>
                  <input className="form-input" placeholder="Years of experience" value={experience} onChange={(e) => setExperience(e.target.value.replace(/\D/g,""))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Car Type <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.car_type ? " form-input-error" : ""}`} value={car_type}
                    onChange={(e) => { setCarType(e.target.value); setFormErrors((p) => ({ ...p, car_type:"" })); }}>
                    <option value="">Select Car Type</option>
                    <option>Automatic</option><option>Manual</option><option>Both</option>
                  </select>
                  <ErrMsg k="car_type" />
                </div>
                <div className="form-field">
                  <label className="form-label">Bike Status</label>
                  <select className="form-select" value={bikeStatus} onChange={(e) => setBikeStatus(e.target.value)}>
                    <option value="">Select Bike Status</option>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Engaged</label>
                  <select className="form-select" value={engaged} onChange={(e) => setEngaged(e.target.value)}>
                    <option value="">Select Engagement</option>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>

                <div className="form-section-label">⚙️ Status & Activity</div>
                <div className="form-section-divider" />
                <div className="form-field">
                  <label className="form-label">
                    Status {!editId && <span className="form-hint" style={{ marginLeft:6 }}>🔒 Auto: Offline</span>}
                  </label>
                  {editId ? (
                    <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="offline">⚫ Offline</option>
                      <option value="online">🟢 online</option>
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
                  <label className="form-label">Driver Status</label>
                  <select className="form-select" value={driverStatus} onChange={(e) => setDriverStatus(e.target.value)}>
                    <option value="">Select Driver Status</option>
                    <option value="active">🟢 Active</option>
                    <option value="inactive">🟡 Inactive</option>
                    <option value="suspend">⛔ Suspended</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Pay Active <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.payactive ? " form-input-error" : ""}`} value={payactive}
                    onChange={(e) => { setPayActive(e.target.value); setFormErrors((p) => ({ ...p, payactive:"" })); }}>
                    <option value="">Select Pay Activity</option>
                    <option value="Active">✅ Active</option>
                    <option value="Deactive">🚫 Deactive</option>
                  </select>
                  <ErrMsg k="payactive" />
                </div>

                <div className="form-section-label">💳 Payment Information</div>
                <div className="form-section-divider" />
                <div className="form-field">
                  <label className="form-label">Payment Mode <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.paymentmode ? " form-input-error" : ""}`} value={paymentmode}
                    onChange={(e) => { setPaymentmode(e.target.value); setFormErrors((p) => ({ ...p, paymentmode:"" })); }}>
                    <option value="">Select Payment Mode</option>
                    <option>Online</option><option>Offline</option><option>Both</option>
                  </select>
                  <ErrMsg k="paymentmode" />
                </div>
                <div className="form-field">
                  <label className="form-label">Fee Status <span className="form-required">*</span></label>
                  <select className={`form-select${formErrors.feeDetails ? " form-input-error" : ""}`} value={feeDetails}
                    onChange={(e) => { setFeeDetails(e.target.value); setFormErrors((p) => ({ ...p, feeDetails:"" })); }}>
                    <option value="">Select Fee Status</option>
                    <option value="Paid">✅ Paid</option>
                    <option value="Not Paid">❌ Not Paid</option>
                    <option value="Pending">⏳ Pending</option>
                  </select>
                  <ErrMsg k="feeDetails" />
                </div>

                <div className="form-section-label">📝 Additional Notes</div>
                <div className="form-section-divider" />
                <div className="form-field" style={{ gridColumn:"1 / -1" }}>
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows={3} placeholder="Any additional remarks..." value={remarks}
                    onChange={(e) => setRemarks(e.target.value)} style={{ resize:"vertical" }} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={submitForm}>{editId ? "Update Driver" : "Add Driver"}</button>
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
              <p className="delete-modal-subtext">You are about to delete <strong>"{deleteName}"</strong>. This cannot be undone.</p>
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

/* ══════════════════════════════════════════════
   View modal helper components & styles
══════════════════════════════════════════════ */

// Field component for view modal
const Field = ({ label, value, mono, full, badge }) => (
  <div style={{ ...(full ? { gridColumn:"1 / -1" } : {}) }}>
    <p style={V.fieldLabel}>{label}</p>
    {badge
      ? <div style={{ marginTop:2 }}>{badge}</div>
      : <p style={{ ...V.fieldValue, ...(mono ? { fontFamily:"monospace", fontSize:13 } : {}) }}>
          {value || "—"}
        </p>
    }
  </div>
);

const V = {
  Field,
  grid:       { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:"14px 20px", marginBottom:4 },
  fieldLabel: { margin:0, fontSize:11, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.4px" },
  fieldValue: { margin:"3px 0 0", fontSize:13, fontWeight:600, color:"#1E293B" },
  avatarLg:   { width:44, height:44, borderRadius:"50%", backgroundColor:"#2563EB", color:"#fff", fontSize:20, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  remarksBox: { backgroundColor:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#475569", lineHeight:1.6 },
};
