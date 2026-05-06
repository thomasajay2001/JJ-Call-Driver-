import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";
import RideCompletionModal from "../home/Ridecompletionmodel"; // adjust path if needed

/* ─────────────────────────────────────────
   FARE STRUCTURE (fallback — overridden by master_settings)
───────────────────────────────────────── */
const BASE_PACKAGE_HRS  = 4;
const BASE_PACKAGE_FARE = 450;
const EXTRA_HR_RATE     = 50;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
};
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true });
};
const toDateStr    = (iso) => iso ? new Date(iso).toISOString().slice(0,10) : "";
const todayStr     = ()    => new Date().toISOString().slice(0,10);
const thisMonthStr = ()    => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

const STATUS_META = {
  pending:                { bg:"#FFF7ED", color:"#C2410C", dot:"#F97316", label:"⏳ Pending"    },
  assigned:               { bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6", label:"🔵 Assigned"   },
  accepted:               { bg:"#FEF3C7", color:"#92400E", dot:"#F59E0B", label:"🟡 On The Way" },
  inride:                 { bg:"#D1FAE5", color:"#065F46", dot:"#10B981", label:"🟢 In Ride"    },
  completed:              { bg:"#F0FDF4", color:"#166534", dot:"#22C55E", label:"✅ Completed"   },
  cancelled:              { bg:"#FFF1F2", color:"#9F1239", dot:"#F43F5E", label:"🚫 Cancelled"  },
  cancelled_with_penalty: { bg:"#FFF1F2", color:"#9F1239", dot:"#F43F5E", label:"🚫 Cancelled (₹200 fee)" },
  scheduled:              { bg:"#F0FDFA", color:"#0F766E", dot:"#14B8A6", label:"📅 Scheduled"  },
  allbusy:                { bg:"#FFF1F2", color:"#9F1239", dot:"#F43F5E", label:"🚫 All Busy"   },
  wait5:                  { bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B", label:"⏱ Wait 5 min" },
  wait10:                 { bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B", label:"⏱ Wait 10 min"},
  wait30:                 { bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B", label:"⏱ Wait 30 min"},
  preferred_query:        { bg:"#FEF3C7", color:"#92400E", dot:"#F59E0B", label:"⏳ Awaiting"   },
};
const getMeta = (s) => STATUS_META[s?.toLowerCase()] || { bg:"#F1F5F9", color:"#475569", dot:"#CBD5E1", label: s || "Unknown" };

/* ═══════════════════════════════════════════════════════
   PAYMENT RECEIPT — shown to customer after ride complete,
   before the rating screen
   ═══════════════════════════════════════════════════════ */
const PaymentReceipt = ({ booking, onContinue }) => {
  const amount     = booking?.amount            != null ? Number(booking.amount)            : null;
  const rideHours  = booking?.ride_hours        != null ? Number(booking.ride_hours)        : null;
  const rideMins   = booking?.ride_minutes      != null ? Number(booking.ride_minutes)      : null;
  const baseHours  = booking?.base_hours_used   != null ? Number(booking.base_hours_used)   : null;
  const baseFare   = booking?.base_fare_used    != null ? Number(booking.base_fare_used)    : null;
  const extraPerHr = booking?.extra_per_hr_used != null ? Number(booking.extra_per_hr_used) : null;

  const hasBreakdown = baseHours != null && baseFare != null && extraPerHr != null && amount != null;

  const extraHrs = (rideHours != null && baseHours != null)
    ? Math.ceil(Math.max(0, (rideHours * 60 + (rideMins || 0)) - baseHours * 60) / 60)
    : 0;

  const fmtDur = () => {
    if (rideHours == null) return null;
    const parts = [];
    if (rideHours > 0) parts.push(`${rideHours} hr${rideHours !== 1 ? "s" : ""}`);
    if (rideMins  > 0) parts.push(`${rideMins} min${rideMins !== 1 ? "s" : ""}`);
    return parts.join(" ") || "—";
  };

  return (
    <div style={PR.page}>
      <div style={PR.top}>
        <div style={PR.iconRing}><span style={{ fontSize: 44 }}>💳</span></div>
        <h2 style={PR.title}>Ride Completed!</h2>
        <p style={PR.sub}>Here's your fare summary</p>
      </div>

      <div style={PR.amtCard}>
        <p style={PR.amtLabel}>TOTAL AMOUNT PAYABLE</p>
        <p style={PR.amtValue}>{amount != null ? `₹${amount}` : "—"}</p>
        <p style={PR.amtNote}>Please pay your driver directly</p>
      </div>

      {hasBreakdown && (
        <div style={PR.breakdown}>
          <p style={PR.breakTitle}>📋 Fare Breakdown</p>
          {fmtDur() && (
            <div style={PR.breakRow}>
              <span style={PR.breakKey}>🕐 Ride Duration</span>
              <span style={PR.breakVal}>{fmtDur()}</span>
            </div>
          )}
          <div style={PR.breakRow}>
            <span style={PR.breakKey}>📦 Base fare (up to {baseHours} hr{baseHours !== 1 ? "s" : ""})</span>
            <span style={PR.breakVal}>₹{baseFare}</span>
          </div>
          {extraHrs > 0 && (
            <div style={PR.breakRow}>
              <span style={PR.breakKey}>➕ Extra {extraHrs} hr{extraHrs !== 1 ? "s" : ""} × ₹{extraPerHr}</span>
              <span style={PR.breakVal}>₹{extraHrs * extraPerHr}</span>
            </div>
          )}
          <div style={PR.breakDivider} />
          <div style={PR.breakRow}>
            <span style={{ ...PR.breakKey, fontWeight: 800, color: "#0F172A" }}>Grand Total</span>
            <span style={{ ...PR.breakVal, fontSize: 18, color: "#15803D" }}>₹{amount}</span>
          </div>
        </div>
      )}

      <div style={PR.reminder}>
        <span style={{ fontSize: 22 }}>💵</span>
        <p style={PR.reminderTxt}>
          Pay <strong>₹{amount ?? "—"}</strong> cash or UPI to your driver before leaving.
        </p>
      </div>

      <button style={PR.btn} onClick={onContinue}>⭐ Rate My Ride</button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
const RideTab = () => {
  const role      = localStorage.getItem("role")     || "";
  const DRIVER_ID = localStorage.getItem("driverId") || "";

  /* ── dynamic rates from master_settings ── */
  const [rateBaseHrs,  setRateBaseHrs]  = useState(BASE_PACKAGE_HRS);
  const [rateBaseFare, setRateBaseFare] = useState(BASE_PACKAGE_FARE);
  const [rateExtraHr,  setRateExtraHr]  = useState(EXTRA_HR_RATE);

  const [booking,     setBooking]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [driverPos,   setDriverPos]   = useState(null);

  const [allBookings, setAllBookings] = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [activeTab,   setActiveTab]   = useState("active");

  const [dateMode,     setDateMode]     = useState("all");
  const [customDate,   setCustomDate]   = useState(todayStr());
  const [customMonth,  setCustomMonth]  = useState(thisMonthStr());
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [expandedId,   setExpandedId]   = useState(null);

  /* ── customer: receipt → rating flow ── */
  const [showPayReceipt, setShowPayReceipt] = useState(false);
  const [payReceiptData, setPayReceiptData] = useState(null);
  const [ratingBooking,  setRatingBooking]  = useState(null);
  const [rating,         setRating]         = useState(0);
  const [comment,        setComment]        = useState("");
  const [ratingSubmit,   setRatingSubmit]   = useState(false);

  /* ── driver: RideCompletionModal ── */
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completing,        setCompleting]        = useState(false);

  const prevStatus   = useRef(null);
  const receiptShown = useRef(false);
  const pollRef      = useRef(null);
  const fetchAllRef  = useRef(null);
  const mapDiv       = useRef(null);
  const lMap         = useRef(null);
  const driverMk     = useRef(null);
  const watchId      = useRef(null);

  /* ── fetch dynamic rates on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/master-settings`);
        if (data.base_hours   != null) setRateBaseHrs(Number(data.base_hours));
        if (data.base_fare    != null) setRateBaseFare(Number(data.base_fare));
        if (data.extra_per_hr != null) setRateExtraHr(Number(data.extra_per_hr));
      } catch { /* silent fallback */ }
    })();
  }, []);

  /* ── fetch all bookings ── */
  const fetchAll = async () => {
    try {
      const currentRole = localStorage.getItem("role") || "";

      if (currentRole === "customer") {
        const customerPhone = localStorage.getItem("customerPhone") || "";
        if (!customerPhone) { setLoading(false); return; }

        const res  = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${customerPhone}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        setAllBookings(list);

        const active = list.find((b) =>
          ["pending","assigned","accepted","inride"].includes(b.status)
        ) || null;

        if (active) {
          prevStatus.current = active.status;
          setBooking(active);
          setLoading(false);
          return;
        }

        /* detect transition to completed → show receipt */
        const wasActive = ["inride","accepted","assigned","pending"].includes(prevStatus.current);
        const unrated   = list
          .filter((b) => b.status === "completed" && !b.rating)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        if (unrated && wasActive && !receiptShown.current) {
          receiptShown.current = true;
          prevStatus.current   = "completed";
          setBooking(null);

          /* fetch full booking with payment fields (ride_hours, base_fare_used, etc.) */
          try {
            const detail = await axios.get(`${BASE_URL}/api/bookings/status/${unrated.id}`);
            const full   = detail?.data?.booking || unrated;
            setPayReceiptData(full);
            setRatingBooking(full);
          } catch {
            setPayReceiptData(unrated);
            setRatingBooking(unrated);
          }

          setShowPayReceipt(true);
          setLoading(false);
          return;
        }

        if (showPayReceipt || ratingBooking) { setLoading(false); return; }

        prevStatus.current = null;
        setBooking(null);

      } else if (currentRole === "driver") {
        const res  = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${DRIVER_ID}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        setAllBookings(list);

        const active = list.find((b) =>
          ["assigned","accepted","inride"].includes(b.status)
        ) || null;

        if (active) { prevStatus.current = active.status; setBooking(active); }
        else        { prevStatus.current = null;           setBooking(null); }
      }
    } catch (e) { console.warn("fetchAll error:", e); }
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const currentRole = localStorage.getItem("role") || "";
      if (currentRole === "customer") {
        const phone = localStorage.getItem("customerPhone") || "";
        if (!phone) return;
        const res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${phone}`);
        setHistoryBookings(Array.isArray(res?.data) ? res.data : []);
      } else if (currentRole === "driver") {
        const res  = await axios.get(`${BASE_URL}/api/bookings/driver/all?driverId=${DRIVER_ID}`);
        const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setHistoryBookings(list);
      }
    } catch (e) { console.warn("fetchHistory error:", e); }
    finally { setHistLoading(false); }
  };

  useEffect(() => { fetchAllRef.current = fetchAll; });

  useEffect(() => {
    fetchAllRef.current();
    pollRef.current = setInterval(() => fetchAllRef.current(), 5000);
    return () => {
      clearInterval(pollRef.current);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  useEffect(() => {
    if (role === "driver" || role === "customer") {
      fetchHistory();
    }
  }, []);

  /* reset receiptShown when a new active booking appears */
  useEffect(() => {
    if (booking?.status && ["pending","assigned","accepted","inride"].includes(booking.status)) {
      receiptShown.current = false;
    }
  }, [booking?.status]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  /* ─── map ─── */
  useEffect(() => {
    if (!booking || !mapDiv.current) return;
    if (!["accepted","inride"].includes(booking.status)) return;
    const init = () => {
      const L = window.L; if (!L || !mapDiv.current) return;
      const lat = parseFloat(booking.pickup_lat) || 13.0827;
      const lng = parseFloat(booking.pickup_lng) || 80.2707;
      if (lMap.current) { lMap.current.setView([lat,lng],14); setTimeout(()=>lMap.current?.invalidateSize(),200); return; }
      const map = L.map(mapDiv.current,{center:[lat,lng],zoom:14,zoomControl:false,attributionControl:false});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);
      const icon = L.divIcon({className:"",html:`<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚕</div>`,iconSize:[32,32],iconAnchor:[16,16]});
      driverMk.current = L.marker([lat,lng],{icon}).addTo(map);
      lMap.current = map; setTimeout(()=>map.invalidateSize(),200);
    };
    if (window.L) init();
    else {
      if (!document.getElementById("lcs")){const l=document.createElement("link");l.id="lcs";l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(l);}
      const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=init;document.head.appendChild(s);
    }
  }, [booking?.status]);

  /* ─── driver GPS ─── */
  useEffect(() => {
    if (role!=="driver"||!booking||!["accepted","inride"].includes(booking.status)) return;
    if (!DRIVER_ID||!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(async({coords}) => {
      const {latitude:lat,longitude:lng}=coords;
      setDriverPos({lat,lng});
      if (driverMk.current&&lMap.current){driverMk.current.setLatLng([lat,lng]);lMap.current.setView([lat,lng],15);}
      try{await fetch(`${BASE_URL}/api/driver/updateLocation`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({driverId:DRIVER_ID,lat,lng})});}catch{}
    },()=>{},{enableHighAccuracy:true,maximumAge:3000,timeout:8000});
    return()=>{if(watchId.current)navigator.geolocation.clearWatch(watchId.current);};
  },[booking?.status]);

  /* ─── customer driver GPS poll ─── */
  useEffect(() => {
    if (role!=="customer"||!booking?.driver_id||!["assigned","accepted","inride"].includes(booking.status)) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/drivers`);
        const dr  = (Array.isArray(res.data)?res.data:[]).find((d)=>d.id==booking.driver_id);
        if (dr?.lat&&dr?.lng) {
          const pos={lat:parseFloat(dr.lat),lng:parseFloat(dr.lng)};
          setDriverPos(pos);
          if (driverMk.current&&lMap.current){driverMk.current.setLatLng([pos.lat,pos.lng]);lMap.current.setView([pos.lat,pos.lng],15);}
        }
      } catch {}
    };
    poll(); const iv=setInterval(poll,4000); return()=>clearInterval(iv);
  },[booking?.driver_id,booking?.status]);

  /* ─── ride actions ─── */
  const startRide = async () => {
    await axios.post(`${BASE_URL}/api/bookings/start`,{bookingId:booking.id,driverId:DRIVER_ID});
    fetchAll();
  };

  /* Called by RideCompletionModal with { hours, minutes, totalAmount } — all from dynamic rates */
  const handleCompleteConfirm = async ({ hours, minutes, totalAmount }) => {
    setCompleting(true);
    try {
      await axios.post(`${BASE_URL}/api/complete-ride`, {
        bookingId:    booking.id,
        driverId:     DRIVER_ID,
        amount:       totalAmount,
        ride_hours:   hours,
        ride_minutes: minutes,
      });
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      setShowCompleteModal(false);
      fetchAll();
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.message || e.message));
    } finally {
      setCompleting(false);
    }
  };

  const submitRating = async () => {
    if (!rating){alert("Please select a star rating");return;}
    setRatingSubmit(true);
    try {
      await axios.post(`${BASE_URL}/api/submit-rating`,{bookingId:ratingBooking.id,rating,comment});
      setRatingBooking(null); setRating(0); setComment("");
      receiptShown.current = false;
    } catch { console.warn("rating error"); }
    finally { setRatingSubmit(false); }
  };

  /* ─── filters ─── */
  const filteredBookings = (activeTab === "history" ? historyBookings : allBookings).filter((b) => {
    const dateStr  = toDateStr(b.created_at || b.scheduled_at);
    const monthStr = dateStr.slice(0,7);
    if (dateMode==="today"       && dateStr  !== todayStr())     return false;
    if (dateMode==="thismonth"   && monthStr !== thisMonthStr()) return false;
    if (dateMode==="custom"      && dateStr  !== customDate)     return false;
    if (dateMode==="custommonth" && monthStr !== customMonth)    return false;
    if (statusFilter!=="all" && b.status?.toLowerCase()!==statusFilter) return false;
    if (searchQuery.trim()) {
      const q=searchQuery.toLowerCase();
      if (!(b.pickup||"").toLowerCase().includes(q)&&!(b.drop_location||"").toLowerCase().includes(q)&&!(String(b.id)||"").includes(q)) return false;
    }
    return true;
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  const summary = {
    total:     filteredBookings.length,
    completed: filteredBookings.filter(b=>b.status==="completed").length,
    cancelled: filteredBookings.filter(b=>b.status?.includes("cancel")).length,
    scheduled: filteredBookings.filter(b=>b.is_scheduled).length,
    inride:    filteredBookings.filter(b=>b.status==="inride").length,
  };

  /* ════════════════ DRIVER VIEW ════════════════ */
  if (role === "driver") {
    if (loading) return <div style={S.center}><div style={S.spinner}/><p style={{color:"#2563EB",fontWeight:600,marginTop:12}}>Loading...</p></div>;
    const dm = booking ? getMeta(booking.status) : null;

    return (
      <div style={S.page}>
        <div style={S.tabBar}>
          <button style={{...S.tabBtn,...(activeTab==="active"?S.tabActive:{})}} onClick={()=>setActiveTab("active")}>
            🚗 Active Ride {booking && <span style={S.liveDotInline}/>}
          </button>
          <button style={{...S.tabBtn,...(activeTab==="history"?S.tabActive:{})}} onClick={()=>setActiveTab("history")}>
            📋 All Trips <span style={S.tabCount}>{historyBookings.length}</span>
          </button>
        </div>

        {activeTab === "active" && (
          <>
            {!booking ? (
              <div style={S.center}>
                <span style={{fontSize:64,marginBottom:16}}>🚗</span>
                <p style={S.noTitle}>No active booking</p>
                <p style={S.noSub}>Your assigned ride will appear here automatically.</p>
              </div>
            ) : (
              <>
                <div style={{...S.statusBar,backgroundColor:dm.bg}}>
                  <div style={{...S.dot,backgroundColor:dm.dot}}/>
                  <span style={{...S.statusTxt,color:dm.color}}>{dm.label}</span>
                </div>

                {["assigned","accepted","inride"].includes(booking.status) && (
                  <div style={S.mapSection}>
                    <div style={S.mapWrap}>
                      <div ref={mapDiv} style={S.mapBox}/>
                      <div style={S.livePill}><div style={S.liveDot}/><span style={S.liveTxt}>LIVE</span></div>
                    </div>
                    {driverPos && <div style={S.gpsRow}><span>📡</span><span style={S.gpsTxt}>{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</span><span style={S.gpsBadge}>Live</span></div>}
                  </div>
                )}

                {/* Live rates badge — shows current rates from master_settings */}
                <div style={S.ratesBadge}>
                  <span style={{fontSize:14}}>💰</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#166534"}}>
                    ₹{rateBaseFare} for {rateBaseHrs} hr{rateBaseHrs!==1?"s":""} · +₹{rateExtraHr}/hr extra
                  </span>
                  <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"#22C55E",backgroundColor:"#DCFCE7",padding:"2px 8px",borderRadius:20}}>LIVE</span>
                </div>

                <div style={{marginBottom:14}}>
                  {booking.status==="assigned" && (
                    <button style={S.startBtn} onClick={startRide}>🚦 START RIDE</button>
                  )}
                  {booking.status==="inride" && (
                    <button
                      style={{...S.completeBtn, opacity: completing ? 0.7 : 1}}
                      onClick={() => setShowCompleteModal(true)}
                      disabled={completing}>
                      {completing ? "⏳ Completing…" : "✅ COMPLETE RIDE"}
                    </button>
                  )}
                </div>

                <div style={S.card}>
                  <p style={S.cardLabel}>👤 Customer</p>
                  <div style={S.personRow}>
                    <div style={S.avatar}><span style={{fontSize:26}}>👤</span></div>
                    <div style={{flex:1}}><p style={S.personName}>{booking.customer_name||"—"}</p><p style={S.personPhone}>📞 {booking.customer_mobile||"—"}</p></div>
                    <a href={`tel:${booking.customer_mobile}`} style={S.callBtn}>📞</a>
                  </div>
                </div>

                <div style={S.card}>
                  <p style={S.cardLabel}>🗺️ Route</p>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}><div style={{...S.routeDot,backgroundColor:"#10B981"}}/><div><p style={S.routeLabel}>Pickup</p><p style={S.routeVal}>{booking.pickup||"—"}</p></div></div>
                  <div style={{width:2,height:16,backgroundColor:"#CBD5E1",margin:"4px 0 4px 5px"}}/>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}><div style={{...S.routeDot,backgroundColor:"#EF4444"}}/><div><p style={S.routeLabel}>Drop</p><p style={S.routeVal}>{booking.drop_location||"—"}</p></div></div>
                </div>

                <div style={S.card}>
                  <p style={S.cardLabel}> Booking Info</p>
                  <div style={{display:"flex",gap:12}}>
                    <div style={S.infoChip}><span style={S.infoKey}>Booking ID</span><span style={S.infoVal}>#{booking.id}</span></div>
                    <div style={S.infoChip}><span style={S.infoKey}>Trip Type</span><span style={S.infoVal}>{booking.triptype||"local"}</span></div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "history" && (
          <HistoryPanel
            bookings={filteredBookings} summary={summary} loading={histLoading}
            dateMode={dateMode} setDateMode={setDateMode}
            customDate={customDate} setCustomDate={setCustomDate}
            customMonth={customMonth} setCustomMonth={setCustomMonth}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            expandedId={expandedId} setExpandedId={setExpandedId}
            onRefresh={fetchHistory} role="driver"
            onGoActive={()=>setActiveTab("active")}
          />
        )}

        {/* ── RideCompletionModal — fetches its own live rates from /api/admin/master-settings ── */}
        <RideCompletionModal
          visible={showCompleteModal}
          ride={booking}
          onConfirm={handleCompleteConfirm}
          onClose={() => setShowCompleteModal(false)}
        />

        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  /* ════════════════ CUSTOMER VIEW ════════════════ */

  /* STEP 1: Payment Receipt (auto-shown after ride completion) */
  if (showPayReceipt && payReceiptData) {
    return (
      <PaymentReceipt
        booking={payReceiptData}
        onContinue={() => {
          setShowPayReceipt(false);
          setPayReceiptData(null);
          /* ratingBooking already set — rating screen shows next render */
        }}
      />
    );
  }

  /* STEP 2: Rating screen */
  if (ratingBooking) return (
    <div style={S.ratingPage}>
      <div style={S.ratingTop}>
        <div style={S.ratingBubble}><span style={{fontSize:50}}>⭐</span></div>
        <h2 style={S.ratingTitle}>Rate Your Ride</h2>
        <p style={S.ratingDesc}>How was your experience with your driver?</p>
      </div>
      <div style={S.card}>
        <p style={S.cardLabel}>Tap a star to rate</p>
        <div style={S.starRow}>
          {[1,2,3,4,5].map((st)=>(
            <button key={st} style={S.starBtn} onClick={()=>setRating(st)}>
              <span style={{fontSize:42,transition:"transform 0.1s",display:"block",transform:st<=rating?"scale(1.2)":"scale(1)"}}>{st<=rating?"⭐":"☆"}</span>
            </button>
          ))}
        </div>
        {rating>0 && <p style={S.ratingHint}>{["","Poor 😞","Fair 😐","Good 🙂","Great 😊","Excellent 🤩"][rating]}</p>}
      </div>
      <div style={S.card}>
        <textarea style={S.textarea} placeholder="Leave a comment (optional)" value={comment} onChange={e=>setComment(e.target.value)} rows={3}/>
      </div>
      <div style={S.ratingBtns}>
        <button style={S.skipBtn} onClick={()=>{setRatingBooking(null);setRating(0);setComment("");receiptShown.current=false;}}>Skip</button>
        <button style={{...S.submitBtn,opacity:ratingSubmit?0.7:1}} onClick={submitRating} disabled={ratingSubmit}>
          {ratingSubmit?"Submitting...":"Submit ⭐"}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loading) return <div style={S.center}><div style={S.spinner}/><p style={{color:"#2563EB",fontWeight:600,marginTop:12}}>Loading...</p></div>;

  return (
    <div style={S.page}>
      <div style={S.tabBar}>
        <button style={{...S.tabBtn,...(activeTab==="active"?S.tabActive:{})}} onClick={()=>setActiveTab("active")}>
          🚗 Active Ride {booking && <span style={S.liveDotInline}/>}
        </button>
        <button style={{...S.tabBtn,...(activeTab==="history"?S.tabActive:{})}} onClick={()=>setActiveTab("history")}>
          📋 All Bookings <span style={S.tabCount}>{historyBookings.length}</span>
        </button>
      </div>

      {activeTab==="active" && (
        <>
          {!booking ? (
            <div style={S.center}>
              <span style={{fontSize:64,marginBottom:16}}>🚗</span>
              <p style={S.noTitle}>No active ride</p>
              <p style={S.noSub}>Your current booking will appear here once booked or assigned.</p>
              <button style={S.histBtn} onClick={()=>setActiveTab("history")}>View All Bookings →</button>
            </div>
          ) : (
            <>
              {(()=>{const m=getMeta(booking.status);return(<div style={{...S.statusBar,backgroundColor:m.bg}}><div style={{...S.dot,backgroundColor:m.dot}}/><span style={{...S.statusTxt,color:m.color}}>{m.label}</span></div>);})()}

              {["accepted","inride"].includes(booking.status) && (
                <div style={S.mapSection}>
                  <div style={S.mapWrap}><div ref={mapDiv} style={S.mapBox}/><div style={S.livePill}><div style={S.liveDot}/><span style={S.liveTxt}>LIVE</span></div></div>
                  {driverPos && <div style={S.gpsRow}><span>📡</span><span style={S.gpsTxt}>Driver: {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</span><span style={S.gpsBadge}>Live</span></div>}
                </div>
              )}

              {["accepted","inride"].includes(booking.status) && booking.driver_name && (
                <div style={S.card}>
                  <p style={S.cardLabel}>👨‍✈️ Your Driver</p>
                  <div style={S.personRow}>
                    <div style={S.avatar}><span style={{fontSize:26}}>👨‍✈️</span></div>
                    <div style={{flex:1}}><p style={S.personName}>{booking.driver_name}</p><p style={S.personPhone}>📞 {booking.driver_phone||"—"}</p></div>
                    <a href={`tel:${booking.driver_phone}`} style={S.callBtn}>📞</a>
                  </div>
                </div>
              )}

              {booking.status==="assigned" && <div style={S.waitCard}><div style={S.waitSpin}/><div><p style={S.waitTitle}>Driver Notified</p><p style={S.waitSub}>Waiting for driver to confirm…</p></div></div>}
              {booking.status==="pending"  && <div style={S.waitCard}><div style={S.waitSpin}/><div><p style={S.waitTitle}>Finding your driver...</p><p style={S.waitSub}>Usually takes 1–3 minutes</p></div></div>}

              <div style={S.card}>
                <p style={S.cardLabel}>🗺️ Route</p>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}><div style={{...S.routeDot,backgroundColor:"#10B981"}}/><div><p style={S.routeLabel}>Pickup</p><p style={S.routeVal}>{booking.pickup||"—"}</p></div></div>
                <div style={{width:2,height:16,backgroundColor:"#CBD5E1",margin:"4px 0 4px 5px"}}/>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}><div style={{...S.routeDot,backgroundColor:"#EF4444"}}/><div><p style={S.routeLabel}>Drop</p><p style={S.routeVal}>{booking.drop_location||"—"}</p></div></div>
              </div>

              <div style={S.card}>
                <p style={S.cardLabel}>📋 Booking Info</p>
                <div style={{display:"flex",gap:12}}>
                  <div style={S.infoChip}><span style={S.infoKey}>Booking ID</span><span style={S.infoVal}>#{booking.id}</span></div>
                  <div style={S.infoChip}><span style={S.infoKey}>Trip Type</span><span style={S.infoVal}>{booking.triptype||"local"}</span></div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab==="history" && (
        <HistoryPanel
          bookings={filteredBookings} summary={summary} loading={histLoading}
          dateMode={dateMode} setDateMode={setDateMode}
          customDate={customDate} setCustomDate={setCustomDate}
          customMonth={customMonth} setCustomMonth={setCustomMonth}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          expandedId={expandedId} setExpandedId={setExpandedId}
          onRefresh={fetchHistory} role="customer"
          onGoActive={()=>setActiveTab("active")}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   SHARED HISTORY PANEL
   ═══════════════════════════════════════════════════════ */
const HistoryPanel = ({bookings,summary,loading,dateMode,setDateMode,customDate,setCustomDate,customMonth,setCustomMonth,statusFilter,setStatusFilter,searchQuery,setSearchQuery,expandedId,setExpandedId,onRefresh,role,onGoActive}) => (
  <div>
    <div style={H.pillRow}>
      {[{key:"all",label:"All Time"},{key:"today",label:"Today"},{key:"thismonth",label:"This Month"},{key:"custom",label:"Pick Date"},{key:"custommonth",label:"Pick Month"}].map((m)=>(
        <button key={m.key} style={{...H.pill,...(dateMode===m.key?H.pillActive:{})}} onClick={()=>setDateMode(m.key)}>{m.label}</button>
      ))}
    </div>
    {dateMode==="custom"      && <div style={H.pickerRow}><span style={H.pickerLabel}>📅 Date:</span><input type="date" value={customDate} max={todayStr()} onChange={e=>setCustomDate(e.target.value)} style={H.dateInput}/></div>}
    {dateMode==="custommonth" && <div style={H.pickerRow}><span style={H.pickerLabel}>📅 Month:</span><input type="month" value={customMonth} max={thisMonthStr()} onChange={e=>setCustomMonth(e.target.value)} style={H.dateInput}/></div>}
    <div style={H.filterRow}>
      <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={H.select}>
        <option value="all">All Status</option>
        <option value="completed">✅ Completed</option>
        <option value="inride">🟢 In Ride</option>
        <option value="assigned">🔵 Assigned</option>
        <option value="accepted">🟡 Accepted</option>
        {role==="customer" && <option value="pending">⏳ Pending</option>}
        <option value="scheduled">📅 Scheduled</option>
        <option value="cancelled">🚫 Cancelled</option>
      </select>
      <input style={H.searchInput} placeholder="🔍 Search…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
      <button style={H.refreshBtn} onClick={onRefresh} disabled={loading}>{loading?"⏳":"↻"}</button>
    </div>
    <div style={H.summaryRow}>
      {[
        {icon:"📋",label:"Total",    value:summary.total,    color:"#2563EB"},
        {icon:"✅",label:"Completed",value:summary.completed,color:"#16A34A"},
        {icon:"🚫",label:"Cancelled",value:summary.cancelled,color:"#DC2626"},
        role==="driver"
          ? {icon:"🟢",label:"In Ride",  value:summary.inride,   color:"#10B981"}
          : {icon:"📅",label:"Scheduled",value:summary.scheduled,color:"#0F766E"},
      ].map((s)=>(
        <div key={s.label} style={H.summaryCard}>
          <span style={{fontSize:18}}>{s.icon}</span>
          <span style={{...H.summaryNum,color:s.color}}>{s.value}</span>
          <span style={H.summaryLabel}>{s.label}</span>
        </div>
      ))}
    </div>
    {loading ? (
      <div style={S.center}><div style={S.spinner}/><p style={{color:"#2563EB",marginTop:10}}>Loading…</p></div>
    ) : bookings.length === 0 ? (
      <div style={S.center}><span style={{fontSize:52,marginBottom:12}}>📭</span><p style={S.noTitle}>No bookings found</p><p style={S.noSub}>Try changing the filter.</p></div>
    ) : (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {bookings.map((b)=>{
          const meta=getMeta(b.status);
          const expanded=expandedId===b.id;
          const isActive=["pending","assigned","accepted","inride"].includes(b.status);
          return (
            <div key={b.id} style={{...H.bookingCard,...(isActive?H.bookingCardActive:{})}} onClick={()=>setExpandedId(expanded?null:b.id)}>
              <div style={H.cardHeader}>
                <div style={H.cardLeft}><div style={{...H.statusDot,backgroundColor:meta.dot}}/><div><div style={H.cardId}>Booking #{b.id}</div><div style={H.cardDate}>{fmtDate(b.created_at)} · {fmtTime(b.created_at)}</div></div></div>
                <div style={H.cardRight}><span style={{...H.statusPill,backgroundColor:meta.bg,color:meta.color}}>{meta.label}</span><span style={H.chevron}>{expanded?"▲":"▼"}</span></div>
              </div>
              <div style={H.routeRow}>
                <div style={H.routeItem}><div style={{...H.routeDot2,backgroundColor:"#10B981"}}/><span style={H.routeTxt}>{b.pickup||"—"}</span></div>
                <div style={H.routeArrow}>→</div>
                <div style={H.routeItem}><div style={{...H.routeDot2,backgroundColor:"#EF4444"}}/><span style={H.routeTxt}>{b.drop_location||"—"}</span></div>
              </div>
              <div style={H.tagsRow}>
                <span style={H.tag}>{b.triptype==="outstation"?"🗺️ Outstation":"🏙️ Local"}</span>
                {b.amount&&<span style={{...H.tag,backgroundColor:"#DCFCE7",color:"#15803D"}}>₹{b.amount}</span>}
                {b.cancellation_penalty>0&&<span style={{...H.tag,backgroundColor:"#FEE2E2",color:"#9F1239"}}>💸 ₹{b.cancellation_penalty} fee</span>}
                {b.rating&&<span style={{...H.tag,backgroundColor:"#FEF9C3",color:"#854D0E"}}>{"⭐".repeat(b.rating)}</span>}
              </div>
              {expanded && (
                <div style={H.expandBody} onClick={e=>e.stopPropagation()}>
                  <div style={H.divider}/>
                  {b.driver_name&&<div style={H.detailRow}><span style={H.detailKey}>👨‍✈️ Driver</span><span style={H.detailVal}>{b.driver_name}{b.driver_phone?` · ${b.driver_phone}`:""}</span></div>}
                  {role==="driver"&&(b.customer_name||b.customer_mobile)&&<div style={H.detailRow}><span style={H.detailKey}>👤 Customer</span><span style={H.detailVal}>{b.customer_name||"—"}{b.customer_mobile?` · ${b.customer_mobile}`:""}</span></div>}
                  {b.amount&&<div style={H.detailRow}><span style={H.detailKey}>💰 Fare</span><span style={{...H.detailVal,fontWeight:800,color:"#16A34A",fontSize:16}}>₹{b.amount}</span></div>}
                  {b.cancellation_penalty>0&&<div style={H.detailRow}><span style={H.detailKey}>💸 Fee</span><span style={{...H.detailVal,color:"#DC2626",fontWeight:700}}>₹{b.cancellation_penalty}</span></div>}
                  {b.rating&&<div style={H.detailRow}><span style={H.detailKey}>⭐ Rating</span><span style={H.detailVal}>{"⭐".repeat(b.rating)} ({b.rating}/5)</span></div>}
                  {b.feedback&&<div style={H.feedbackBox}><span style={H.detailKey}>💬 Feedback</span><p style={H.feedbackTxt}>{b.feedback}</p></div>}
                  {isActive&&<button style={H.goActiveBtn} onClick={()=>{setExpandedId(null);onGoActive();}}>🚗 View Active Ride →</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default RideTab;

/* ═══════════════ PAYMENT RECEIPT STYLES ═══════════════ */
const PR = {
  page:        { flex:1, backgroundColor:"#F8FAFC", minHeight:"100vh", padding:"32px 20px 100px", display:"flex", flexDirection:"column", gap:16 },
  top:         { display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" },
  iconRing:    { width:88, height:88, borderRadius:"50%", backgroundColor:"#F0FDF4", border:"3px solid #BBF7D0", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 },
  title:       { margin:"0 0 4px", fontSize:24, fontWeight:900, color:"#0F172A" },
  sub:         { margin:0, fontSize:14, color:"#64748B" },
  amtCard:     { backgroundColor:"#F0FDF4", border:"2.5px solid #86EFAC", borderRadius:22, padding:"20px", textAlign:"center" },
  amtLabel:    { margin:"0 0 4px", fontSize:10, fontWeight:800, color:"#16A34A", letterSpacing:"1.2px" },
  amtValue:    { margin:"0 0 4px", fontSize:52, fontWeight:900, color:"#15803D", lineHeight:1 },
  amtNote:     { margin:0, fontSize:12, color:"#16A34A", fontWeight:600 },
  breakdown:   { backgroundColor:"#fff", border:"1.5px solid #E2E8F0", borderRadius:16, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" },
  breakTitle:  { margin:"0 0 14px", fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.5px" },
  breakRow:    { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 },
  breakKey:    { fontSize:13, color:"#475569", fontWeight:500 },
  breakVal:    { fontSize:13, color:"#0F172A", fontWeight:700 },
  breakDivider:{ borderTop:"1.5px dashed #E2E8F0", margin:"10px 0" },
  reminder:    { display:"flex", alignItems:"center", gap:12, backgroundColor:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:14, padding:"14px" },
  reminderTxt: { margin:0, fontSize:13, color:"#92400E", fontWeight:600, lineHeight:1.6 },
  btn:         { width:"100%", padding:"17px 0", backgroundColor:"#2563EB", border:"none", borderRadius:16, color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 16px rgba(37,99,235,0.32)" },
};

/* ═══════════════ SHARED STYLES ═══════════════ */
const S = {
  page:        { flex:1, backgroundColor:"#F4F6F9", padding:"12px 16px 90px", minHeight:"100vh" },
  center:      { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"40vh", padding:24, textAlign:"center" },
  spinner:     { width:40, height:40, border:"4px solid #bfdbfe", borderTopColor:"#2563EB", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  noTitle:     { margin:"0 0 8px", fontSize:18, fontWeight:700, color:"#1E293B" },
  noSub:       { margin:"0 0 16px", fontSize:14, color:"#64748B", lineHeight:1.5 },
  histBtn:     { padding:"10px 20px", backgroundColor:"#2563EB", color:"#fff", border:"none", borderRadius:12, fontWeight:700, fontSize:14, cursor:"pointer" },
  tabBar:      { display:"flex", gap:6, marginBottom:14, backgroundColor:"#E2E8F0", borderRadius:14, padding:4 },
  tabBtn:      { flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", borderRadius:10, border:"none", backgroundColor:"transparent", fontSize:13, fontWeight:600, color:"#64748B", cursor:"pointer" },
  tabActive:   { backgroundColor:"#fff", color:"#1E293B", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" },
  tabCount:    { backgroundColor:"#2563EB", color:"#fff", fontSize:10, fontWeight:800, borderRadius:20, padding:"1px 6px" },
  liveDotInline:{ width:8, height:8, borderRadius:"50%", backgroundColor:"#EF4444", display:"inline-block", marginLeft:4, animation:"pulse 1s ease infinite" },
  statusBar:   { display:"flex", alignItems:"center", gap:10, borderRadius:16, padding:"14px 16px", marginBottom:14 },
  dot:         { width:10, height:10, borderRadius:"50%", flexShrink:0, animation:"pulse 1.5s ease infinite" },
  statusTxt:   { fontSize:15, fontWeight:700 },
  mapSection:  { marginBottom:14 },
  mapWrap:     { position:"relative", width:"100%", height:220, borderRadius:18, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.12)" },
  mapBox:      { width:"100%", height:"100%" },
  livePill:    { position:"absolute", top:10, left:10, display:"flex", alignItems:"center", gap:5, backgroundColor:"rgba(0,0,0,0.65)", borderRadius:20, padding:"4px 10px", zIndex:10 },
  liveDot:     { width:8, height:8, borderRadius:"50%", backgroundColor:"#EF4444", animation:"pulse 1s ease infinite" },
  liveTxt:     { fontSize:11, fontWeight:800, color:"#fff", letterSpacing:1 },
  gpsRow:      { display:"flex", alignItems:"center", gap:8, backgroundColor:"#fff", borderRadius:12, padding:"8px 12px", marginTop:8 },
  gpsTxt:      { fontSize:12, color:"#64748B", flex:1 },
  gpsBadge:    { fontSize:10, fontWeight:700, color:"#10B981", backgroundColor:"#D1FAE5", padding:"2px 8px", borderRadius:10 },
  ratesBadge:  { display:"flex", alignItems:"center", gap:8, backgroundColor:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12, padding:"8px 12px", marginBottom:12 },
  startBtn:    { width:"100%", padding:"16px 0", backgroundColor:"#F59E0B", border:"none", borderRadius:16, fontSize:16, fontWeight:800, color:"#fff", cursor:"pointer", marginBottom:10, boxShadow:"0 4px 12px rgba(245,158,11,0.3)" },
  completeBtn: { width:"100%", padding:"16px 0", backgroundColor:"#10B981", border:"none", borderRadius:16, fontSize:16, fontWeight:800, color:"#fff", cursor:"pointer", marginBottom:10, boxShadow:"0 4px 12px rgba(16,185,129,0.3)" },
  card:        { backgroundColor:"#fff", borderRadius:18, padding:16, marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  cardLabel:   { margin:"0 0 12px", fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5 },
  personRow:   { display:"flex", alignItems:"center", gap:12 },
  avatar:      { width:50, height:50, borderRadius:"50%", backgroundColor:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  personName:  { margin:"0 0 4px", fontSize:16, fontWeight:700, color:"#1E293B" },
  personPhone: { margin:0, fontSize:13, color:"#64748B" },
  callBtn:     { width:42, height:42, borderRadius:"50%", backgroundColor:"#D1FAE5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, textDecoration:"none" },
  waitCard:    { display:"flex", alignItems:"center", gap:14, backgroundColor:"#EFF6FF", borderRadius:16, padding:16, marginBottom:12 },
  waitSpin:    { width:32, height:32, border:"3px solid #bfdbfe", borderTopColor:"#2563EB", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 },
  waitTitle:   { margin:"0 0 3px", fontSize:15, fontWeight:700, color:"#1E293B" },
  waitSub:     { margin:0, fontSize:12, color:"#64748B" },
  routeDot:    { width:12, height:12, borderRadius:"50%", marginTop:3, flexShrink:0 },
  routeLabel:  { margin:"0 0 2px", fontSize:10, color:"#94A3B8", fontWeight:700, textTransform:"uppercase" },
  routeVal:    { margin:0, fontSize:14, fontWeight:600, color:"#1E293B" },
  infoChip:    { flex:1, backgroundColor:"#F8FAFC", borderRadius:12, padding:"10px 12px" },
  infoKey:     { display:"block", fontSize:10, color:"#94A3B8", fontWeight:700, textTransform:"uppercase", marginBottom:4 },
  infoVal:     { display:"block", fontSize:14, fontWeight:700, color:"#1E293B", textTransform:"capitalize" },
  ratingPage:  { flex:1, backgroundColor:"#F8FAFC", minHeight:"100vh", padding:"32px 20px 100px", display:"flex", flexDirection:"column", gap:16 },
  ratingTop:   { display:"flex", flexDirection:"column", alignItems:"center" },
  ratingBubble:{ width:96, height:96, borderRadius:"50%", backgroundColor:"#FEF9C3", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 },
  ratingTitle: { margin:"0 0 6px", fontSize:26, fontWeight:800, color:"#1E293B" },
  ratingDesc:  { margin:0, fontSize:15, color:"#64748B" },
  starRow:     { display:"flex", justifyContent:"center", gap:6 },
  starBtn:     { background:"none", border:"none", cursor:"pointer", padding:4, lineHeight:1 },
  ratingHint:  { margin:"12px 0 0", textAlign:"center", fontSize:15, fontWeight:700, color:"#2563EB" },
  textarea:    { width:"100%", boxSizing:"border-box", border:"1.5px solid #E2E8F0", borderRadius:14, padding:"12px 14px", fontSize:14, backgroundColor:"#F8FAFC", resize:"none", outline:"none", fontFamily:"inherit" },
  ratingBtns:  { display:"flex", gap:10 },
  skipBtn:     { flex:1, padding:"14px 0", borderRadius:14, backgroundColor:"#E2E8F0", border:"none", fontWeight:700, fontSize:15, color:"#475569", cursor:"pointer" },
  submitBtn:   { flex:2, padding:"14px 0", borderRadius:14, backgroundColor:"#2563EB", border:"none", fontWeight:800, fontSize:15, color:"#fff", cursor:"pointer" },
};

const H = {
  pillRow:     { display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 },
  pill:        { padding:"6px 14px", borderRadius:20, border:"1.5px solid #E2E8F0", backgroundColor:"#F8FAFC", fontSize:12, fontWeight:600, color:"#64748B", cursor:"pointer" },
  pillActive:  { backgroundColor:"#2563EB", borderColor:"#2563EB", color:"#fff", boxShadow:"0 2px 8px rgba(37,99,235,0.3)" },
  pickerRow:   { display:"flex", alignItems:"center", gap:10, marginBottom:10, backgroundColor:"#EFF6FF", borderRadius:12, padding:"10px 14px" },
  pickerLabel: { fontSize:13, fontWeight:600, color:"#1D4ED8", whiteSpace:"nowrap" },
  dateInput:   { flex:1, border:"1.5px solid #BFDBFE", borderRadius:10, padding:"8px 12px", fontSize:13, backgroundColor:"#fff", outline:"none", color:"#1E293B" },
  filterRow:   { display:"flex", gap:8, marginBottom:12, alignItems:"center" },
  select:      { flex:"0 0 auto", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:12, backgroundColor:"#F8FAFC", fontSize:12, fontWeight:600, color:"#1E293B", outline:"none", cursor:"pointer" },
  searchInput: { flex:1, padding:"9px 14px", border:"1.5px solid #E2E8F0", borderRadius:12, backgroundColor:"#F8FAFC", fontSize:13, outline:"none", color:"#1E293B" },
  refreshBtn:  { width:38, height:38, borderRadius:10, backgroundColor:"#EFF6FF", border:"1.5px solid #BFDBFE", fontSize:16, color:"#2563EB", fontWeight:700, cursor:"pointer", flexShrink:0 },
  summaryRow:  { display:"flex", gap:8, marginBottom:14 },
  summaryCard: { flex:1, backgroundColor:"#fff", borderRadius:14, padding:"10px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, boxShadow:"0 2px 6px rgba(0,0,0,0.05)" },
  summaryNum:  { fontSize:22, fontWeight:900, lineHeight:1 },
  summaryLabel:{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.4px" },
  bookingCard: { backgroundColor:"#fff", borderRadius:16, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", cursor:"pointer", border:"1.5px solid transparent" },
  bookingCardActive:{ border:"1.5px solid #BFDBFE", backgroundColor:"#F0F9FF" },
  cardHeader:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  cardLeft:    { display:"flex", alignItems:"center", gap:10 },
  statusDot:   { width:10, height:10, borderRadius:"50%", flexShrink:0, marginTop:2 },
  cardId:      { fontSize:13, fontWeight:700, color:"#1E293B" },
  cardDate:    { fontSize:11, color:"#94A3B8", marginTop:1 },
  cardRight:   { display:"flex", alignItems:"center", gap:8 },
  statusPill:  { fontSize:11, fontWeight:700, borderRadius:20, padding:"3px 10px", whiteSpace:"nowrap" },
  chevron:     { fontSize:11, color:"#94A3B8" },
  routeRow:    { display:"flex", alignItems:"center", gap:6, marginBottom:8 },
  routeItem:   { display:"flex", alignItems:"center", gap:5, flex:1, minWidth:0 },
  routeDot2:   { width:7, height:7, borderRadius:"50%", flexShrink:0 },
  routeTxt:    { fontSize:12, color:"#475569", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  routeArrow:  { fontSize:12, color:"#CBD5E1", flexShrink:0 },
  tagsRow:     { display:"flex", gap:6, flexWrap:"wrap" },
  tag:         { fontSize:10, fontWeight:700, backgroundColor:"#F1F5F9", color:"#475569", borderRadius:20, padding:"3px 8px" },
  expandBody:  { marginTop:12 },
  divider:     { height:1, backgroundColor:"#F1F5F9", marginBottom:12 },
  detailRow:   { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, gap:8 },
  detailKey:   { fontSize:12, color:"#94A3B8", fontWeight:600, flexShrink:0 },
  detailVal:   { fontSize:13, color:"#1E293B", fontWeight:600, textAlign:"right" },
  feedbackBox: { backgroundColor:"#F8FAFC", borderRadius:10, padding:"10px 12px", marginTop:4 },
  feedbackTxt: { margin:"4px 0 0", fontSize:13, color:"#475569", lineHeight:1.5 },
  goActiveBtn: { width:"100%", marginTop:12, padding:"11px 0", backgroundColor:"#EFF6FF", border:"1.5px solid #BFDBFE", borderRadius:12, color:"#1D4ED8", fontWeight:700, fontSize:13, cursor:"pointer" },
};