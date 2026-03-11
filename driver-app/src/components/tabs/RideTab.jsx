import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ─────────────────────────────────────────
   FARE STRUCTURE
   First 4 hours  →  ₹450 (flat package)
   Each extra hr  →  + ₹200
   Examples:
     1 hr  = ₹450   (package rate)
     4 hrs = ₹450   (package rate)
     5 hrs = ₹650   (450 + 1×200)
     6 hrs = ₹850   (450 + 2×200)
     8 hrs = ₹1250  (450 + 4×200)
───────────────────────────────────────── */
const BASE_PACKAGE_HRS  = 4;
const BASE_PACKAGE_FARE = 450;
const EXTRA_HR_RATE     = 200;

function calcFare(hrs) {
  if (!hrs || hrs <= 0) return 0;
  if (hrs <= BASE_PACKAGE_HRS) return BASE_PACKAGE_FARE;
  const extra = hrs - BASE_PACKAGE_HRS;
  return BASE_PACKAGE_FARE + Math.ceil(extra) * EXTRA_HR_RATE;
}

/* ═══════════════════════════════════════════════════════ */
const RideTab = () => {
  const role = localStorage.getItem("role") || "";

  const [booking,        setBooking]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [driverPos,      setDriverPos]      = useState(null);

  // rating
  const [ratingBooking,  setRatingBooking]  = useState(null);
  const [rating,         setRating]         = useState(0);
  const [comment,        setComment]        = useState("");
  const [ratingSubmit,   setRatingSubmit]   = useState(false);

  // ── duration popup ──
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

  /* ─── fetch active booking ─── */
  const fetchBooking = async () => {
    try {
      const phone    = localStorage.getItem("customerPhone") || "";
      const driverId = localStorage.getItem("driverId")      || "";

      let res;
      if (role === "customer") res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${phone}`);
      else if (role === "driver") res = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${driverId}`);

      const list   = Array.isArray(res?.data) ? res.data : [];
      const active = list.find((b) => ["pending","assigned","accepted","inride"].includes(b.status)) || null;

      if (active) { prevStatus.current = active.status; setBooking(active); return; }

      if (role === "customer") {
        const unrated  = list.filter((b) => b.status==="completed" && !b.rating).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
        const wasActive = ["inride","accepted","assigned","pending"].includes(prevStatus.current);
        if (unrated && wasActive) { setRatingBooking(unrated); setBooking(null); prevStatus.current="completed"; return; }
        if (ratingBooking) return;
      }

      prevStatus.current = null; setBooking(null);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchBooking();
    pollRef.current = setInterval(fetchBooking, 4000);
    return () => { clearInterval(pollRef.current); if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  /* ─── map init ─── */
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
      const carIcon = L.divIcon({ className:"", html:`<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚕</div>`, iconSize:[32,32], iconAnchor:[16,16] });
      driverMk.current = L.marker([lat,lng],{icon:carIcon}).addTo(map);
      lMap.current = map; setTimeout(()=>map.invalidateSize(),200);
    };
    if (window.L) init();
    else {
      if (!document.getElementById("lcs")) { const l=document.createElement("link"); l.id="lcs"; l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l); }
      const s=document.createElement("script"); s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=init; document.head.appendChild(s);
    }
  }, [booking?.status]);

  /* ─── driver GPS push ─── */
  useEffect(() => {
    if (role!=="driver" || !booking) return;
    if (!["accepted","inride"].includes(booking.status)) return;
    const driverId = localStorage.getItem("driverId");
    if (!driverId || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(async({coords}) => {
      const {latitude:lat, longitude:lng} = coords;
      setDriverPos({lat,lng});
      if (driverMk.current && lMap.current) { driverMk.current.setLatLng([lat,lng]); lMap.current.setView([lat,lng],15); }
      try { await fetch(`${BASE_URL}/api/driver/updateLocation`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({driverId,lat,lng})}); } catch {}
    }, ()=>{}, {enableHighAccuracy:true,maximumAge:3000,timeout:8000});
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [booking?.status]);

  /* ─── customer poll GPS ─── */
  useEffect(() => {
    if (role!=="customer" || !booking?.driver_id) return;
    if (!["assigned","accepted","inride"].includes(booking.status)) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/drivers`);
        const dr  = (Array.isArray(res.data)?res.data:[]).find((d)=>d.id==booking.driver_id);
        if (dr?.lat && dr?.lng) {
          const pos = {lat:parseFloat(dr.lat),lng:parseFloat(dr.lng)};
          setDriverPos(pos);
          if (driverMk.current && lMap.current) { driverMk.current.setLatLng([pos.lat,pos.lng]); lMap.current.setView([pos.lat,pos.lng],15); }
        }
      } catch {}
    };
    poll(); const iv=setInterval(poll,4000); return ()=>clearInterval(iv);
  }, [booking?.driver_id, booking?.status]);

  /* ─── start ride ─── */
  const startRide = async () => {
    await axios.post(`${BASE_URL}/api/bookings/start`, {bookingId:booking.id, driverId:booking.driver_id});
    fetchBooking();
  };

  /* ─── open duration popup ─── */
  const openCompletePopup = () => {
    setRideToComplete(booking);
    setHours(""); setPopupErr(""); setShowPopup(true);
  };

  /* ─── submit complete ─── */
  const handleComplete = async () => {
    const h = parseFloat(hours);
    if (!hours || isNaN(h) || h <= 0) { setPopupErr("Please enter a valid number of hours."); return; }
    if (h > 24)                        { setPopupErr("Duration cannot exceed 24 hours."); return; }

    const fare      = calcFare(h);
    const totalMins = Math.round(h * 60);

    setCompleting(true);
    try {
      await axios.post(`${BASE_URL}/api/complete-ride`, {
        bookingId:    rideToComplete.id,
        driverId:     localStorage.getItem("driverId"),
        durationMins: totalMins,
        fare,
      });
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      setShowPopup(false); setRideToComplete(null);
      fetchBooking();
    } catch (e) {
      setPopupErr("Failed: " + (e?.response?.data?.message || e.message));
    } finally { setCompleting(false); }
  };

  /* ─── rating submit ─── */
  const submitRating = async () => {
    if (!rating) { alert("Please select a star rating"); return; }
    setRatingSubmit(true);
    try { await axios.post(`${BASE_URL}/api/submit-rating`, {bookingId:ratingBooking.id, rating, comment}); setRatingBooking(null); setRating(0); setComment(""); }
    catch { console.warn("rating error"); }
    finally { setRatingSubmit(false); }
  };

  /* ─── derived fare values ─── */
  const parsedHrs  = parseFloat(hours) || 0;
  const liveFare   = calcFare(parsedHrs);
  const extraHrs   = parsedHrs > BASE_PACKAGE_HRS ? Math.ceil(parsedHrs - BASE_PACKAGE_HRS) : 0;
  const isExtra    = parsedHrs > BASE_PACKAGE_HRS;

  const statusStyle = (s) => ({
    pending:   {bg:"#FFF7ED",color:"#C2410C",label:"⏳ Pending – Finding driver..."},
    assigned:  {bg:"#EFF6FF",color:"#1D4ED8",label:"🔵 Assigned – Driver accepted"},
    accepted:  {bg:"#FEF3C7",color:"#92400E",label:"🟡 Driver is on the way"},
    inride:    {bg:"#D1FAE5",color:"#065F46",label:"🟢 Ride in Progress"},
    completed: {bg:"#F0FDF4",color:"#166534",label:"✅ Completed"},
  }[s] || {bg:"#F1F5F9",color:"#475569",label:s});

  /* ════════════════════════════
     RATING SCREEN
  ════════════════════════════ */
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

  if (!booking) return (
    <div style={S.center}>
      <span style={{fontSize:64,marginBottom:16}}>🚗</span>
      <p style={S.noTitle}>No active ride</p>
      <p style={S.noSub}>Your current booking will appear here once booked or assigned.</p>
    </div>
  );

  const sc       = statusStyle(booking.status);
  const showMap  = ["assigned","accepted","inride"].includes(booking.status);

  /* ════════════════════════════
     MAIN RIDE SCREEN
  ════════════════════════════ */
  return (
    <div style={S.page}>

      {/* Status banner */}
      <div style={{...S.statusBar, backgroundColor:sc.bg}}>
        <div style={{...S.dot, backgroundColor:sc.color}}/>
        <span style={{...S.statusTxt, color:sc.color}}>{sc.label}</span>
      </div>

      {/* Live map */}
      {showMap && (
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

      {/* Driver action buttons */}
      {role==="driver" && (
        <div style={{marginBottom:14}}>
          {booking.status==="assigned" && (
            <button style={S.startBtn} onClick={startRide}>🚦 START RIDE</button>
          )}
          {booking.status==="inride" && (
            <button style={S.completeBtn} onClick={openCompletePopup}>✅ COMPLETE RIDE</button>
          )}
        </div>
      )}

      {/* Customer info (driver sees) */}
      {role==="driver" && (
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
      )}

      {/* Driver info (customer sees) */}
      {role==="customer" && booking.driver_name && (
        <div style={S.card}>
          <p style={S.cardLabel}>👨‍✈️ Your Driver</p>
          <div style={S.personRow}>
            <div style={S.avatar}><span style={{fontSize:26}}>👨‍✈️</span></div>
            <div style={{flex:1}}>
              <p style={S.personName}>{booking.driver_name}</p>
              <p style={S.personPhone}>📞 {booking.driver_phone||"—"}</p>
            </div>
            <a href={`tel:${booking.driver_phone}`} style={S.callBtn}>📞</a>
          </div>
        </div>
      )}

      {role==="customer" && booking.status==="pending" && (
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

      {/* Booking info */}
      <div style={S.card}>
        <p style={S.cardLabel}>📋 Booking Info</p>
        <div style={{display:"flex",gap:12}}>
          <div style={S.infoChip}><span style={S.infoKey}>Booking ID</span><span style={S.infoVal}>#{booking.id}</span></div>
          <div style={S.infoChip}><span style={S.infoKey}>Trip Type</span><span style={S.infoVal}>{booking.triptype||"local"}</span></div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TRIP DURATION POPUP  (driver only, after Complete)
          ══════════════════════════════════════════════════════ */}
      {showPopup && (
        <div style={P.overlay}>
          <div style={P.sheet}>

            {/* drag handle */}
            <div style={P.handle}/>

            {/* header */}
            <div style={P.header}>
              <span style={P.headerEmoji}>🏁</span>
              <div>
                <h3 style={P.title}>Ride Completed!</h3>
                <p style={P.subtitle}>Enter trip duration to calculate fare</p>
              </div>
            </div>

            {/* fare structure card */}
            <div style={P.structCard}>
              <div style={P.structRow}>
                <div style={P.structLeft}>
                  <span style={P.structIcon}>📦</span>
                  <div>
                    <p style={P.structTitle}>Base Package</p>
                    <p style={P.structDesc}>Up to {BASE_PACKAGE_HRS} hours</p>
                  </div>
                </div>
                <span style={P.structPrice}>₹{BASE_PACKAGE_FARE}</span>
              </div>
              <div style={P.structDivider}/>
              <div style={P.structRow}>
                <div style={P.structLeft}>
                  <span style={P.structIcon}>⏰</span>
                  <div>
                    <p style={P.structTitle}>Additional Hours</p>
                    <p style={P.structDesc}>After {BASE_PACKAGE_HRS} hrs</p>
                  </div>
                </div>
                <span style={P.structPrice}>₹{EXTRA_HR_RATE}/hr</span>
              </div>
            </div>

            {/* hours input */}
            <div style={{marginBottom:16}}>
              <label style={P.inputLabel}>⏱ Enter trip duration (hours)</label>
              <div style={P.inputWrap}>
                <input
                  type="number"
                  min="0.5" max="24" step="0.5"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => { setHours(e.target.value); setPopupErr(""); }}
                  style={P.input}
                  autoFocus
                />
                <span style={P.inputUnit}>hrs</span>
              </div>
              {popupErr && <p style={P.error}>{popupErr}</p>}
            </div>

            {/* live fare — shows as driver types */}
            {parsedHrs > 0 && (
              <div style={P.fareCard}>
                <p style={P.fareCardTitle}>💰 Fare Calculation</p>

                <div style={P.fareRow}>
                  <span style={P.fareKey}>Base ({BASE_PACKAGE_HRS} hrs package)</span>
                  <span style={P.fareAmt}>₹{BASE_PACKAGE_FARE}</span>
                </div>

                {isExtra && (
                  <div style={P.fareRow}>
                    <span style={P.fareKey}>Extra {extraHrs} hr{extraHrs>1?"s":""} × ₹{EXTRA_HR_RATE}</span>
                    <span style={P.fareAmt}>₹{extraHrs * EXTRA_HR_RATE}</span>
                  </div>
                )}

                <div style={P.fareDivider}/>

                <div style={P.fareTotalRow}>
                  <span style={P.fareTotalKey}>{parsedHrs} hr{parsedHrs!==1?"s":""} total</span>
                  <span style={P.fareTotalAmt}>₹{liveFare}</span>
                </div>

                {/* example hint */}
                <p style={P.fareExample}>
                  {isExtra
                    ? `₹${BASE_PACKAGE_FARE} + ${extraHrs} × ₹${EXTRA_HR_RATE} = ₹${liveFare}`
                    : `Flat package rate — up to ${BASE_PACKAGE_HRS} hrs = ₹${BASE_PACKAGE_FARE}`}
                </p>
              </div>
            )}

            {/* action buttons */}
            <div style={P.actions}>
              <button style={P.backBtn}
                onClick={() => { setShowPopup(false); setRideToComplete(null); }}
                disabled={completing}>
                ← Back
              </button>
              <button
                style={{
                  ...P.confirmBtn,
                  opacity: completing || !hours || parsedHrs<=0 ? 0.55 : 1,
                  cursor:  completing || !hours || parsedHrs<=0 ? "not-allowed" : "pointer",
                }}
                onClick={handleComplete}
                disabled={completing || !hours || parsedHrs<=0}
              >
                {completing ? "⏳ Completing…" : parsedHrs>0 ? `✅ Confirm — ₹${liveFare}` : "✅ Confirm Ride"}
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

/* ── Main styles ── */
const S = {
  page:       {flex:1,backgroundColor:"#F4F6F9",padding:"16px 16px 90px",minHeight:"100vh"},
  center:     {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",padding:24,textAlign:"center"},
  spinner:    {width:40,height:40,border:"4px solid #bfdbfe",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  noTitle:    {margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#1E293B"},
  noSub:      {margin:0,fontSize:14,color:"#64748B",lineHeight:1.5},
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
  // rating
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
  input:        {
    flex:1, textAlign:"center", fontSize:40, fontWeight:900, fontFamily:"monospace",
    letterSpacing:2, color:"#1E293B", backgroundColor:"#F8FAFC",
    border:"2px solid #E2E8F0", borderRadius:18, padding:"14px 0", outline:"none",
  },
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
