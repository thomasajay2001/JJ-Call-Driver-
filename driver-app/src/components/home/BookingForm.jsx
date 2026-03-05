import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

const BookingStatusTracker = ({ bookingId, onClose }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const r    = await fetch(`${BASE_URL}/api/bookings/status/${bookingId}`);
      const data = await r.json();
      if (data.success) setBooking(data.booking);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, 5000);
    return () => clearInterval(timerRef.current);
  }, [bookingId]);

  useEffect(() => {
    if (booking?.status === "completed") clearInterval(timerRef.current);
  }, [booking?.status]);

  if (loading) return (
    <div style={tr.center}><div style={tr.spinner} /><p style={tr.spinnerTxt}>Loading…</p></div>
  );
  if (!booking) return null;

  const status    = booking.status?.toLowerCase();
  const isWaiting = ["wait5","wait10","wait30"].includes(status);
  const isAllBusy = status === "allbusy";

  const steps = [
    { key:"pending",   icon:"📋", label:"Booking Received",  sub:"Waiting for admin to assign a driver…"       },
    { key:"assigned",  icon:"🔍", label:"Finding Driver",     sub:"Driver notified, waiting for confirmation…"  },
    { key:"accepted",  icon:"🚗", label:"Driver On The Way",  sub:"Driver is heading to your pickup!"           },
    { key:"inride",    icon:"🛣️", label:"Trip In Progress",  sub:"Enjoy your ride! 🎉"                        },
    { key:"completed", icon:"✅", label:"Trip Completed",     sub:"Thank you for riding with us!"               },
  ];
  const activeIdx = steps.findIndex((s) => s.key === status);

  // ← KEY RULE: driver details only on accepted / inride / completed
  const showDriver = ["accepted","inride","completed"].includes(status) && booking.driver_name;

  return (
    <div style={tr.wrap}>
      <div style={tr.header}>
        <div>
          <p style={tr.headerSub}>Booking #{booking.id}</p>
          <h3 style={tr.headerTitle}>
            {isWaiting ? "⏱ Please Wait" : isAllBusy ? "🚫 All Drivers Busy" : "Tracking Your Ride"}
          </h3>
        </div>
        {status === "completed" && (
          <button style={tr.doneBtn} onClick={onClose}>Done ✓</button>
        )}
      </div>

      {isWaiting && (
        <div style={tr.waitBox}>
          <span style={{fontSize:20}}>⏱</span>
          <div>
            <p style={{...tr.bannerTitle,color:"#92400E"}}>
              Please wait {status==="wait5"?"~5":status==="wait10"?"~10":"~30"} minutes
            </p>
            <p style={{...tr.bannerSub,color:"#B45309"}}>A driver will be assigned shortly.</p>
          </div>
        </div>
      )}

      {isAllBusy && (
        <div style={tr.busyBox}>
          <span style={{fontSize:20}}>🚫</span>
          <div>
            <p style={{...tr.bannerTitle,color:"#9F1239"}}>All drivers are currently busy</p>
            <p style={{...tr.bannerSub,color:"#BE123C"}}>Please try again in a few minutes.</p>
          </div>
        </div>
      )}

      {!isWaiting && !isAllBusy && (
        <div style={{marginBottom:14}}>
          {steps.map((step, i) => {
            const done    = activeIdx > i;
            const current = activeIdx === i;
            return (
              <div key={step.key}>
                {i > 0 && (
                  <div style={{width:2,height:16,marginLeft:18,backgroundColor:done?"#2563EB":"#E2E8F0",transition:"background 0.3s"}} />
                )}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{
                    width:36,height:36,borderRadius:"50%",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    backgroundColor:done||current?"#2563EB":"#F1F5F9",
                    border:`2px solid ${done||current?"#2563EB":"#CBD5E1"}`,
                    transition:"all 0.3s",
                  }}>
                    {done ? <span style={{color:"#fff",fontSize:12}}>✓</span> : <span style={{fontSize:14}}>{step.icon}</span>}
                  </div>
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:current?700:500,color:current?"#2563EB":done?"#1E293B":"#94A3B8"}}>
                      {step.label}
                    </p>
                    {current && <p style={tr.stepSub}>{step.sub}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRIVER CARD — only after driver accepts, never on assigned */}
      {showDriver && (
        <div style={tr.driverCard}>
          <div style={tr.driverAvatar}>{booking.driver_name?.[0]?.toUpperCase()}</div>
          <div style={{flex:1}}>
            <p style={tr.driverName}>{booking.driver_name}</p>
            {booking.driver_phone && (
              <a href={`tel:${booking.driver_phone}`} style={tr.driverPhone}>📞 {booking.driver_phone}</a>
            )}
            <p style={tr.driverLabel}>Your Driver</p>
          </div>
          <div style={{...tr.statusPill,backgroundColor:status==="inride"?"#D1FAE5":"#EFF6FF",color:status==="inride"?"#065F46":"#1D4ED8"}}>
            {status==="inride"?"🚗 In Ride":"🟢 On the Way"}
          </div>
        </div>
      )}

      {/* assigned — driver hasn't accepted yet, hide driver info */}
      {status === "assigned" && (
        <div style={tr.searchingBox}>
          <div style={{display:"flex",gap:5,marginBottom:6}}>
            {[0,0.2,0.4].map((delay,i) => (
              <div key={i} style={{width:7,height:7,borderRadius:"50%",backgroundColor:"#2563EB",animation:`bounce 1.4s ease-in-out ${delay}s infinite`}} />
            ))}
          </div>
          <p style={tr.searchingTxt}>Driver is confirming your booking…</p>
        </div>
      )}

      <div style={tr.routeBox}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{...tr.routeDot,backgroundColor:"#10B981"}} />
          <p style={tr.routeTxt}>{booking.pickup}</p>
        </div>
        <div style={{width:2,height:10,backgroundColor:"#CBD5E1",marginLeft:3}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{...tr.routeDot,backgroundColor:"#EF4444"}} />
          <p style={tr.routeTxt}>{booking.drop_location}</p>
        </div>
      </div>

      {status !== "completed" && <p style={tr.pollNote}>🔄 Auto-updating every 5 seconds</p>}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>
    </div>
  );
};

/* ── RecommendedDrivers ── */
const RecommendedDrivers = ({ phone, selectedId, onSelect }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!/^[6-9]\d{9}$/.test(phone)) { setDrivers([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`${BASE_URL}/recommended-drivers/${encodeURIComponent(phone)}`)
        .then(r=>r.json()).then(data=>{ if(data.success) setDrivers(data.drivers||[]); })
        .catch(()=>setDrivers([])).finally(()=>setLoading(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [phone]);
  if (loading) return (<div style={rec.loadingRow}><div style={rec.spinnerSmall}/><span style={rec.loadingText}>Finding your preferred drivers…</span></div>);
  if (!drivers.length) return null;
  return (
    <div style={rec.wrapper}>
      <p style={rec.heading}>⭐ Preferred Drivers<span style={rec.hint}> — tap to choose</span></p>
      <div style={rec.row}>
        {drivers.map((d) => {
          const isAvailable = d.status==="available", isSelected = selectedId===d.id;
          return (
            <button key={d.id} type="button" onClick={()=>onSelect(isSelected?null:d)}
              style={{...rec.chip,...(isSelected?rec.chipSelected:{}),...(!isAvailable&&!isSelected?rec.chipBusy:{})}}>
              <div style={{...rec.avatar,backgroundColor:isSelected?"#fff":isAvailable?"#2563EB":"#CBD5E1",color:isSelected?"#2563EB":"#fff"}}>
                {d.name?.[0]?.toUpperCase()??"?"}
              </div>
              <div style={rec.info}>
                <span style={{...rec.name,color:isSelected?"#fff":"#1E293B"}}>{d.name.split(" ")[0]}</span>
                <div style={rec.statusRow}>
                  <span style={{...rec.dot,backgroundColor:isAvailable?"#10B981":"#FCA5A5"}}/>
                  <span style={{...rec.statusLabel,color:isSelected?"#BFDBFE":isAvailable?"#10B981":"#94A3B8"}}>{isAvailable?"Free":"Busy"}</span>
                </div>
              </div>
              {isSelected && <span style={rec.tick}>✓</span>}
            </button>
          );
        })}
      </div>
      {selectedId && <p style={rec.selectedNote}>✅ <strong>{drivers.find(d=>d.id===selectedId)?.name}</strong> saved as your preferred driver</p>}
    </div>
  );
};

/* ── BookingForm ── */
const BookingForm = ({ visible, onClose, onSuccess, initialDrop, initialTriptype }) => {
  const [name,setName]=useState(""); const [phone,setPhone]=useState(""); const [area,setArea]=useState("");
  const [darea,setDArea]=useState(initialDrop||""); const [triptype,setTriptype]=useState(initialTriptype||"");
  const [preferredDriver,setPreferredDriver]=useState(null);
  const [suggestions,setSuggestions]=useState([]); const [dropSuggestions,setDropSuggestions]=useState([]);
  const [errors,setErrors]=useState({}); const [locLoading,setLocLoading]=useState(false);
  const [submitting,setSubmitting]=useState(false); const [pickupCoords,setPickupCoords]=useState(null);
  const [bookedId,setBookedId]=useState(null); // ← after booking: show tracker
  const miniMapDiv=useRef(null); const miniMap=useRef(null); const miniMarker=useRef(null);

  useEffect(()=>{ if(initialDrop) setDArea(initialDrop); if(initialTriptype) setTriptype(initialTriptype); },[initialDrop,initialTriptype]);
  useEffect(()=>{ if(visible){ const s=localStorage.getItem("customerPhone")||""; if(s) setPhone(s); } },[visible]);
  useEffect(()=>{
    if(!visible){
      setName(""); setPhone(""); setArea(""); setDArea(initialDrop||""); setTriptype(initialTriptype||"");
      setPreferredDriver(null); setSuggestions([]); setDropSuggestions([]);
      setErrors({}); setPickupCoords(null); setSubmitting(false); setBookedId(null);
      if(miniMap.current){ miniMap.current.remove(); miniMap.current=null; }
    }
  },[visible]);

  useEffect(()=>{
    if(!pickupCoords||!miniMapDiv.current) return;
    const build=()=>{
      const L=window.L; if(!L) return;
      if(miniMap.current){ miniMap.current.setView([pickupCoords.lat,pickupCoords.lng],15); miniMarker.current?.setLatLng([pickupCoords.lat,pickupCoords.lng]); setTimeout(()=>miniMap.current?.invalidateSize(),100); return; }
      const map=L.map(miniMapDiv.current,{center:[pickupCoords.lat,pickupCoords.lng],zoom:15,zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);
      const icon=L.divIcon({className:"",html:`<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,0.5);"></div>`,iconSize:[18,18],iconAnchor:[9,9]});
      miniMarker.current=L.marker([pickupCoords.lat,pickupCoords.lng],{icon}).addTo(map); miniMap.current=map; setTimeout(()=>map.invalidateSize(),150);
    };
    if(window.L){ build(); } else {
      if(!document.getElementById("leaflet-css")){ const l=document.createElement("link"); l.id="leaflet-css"; l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l); }
      const s=document.createElement("script"); s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=build; document.head.appendChild(s);
    }
  },[pickupCoords]);

  const searchLocation=async(field,query)=>{
    if(!query||query.length<2){ field==="area"?setSuggestions([]):setDropSuggestions([]); return; }
    try{ const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,{headers:{"User-Agent":"JJCallDriverApp/1.0"}}); const data=await r.json(); field==="area"?setSuggestions(data):setDropSuggestions(data); }catch{}
  };
  const selectPickup=(s)=>{ setArea(s.display_name); setSuggestions([]); setPickupCoords({lat:parseFloat(s.lat),lng:parseFloat(s.lon)}); setErrors(e=>({...e,area:""})); };
  const selectDrop=(s)=>{ setDArea(s.display_name); setDropSuggestions([]); setErrors(e=>({...e,darea:""})); };
  const getCurrentLocation=()=>{
    if(!navigator.geolocation){ alert("Geolocation not supported."); return; }
    setLocLoading(true); setSuggestions([]);
    navigator.geolocation.getCurrentPosition(async({coords})=>{
      const{latitude,longitude}=coords;
      try{ const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,{headers:{"User-Agent":"JJCallDriverApp/1.0"}}); const data=await r.json(); setArea(data.display_name||`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); setPickupCoords({lat:latitude,lng:longitude}); setErrors(e=>({...e,area:""})); }
      catch{ setArea(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); setPickupCoords({lat:latitude,lng:longitude}); }
      setLocLoading(false);
    },(err)=>{ setLocLoading(false); if(err.code===1) alert("Location permission denied."); else if(err.code===2) alert("Location unavailable."); else alert("Timed out."); },{timeout:10000,enableHighAccuracy:true});
  };
  const validate=()=>{
    const e={};
    if(!name.trim()) e.name="Name is required";
    if(!phone.trim()) e.phone="Phone is required"; else if(!/^[6-9]\d{9}$/.test(phone)) e.phone="Enter valid 10-digit number";
    if(!area.trim()) e.area="Pickup location required";
    if(!darea.trim()) e.darea="Drop location required";
    if(!triptype) e.triptype="Select trip type";
    setErrors(e); return Object.keys(e).length===0;
  };
  const handleSubmit=async()=>{
    if(!validate()||submitting) return;
    setSubmitting(true);
    try{
      const bookingphnno=localStorage.getItem("customerPhone")||localStorage.getItem("userPhone")||phone;
      const payload={name,phone,pickup:area,pickupLat:pickupCoords?.lat??null,pickupLng:pickupCoords?.lng??null,drop:darea,triptype,bookingphnno,recommended_driver_id:preferredDriver?.id??null};
      const res=await axios.post(`${BASE_URL}/api/trip-booking`,payload);
      if(res.data.success){
        if(miniMap.current){ miniMap.current.remove(); miniMap.current=null; }
        setBookedId(res.data.bookingId); // switch to tracker
        onSuccess();
      } else { alert(res.data.message||"Booking failed."); }
    }catch(err){
      const msg=err?.response?.data?.message||err?.response?.data?.error;
      alert(msg?`Server error (${err?.response?.status}): ${msg}`:"Failed to submit booking.");
    }finally{ setSubmitting(false); }
  };

  if(!visible) return null;

  // ── After booking created: show tracker (driver hidden until accepted) ──
  if(bookedId){
    return(
      <div style={st.overlay} onClick={e=>e.stopPropagation()}>
        <div style={st.sheet}>
          <button style={st.closeBtn} onClick={onClose}>✕</button>
          <BookingStatusTracker bookingId={bookedId} onClose={onClose}/>
        </div>
      </div>
    );
  }

  return(
    <div style={st.overlay} onClick={onClose}>
      <div style={st.sheet} onClick={e=>e.stopPropagation()}>
        <button style={st.closeBtn} onClick={onClose}>✕</button>
        <h2 style={st.sheetTitle}>Book a Ride</h2>

        <label style={st.label}>Full Name</label>
        <input style={{...st.input,...(errors.name?st.inputErr:{})}} placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/>
        {errors.name&&<p style={st.err}>{errors.name}</p>}

        <label style={st.label}>Phone Number</label>
        <input style={{...st.input,...(errors.phone?st.inputErr:{})}} placeholder="10-digit mobile number" maxLength={10} value={phone} onChange={e=>{setPhone(e.target.value.replace(/\D/g,"")); setPreferredDriver(null);}}/>
        {errors.phone&&<p style={st.err}>{errors.phone}</p>}

        <label style={st.label}>Pickup Location</label>
        <div style={{position:"relative"}}>
          <div style={st.inputRow}>
            <input style={{...st.inputInner,...(errors.area?{borderColor:"#EF4444"}:{})}} placeholder="Search pickup area..." value={area}
              onChange={e=>{setArea(e.target.value); setPickupCoords(null); searchLocation("area",e.target.value);}}/>
            <button style={st.locBtn} onClick={getCurrentLocation} disabled={locLoading}>
              {locLoading?<div style={st.spinner}/>:(
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" fill="#2563EB" fillOpacity="0.2"/><circle cx="12" cy="12" r="7"/>
                  <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
              )}
            </button>
          </div>
          {suggestions.length>0&&(
            <div style={st.suggBox}>{suggestions.map((s,i)=>(
              <div key={i} style={st.suggItem} onClick={()=>selectPickup(s)}>
                <span style={{marginRight:8,flexShrink:0,fontSize:14}}>📍</span>
                <span style={{fontSize:12,color:"#1E293B",lineHeight:1.4}}>{s.display_name}</span>
              </div>
            ))}</div>
          )}
        </div>
        {errors.area&&<p style={st.err}>{errors.area}</p>}

        {pickupCoords&&(
          <div style={st.miniMapWrap}>
            <div ref={miniMapDiv} style={st.miniMap}/>
            <div style={st.miniMapFooter}>
              <span style={{fontSize:13}}>📍</span>
              <span style={{fontSize:11,color:"#2563EB",fontWeight:600}}>Pickup location set</span>
              <button style={st.clearLocBtn} onClick={()=>{setArea(""); setPickupCoords(null); if(miniMap.current){miniMap.current.remove();miniMap.current=null;}}}>✕ Clear</button>
            </div>
          </div>
        )}

        <label style={st.label}>Drop Location</label>
        <div style={{position:"relative"}}>
          <input style={{...st.input,...(errors.darea?st.inputErr:{})}} placeholder="Search drop area..." value={darea} onChange={e=>{setDArea(e.target.value); searchLocation("darea",e.target.value);}}/>
          {dropSuggestions.length>0&&(
            <div style={st.suggBox}>{dropSuggestions.map((s,i)=>(
              <div key={i} style={st.suggItem} onClick={()=>selectDrop(s)}>
                <span style={{marginRight:8,flexShrink:0,fontSize:14}}>🏁</span>
                <span style={{fontSize:12,color:"#1E293B",lineHeight:1.4}}>{s.display_name}</span>
              </div>
            ))}</div>
          )}
        </div>
        {errors.darea&&<p style={st.err}>{errors.darea}</p>}

        <label style={st.label}>Trip Type</label>
        <div style={{display:"flex",gap:10,margin:"6px 0 4px"}}>
          {["local","outstation"].map(t=>(
            <button key={t} style={{...st.tripBtn,...(triptype===t?st.tripActive:{})}} onClick={()=>setTriptype(t)}>
              {t==="local"?"🏙️ Local":"🛣️ Outstation"}
            </button>
          ))}
        </div>
        {errors.triptype&&<p style={st.err}>{errors.triptype}</p>}

        <RecommendedDrivers phone={phone} selectedId={preferredDriver?.id??null} onSelect={setPreferredDriver}/>

        <button style={{...st.submitBtn,opacity:submitting?0.7:1,backgroundColor:preferredDriver&&!submitting?"#1D4ED8":"#2563EB"}} onClick={handleSubmit} disabled={submitting}>
          {submitting ? (preferredDriver?`📡 Sending to ${preferredDriver.name.split(" ")[0]}…`:"⏳ Booking...") : (preferredDriver?`🚖 Book with ${preferredDriver.name.split(" ")[0]}`:"🚖 Book Ride")}
        </button>
      </div>
    </div>
  );
};

export default BookingForm;

const tr={
  wrap:{padding:"4px 0 8px"},center:{display:"flex",flexDirection:"column",alignItems:"center",padding:"24px 0"},
  spinner:{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  spinnerTxt:{marginTop:10,fontSize:12,color:"#94A3B8"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16},
  headerSub:{margin:0,fontSize:11,color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"},
  headerTitle:{margin:"3px 0 0",fontSize:18,fontWeight:800,color:"#1E293B"},
  doneBtn:{backgroundColor:"#2563EB",color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},
  waitBox:{display:"flex",gap:10,alignItems:"flex-start",backgroundColor:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:12,padding:"12px 14px",marginBottom:14},
  busyBox:{display:"flex",gap:10,alignItems:"flex-start",backgroundColor:"#FFF1F2",border:"1.5px solid #FECDD3",borderRadius:12,padding:"12px 14px",marginBottom:14},
  bannerTitle:{margin:0,fontSize:13,fontWeight:700},bannerSub:{margin:"3px 0 0",fontSize:12},stepSub:{margin:"2px 0 0",fontSize:11,color:"#64748B"},
  driverCard:{display:"flex",alignItems:"center",gap:12,backgroundColor:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:14,padding:"12px 14px",marginBottom:12},
  driverAvatar:{width:42,height:42,borderRadius:"50%",backgroundColor:"#16A34A",color:"#fff",fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  driverName:{margin:0,fontSize:14,fontWeight:700,color:"#1E293B"},
  driverPhone:{display:"block",margin:"2px 0",fontSize:13,color:"#2563EB",textDecoration:"none",fontWeight:600},
  driverLabel:{margin:0,fontSize:11,color:"#64748B"},
  statusPill:{borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700},
  searchingBox:{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0 12px"},
  searchingTxt:{margin:0,fontSize:12,color:"#64748B"},
  routeBox:{backgroundColor:"#F8FAFC",borderRadius:10,padding:"10px 12px",marginBottom:10},
  routeDot:{width:7,height:7,borderRadius:"50%",flexShrink:0},
  routeTxt:{margin:0,fontSize:12,color:"#1E293B",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  pollNote:{margin:0,textAlign:"center",fontSize:11,color:"#CBD5E1"},
};
const st={
  overlay:{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  sheet:{position:"relative",width:"100%",maxWidth:420,backgroundColor:"#fff",borderRadius:28,padding:"48px 20px 24px",maxHeight:"92vh",overflowY:"auto"},
  closeBtn:{position:"absolute",top:14,right:14,width:36,height:36,borderRadius:"50%",backgroundColor:"#F8FAFC",border:"none",fontSize:18,fontWeight:700,cursor:"pointer"},
  sheetTitle:{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#1E293B",textAlign:"center"},
  label:{display:"block",fontSize:13,fontWeight:600,color:"#64748B",margin:"10px 0 4px"},
  input:{width:"100%",boxSizing:"border-box",backgroundColor:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:14,padding:"12px 14px",fontSize:14,color:"#1E293B",outline:"none"},
  inputErr:{borderColor:"#EF4444"},err:{margin:"4px 0 0",fontSize:12,color:"#EF4444"},
  inputRow:{display:"flex",alignItems:"center",gap:8},
  inputInner:{flex:1,boxSizing:"border-box",backgroundColor:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:14,padding:"12px 14px",fontSize:14,color:"#1E293B",outline:"none"},
  locBtn:{flexShrink:0,width:46,height:46,borderRadius:14,backgroundColor:"#EFF6FF",border:"1.5px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},
  spinner:{width:18,height:18,border:"2.5px solid #bfdbfe",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  suggBox:{position:"absolute",top:"100%",left:0,right:0,backgroundColor:"#fff",borderRadius:14,boxShadow:"0 6px 20px rgba(0,0,0,0.12)",zIndex:20,maxHeight:200,overflowY:"auto",marginTop:4},
  suggItem:{display:"flex",alignItems:"flex-start",padding:"10px 14px",borderBottom:"1px solid #F1F5F9",cursor:"pointer"},
  miniMapWrap:{margin:"8px 0 4px",borderRadius:14,overflow:"hidden",border:"1.5px solid #BFDBFE"},
  miniMap:{width:"100%",height:110},
  miniMapFooter:{display:"flex",alignItems:"center",gap:6,backgroundColor:"#EFF6FF",padding:"6px 12px"},
  clearLocBtn:{marginLeft:"auto",background:"none",border:"none",fontSize:11,color:"#EF4444",fontWeight:700,cursor:"pointer"},
  tripBtn:{flex:1,padding:"12px 0",borderRadius:14,border:"1.5px solid #E2E8F0",backgroundColor:"#F8FAFC",fontSize:14,fontWeight:600,color:"#64748B",cursor:"pointer"},
  tripActive:{backgroundColor:"#2563EB",borderColor:"#2563EB",color:"#fff"},
  submitBtn:{width:"100%",padding:"16px 0",border:"none",borderRadius:18,fontSize:16,fontWeight:800,color:"#fff",cursor:"pointer",marginTop:12,boxShadow:"0 4px 14px rgba(37,99,235,0.3)",transition:"all 0.2s"},
};
const rec={
  loadingRow:{display:"flex",alignItems:"center",gap:8,margin:"12px 0 4px",padding:"9px 12px",backgroundColor:"#F8FAFC",borderRadius:12},
  spinnerSmall:{width:13,height:13,border:"2px solid #BFDBFE",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0},
  loadingText:{fontSize:11,color:"#94A3B8"},
  wrapper:{margin:"12px 0 4px",backgroundColor:"#F0F9FF",borderRadius:14,padding:"10px 10px 8px",border:"1.5px solid #BFDBFE"},
  heading:{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#1E40AF",textTransform:"uppercase",letterSpacing:"0.4px"},
  hint:{fontWeight:400,color:"#93C5FD",textTransform:"none",letterSpacing:0,fontSize:11},
  row:{display:"flex",gap:8,overflowX:"auto",paddingBottom:2},
  chip:{display:"flex",alignItems:"center",gap:6,flexShrink:0,backgroundColor:"#fff",border:"1.5px solid #E2E8F0",borderRadius:50,padding:"5px 10px 5px 5px",cursor:"pointer",transition:"all 0.15s",outline:"none"},
  chipSelected:{backgroundColor:"#2563EB",borderColor:"#2563EB"},chipBusy:{opacity:0.55},
  avatar:{width:26,height:26,borderRadius:"50%",fontSize:11,fontWeight:700,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"},
  info:{display:"flex",flexDirection:"column"},name:{fontSize:12,fontWeight:600,whiteSpace:"nowrap"},
  statusRow:{display:"flex",alignItems:"center",gap:3,marginTop:1},dot:{width:5,height:5,borderRadius:"50%",flexShrink:0},
  statusLabel:{fontSize:10,fontWeight:500},tick:{fontSize:12,color:"#fff",fontWeight:800,marginLeft:2},
  selectedNote:{margin:"8px 0 0",fontSize:11,color:"#1D4ED8",backgroundColor:"#EFF6FF",borderRadius:8,padding:"5px 10px"},
};