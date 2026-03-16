import React, { useState, useEffect } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ═══════════════════════════════════════════════════════
   RideCompletionModal
   - Fetches base_hours, base_fare, extra_per_hr from
     GET /api/admin/master-settings  (master_settings table)
   - Falls back to 4 hrs / ₹450 / ₹50 if API fails
   - Driver enters hours + minutes → calculates fare
   - Emits { hours, minutes, totalAmount } on confirm
   ═══════════════════════════════════════════════════════ */

/* ── Fare calc using dynamic rates ── */
const calcFare = (hrs, mins, baseHours, baseFare, extraPerHr) => {
  const totalMins = hrs * 60 + mins;
  const baseMins  = baseHours * 60;
  if (totalMins <= baseMins) return baseFare;
  const extraMins  = totalMins - baseMins;
  const extraHours = Math.ceil(extraMins / 60);
  return baseFare + extraHours * extraPerHr;
};

const fmtDuration = (hrs, mins) => {
  const parts = [];
  if (hrs > 0) parts.push(`${hrs} hr${hrs !== 1 ? "s" : ""}`);
  if (mins > 0) parts.push(`${mins} min${mins !== 1 ? "s" : ""}`);
  return parts.join(" ") || "0 mins";
};

const RideCompletionModal = ({ visible, ride, onConfirm, onClose }) => {
  /* ── dynamic rates from master_settings ── */
  const [baseHours,   setBaseHours]   = useState(4);
  const [baseFare,    setBaseFare]    = useState(450);
  const [extraPerHr,  setExtraPerHr]  = useState(50);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [hours,   setHours]   = useState(4);
  const [minutes, setMinutes] = useState(0);
  const [step,    setStep]    = useState("input");
  const [animate, setAnimate] = useState(false);

  /* ── fetch rates when modal opens ── */
  useEffect(() => {
    if (!visible) { setAnimate(false); return; }

    setStep("input");
    setTimeout(() => setAnimate(true), 10);

    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/master-settings`);
        if (data.base_hours   != null) setBaseHours(Number(data.base_hours));
        if (data.base_fare    != null) setBaseFare(Number(data.base_fare));
        if (data.extra_per_hr != null) setExtraPerHr(Number(data.extra_per_hr));
        /* reset hours spinner to the configured base */
        setHours(data.base_hours != null ? Number(data.base_hours) : 4);
        setMinutes(0);
      } catch {
        /* silent fallback — keep defaults */
        setHours(4); setMinutes(0);
      } finally {
        setRatesLoading(false);
      }
    };

    fetchRates();
  }, [visible]);

  if (!visible) return null;

  /* ── derived values ── */
  const totalFare  = calcFare(hours, minutes, baseHours, baseFare, extraPerHr);
  const extraMins  = Math.max(0, hours * 60 + minutes - baseHours * 60);
  const extraHours = Math.ceil(extraMins / 60);
  const isExtra    = extraMins > 0;

  const handleNext = () => {
    if (hours === 0 && minutes === 0) return;
    setStep("summary");
  };

  const handleConfirm = () => {
    onConfirm({ hours, minutes, totalAmount: totalFare });
  };

  /* ── presets based on dynamic base hours ── */
  const PRESETS = [
    { label: `${Math.max(1, baseHours - 2)} hrs`, h: Math.max(1, baseHours - 2), m: 0 },
    { label: `${Math.max(1, baseHours - 1)} hrs`, h: Math.max(1, baseHours - 1), m: 0 },
    { label: `${baseHours} hrs`,                  h: baseHours,                  m: 0 },
    { label: `${baseHours + 1} hrs`,              h: baseHours + 1,              m: 0 },
    { label: `${baseHours + 2} hrs`,              h: baseHours + 2,              m: 0 },
  ];

  const s = {
    overlay: {
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      transition: "opacity 0.25s",
      opacity: animate ? 1 : 0,
    },
    sheet: {
      width: "100%", maxWidth: 480,
      background: "#fff",
      borderRadius: "28px 28px 0 0",
      padding: "0 0 32px",
      boxShadow: "0 -8px 40px rgba(15,23,42,0.18)",
      transform: animate ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
      overflow: "hidden",
    },
    handle: { width: 40, height: 4, borderRadius: 2, background: "#E2E8F0", margin: "12px auto 0" },
    header: { padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 17, fontWeight: 800, color: "#0F172A", letterSpacing: -0.3 },
    closeBtn: { width: 32, height: 32, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B" },
    body: { padding: "20px 20px 0" },

    /* ride mini-card */
    rideCard: { background: "#F8FAFC", borderRadius: 14, padding: "12px 14px", marginBottom: 20, border: "1px solid #E2E8F0" },
    rideLabel: { fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" },
    rideValue: { fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 },

    /* rates badge */
    ratesBadge: { display: "flex", alignItems: "center", gap: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "8px 12px", marginBottom: 16 },
    ratesText:  { fontSize: 12, fontWeight: 600, color: "#166534" },

    /* duration */
    durationLabel: { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 },
    durationRow: { display: "flex", gap: 12, marginBottom: 18 },
    spinnerBox: { flex: 1, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" },
    spinnerLbl: { fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.6, textTransform: "uppercase", textAlign: "center", paddingTop: 8 },
    spinnerControls: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 10px" },
    spinBtn: { width: 34, height: 34, borderRadius: 10, border: "none", background: "#EFF6FF", cursor: "pointer", fontSize: 20, fontWeight: 700, color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
    spinVal: { fontSize: 28, fontWeight: 800, color: "#0F172A", minWidth: 40, textAlign: "center" },

    /* fare preview */
    farePreview: { background: "linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%)", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #BFDBFE" },
    fareRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    fareKey: { fontSize: 13, color: "#3B82F6", fontWeight: 600 },
    fareVal: { fontSize: 13, color: "#1D4ED8", fontWeight: 700 },
    fareDivider: { borderTop: "1px solid #BFDBFE", margin: "8px 0" },
    fareTotal: { fontSize: 22, fontWeight: 900, color: "#1E3A8A" },
    fareTotalLabel: { fontSize: 13, color: "#2563EB", fontWeight: 600 },

    /* summary */
    summaryCard: { background: "#F0FDF4", borderRadius: 16, padding: "18px 16px", border: "1px solid #BBF7D0", marginBottom: 20, textAlign: "center" },
    summaryIcon: { fontSize: 36, marginBottom: 8 },
    summaryTitle: { fontSize: 15, fontWeight: 800, color: "#14532D", marginBottom: 4 },
    summaryDur: { fontSize: 13, color: "#166534", marginBottom: 14, fontWeight: 600 },
    summaryAmtLbl: { fontSize: 12, color: "#4ADE80", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" },
    summaryAmt: { fontSize: 38, fontWeight: 900, color: "#15803D", lineHeight: 1.1 },
    summaryBreak: { marginTop: 12, background: "#DCFCE7", borderRadius: 10, padding: "10px 14px", textAlign: "left" },
    breakRow: { display: "flex", justifyContent: "space-between", marginBottom: 4 },
    breakKey: { fontSize: 12, color: "#166534" },
    breakVal: { fontSize: 12, fontWeight: 700, color: "#14532D" },

    /* buttons */
    primaryBtn: { width: "100%", padding: "16px 0", background: "linear-gradient(135deg,#2563EB,#1D4ED8)", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", marginBottom: 10 },
    successBtn: { width: "100%", padding: "16px 0", background: "linear-gradient(135deg,#16A34A,#15803D)", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(22,163,74,0.35)", marginBottom: 10 },
    backBtn: { width: "100%", padding: "12px 0", background: "none", border: "1.5px solid #E2E8F0", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#64748B", cursor: "pointer" },

    tipsRow: { display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" },
    tipChip: (active) => ({ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${active ? "#2563EB" : "#E2E8F0"}`, background: active ? "#EFF6FF" : "#fff", fontSize: 13, fontWeight: 700, color: active ? "#2563EB" : "#64748B", cursor: "pointer" }),

    /* loading overlay */
    loadingOverlay: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 10 },
    loadingSpinner: { width: 28, height: 28, border: "3px solid #DBEAFE", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
    loadingText: { fontSize: 13, color: "#64748B", fontWeight: 600 },
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={s.sheet}>
        <div style={s.handle} />

        {/* Header */}
        <div style={s.header}>
          <span style={s.headerTitle}>
            {step === "input" ? "⏱ Enter Ride Duration" : "✅ Confirm & Complete"}
          </span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>

          {/* Loading rates */}
          {ratesLoading ? (
            <div style={s.loadingOverlay}>
              <div style={s.loadingSpinner} />
              <span style={s.loadingText}>Loading fare rates…</span>
            </div>
          ) : (
            <>
              {/* Ride mini info */}
              {ride && (
                <div style={s.rideCard}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={s.rideLabel}>Pickup</div>
                      <div style={s.rideValue}>{ride.pickup || "—"}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={s.rideLabel}>Drop</div>
                      <div style={s.rideValue}>{ride.drop_location || ride.drop || "—"}</div>
                    </div>
                  </div>
                  {(ride.customer_name || ride.name) && (
                    <div style={{ ...s.rideLabel, marginTop: 8 }}>
                      👤 {ride.customer_name || ride.name}
                    </div>
                  )}
                </div>
              )}

              {/* Active rates badge */}
              <div style={s.ratesBadge}>
                <span style={{ fontSize: 16 }}>💰</span>
                <span style={s.ratesText}>
                  ₹{baseFare} for {baseHours} hr{baseHours !== 1 ? "s" : ""} &nbsp;·&nbsp; +₹{extraPerHr}/hr extra
                </span>
                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#22C55E", background: "#DCFCE7", padding: "2px 8px", borderRadius: 20 }}>
                  LIVE RATES
                </span>
              </div>

              {/* ─── INPUT STEP ─── */}
              {step === "input" && (
                <>
                  {/* Quick presets — built from dynamic baseHours */}
                  <div style={s.durationLabel}>Quick Presets</div>
                  <div style={s.tipsRow}>
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        style={s.tipChip(hours === p.h && minutes === p.m)}
                        onClick={() => { setHours(p.h); setMinutes(p.m); }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual spinners */}
                  <div style={s.durationLabel}>Or Set Manually</div>
                  <div style={s.durationRow}>
                    <div style={s.spinnerBox}>
                      <div style={s.spinnerLbl}>Hours</div>
                      <div style={s.spinnerControls}>
                        <button style={s.spinBtn} onClick={() => setHours(h => Math.max(0, h - 1))}>−</button>
                        <span style={s.spinVal}>{hours}</span>
                        <button style={s.spinBtn} onClick={() => setHours(h => Math.min(24, h + 1))}>+</button>
                      </div>
                    </div>
                    <div style={s.spinnerBox}>
                      <div style={s.spinnerLbl}>Minutes</div>
                      <div style={s.spinnerControls}>
                        <button style={s.spinBtn} onClick={() => setMinutes(m => Math.max(0, m - 15))}>−</button>
                        <span style={s.spinVal}>{String(minutes).padStart(2, "0")}</span>
                        <button style={s.spinBtn} onClick={() => setMinutes(m => Math.min(45, m + 15))}>+</button>
                      </div>
                    </div>
                  </div>

                  {/* Live fare preview */}
                  <div style={s.farePreview}>
                    <div style={s.fareRow}>
                      <span style={s.fareKey}>Base ({baseHours} hrs)</span>
                      <span style={s.fareVal}>₹{baseFare}</span>
                    </div>
                    {isExtra && (
                      <div style={s.fareRow}>
                        <span style={s.fareKey}>
                          Extra ({extraHours} hr{extraHours !== 1 ? "s" : ""} × ₹{extraPerHr})
                        </span>
                        <span style={s.fareVal}>₹{extraHours * extraPerHr}</span>
                      </div>
                    )}
                    <div style={s.fareDivider} />
                    <div style={s.fareRow}>
                      <span style={s.fareTotalLabel}>Total Fare</span>
                      <span style={s.fareTotal}>₹{totalFare}</span>
                    </div>
                  </div>

                  <button
                    style={{ ...s.primaryBtn, opacity: (hours === 0 && minutes === 0) ? 0.45 : 1 }}
                    onClick={handleNext}
                    disabled={hours === 0 && minutes === 0}
                  >
                    Calculate & Review →
                  </button>
                </>
              )}

              {/* ─── SUMMARY STEP ─── */}
              {step === "summary" && (
                <>
                  <div style={s.summaryCard}>
                    <div style={s.summaryIcon}>🏁</div>
                    <div style={s.summaryTitle}>Ride Duration</div>
                    <div style={s.summaryDur}>{fmtDuration(hours, minutes)}</div>
                    <div style={s.summaryAmtLbl}>Total Fare</div>
                    <div style={s.summaryAmt}>₹{totalFare}</div>

                    <div style={s.summaryBreak}>
                      <div style={s.breakRow}>
                        <span style={s.breakKey}>Base fare (up to {baseHours} hrs)</span>
                        <span style={s.breakVal}>₹{baseFare}</span>
                      </div>
                      {isExtra && (
                        <div style={s.breakRow}>
                          <span style={s.breakKey}>
                            Extra {extraHours} hr{extraHours !== 1 ? "s" : ""} × ₹{extraPerHr}
                          </span>
                          <span style={s.breakVal}>₹{extraHours * extraPerHr}</span>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid #BBF7D0", margin: "6px 0" }} />
                      <div style={s.breakRow}>
                        <span style={{ ...s.breakKey, fontWeight: 700 }}>Grand Total</span>
                        <span style={{ ...s.breakVal, fontSize: 14 }}>₹{totalFare}</span>
                      </div>
                    </div>
                  </div>

                  <button style={s.successBtn} onClick={handleConfirm}>
                    ✅ Confirm & Complete Ride
                  </button>
                  <button style={s.backBtn} onClick={() => setStep("input")}>
                    ← Edit Duration
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideCompletionModal;