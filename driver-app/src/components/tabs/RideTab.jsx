import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ─────────────────────────────────────────
   FARE STRUCTURE
───────────────────────────────────────── */
const BASE_PACKAGE_HRS  = 4;
const BASE_PACKAGE_FARE = 450;
const EXTRA_HR_RATE     = 200;

function calcFare(hrs) {
  if (!hrs || hrs <= 0) return 0;
  if (hrs <= BASE_PACKAGE_HRS) return BASE_PACKAGE_FARE;
  return BASE_PACKAGE_FARE + Math.ceil(hrs - BASE_PACKAGE_HRS) * EXTRA_HR_RATE;
}

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
};
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true });
};
const toDateStr = (iso) => iso ? new Date(iso).toISOString().slice(0,10) : "";
const todayStr  = () => new Date().toISOString().slice(0,10);
const thisMonthStr = () => {
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

/* ═══════════════════════════════════════════════════════ */
const RideTab = () => {
  const role = localStorage.getItem("role") || "";

  /* ── active ride ── */
  const [booking,        setBooking]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [driverPos,      setDriverPos]      = useState(null);

  /* ── all bookings ── */
  const [allBookings,    setAllBookings]    = useState([]);
  const [histLoading,    setHistLoading]    = useState(false);

  /* ── tab ── */
  const [activeTab,      setActiveTab]      = useState("active");

  /* ── filters ── */
  const [dateMode,       setDateMode]       = useState("all");    // all | today | thismonth | custom | custommonth
  const [customDate,     setCustomDate]     = useState(todayStr());
  const [customMonth,    setCustomMonth]    = useState(thisMonthStr());
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");

  /* ── expand card ── */
  const [expandedId,     setExpandedId]     = useState(null);

  /* ── rating ── */
  const [ratingBooking,  setRatingBooking]  = useState(null);
  const [rating,         setRating]         = useState(0);
  const [comment,        setComment]        = useState("");
  const [ratingSubmit,   setRatingSubmit]   = useState(false);

  /* ── duration popup ── */
  const [showPopup,      setShowPopup]      = useState(false);
  const [rideToComplete, setRideToComplete] = useState(null);
  const [hours,          setHours]          = useState("");
  const [popupErr,       setPopupErr]       = useState("");
  const [completing,     setCompleting]     = useState(false);

  const prevStatus = useRef(null);
  const pollRef    = useRef(null);
  const mapDiv     = useRef(null);
  const lMap       = useRef(null);
  const driverMk   = useRef(null);
  const watchId    = useRef(null);

  /* ─── fetch ─── */
  const fetchAll = async () => {
    try {
      const phone    = localStorage.getItem("customerPhone") || "";
      const driverId = localStorage.getItem("driverId")      || "";
      let res;
      if (role === "customer") res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${phone}`);
      else if (role === "driver") res = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${driverId}`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setAllBookings(list);

      const active = list.find((b) => ["pending","assigned","accepted","inride"].includes(b.status)) || null;
      if (active) { prevStatus.current = active.status; setBooking(active); setLoading(false); return; }

      if (role === "customer") {
        const unrated   = list.filter((b) => b.status==="completed" && !b.rating)
                              .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
        const wasActive = ["inride","accepted","assigned","pending"].includes(prevStatus.current);
        if (unrated && wasActive) { setRatingBooking(unrated); setBooking(null); prevStatus.current="completed"; setLoading(false); return; }
        if (ratingBooking) { setLoading(false); return; }
      }

      prevStatus.current = null; setBooking(null);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const phone    = localStorage.getItem("customerPhone") || "";
      const driverId = localStorage.getItem("driverId")      || "";
      let res;
      if (role === "customer") res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${phone}`);
      else if (role === "driver") res = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${driverId}`);
      setAllBookings(Array.isArray(res?.data) ? res.data : []);
    } catch {}
    finally { setHistLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 4000);
    return () => { clearInterval(pollRef.current); if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  /* ─── map ─── */
  useEffect(() => {
    if (!booking || !mapDiv.current) return;
    if (!["assigned","accepted","inride"].includes(booking.status)) return;
    const init = () => {
      const L = window.L; if (!L || !mapDiv.current) return;
      const lat = parseFloat(booking.pickup_lat) || 13.0827;
      const lng = parseFloat(booking.pickup_lng) || 80.2707;
      if (lMap.current) { lMap.current.setView([lat,lng],14); setTimeout(()=>lMap.current?.invalidateSize(),200); return; }
      const map = L.map(mapDiv.current, { center:[lat,lng], zoom:14, zoomControl:false, attributionControl:false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);
      const icon = L.divIcon({ className:"", html:`<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚕</div>`, iconSize:[32,32], iconAnchor:[16,16] });
      driverMk.current = L.marker([lat,lng],{icon}).addTo(map);
      lMap.current = map; setTimeout(()=>map.invalidateSize(),200);
    };
    if (window.L) init();
    else {
      if (!document.getElementById("lcs")) { const l=document.createElement("link"); l.id="lcs"; l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l); }
      const s=document.createElement("script"); s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=init; document.head.appendChild(s);
    }
  }, [booking?.status]);

  /* ─── driver GPS ─── */
  useEffect(() => {
    if (role!=="driver"||!booking||!["accepted","inride"].includes(booking.status)) return;
    const driverId = localStorage.getItem("driverId");
    if (!driverId||!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(async({coords}) => {
      const {latitude:lat,longitude:lng} = coords;
      setDriverPos({lat,lng});
      if (driverMk.current&&lMap.current) { driverMk.current.setLatLng([lat,lng]); lMap.current.setView([lat,lng],15); }
      try { await fetch(`${BASE_URL}/api/driver/updateLocation`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({driverId,lat,lng})}); } catch {}
    }, ()=>{}, {enableHighAccuracy:true,maximumAge:3000,timeout:8000});
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [booking?.status]);

  /* ─── customer GPS poll ─── */
  useEffect(() => {
    if (role!=="customer"||!booking?.driver_id||!["assigned","accepted","inride"].includes(booking.status)) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/drivers`);
        const dr  = (Array.isArray(res.data)?res.data:[]).find((d)=>d.id==booking.driver_id);
        if (dr?.lat&&dr?.lng) {
          const pos={lat:parseFloat(dr.lat),lng:parseFloat(dr.lng)};
          setDriverPos(pos);
          if (driverMk.current&&lMap.current) { driverMk.current.setLatLng([pos.lat,pos.lng]); lMap.current.setView([pos.lat,pos.lng],15); }
        }
      } catch {}
    };
    poll(); const iv=setInterval(poll,4000); return ()=>clearInterval(iv);
  }, [booking?.driver_id, booking?.status]);

  const startRide = async () => {
    await axios.post(`${BASE_URL}/api/bookings/start`, {bookingId:booking.id, driverId:booking.driver_id});
    fetchAll();
  };
  const openCompletePopup = () => { setRideToComplete(booking); setHours(""); setPopupErr(""); setShowPopup(true); };
  const handleComplete = async () => {
    const h = parseFloat(hours);
    if (!hours||isNaN(h)||h<=0) { setPopupErr("Please enter valid hours."); return; }
    if (h>24) { setPopupErr("Max 24 hours."); return; }
    setCompleting(true);
    try {
      await axios.post(`${BASE_URL}/api/complete-ride`, {
        bookingId: rideToComplete.id, driverId: localStorage.getItem("driverId"),
        durationMins: Math.round(h*60), fare: calcFare(h),
      });
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      setShowPopup(false); setRideToComplete(null); fetchAll();
    } catch (e) { setPopupErr("Failed: "+(e?.response?.data?.message||e.message)); }
    finally { setCompleting(false); }
  };
  const submitRating = async () => {
    if (!rating) { alert("Please select a star rating"); return; }
    setRatingSubmit(true);
    try { await axios.post(`${BASE_URL}/api/submit-rating`, {bookingId:ratingBooking.id, rating, comment}); setRatingBooking(null); setRating(0); setComment(""); }
    catch { console.warn("rating error"); }
    finally { setRatingSubmit(false); }
  };

  const parsedHrs = parseFloat(hours) || 0;
  const liveFare  = calcFare(parsedHrs);
  const extraHrs  = parsedHrs > BASE_PACKAGE_HRS ? Math.ceil(parsedHrs - BASE_PACKAGE_HRS) : 0;
  const isExtra   = parsedHrs > BASE_PACKAGE_HRS;

  /* ─── apply filters ─── */
  const filteredBookings = allBookings.filter((b) => {
    const dateStr = toDateStr(b.created_at || b.scheduled_at);
    const monthStr = dateStr.slice(0,7);

    if (dateMode === "today"       && dateStr !== todayStr())      return false;
    if (dateMode === "thismonth"   && monthStr !== thisMonthStr()) return false;
    if (dateMode === "custom"      && dateStr !== customDate)      return false;
    if (dateMode === "custommonth" && monthStr !== customMonth)    return false;

    if (statusFilter !== "all" && b.status?.toLowerCase() !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(b.pickup||"").toLowerCase().includes(q) &&
          !(b.drop_location||"").toLowerCase().includes(q) &&
          !(String(b.id)||"").includes(q)) return false;
    }
    return true;
  }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  /* ─── summary counts ─── */
  const summary = {
    total:     filteredBookings.length,
    completed: filteredBookings.filter(b => b.status==="completed").length,
    cancelled: filteredBookings.filter(b => b.status?.includes("cancel")).length,
    scheduled: filteredBookings.filter(b => b.is_scheduled).length,
    inride:    filteredBookings.filter(b => b.status==="inride").length,
  };

  /* ════════════════════════════════════════════════════════════
     DRIVER VIEW — active booking only, no history tab
  ════════════════════════════════════════════════════════════ */
  if (role === "driver") {
    if (loading) return <div style={S.center}><div style={S.spinner}/><p style={{color:"#2563EB",fontWeight:600,marginTop:12}}>Loading...</p></div>;

    if (!booking) return (
      <div style={S.center}>
        <span style={{fontSize:64,marginBottom:16}}>🚗</span>
        <p style={S.noTitle}>No active booking</p>
        <p style={S.noSub}>Your assigned ride will appear here automatically.</p>
      </div>
    );

    const dm = getMeta(booking.status);
    return (
      <div style={S.page}>
        <div style={{...S.statusBar, backgroundColor:dm.bg}}>
          <div style={{...S.dot, backgroundColor:dm.dot}}/>
          <span style={{...S.statusTxt, color:dm.color}}>{dm.label}</span>
        </div>

        {["assigned","accepted","inride"].includes(booking.status) && (
          <div style={S.mapSection}>
            <div style={S.mapWrap}>
              <div ref={mapDiv} style={S.mapBox}/>
              <div style={S.livePill}><div style={S.liveDot}/><span style={S.liveTxt}>LIVE</span></div>
            </div>
            {driverPos && (
              <div style={S.gpsRow}>
                <span>📡</span>
                <span style={S.gpsTxt}>{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</span>
                <span style={S.gpsBadge}>Live</span>
              </div>
            )}
          </div>
        )}

        <div style={{marginBottom:14}}>
          {booking.status==="assigned" && <button style={S.startBtn} onClick={startRide}>🚦 START RIDE</button>}
          {booking.status==="inride"   && <button style={S.completeBtn} onClick={openCompletePopup}>✅ COMPLETE RIDE</button>}
        </div>

        <div style={S.card}>
          <p style={S.cardLabel}>👤 Customer</p>
          <div style={S.personRow}>
            <div style={S.avatar}><span style={{fontSize:26}}>👤</span></div>
            <div style={{flex:1}}>
              <p style={S.personName}>{booking.customer_name||"—"}</p>
              <p style={S.personPhone}>📞 {booking.customer_mobile||"—"}</p>
            </div>
            <a href={`tel:${booking.customer_mobile}`} style={S.callBtn}>📞</a>
          </div>
        </div>

        <div style={S.card}>
          <p style={S.cardLabel}>🗺️ Route</p>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{...S.routeDot,backgroundColor:"#10B981"}}/>
            <div><p style={S.routeLabel}>Pickup</p><p style={S.routeVal}>{booking.pickup||"—"}</p></div>
          </div>
          <div style={{width:2,height:16,backgroundColor:"#CBD5E1",margin:"4px 0 4px 5px"}}/>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{...S.routeDot,backgroundColor:"#EF4444"}}/>
            <div><p style={S.routeLabel}>Drop</p><p style={S.routeVal}>{booking.drop_location||"—"}</p></div>
          </div>
        </div>

        <div style={S.card}>
          <p style={S.cardLabel}>📋 Booking Info</p>
          <div style={{display:"flex",gap:12}}>
            <div style={S.infoChip}><span style={S.infoKey}>Booking ID</span><span style={S.infoVal}>#{booking.id}</span></div>
            <div style={S.infoChip}><span style={S.infoKey}>Trip Type</span><span style={S.infoVal}>{booking.triptype||"local"}</span></div>
          </div>
          {booking.fare && (
            <div style={{...S.infoChip,marginTop:10,flex:"unset"}}>
              <span style={S.infoKey}>Fare</span>
              <span style={{...S.infoVal,color:"#16A34A",fontSize:18}}>₹{booking.fare}</span>
            </div>
          )}
        </div>

        {/* Duration popup */}
        {showPopup && (
          <div style={P.overlay}>
            <div style={P.sheet}>
              <div style={P.handle}/>
              <div style={P.header}>
                <span style={P.headerEmoji}>🏁</span>
                <div><h3 style={P.title}>Ride Completed!</h3><p style={P.subtitle}>Enter trip duration to calculate fare</p></div>
              </div>
              <div style={P.structCard}>
                <div style={P.structRow}>
                  <div style={P.structLeft}><span style={P.structIcon}>📦</span><div><p style={P.structTitle}>Base Package</p><p style={P.structDesc}>Up to {BASE_PACKAGE_HRS} hours</p></div></div>
                  <span style={P.structPrice}>₹{BASE_PACKAGE_FARE}</span>
                </div>
                <div style={P.structDivider}/>
                <div style={P.structRow}>
                  <div style={P.structLeft}><span style={P.structIcon}>⏰</span><div><p style={P.structTitle}>Additional Hours</p><p style={P.structDesc}>After {BASE_PACKAGE_HRS} hrs</p></div></div>
                  <span style={P.structPrice}>₹{EXTRA_HR_RATE}/hr</span>
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={P.inputLabel}>⏱ Enter trip duration (hours)</label>
                <div style={P.inputWrap}>
                  <input type="number" min="0.5" max="24" step="0.5" placeholder="0" value={hours}
                    onChange={(e)=>{setHours(e.target.value);setPopupErr("");}} style={P.input} autoFocus/>
                  <span style={P.inputUnit}>hrs</span>
                </div>
                {popupErr && <p style={P.error}>{popupErr}</p>}
              </div>
              {parsedHrs>0 && (
                <div style={P.fareCard}>
                  <p style={P.fareCardTitle}>💰 Fare Calculation</p>
                  <div style={P.fareRow}><span style={P.fareKey}>Base ({BASE_PACKAGE_HRS} hrs package)</span><span style={P.fareAmt}>₹{BASE_PACKAGE_FARE}</span></div>
                  {isExtra && <div style={P.fareRow}><span style={P.fareKey}>Extra {extraHrs} hr{extraHrs>1?"s":""} × ₹{EXTRA_HR_RATE}</span><span style={P.fareAmt}>₹{extraHrs*EXTRA_HR_RATE}</span></div>}
                  <div style={P.fareDivider}/>
                  <div style={P.fareTotalRow}>
                    <span style={P.fareTotalKey}>{parsedHrs} hr{parsedHrs!==1?"s":""} total</span>
                    <span style={P.fareTotalAmt}>₹{liveFare}</span>
                  </div>
                  <p style={P.fareExample}>{isExtra?`₹${BASE_PACKAGE_FARE} + ${extraHrs} × ₹${EXTRA_HR_RATE} = ₹${liveFare}`:`Flat package — up to ${BASE_PACKAGE_HRS} hrs = ₹${BASE_PACKAGE_FARE}`}</p>
                </div>
              )}
              <div style={P.actions}>
                <button style={P.backBtn} onClick={()=>{setShowPopup(false);setRideToComplete(null);}} disabled={completing}>← Back</button>
                <button style={{...P.confirmBtn,opacity:completing||!hours||parsedHrs<=0?0.55:1,cursor:completing||!hours||parsedHrs<=0?"not-allowed":"pointer"}}
                  onClick={handleComplete} disabled={completing||!hours||parsedHrs<=0}>
                  {completing?"⏳ Completing…":parsedHrs>0?`✅ Confirm — ₹${liveFare}`:"✅ Confirm Ride"}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     CUSTOMER VIEW — rating screen + active + full history
  ════════════════════════════════════════════════════════════ */

  /* ── Rating screen (customer only) ── */
  if (ratingBooking) return (
    <div style={S.ratingPage}>
      <div style={S.ratingTop}>
        <div style={S.ratingBubble}><span style={{fontSize:50}}>🎉</span></div>
        <h2 style={S.ratingTitle}>Ride Completed!</h2>
        <p style={S.ratingDesc}>How was your experience?</p>
      </div>
      <div style={S.card}>
        <p style={S.cardLabel}>Tap a star to rate</p>
        <div style={S.starRow}>
          {[1,2,3,4,5].map((s)=>(
            <button key={s} style={S.starBtn} onClick={()=>setRating(s)}>
              <span style={{fontSize:42,transition:"transform 0.1s",display:"block",transform:s<=rating?"scale(1.2)":"scale(1)"}}>{s<=rating?"⭐":"☆"}</span>
            </button>
          ))}
        </div>
        {rating>0 && <p style={S.ratingHint}>{["","Poor 😞","Fair 😐","Good 🙂","Great 😊","Excellent 🤩"][rating]}</p>}
      </div>
      <div style={S.card}>
        <textarea style={S.textarea} placeholder="Leave a comment (optional)" value={comment} onChange={e=>setComment(e.target.value)} rows={3}/>
      </div>
      <div style={S.ratingBtns}>
        <button style={S.skipBtn} onClick={()=>{setRatingBooking(null);setRating(0);setComment("");}}>Skip</button>
        <button style={{...S.submitBtn,opacity:ratingSubmit?0.7:1}} onClick={submitRating} disabled={ratingSubmit}>
          {ratingSubmit?"Submitting...":"Submit ⭐"}
        </button>
      </div>
    </div>
  );

  if (loading) return <div style={S.center}><div style={S.spinner}/><p style={{color:"#2563EB",fontWeight:600,marginTop:12}}>Loading...</p></div>;

  /* ════════════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={S.page}>

      {/* ── TAB BAR ── */}
      <div style={S.tabBar}>
        <button style={{...S.tabBtn,...(activeTab==="active"?S.tabActive:{})}} onClick={()=>setActiveTab("active")}>
          🚗 Active Ride {booking && <span style={S.liveDotInline}/>}
        </button>
        <button style={{...S.tabBtn,...(activeTab==="history"?S.tabActive:{})}} onClick={()=>setActiveTab("history")}>
          📋 All Bookings <span style={S.tabCount}>{allBookings.length}</span>
        </button>
      </div>

      {/* ════════════════════════
          ACTIVE RIDE TAB
      ════════════════════════ */}
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
              {/* Status banner */}
              {(() => { const m=getMeta(booking.status); return (
                <div style={{...S.statusBar,backgroundColor:m.bg}}>
                  <div style={{...S.dot,backgroundColor:m.dot}}/>
                  <span style={{...S.statusTxt,color:m.color}}>{m.label}</span>
                </div>
              ); })()}

              {/* Map */}
              {["assigned","accepted","inride"].includes(booking.status) && (
                <div style={S.mapSection}>
                  <div style={S.mapWrap}>
                    <div ref={mapDiv} style={S.mapBox}/>
                    <div style={S.livePill}><div style={S.liveDot}/><span style={S.liveTxt}>LIVE</span></div>
                  </div>
                  {driverPos && (
                    <div style={S.gpsRow}>
                      <span>📡</span>
                      <span style={S.gpsTxt}>Driver: {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</span>
                      <span style={S.gpsBadge}>Live</span>
                    </div>
                  )}
                </div>
              )}

              {/* Driver info card (customer sees) */}
              {booking.driver_name && (
                <div style={S.card}>
                  <p style={S.cardLabel}>👨‍✈️ Your Driver</p>
                  <div style={S.personRow}>
                    <div style={S.avatar}><span style={{fontSize:26}}>👨‍✈️</span></div>
                    <div style={{flex:1}}><p style={S.personName}>{booking.driver_name}</p><p style={S.personPhone}>📞 {booking.driver_phone||"—"}</p></div>
                    <a href={`tel:${booking.driver_phone}`} style={S.callBtn}>📞</a>
                  </div>
                </div>
              )}
              {booking.status==="pending" && (
                <div style={S.waitCard}>
                  <div style={S.waitSpin}/><div><p style={S.waitTitle}>Finding your driver...</p><p style={S.waitSub}>Usually takes 1–3 minutes</p></div>
                </div>
              )}

              {/* Route */}
              <div style={S.card}>
                <p style={S.cardLabel}>🗺️ Route</p>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{...S.routeDot,backgroundColor:"#10B981"}}/>
                  <div><p style={S.routeLabel}>Pickup</p><p style={S.routeVal}>{booking.pickup||"—"}</p></div>
                </div>
                <div style={{width:2,height:16,backgroundColor:"#CBD5E1",margin:"4px 0 4px 5px"}}/>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{...S.routeDot,backgroundColor:"#EF4444"}}/>
                  <div><p style={S.routeLabel}>Drop</p><p style={S.routeVal}>{booking.drop_location||"—"}</p></div>
                </div>
              </div>

              <div style={S.card}>
                <p style={S.cardLabel}>📋 Booking Info</p>
                <div style={{display:"flex",gap:12}}>
                  <div style={S.infoChip}><span style={S.infoKey}>Booking ID</span><span style={S.infoVal}>#{booking.id}</span></div>
                  <div style={S.infoChip}><span style={S.infoKey}>Trip Type</span><span style={S.infoVal}>{booking.triptype||"local"}</span></div>
                </div>
                {booking.fare && (
                  <div style={{...S.infoChip,marginTop:10}}>
                    <span style={S.infoKey}>Fare</span>
                    <span style={{...S.infoVal,color:"#16A34A",fontSize:18}}>₹{booking.fare}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════════════
          ALL BOOKINGS TAB
      ════════════════════════ */}
      {activeTab==="history" && (
        <div>

          {/* ── DATE MODE PILLS ── */}
          <div style={H.pillRow}>
            {[
              {key:"all",       label:"All Time"},
              {key:"today",     label:"Today"},
              {key:"thismonth", label:"This Month"},
              {key:"custom",    label:"Pick Date"},
              {key:"custommonth",label:"Pick Month"},
            ].map((m)=>(
              <button key={m.key}
                style={{...H.pill,...(dateMode===m.key?H.pillActive:{})}}
                onClick={()=>setDateMode(m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          {/* ── DATE PICKERS ── */}
          {dateMode==="custom" && (
            <div style={H.pickerRow}>
              <span style={H.pickerLabel}>📅 Select Date:</span>
              <input type="date" value={customDate} max={todayStr()}
                onChange={e=>setCustomDate(e.target.value)} style={H.dateInput}/>
            </div>
          )}
          {dateMode==="custommonth" && (
            <div style={H.pickerRow}>
              <span style={H.pickerLabel}>📅 Select Month:</span>
              <input type="month" value={customMonth} max={thisMonthStr()}
                onChange={e=>setCustomMonth(e.target.value)} style={H.dateInput}/>
            </div>
          )}

          {/* ── STATUS FILTER + SEARCH ── */}
          <div style={H.filterRow}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={H.select}>
              <option value="all">All Status</option>
              <option value="completed">✅ Completed</option>
              <option value="inride">🟢 In Ride</option>
              <option value="assigned">🔵 Assigned</option>
              <option value="accepted">🟡 Accepted</option>
              <option value="pending">⏳ Pending</option>
              <option value="scheduled">📅 Scheduled</option>
              <option value="cancelled">🚫 Cancelled</option>
              <option value="allbusy">🚫 All Busy</option>
              <option value="wait5">⏱ Wait 5</option>
              <option value="wait10">⏱ Wait 10</option>
              <option value="wait30">⏱ Wait 30</option>
            </select>
            <input
              style={H.searchInput}
              placeholder="🔍 Search pickup, drop, ID…"
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
            />
            <button style={H.refreshBtn} onClick={fetchHistory} disabled={histLoading}>
              {histLoading?"⏳":"↻"}
            </button>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div style={H.summaryRow}>
            {[
              {icon:"📋", label:"Total",     value:summary.total,     color:"#2563EB"},
              {icon:"✅", label:"Completed", value:summary.completed, color:"#16A34A"},
              {icon:"🚫", label:"Cancelled", value:summary.cancelled, color:"#DC2626"},
              {icon:"📅", label:"Scheduled", value:summary.scheduled, color:"#0F766E"},
            ].map((s)=>(
              <div key={s.label} style={H.summaryCard}>
                <span style={{fontSize:18}}>{s.icon}</span>
                <span style={{...H.summaryNum,color:s.color}}>{s.value}</span>
                <span style={H.summaryLabel}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── BOOKING LIST ── */}
          {histLoading ? (
            <div style={S.center}><div style={S.spinner}/><p style={{color:"#2563EB",marginTop:10}}>Loading bookings…</p></div>
          ) : filteredBookings.length === 0 ? (
            <div style={S.center}>
              <span style={{fontSize:52,marginBottom:12}}>📭</span>
              <p style={S.noTitle}>No bookings found</p>
              <p style={S.noSub}>Try changing the date or status filter.</p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredBookings.map((b) => {
                const meta      = getMeta(b.status);
                const expanded  = expandedId === b.id;
                const isActive  = ["pending","assigned","accepted","inride"].includes(b.status);

                return (
                  <div key={b.id}
                    style={{...H.bookingCard,...(isActive?H.bookingCardActive:{})}}
                    onClick={()=>setExpandedId(expanded?null:b.id)}>

                    {/* ── Card header ── */}
                    <div style={H.cardHeader}>
                      <div style={H.cardLeft}>
                        <div style={{...H.statusDot,backgroundColor:meta.dot}}/>
                        <div>
                          <div style={H.cardId}>Booking #{b.id}</div>
                          <div style={H.cardDate}>{fmtDate(b.created_at)} · {fmtTime(b.created_at)}</div>
                        </div>
                      </div>
                      <div style={H.cardRight}>
                        <span style={{...H.statusPill,backgroundColor:meta.bg,color:meta.color}}>
                          {meta.label}
                        </span>
                        <span style={H.chevron}>{expanded?"▲":"▼"}</span>
                      </div>
                    </div>

                    {/* ── Always visible: route summary ── */}
                    <div style={H.routeRow}>
                      <div style={H.routeItem}>
                        <div style={{...H.routeDot2,backgroundColor:"#10B981"}}/>
                        <span style={H.routeTxt} title={b.pickup}>{b.pickup||"—"}</span>
                      </div>
                      <div style={H.routeArrow}>→</div>
                      <div style={H.routeItem}>
                        <div style={{...H.routeDot2,backgroundColor:"#EF4444"}}/>
                        <span style={H.routeTxt} title={b.drop_location}>{b.drop_location||"—"}</span>
                      </div>
                    </div>

                    {/* ── Tags row ── */}
                    <div style={H.tagsRow}>
                      <span style={H.tag}>{b.triptype==="outstation"?"🗺️ Outstation":"🏙️ Local"}</span>
                      {b.is_scheduled && <span style={{...H.tag,backgroundColor:"#CCFBF1",color:"#0F766E"}}>📅 Scheduled</span>}
                      {b.fare         && <span style={{...H.tag,backgroundColor:"#DCFCE7",color:"#15803D"}}>₹{b.fare}</span>}
                      {b.cancellation_penalty>0 && <span style={{...H.tag,backgroundColor:"#FEE2E2",color:"#9F1239"}}>💸 ₹{b.cancellation_penalty} fee</span>}
                      {b.rating       && <span style={{...H.tag,backgroundColor:"#FEF9C3",color:"#854D0E"}}>{"⭐".repeat(b.rating)}</span>}
                    </div>

                    {/* ── Expanded details ── */}
                    {expanded && (
                      <div style={H.expandBody} onClick={e=>e.stopPropagation()}>
                        <div style={H.divider}/>

                        {/* Scheduled time */}
                        {b.is_scheduled && b.scheduled_at && (
                          <div style={H.detailRow}>
                            <span style={H.detailKey}>📅 Scheduled For</span>
                            <span style={H.detailVal}>{fmtDate(b.scheduled_at)} · {fmtTime(b.scheduled_at)}</span>
                          </div>
                        )}

                        {/* Driver */}
                        {b.driver_name && (
                          <div style={H.detailRow}>
                            <span style={H.detailKey}>👨‍✈️ Driver</span>
                            <span style={H.detailVal}>{b.driver_name} {b.driver_phone ? `· ${b.driver_phone}` : ""}</span>
                          </div>
                        )}

                        {/* Fare */}
                        {b.fare && (
                          <div style={H.detailRow}>
                            <span style={H.detailKey}>💰 Fare</span>
                            <span style={{...H.detailVal,fontWeight:800,color:"#16A34A",fontSize:16}}>₹{b.fare}</span>
                          </div>
                        )}

                        {/* Penalty */}
                        {b.cancellation_penalty>0 && (
                          <div style={H.detailRow}>
                            <span style={H.detailKey}>💸 Cancellation Fee</span>
                            <span style={{...H.detailVal,color:"#DC2626",fontWeight:700}}>₹{b.cancellation_penalty}</span>
                          </div>
                        )}

                        {/* Duration */}
                        {b.duration_mins && (
                          <div style={H.detailRow}>
                            <span style={H.detailKey}>⏱ Duration</span>
                            <span style={H.detailVal}>{Math.floor(b.duration_mins/60)}h {b.duration_mins%60}m</span>
                          </div>
                        )}

                        {/* Trip type */}
                        <div style={H.detailRow}>
                          <span style={H.detailKey}>🗺️ Trip Type</span>
                          <span style={H.detailVal}>{b.triptype||"local"}</span>
                        </div>

                        {/* Rating */}
                        {b.rating && (
                          <div style={H.detailRow}>
                            <span style={H.detailKey}>⭐ Rating</span>
                            <span style={H.detailVal}>{"⭐".repeat(b.rating)} ({b.rating}/5)</span>
                          </div>
                        )}
                        {b.feedback && (
                          <div style={H.feedbackBox}>
                            <span style={H.detailKey}>💬 Feedback</span>
                            <p style={H.feedbackTxt}>{b.feedback}</p>
                          </div>
                        )}

                        {/* Active ride shortcut */}
                        {isActive && (
                          <button style={H.goActiveBtn} onClick={()=>setActiveTab("active")}>
                            🚗 View Active Ride →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════
          DURATION POPUP
      ════════════════════════ */}
      {showPopup && (
        <div style={P.overlay}>
          <div style={P.sheet}>
            <div style={P.handle}/>
            <div style={P.header}>
              <span style={P.headerEmoji}>🏁</span>
              <div>
                <h3 style={P.title}>Ride Completed!</h3>
                <p style={P.subtitle}>Enter trip duration to calculate fare</p>
              </div>
            </div>

            <div style={P.structCard}>
              <div style={P.structRow}>
                <div style={P.structLeft}><span style={P.structIcon}>📦</span><div><p style={P.structTitle}>Base Package</p><p style={P.structDesc}>Up to {BASE_PACKAGE_HRS} hours</p></div></div>
                <span style={P.structPrice}>₹{BASE_PACKAGE_FARE}</span>
              </div>
              <div style={P.structDivider}/>
              <div style={P.structRow}>
                <div style={P.structLeft}><span style={P.structIcon}>⏰</span><div><p style={P.structTitle}>Additional Hours</p><p style={P.structDesc}>After {BASE_PACKAGE_HRS} hrs</p></div></div>
                <span style={P.structPrice}>₹{EXTRA_HR_RATE}/hr</span>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={P.inputLabel}>⏱ Enter trip duration (hours)</label>
              <div style={P.inputWrap}>
                <input type="number" min="0.5" max="24" step="0.5" placeholder="0" value={hours}
                  onChange={(e)=>{setHours(e.target.value);setPopupErr("");}} style={P.input} autoFocus/>
                <span style={P.inputUnit}>hrs</span>
              </div>
              {popupErr && <p style={P.error}>{popupErr}</p>}
            </div>

            {parsedHrs>0 && (
              <div style={P.fareCard}>
                <p style={P.fareCardTitle}>💰 Fare Calculation</p>
                <div style={P.fareRow}><span style={P.fareKey}>Base ({BASE_PACKAGE_HRS} hrs package)</span><span style={P.fareAmt}>₹{BASE_PACKAGE_FARE}</span></div>
                {isExtra && <div style={P.fareRow}><span style={P.fareKey}>Extra {extraHrs} hr{extraHrs>1?"s":""} × ₹{EXTRA_HR_RATE}</span><span style={P.fareAmt}>₹{extraHrs*EXTRA_HR_RATE}</span></div>}
                <div style={P.fareDivider}/>
                <div style={P.fareTotalRow}>
                  <span style={P.fareTotalKey}>{parsedHrs} hr{parsedHrs!==1?"s":""} total</span>
                  <span style={P.fareTotalAmt}>₹{liveFare}</span>
                </div>
                <p style={P.fareExample}>{isExtra?`₹${BASE_PACKAGE_FARE} + ${extraHrs} × ₹${EXTRA_HR_RATE} = ₹${liveFare}`:`Flat package rate — up to ${BASE_PACKAGE_HRS} hrs = ₹${BASE_PACKAGE_FARE}`}</p>
              </div>
            )}

            <div style={P.actions}>
              <button style={P.backBtn} onClick={()=>{setShowPopup(false);setRideToComplete(null);}} disabled={completing}>← Back</button>
              <button style={{...P.confirmBtn,opacity:completing||!hours||parsedHrs<=0?0.55:1,cursor:completing||!hours||parsedHrs<=0?"not-allowed":"pointer"}}
                onClick={handleComplete} disabled={completing||!hours||parsedHrs<=0}>
                {completing?"⏳ Completing…":parsedHrs>0?`✅ Confirm — ₹${liveFare}`:"✅ Confirm Ride"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
};

export default RideTab;

/* ── Shared styles ── */
const S = {
  page:       {flex:1,backgroundColor:"#F4F6F9",padding:"12px 16px 90px",minHeight:"100vh"},
  center:     {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"40vh",padding:24,textAlign:"center"},
  spinner:    {width:40,height:40,border:"4px solid #bfdbfe",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  noTitle:    {margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#1E293B"},
  noSub:      {margin:"0 0 16px",fontSize:14,color:"#64748B",lineHeight:1.5},
  histBtn:    {padding:"10px 20px",backgroundColor:"#2563EB",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer"},
  tabBar:     {display:"flex",gap:6,marginBottom:14,backgroundColor:"#E2E8F0",borderRadius:14,padding:4},
  tabBtn:     {flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 0",borderRadius:10,border:"none",backgroundColor:"transparent",fontSize:13,fontWeight:600,color:"#64748B",cursor:"pointer",position:"relative"},
  tabActive:  {backgroundColor:"#fff",color:"#1E293B",boxShadow:"0 2px 8px rgba(0,0,0,0.1)"},
  tabCount:   {backgroundColor:"#2563EB",color:"#fff",fontSize:10,fontWeight:800,borderRadius:20,padding:"1px 6px"},
  liveDotInline:{width:8,height:8,borderRadius:"50%",backgroundColor:"#EF4444",display:"inline-block",marginLeft:4,animation:"pulse 1s ease infinite"},
  statusBar:  {display:"flex",alignItems:"center",gap:10,borderRadius:16,padding:"14px 16px",marginBottom:14},
  dot:        {width:10,height:10,borderRadius:"50%",flexShrink:0,animation:"pulse 1.5s ease infinite"},
  statusTxt:  {fontSize:15,fontWeight:700},
  mapSection: {marginBottom:14},
  mapWrap:    {position:"relative",width:"100%",height:220,borderRadius:18,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.12)"},
  mapBox:     {width:"100%",height:"100%"},
  livePill:   {position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:5,backgroundColor:"rgba(0,0,0,0.65)",borderRadius:20,padding:"4px 10px",zIndex:10},
  liveDot:    {width:8,height:8,borderRadius:"50%",backgroundColor:"#EF4444",animation:"pulse 1s ease infinite"},
  liveTxt:    {fontSize:11,fontWeight:800,color:"#fff",letterSpacing:1},
  gpsRow:     {display:"flex",alignItems:"center",gap:8,backgroundColor:"#fff",borderRadius:12,padding:"8px 12px",marginTop:8},
  gpsTxt:     {fontSize:12,color:"#64748B",flex:1},
  gpsBadge:   {fontSize:10,fontWeight:700,color:"#10B981",backgroundColor:"#D1FAE5",padding:"2px 8px",borderRadius:10},
  startBtn:   {width:"100%",padding:"16px 0",backgroundColor:"#F59E0B",border:"none",borderRadius:16,fontSize:16,fontWeight:800,color:"#fff",cursor:"pointer",marginBottom:10,boxShadow:"0 4px 12px rgba(245,158,11,0.3)"},
  completeBtn:{width:"100%",padding:"16px 0",backgroundColor:"#10B981",border:"none",borderRadius:16,fontSize:16,fontWeight:800,color:"#fff",cursor:"pointer",marginBottom:10,boxShadow:"0 4px 12px rgba(16,185,129,0.3)"},
  card:       {backgroundColor:"#fff",borderRadius:18,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"},
  cardLabel:  {margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:0.5},
  personRow:  {display:"flex",alignItems:"center",gap:12},
  avatar:     {width:50,height:50,borderRadius:"50%",backgroundColor:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  personName: {margin:"0 0 4px",fontSize:16,fontWeight:700,color:"#1E293B"},
  personPhone:{margin:0,fontSize:13,color:"#64748B"},
  callBtn:    {width:42,height:42,borderRadius:"50%",backgroundColor:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,textDecoration:"none"},
  waitCard:   {display:"flex",alignItems:"center",gap:14,backgroundColor:"#EFF6FF",borderRadius:16,padding:16,marginBottom:12},
  waitSpin:   {width:32,height:32,border:"3px solid #bfdbfe",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0},
  waitTitle:  {margin:"0 0 3px",fontSize:15,fontWeight:700,color:"#1E293B"},
  waitSub:    {margin:0,fontSize:12,color:"#64748B"},
  routeDot:   {width:12,height:12,borderRadius:"50%",marginTop:3,flexShrink:0},
  routeLabel: {margin:"0 0 2px",fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase"},
  routeVal:   {margin:0,fontSize:14,fontWeight:600,color:"#1E293B"},
  infoChip:   {flex:1,backgroundColor:"#F8FAFC",borderRadius:12,padding:"10px 12px"},
  infoKey:    {display:"block",fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",marginBottom:4},
  infoVal:    {display:"block",fontSize:14,fontWeight:700,color:"#1E293B",textTransform:"capitalize"},
  ratingPage:  {flex:1,backgroundColor:"#F8FAFC",minHeight:"100vh",padding:"32px 20px 100px",display:"flex",flexDirection:"column",gap:16},
  ratingTop:   {display:"flex",flexDirection:"column",alignItems:"center"},
  ratingBubble:{width:96,height:96,borderRadius:"50%",backgroundColor:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16},
  ratingTitle: {margin:"0 0 6px",fontSize:26,fontWeight:800,color:"#1E293B"},
  ratingDesc:  {margin:0,fontSize:15,color:"#64748B"},
  starRow:     {display:"flex",justifyContent:"center",gap:6},
  starBtn:     {background:"none",border:"none",cursor:"pointer",padding:4,lineHeight:1},
  ratingHint:  {margin:"12px 0 0",textAlign:"center",fontSize:15,fontWeight:700,color:"#2563EB"},
  textarea:    {width:"100%",boxSizing:"border-box",border:"1.5px solid #E2E8F0",borderRadius:14,padding:"12px 14px",fontSize:14,backgroundColor:"#F8FAFC",resize:"none",outline:"none",fontFamily:"inherit"},
  ratingBtns:  {display:"flex",gap:10},
  skipBtn:     {flex:1,padding:"14px 0",borderRadius:14,backgroundColor:"#E2E8F0",border:"none",fontWeight:700,fontSize:15,color:"#475569",cursor:"pointer"},
  submitBtn:   {flex:2,padding:"14px 0",borderRadius:14,backgroundColor:"#2563EB",border:"none",fontWeight:800,fontSize:15,color:"#fff",cursor:"pointer"},
};

/* ── History tab styles ── */
const H = {
  pillRow:     {display:"flex",gap:6,flexWrap:"wrap",marginBottom:10},
  pill:        {padding:"6px 14px",borderRadius:20,border:"1.5px solid #E2E8F0",backgroundColor:"#F8FAFC",fontSize:12,fontWeight:600,color:"#64748B",cursor:"pointer"},
  pillActive:  {backgroundColor:"#2563EB",borderColor:"#2563EB",color:"#fff",boxShadow:"0 2px 8px rgba(37,99,235,0.3)"},
  pickerRow:   {display:"flex",alignItems:"center",gap:10,marginBottom:10,backgroundColor:"#EFF6FF",borderRadius:12,padding:"10px 14px"},
  pickerLabel: {fontSize:13,fontWeight:600,color:"#1D4ED8",whiteSpace:"nowrap"},
  dateInput:   {flex:1,border:"1.5px solid #BFDBFE",borderRadius:10,padding:"8px 12px",fontSize:13,backgroundColor:"#fff",outline:"none",color:"#1E293B"},
  filterRow:   {display:"flex",gap:8,marginBottom:12,alignItems:"center"},
  select:      {flex:"0 0 auto",padding:"9px 12px",border:"1.5px solid #E2E8F0",borderRadius:12,backgroundColor:"#F8FAFC",fontSize:12,fontWeight:600,color:"#1E293B",outline:"none",cursor:"pointer"},
  searchInput: {flex:1,padding:"9px 14px",border:"1.5px solid #E2E8F0",borderRadius:12,backgroundColor:"#F8FAFC",fontSize:13,outline:"none",color:"#1E293B"},
  refreshBtn:  {width:38,height:38,borderRadius:10,backgroundColor:"#EFF6FF",border:"1.5px solid #BFDBFE",fontSize:16,color:"#2563EB",fontWeight:700,cursor:"pointer",flexShrink:0},
  summaryRow:  {display:"flex",gap:8,marginBottom:14},
  summaryCard: {flex:1,backgroundColor:"#fff",borderRadius:14,padding:"10px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"},
  summaryNum:  {fontSize:22,fontWeight:900,lineHeight:1},
  summaryLabel:{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.4px"},
  bookingCard: {backgroundColor:"#fff",borderRadius:16,padding:"14px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",border:"1.5px solid transparent",transition:"box-shadow 0.15s"},
  bookingCardActive:{border:"1.5px solid #BFDBFE",backgroundColor:"#F0F9FF"},
  cardHeader:  {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10},
  cardLeft:    {display:"flex",alignItems:"center",gap:10},
  statusDot:   {width:10,height:10,borderRadius:"50%",flexShrink:0,marginTop:2},
  cardId:      {fontSize:13,fontWeight:700,color:"#1E293B"},
  cardDate:    {fontSize:11,color:"#94A3B8",marginTop:1},
  cardRight:   {display:"flex",alignItems:"center",gap:8},
  statusPill:  {fontSize:11,fontWeight:700,borderRadius:20,padding:"3px 10px",whiteSpace:"nowrap"},
  chevron:     {fontSize:11,color:"#94A3B8"},
  routeRow:    {display:"flex",alignItems:"center",gap:6,marginBottom:8},
  routeItem:   {display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0},
  routeDot2:   {width:7,height:7,borderRadius:"50%",flexShrink:0},
  routeTxt:    {fontSize:12,color:"#475569",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  routeArrow:  {fontSize:12,color:"#CBD5E1",flexShrink:0},
  tagsRow:     {display:"flex",gap:6,flexWrap:"wrap"},
  tag:         {fontSize:10,fontWeight:700,backgroundColor:"#F1F5F9",color:"#475569",borderRadius:20,padding:"3px 8px"},
  expandBody:  {marginTop:12},
  divider:     {height:1,backgroundColor:"#F1F5F9",marginBottom:12},
  detailRow:   {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8},
  detailKey:   {fontSize:12,color:"#94A3B8",fontWeight:600,flexShrink:0},
  detailVal:   {fontSize:13,color:"#1E293B",fontWeight:600,textAlign:"right"},
  feedbackBox: {backgroundColor:"#F8FAFC",borderRadius:10,padding:"10px 12px",marginTop:4},
  feedbackTxt: {margin:"4px 0 0",fontSize:13,color:"#475569",lineHeight:1.5},
  goActiveBtn: {width:"100%",marginTop:12,padding:"11px 0",backgroundColor:"#EFF6FF",border:"1.5px solid #BFDBFE",borderRadius:12,color:"#1D4ED8",fontWeight:700,fontSize:13,cursor:"pointer"},
};

/* ── Duration popup styles ── */
const P = {
  overlay:      {position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.55)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  sheet:        {backgroundColor:"#fff",borderRadius:"28px 28px 0 0",padding:"10px 20px 44px",width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,0.18)"},
  handle:       {width:40,height:4,backgroundColor:"#CBD5E1",borderRadius:2,margin:"0 auto 22px"},
  header:       {display:"flex",alignItems:"center",gap:14,marginBottom:18},
  headerEmoji:  {fontSize:36,lineHeight:1,flexShrink:0},
  title:        {margin:"0 0 3px",fontSize:20,fontWeight:800,color:"#1E293B"},
  subtitle:     {margin:0,fontSize:13,color:"#64748B"},
  structCard:   {backgroundColor:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:14,padding:"12px 14px",marginBottom:18},
  structRow:    {display:"flex",alignItems:"center",justifyContent:"space-between"},
  structLeft:   {display:"flex",alignItems:"center",gap:10},
  structIcon:   {fontSize:20,flexShrink:0},
  structTitle:  {margin:0,fontSize:13,fontWeight:700,color:"#1E293B"},
  structDesc:   {margin:"2px 0 0",fontSize:11,color:"#64748B"},
  structPrice:  {fontSize:15,fontWeight:800,color:"#2563EB",flexShrink:0},
  structDivider:{height:1,backgroundColor:"#E2E8F0",margin:"10px 0"},
  inputLabel:   {display:"block",margin:"0 0 10px",fontSize:14,fontWeight:700,color:"#1E293B"},
  inputWrap:    {display:"flex",alignItems:"center",gap:12},
  input:        {flex:1,textAlign:"center",fontSize:40,fontWeight:900,fontFamily:"monospace",letterSpacing:2,color:"#1E293B",backgroundColor:"#F8FAFC",border:"2px solid #E2E8F0",borderRadius:18,padding:"14px 0",outline:"none"},
  inputUnit:    {fontSize:20,fontWeight:700,color:"#94A3B8",flexShrink:0},
  error:        {margin:"8px 0 0",fontSize:12,color:"#EF4444",fontWeight:600},
  fareCard:      {backgroundColor:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:16,padding:"14px 16px",marginBottom:18},
  fareCardTitle: {margin:"0 0 12px",fontSize:13,fontWeight:800,color:"#15803D"},
  fareRow:       {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6},
  fareKey:       {fontSize:13,color:"#475569"},
  fareAmt:       {fontSize:13,fontWeight:700,color:"#1E293B"},
  fareDivider:   {height:1,backgroundColor:"#BBF7D0",margin:"10px 0"},
  fareTotalRow:  {display:"flex",justifyContent:"space-between",alignItems:"center"},
  fareTotalKey:  {fontSize:15,fontWeight:800,color:"#15803D"},
  fareTotalAmt:  {fontSize:30,fontWeight:900,color:"#10B981",letterSpacing:-1},
  fareExample:   {margin:"10px 0 0",fontSize:11,color:"#16A34A",backgroundColor:"#DCFCE7",borderRadius:8,padding:"5px 10px",textAlign:"center"},
  actions:   {display:"flex",gap:10},
  backBtn:   {flex:1,padding:"15px 0",backgroundColor:"#F1F5F9",border:"none",borderRadius:14,fontWeight:700,fontSize:15,color:"#475569",cursor:"pointer"},
  confirmBtn:{flex:2,padding:"15px 0",backgroundColor:"#10B981",border:"none",borderRadius:14,fontWeight:800,fontSize:16,color:"#fff",boxShadow:"0 4px 14px rgba(16,185,129,0.35)",transition:"opacity 0.15s"},
};