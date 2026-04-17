import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

/* ═══════════════════════════════════════════════════
   MasterSettings — Admin Panel
   • Matches DriverDashboard modal / table patterns exactly
   • VIEW  → table-card (same as DriverDashboard)
   • EDIT  → modal-overlay → modal modal-lg
   ═══════════════════════════════════════════════════ */

export default function MasterSettings() {
  const fileRef = useRef();

  /* ── state ── */
  const [saved, setSaved] = useState({
    logo_url: null, logo_name: null,
    base_hours: null, base_fare: null, extra_per_hr: null, outstation_extra: null, updated_at: null,  // ADD outstation_extra
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [baseHours, setBaseHours] = useState("");
  const [baseFare, setBaseFare] = useState("");
  const [extraPerHr, setExtraPerHr] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [outstationExtra, setOutstationExtra] = useState("");

  /* ── load ── */
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/admin/master-settings`);
      setSaved(data);
    } catch { }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchSettings(); }, []);

  /* ── toast ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── open edit — pre-fill ── */
  const openEdit = () => {
    setLogoPreview(saved.logo_url || null);
    setLogoFile(null);
    setBaseHours(saved.base_hours ?? "");
    setBaseFare(saved.base_fare ?? "");
    setExtraPerHr(saved.extra_per_hr ?? "");
    setExtraPerHr(saved.extra_per_hr ?? "");
    setOutstationExtra(saved.outstation_extra ?? "");
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setLogoFile(null);
    setFormErrors({});
  };

  /* ── logo pick ── */
  const handleLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: "error", msg: "Logo must be under 2 MB" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  /* ── remove logo ── */
  const handleRemoveLogo = async () => {
    try {
      await axios.delete(`${BASE_URL}/api/admin/master-settings/logo`);
      setLogoPreview(null);
      setLogoFile(null);
      setSaved(p => ({ ...p, logo_url: null, logo_name: null }));
      setToast({ type: "success", msg: "Logo removed" });
    } catch {
      setToast({ type: "error", msg: "Failed to remove logo" });
    }
  };

  /* ── validate ── */
  const validate = () => {
    const e = {};
    if (!baseHours || Number(baseHours) < 1) e.base_hours = "Base hours must be ≥ 1";
    if (!baseFare || Number(baseFare) < 1) e.base_fare = "Base fare must be ≥ ₹1";
    if (extraPerHr === "" || Number(extraPerHr) < 0) e.extra_per_hr = "Extra/hr cannot be negative";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── save ── */
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("base_hours", baseHours);
      fd.append("base_fare", baseFare);
      fd.append("extra_per_hr", extraPerHr);
      fd.append("outstation_extra", outstationExtra);
      if (logoFile) fd.append("logo", logoFile);
      const { data } = await axios.post(`${BASE_URL}/api/admin/master-settings`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSaved(data);
      setLogoFile(null);
      closeForm();
      setToast({ type: "success", msg: "Settings saved successfully!" });
    } catch (e) {
      setToast({ type: "error", msg: e?.response?.data?.message || "Save failed" });
    } finally { setSaving(false); }
  };

  const fmtDate = (val) => {
    if (!val) return "—";
    const d = new Date(val);
    return isNaN(d) ? "—" : d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const exampleFare = saved.base_fare != null && saved.extra_per_hr != null
    ? Number(saved.base_fare) + Number(saved.extra_per_hr) : null;

  const hrs = Number(baseHours) || 0;
  const fare = Number(baseFare) || 0;
  const xtra = Number(extraPerHr) || 0;

  const ErrMsg = ({ k }) => formErrors[k]
    ? <span className="form-error">⚠ {formErrors[k]}</span>
    : null;

  return (
    <div>

      {/* ── Page Header ── */}
      <div className="page-header page-header-mobile">
        <div className="page-header-left">
          <h1 className="page-title">Master Settings</h1>
          <p className="page-subtitle">App logo &amp; payment configuration</p>
        </div>
        <div className="page-header-right page-header-right-mobile">
          <button className="btn btn-ghost btn-sm" onClick={fetchSettings}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={openEdit}>✏️ Edit Settings</button>
        </div>
      </div>

      {/* ── VIEW TABLE ── */}
      <div className="table-card">
        <div className="table-card-header">
          <h3 className="table-card-title">⚙️ Configuration Overview</h3>
          <div className="table-card-header-right">
            {saved.updated_at && (
              <span className="table-click-hint">🕐 {fmtDate(saved.updated_at)}</span>
            )}
            <span className="table-record-badge">master_settings</span>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="ds-loading" style={{ padding: "48px 0" }}>
              <div className="ds-spinner" />
              <p className="ds-loading-text">Loading settings…</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Base Hours</th>
                  <th>Base Fare</th>
                  <th>Extra / Hr</th>
                  <th>Outstation Extra</th>
                  <th>
                    Example Fare
                    {saved.base_hours != null && (
                      <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted,#94A3B8)", marginLeft: 4 }}>
                        ({Number(saved.base_hours) + 1} hrs)
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* value row */}
                <tr>
                  <td>
                    {saved.logo_url ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img
                          src={saved.logo_url} alt="logo"
                          style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8, border: "1px solid #E8EDF5", background: "#F8FAFF", padding: 3, flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                            {saved.logo_name || "Uploaded"}
                          </div>
                          <span className="badge badge-green" style={{ marginTop: 3, display: "inline-block" }}>Active</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, border: "1.5px dashed #E2E8F0", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚖</div>
                        <span className="badge badge-gray">Not uploaded</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {saved.base_hours != null
                      ? <span className="dsp-number-cell">{saved.base_hours} hrs</span>
                      : <span className="badge badge-gray">Not set</span>}
                  </td>
                  <td>
                    {saved.base_fare != null
                      ? <span className="dsp-income-cell">₹{saved.base_fare}</span>
                      : <span className="badge badge-gray">Not set</span>}
                  </td>
                  <td>
                    {saved.extra_per_hr != null
                      ? <span className="dsp-income-cell">₹{saved.extra_per_hr}</span>
                      : <span className="badge badge-gray">Not set</span>}
                  </td>
                  <td>
                    {saved.outstation_extra != null
                      ? <span className="dsp-income-cell">₹{saved.outstation_extra}</span>
                      : <span className="badge badge-gray">Not set</span>}
                  </td>
                  <td>
                    {exampleFare != null
                      ? <span className="dsp-income-cell" style={{ color: "#7C3AED" }}>₹{exampleFare}</span>
                      : <span className="badge badge-gray">—</span>}
                  </td>
                </tr>

                {/* type row */}
                <tr>
                  <td><span className="badge badge-amber">Branding</span></td>
                  <td><span className="badge badge-blue">Included</span></td>
                  <td><span className="badge badge-green">Flat Rate</span></td>
                  <td><span className="badge badge-amber">Add-on</span></td>
                  <td>
                    <span className="badge" style={{ background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE" }}>
                      Calculated
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          EDIT MODAL — matches DriverDashboard exactly
      ══════════════════════════════════════════ */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-lg">

            {/* modal header */}
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize: 26 }}>⚙️</span>
                <span className="modal-title">Edit Master Settings</span>
              </div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>

            {/* modal body */}
            <div className="modal-body">
              <div className="form-grid">

                {/* ── Logo section ── */}
                <div className="form-section-label">🏷️ App Logo</div>
                <div className="form-section-divider" />

                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Logo Image</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

                    {/* preview */}
                    <div style={{ width: 72, height: 72, borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F8FAFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : <span style={{ fontSize: 28 }}>🚖</span>
                      }
                    </div>

                    {/* upload actions */}
                    <div style={{ flex: 1 }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoPick} />
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: "100%", justifyContent: "center", marginBottom: 6 }}
                        onClick={() => fileRef.current?.click()}
                      >
                        📁 {logoFile
                          ? (logoFile.name.length > 24 ? logoFile.name.substring(0, 24) + "…" : logoFile.name)
                          : logoPreview ? "Change Logo" : "Upload Logo"
                        }
                      </button>
                      <p style={{ fontSize: 11, color: "var(--text-muted,#94A3B8)", textAlign: "center", margin: 0 }}>
                        PNG · JPG · SVG · Max 2 MB
                      </p>
                      {saved.logo_url && !logoFile && (
                        <button
                          onClick={handleRemoveLogo}
                          style={{ background: "none", border: "none", color: "var(--danger,#EF4444)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "block", width: "100%", textAlign: "center", marginTop: 4, padding: 0 }}
                        >
                          🗑 Remove saved logo
                        </button>
                      )}
                      {logoFile && (
                        <button
                          onClick={() => { setLogoFile(null); setLogoPreview(saved.logo_url || null); }}
                          style={{ background: "none", border: "none", color: "var(--danger,#EF4444)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "block", width: "100%", textAlign: "center", marginTop: 4, padding: 0 }}
                        >
                          ✕ Cancel selection
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Payment section ── */}
                <div className="form-section-label">💰 Payment Settings</div>
                <div className="form-section-divider" />

                {/* Base Hours */}
                <div className="form-field">
                  <label className="form-label">
                    Base Hours <span className="form-required">*</span>
                  </label>
                  <div style={{ display: "flex", border: "1.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden", background: "#F8FAFF" }}>
                    <span style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, color: "#94A3B8", background: "#F0F4FB", borderRight: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>⏱ hrs</span>
                    <input
                      className={`form-input${formErrors.base_hours ? " form-input-error" : ""}`}
                      style={{ border: "none", borderRadius: 0, background: "transparent" }}
                      type="number" min={1} max={24} placeholder="e.g. 4"
                      value={baseHours}
                      onChange={e => { setBaseHours(e.target.value); setFormErrors(p => ({ ...p, base_hours: "" })); }}
                    />
                  </div>
                  <ErrMsg k="base_hours" />
                </div>

                {/* Base Fare */}
                <div className="form-field">
                  <label className="form-label">
                    Base Fare — first {hrs || "?"} hr{hrs !== 1 ? "s" : ""} <span className="form-required">*</span>
                  </label>
                  <div style={{ display: "flex", border: "1.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden", background: "#F8FAFF" }}>
                    <span style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, color: "#94A3B8", background: "#F0F4FB", borderRight: "1.5px solid #E2E8F0", display: "flex", alignItems: "center" }}>₹</span>
                    <input
                      className={`form-input${formErrors.base_fare ? " form-input-error" : ""}`}
                      style={{ border: "none", borderRadius: 0, background: "transparent" }}
                      type="number" min={0} placeholder="e.g. 450"
                      value={baseFare}
                      onChange={e => { setBaseFare(e.target.value); setFormErrors(p => ({ ...p, base_fare: "" })); }}
                    />
                  </div>
                  <ErrMsg k="base_fare" />
                </div>

                {/* Extra per hr */}
                <div className="form-field">
                  <label className="form-label">
                    Extra per Hour — after {hrs || "?"} hr{hrs !== 1 ? "s" : ""} <span className="form-required">*</span>
                  </label>
                  <div style={{ display: "flex", border: "1.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden", background: "#F8FAFF" }}>
                    <span style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, color: "#94A3B8", background: "#F0F4FB", borderRight: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>₹ / hr</span>
                    <input
                      className={`form-input${formErrors.extra_per_hr ? " form-input-error" : ""}`}
                      style={{ border: "none", borderRadius: 0, background: "transparent" }}
                      type="number" min={0} placeholder="e.g. 50"
                      value={extraPerHr}
                      onChange={e => { setExtraPerHr(e.target.value); setFormErrors(p => ({ ...p, extra_per_hr: "" })); }}
                    />
                  </div>
                  <ErrMsg k="extra_per_hr" />
                </div>


                {/* Outstation Extra */}
                <div className="form-field">
                  <label className="form-label">
                    Outstation Extra Fare <span className="form-required">*</span>
                  </label>
                  <div style={{ display: "flex", border: "1.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden", background: "#F8FAFF" }}>
                    <span style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, color: "#94A3B8", background: "#F0F4FB", borderRight: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>₹</span>
                    <input
                      className={`form-input${formErrors.outstation_extra ? " form-input-error" : ""}`}
                      style={{ border: "none", borderRadius: 0, background: "transparent" }}
                      type="number" min={0} placeholder="e.g. 200"
                      value={outstationExtra}
                      onChange={e => { setOutstationExtra(e.target.value); setFormErrors(p => ({ ...p, outstation_extra: "" })); }}
                    />
                  </div>
                  <ErrMsg k="outstation_extra" />
                </div>


                {/* Live fare preview */}
                {hrs > 0 && fare > 0 && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>🧾</span>
                      <div style={{ flex: 1, fontSize: 13, color: "#1D4ED8", fontWeight: 600, lineHeight: 1.6 }}>
                        Up to <b>{hrs} hr{hrs !== 1 ? "s" : ""}</b> → ₹{fare}<br />
                        Each extra hr → +₹{xtra}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#1E3A8A" }}>₹{fare + xtra}</div>
                        <div style={{ fontSize: 10, color: "#3B82F6", fontWeight: 600 }}>{hrs + 1}h example</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* modal footer */}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ opacity: saving ? 0.65 : 1 }}
              >
                {saving ? "Saving…" : "💾 Save Settings"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          color: "#fff", zIndex: 99999,
          background: toast.type === "success"
            ? "linear-gradient(135deg,#16A34A,#15803D)"
            : "linear-gradient(135deg,#DC2626,#B91C1C)",
          boxShadow: "0 6px 24px rgba(0,0,0,.18)", whiteSpace: "nowrap",
        }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}