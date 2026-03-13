import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ═══════════════════════════════════════════════════════
   CALENDAR + TIME PICKER HELPERS
   ═══════════════════════════════════════════════════════ */
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const ALL_TIME_SLOTS = (() => {
  const s = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      s.push({ h, m, label: `${h12}:${String(m).padStart(2,"0")} ${h < 12 ? "AM" : "PM"}` });
    }
  return s;
})();

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const buildCal = (year, month) => {
  const first = new Date(year, month, 1).getDay();
  const last  = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let day = 1 - first;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++, day++)
      week.push(day >= 1 && day <= last ? day : null);
    weeks.push(week);
    if (day > last) break;
  }
  return weeks;
};

/* ── Mini Calendar ── */
const MiniCalendar = ({ selectedDate, onChange, minDate }) => {
  const today = new Date();
  const [vy, setVy] = useState((selectedDate || today).getFullYear());
  const [vm, setVm] = useState((selectedDate || today).getMonth());

  const prev = () => { if (vm === 0) { setVy(y => y-1); setVm(11); } else setVm(m => m-1); };
  const next = () => { if (vm === 11) { setVy(y => y+1); setVm(0);  } else setVm(m => m+1); };

  const isDisabled = (day) => {
    if (!day) return true;
    const d = new Date(vy, vm, day); d.setHours(23,59,0,0);
    return minDate && d < minDate;
  };
  const isSelected = (day) => day && selectedDate && isSameDay(new Date(vy, vm, day), selectedDate);
  const isToday    = (day) => day && isSameDay(new Date(vy, vm, day), today);

  return (
    <div style={cal.wrap}>
      <div style={cal.nav}>
        <button type="button" style={cal.nb} onClick={prev}>‹</button>
        <span style={cal.ntitle}>{MONTHS[vm].slice(0,3)} {vy}</span>
        <button type="button" style={cal.nb} onClick={next}>›</button>
      </div>
      <div style={cal.grid}>
        {DAYS.map(d => <div key={d} style={cal.dh}>{d}</div>)}
        {buildCal(vy, vm).flat().map((day, i) => {
          const sel = isSelected(day), dis = isDisabled(day), tod = isToday(day);
          return (
            <button key={i} type="button" disabled={dis || !day}
              style={{ ...cal.cell,
                ...(sel            ? cal.sel   : {}),
                ...(tod && !sel    ? cal.tod   : {}),
                ...(dis            ? cal.dis   : {}),
                ...(!day           ? cal.empty : {}) }}
              onClick={() => { if (!day || dis) return; onChange(new Date(vy, vm, day)); }}>
              {day || ""}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Time Picker ── */
const TimePicker = ({ selectedDate, onChange }) => {
  const now = new Date();
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current.querySelector("[data-active='true']");
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedDate?.toDateString()]);

  const isDis = (slot) => {
    if (!selectedDate) return false;
    const c = new Date(selectedDate); c.setHours(slot.h, slot.m, 0, 0);
    return c < new Date(now.getTime() + 30 * 60 * 1000);
  };
  const isSel = (slot) =>
    selectedDate &&
    selectedDate.getHours()   === slot.h &&
    selectedDate.getMinutes() === slot.m;

  return (
    <div style={tp.wrap}>
      <p style={tp.hd}>⏰ Time</p>
      <div ref={ref} style={tp.scroll}>
        {ALL_TIME_SLOTS.map((slot, i) => {
          const dis = isDis(slot), sel = isSel(slot);
          return (
            <button key={i} type="button" data-active={sel ? "true" : "false"} disabled={dis}
              style={{ ...tp.slot, ...(sel ? tp.active : {}), ...(dis ? tp.dis : {}) }}
              onClick={() => {
                if (!selectedDate || dis) return;
                const next = new Date(selectedDate); next.setHours(slot.h, slot.m, 0, 0); onChange(next);
              }}>
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Schedule Picker ── */
const SchedulePicker = ({ scheduledAt, onChange }) => {
  const [mode, setMode] = useState("now");

  const switchNow = () => { setMode("now"); onChange(null); };
  const switchLater = () => {
    setMode("later");
    if (!scheduledAt) {
      const d = new Date();
      d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30 + 30, 0, 0);
      onChange(d);
    }
  };

  const handleDateChange = (pickedDay) => {
    const next = scheduledAt ? new Date(scheduledAt) : new Date();
    next.setFullYear(pickedDay.getFullYear(), pickedDay.getMonth(), pickedDay.getDate());
    if (next < new Date(Date.now() + 30 * 60 * 1000)) {
      const now = new Date();
      next.setHours(now.getHours(), Math.ceil(now.getMinutes() / 30) * 30 + 30, 0, 0);
    }
    onChange(next);
  };

  const minDate = new Date(); minDate.setHours(0, 0, 0, 0);

  return (
    <div style={sc.wrap}>
      {/* Toggle row */}
      <div style={sc.toggleRow}>
        <button type="button"
          style={{ ...sc.btn, ...(mode === "now" ? sc.btnNow : {}) }}
          onClick={switchNow}>
          <span style={{ fontSize: 16 }}>⚡</span><span>Ride Now</span>
        </button>
        <button type="button"
          style={{ ...sc.btn, ...(mode === "later" ? sc.btnSched : {}) }}
          onClick={switchLater}>
          <span style={{ fontSize: 16 }}>📅</span><span>Schedule</span>
        </button>
      </div>

      {/* Ride Now badge */}
      {mode === "now" && (
        <div style={sc.nowBadge}>
          <span>✅</span>
          <span style={sc.nowTxt}>Driver will be assigned immediately</span>
        </div>
      )}

      {/* Schedule picker */}
      {mode === "later" && (
        <div style={sc.laterWrap}>
          {/* Summary pill */}
          {scheduledAt && (
            <div style={sc.pill}>
              <span style={{ fontSize: 20 }}>🗓️</span>
              <div style={{ flex: 1 }}>
                <p style={sc.pillDate}>
                  {scheduledAt.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}
                </p>
                <p style={sc.pillTime}>
                  {scheduledAt.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true })}
                </p>
              </div>
              <span style={sc.pillCheck}>✓ Set</span>
            </div>
          )}

          {/* Calendar + Time side-by-side */}
          <div style={sc.pickerBox}>
            <MiniCalendar selectedDate={scheduledAt} onChange={handleDateChange} minDate={minDate} />
            <div style={sc.divider} />
            <TimePicker selectedDate={scheduledAt} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   BookingStatusTracker
   ═══════════════════════════════════════════════════════ */
const BookingStatusTracker = ({ bookingId, onClose, onRebook }) => {
  const [booking,          setBooking]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [waitCountdown,    setWaitCountdown]    = useState(null);
  const [waitExpired,      setWaitExpired]      = useState(false);
  const [waitTotalSecs,    setWaitTotalSecs]    = useState(null);
  const [preferredPopup,   setPreferredPopup]   = useState(false);
  const [showRating,       setShowRating]       = useState(false);
  const [ratingValue,      setRatingValue]      = useState(0);
  const [ratingHover,      setRatingHover]      = useState(0);
  const [ratingComment,    setRatingComment]    = useState("");
  const [ratingSubmitted,  setRatingSubmitted]  = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const timerRef        = useRef(null);
  const countRef        = useRef(null);
  const waitInitialized = useRef(false);

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
    if (booking?.status === "completed") {
      clearInterval(timerRef.current);
      if (!ratingSubmitted) setTimeout(() => setShowRating(true), 800);
    }
  }, [booking?.status]);

  useEffect(() => {
    if (!booking) return;
    const s    = booking.status?.toLowerCase();
    const mins = s==="wait5"?5 : s==="wait10"?10 : s==="wait30"?30 : null;
    if (mins && !waitInitialized.current) {
      waitInitialized.current = true;
      const total = mins * 60;
      setWaitTotalSecs(total); setWaitCountdown(total); setWaitExpired(false);
    }
    if (!mins) {
      waitInitialized.current = false;
      setWaitCountdown(null); setWaitExpired(false); clearInterval(countRef.current);
    }
  }, [booking?.status]);

  useEffect(() => {
    if (!bookingId) return;
    const phone = localStorage.getItem("customerPhone");
    if (!phone) return;
    let socket;
    import("socket.io-client").then(({ io }) => {
      socket = io(BASE_URL);
      socket.emit("joinCustomer", phone);
      socket.on("preferredUnavailable", ({ bookingId: id }) => {
        if (String(id) === String(bookingId)) setPreferredPopup(true);
      });
    });
    return () => { if (socket) socket.disconnect(); };
  }, [bookingId]);

  useEffect(() => {
    if (waitCountdown === null) return;
    if (waitCountdown <= 0) { setWaitExpired(true); clearInterval(countRef.current); return; }
    clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setWaitCountdown((p) => {
        if (p <= 1) { clearInterval(countRef.current); setWaitExpired(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(countRef.current);
  }, [waitCountdown !== null && waitCountdown > 0 ? "running" : "stopped"]);

  const submitRating = async () => {
    if (!ratingValue) return;
    setRatingSubmitting(true);
    try {
      await fetch(`${BASE_URL}/api/submit-rating`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ bookingId, rating:ratingValue, comment:ratingComment }),
      });
      setRatingSubmitted(true); setShowRating(false);
    } catch {}
    finally { setRatingSubmitting(false); }
  };

  if (loading) return <div style={tr.center}><div style={tr.spinner}/><p style={tr.spinnerTxt}>Loading…</p></div>;
  if (!booking) return null;

  const status    = booking.status?.toLowerCase();
  const isWaiting = ["wait5","wait10","wait30"].includes(status);
  const isAllBusy = status === "allbusy";
  const isScheduled = status === "scheduled";
  const waitMins  = status==="wait5"?5 : status==="wait10"?10 : 30;
  const pct       = waitCountdown!==null && waitTotalSecs ? (waitCountdown/waitTotalSecs)*100 : 0;

  const steps = [
    { key:"pending",   icon:"📋", label:"Booking Received", sub:"Waiting for admin to assign a driver…" },
    { key:"assigned",  icon:"🔍", label:"Finding Driver",    sub:"Driver notified, waiting for confirmation…" },
    { key:"accepted",  icon:"🚗", label:"Driver On The Way", sub:"Driver is heading to your pickup!" },
    { key:"inride",    icon:"🛣️", label:"Trip In Progress",  sub:"Enjoy your ride! 🎉" },
    { key:"completed", icon:"✅", label:"Trip Completed",    sub:"Thank you for riding with us!" },
  ];
  const activeIdx  = steps.findIndex((s) => s.key === status);
  const showDriver = ["accepted","inride","completed"].includes(status) && booking.driver_name;

  return (
    <div style={tr.wrap}>
      {/* header */}
      <div style={tr.header}>
        <div>
          <p style={tr.headerSub}>Booking #{booking.id}</p>
          <h3 style={tr.headerTitle}>
            {isScheduled ? "📅 Ride Scheduled"
              : isWaiting  ? "⏱ Please Wait"
              : isAllBusy  ? "🚫 All Drivers Busy"
              : "Tracking Your Ride"}
          </h3>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {status==="completed" && <button style={tr.doneBtn} onClick={()=>onClose(status)}>Done ✓</button>}
          {(isWaiting||isAllBusy) && <button style={tr.cancelBtn} onClick={()=>onClose(status)}>✕ Cancel</button>}
          <button style={tr.closeIcon} onClick={()=>onClose(status)} title="Close">✕</button>
        </div>
      </div>

      {/* scheduled ride banner */}
      {isScheduled && (
        <div style={tr.scheduledBox}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontSize:28}}>📅</span>
            <div>
              <p style={{margin:"0 0 2px",fontSize:14,fontWeight:800,color:"#0F766E"}}>Ride Scheduled!</p>
              <p style={{margin:0,fontSize:12,color:"#0D9488"}}>Your ride is confirmed and will be dispatched on time.</p>
            </div>
          </div>
          {booking.scheduled_at && (
            <div style={tr.schedTimeBox}>
              <span style={{fontSize:13}}>🗓️</span>
              <span style={{fontSize:13,fontWeight:700,color:"#0F766E"}}>
                {new Date(booking.scheduled_at).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
                {" · "}
                {new Date(booking.scheduled_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true})}
              </span>
            </div>
          )}
          <button style={tr.cancelScheduledBtn} onClick={()=>onClose(status)}>✕ Cancel Booking</button>
        </div>
      )}

      {/* wait countdown */}
      {isWaiting && (
        <div style={tr.waitBox}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontSize:22}}>⏱</span>
            <div>
              <p style={{...tr.bannerTitle,color:"#92400E",margin:"0 0 2px"}}>Please Wait ~{waitMins} Minutes</p>
              <p style={{...tr.bannerSub,color:"#B45309",margin:0}}>Admin is finding a driver for you.</p>
            </div>
          </div>
          {!waitExpired && waitCountdown!==null && (
            <div style={tr.countdownBox}>
              <p style={tr.countdownLabel}>Time Remaining</p>
              <p style={tr.countdownTime}>
                {String(Math.floor(waitCountdown/60)).padStart(2,"0")}
                <span style={{fontSize:22,color:"#D97706"}}>:</span>
                {String(waitCountdown%60).padStart(2,"0")}
              </p>
              <div style={tr.progressBg}><div style={{...tr.progressFill,width:`${pct}%`,backgroundColor:pct>30?"#F59E0B":"#EF4444"}}/></div>
              <p style={tr.countdownSub}>{waitCountdown>60?`About ${Math.ceil(waitCountdown/60)} min left`:"Less than a minute left"}</p>
            </div>
          )}
          {waitExpired && (
            <div style={tr.expiredBox}>
              <span style={{fontSize:28,marginBottom:6}}>⏰</span>
              <p style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:"#9F1239"}}>Wait time is up!</p>
              <p style={{margin:"0 0 14px",fontSize:13,color:"#BE123C",textAlign:"center"}}>No driver assigned. Book again?</p>
              <button onClick={onRebook} style={tr.rebookBtn}>🚖 Book Again</button>
            </div>
          )}
        </div>
      )}

      {/* all busy */}
      {isAllBusy && (
        <div style={tr.busyBox}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontSize:22}}>🚫</span>
            <div>
              <p style={{...tr.bannerTitle,color:"#9F1239",margin:"0 0 2px"}}>All drivers are currently busy</p>
              <p style={{...tr.bannerSub,color:"#BE123C",margin:0}}>Please try again shortly.</p>
            </div>
          </div>
          <button onClick={onRebook} style={tr.rebookBtn}>🚖 Try Again</button>
        </div>
      )}

      {/* step tracker */}
      {!isWaiting && !isAllBusy && !isScheduled && (
        <div style={{marginBottom:14}}>
          {steps.map((step, i) => {
            const done=activeIdx>i, current=activeIdx===i;
            return (
              <div key={step.key}>
                {i>0 && <div style={{width:2,height:16,marginLeft:18,backgroundColor:done?"#2563EB":"#E2E8F0"}}/>}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:done||current?"#2563EB":"#F1F5F9",border:`2px solid ${done||current?"#2563EB":"#CBD5E1"}`}}>
                    {done?<span style={{color:"#fff",fontSize:12}}>✓</span>:<span style={{fontSize:14}}>{step.icon}</span>}
                  </div>
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:current?700:500,color:current?"#2563EB":done?"#1E293B":"#94A3B8"}}>{step.label}</p>
                    {current && <p style={tr.stepSub}>{step.sub}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* driver card */}
      {showDriver && (
        <div style={tr.driverCard}>
          <div style={tr.driverAvatar}>{booking.driver_name?.[0]?.toUpperCase()}</div>
          <div style={{flex:1}}>
            <p style={tr.driverName}>{booking.driver_name}</p>
            {booking.driver_phone && <a href={`tel:${booking.driver_phone}`} style={tr.driverPhone}>📞 {booking.driver_phone}</a>}
            <p style={tr.driverLabel}>Your Driver</p>
          </div>
          <div style={{...tr.statusPill,backgroundColor:status==="inride"?"#D1FAE5":"#EFF6FF",color:status==="inride"?"#065F46":"#1D4ED8"}}>
            {status==="inride"?"🚗 In Ride":"🟢 On the Way"}
          </div>
        </div>
      )}

      {status==="assigned" && (
        <div style={tr.searchingBox}>
          <div style={{display:"flex",gap:5,marginBottom:6}}>
            {[0,0.2,0.4].map((delay,i)=>(<div key={i} style={{width:7,height:7,borderRadius:"50%",backgroundColor:"#2563EB",animation:`bounce 1.4s ease-in-out ${delay}s infinite`}}/>))}
          </div>
          <p style={tr.searchingTxt}>Driver is confirming your booking…</p>
        </div>
      )}

      {/* route */}
      <div style={tr.routeBox}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{...tr.routeDot,backgroundColor:"#10B981"}}/><p style={tr.routeTxt}>{booking.pickup}</p></div>
        <div style={{width:2,height:10,backgroundColor:"#CBD5E1",marginLeft:3}}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{...tr.routeDot,backgroundColor:"#EF4444"}}/><p style={tr.routeTxt}>{booking.drop_location}</p></div>
      </div>

      {status!=="completed" && !isWaiting && !isAllBusy && !isScheduled && <p style={tr.pollNote}>🔄 Auto-updating every 5 seconds</p>}

      {status==="completed" && ratingSubmitted && (
        <div style={{backgroundColor:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:12,padding:"12px 14px",marginTop:10,textAlign:"center"}}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#16A34A"}}>⭐ Thanks for your rating!</p>
        </div>
      )}

      {/* rating popup */}
      {showRating && (
        <div style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{backgroundColor:"#fff",borderRadius:24,padding:28,maxWidth:360,width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:52,marginBottom:8}}>🎉</div>
              <h3 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:"#1E293B"}}>Ride Completed!</h3>
              <p style={{margin:0,fontSize:13,color:"#64748B"}}>How was your ride with <strong>{booking.driver_name||"your driver"}</strong>?</p>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:16}}>
              {[1,2,3,4,5].map(star=>(
                <button key={star} style={{background:"none",border:"none",fontSize:36,cursor:"pointer",transition:"transform 0.1s",transform:(ratingHover||ratingValue)>=star?"scale(1.2)":"scale(1)"}}
                  onMouseEnter={()=>setRatingHover(star)} onMouseLeave={()=>setRatingHover(0)} onClick={()=>setRatingValue(star)}>
                  {(ratingHover||ratingValue)>=star?"⭐":"☆"}
                </button>
              ))}
            </div>
            {ratingValue>0 && <p style={{textAlign:"center",margin:"0 0 12px",fontSize:13,color:"#64748B",fontWeight:600}}>{["","😞 Poor","😐 Fair","🙂 Good","😊 Great","🤩 Excellent!"][ratingValue]}</p>}
            <textarea style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #E2E8F0",borderRadius:12,padding:"10px 12px",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",color:"#1E293B"}} rows={3} placeholder="Any comments? (optional)" value={ratingComment} onChange={e=>setRatingComment(e.target.value)}/>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button style={{flex:1,padding:"12px 0",backgroundColor:"#F8FAFC",color:"#64748B",border:"1.5px solid #E2E8F0",borderRadius:12,fontWeight:600,fontSize:14,cursor:"pointer"}} onClick={()=>{setShowRating(false);setRatingSubmitted(true);}}>Skip</button>
              <button style={{flex:2,padding:"12px 0",backgroundColor:ratingValue?"#2563EB":"#CBD5E1",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:15,cursor:ratingValue?"pointer":"not-allowed"}} onClick={submitRating} disabled={!ratingValue||ratingSubmitting}>
                {ratingSubmitting?"⏳ Submitting…":"⭐ Submit Rating"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* preferred unavailable popup */}
      {preferredPopup && (
        <div style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{backgroundColor:"#fff",borderRadius:24,padding:28,maxWidth:340,width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:52,marginBottom:10}}>🚕</div>
              <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:"#1E293B"}}>Preferred Driver Unavailable</h3>
              <p style={{margin:0,fontSize:14,color:"#64748B",lineHeight:1.6}}>
                Your preferred driver is currently not available.<br/>
                <strong>Can we assign another driver for you?</strong>
              </p>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"13px 0",backgroundColor:"#FEE2E2",color:"#9F1239",border:"1.5px solid #FECDD3",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer"}}
                onClick={async()=>{
                  setPreferredPopup(false);
                  try{await fetch(`${BASE_URL}/api/bookings/${bookingId}/preferred-response`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accept:false})});}catch{}
                  if(onClose)onClose("cancelled");
                }}>❌ No, Cancel</button>
              <button style={{flex:1,padding:"13px 0",backgroundColor:"#2563EB",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer"}}
                onClick={async()=>{
                  setPreferredPopup(false);
                  try{await fetch(`${BASE_URL}/api/bookings/${bookingId}/preferred-response`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accept:true})});}catch{}
                }}>✅ Yes, Proceed</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   RecommendedDrivers
   ═══════════════════════════════════════════════════════ */
const RecommendedDrivers = ({ phone, selectedId, onSelect }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!/^[6-9]\d{9}$/.test(phone)) { setDrivers([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`${BASE_URL}/recommended-drivers/${encodeURIComponent(phone)}`)
        .then(r=>r.json()).then(d=>{ if(d.success) setDrivers(d.drivers||[]); })
        .catch(()=>setDrivers([])).finally(()=>setLoading(false));
    }, 600);
    return () => clearTimeout(t);
  }, [phone]);
  if (loading) return <div style={rec.row2}><div style={rec.spinSm}/><span style={{fontSize:11,color:"#94A3B8"}}>Finding your preferred drivers…</span></div>;
  if (!drivers.length) return null;
  return (
    <div style={rec.wrap}>
      <p style={rec.heading}>⭐ Preferred Drivers<span style={rec.hint}> — tap to choose</span></p>
      <div style={rec.row}>
        {drivers.map((d) => {
          const avail=d.status==="available", sel=selectedId===d.id;
          return (
            <button key={d.id} type="button" onClick={()=>onSelect(sel?null:d)}
              style={{...rec.chip,...(sel?rec.chipSel:{}),...(!avail&&!sel?rec.chipBusy:{})}}>
              <div style={{...rec.av,backgroundColor:sel?"#fff":avail?"#2563EB":"#CBD5E1",color:sel?"#2563EB":"#fff"}}>{d.name?.[0]?.toUpperCase()??"?"}</div>
              <div style={{display:"flex",flexDirection:"column"}}>
                <span style={{fontSize:12,fontWeight:600,color:sel?"#fff":"#1E293B",whiteSpace:"nowrap"}}>{d.name.split(" ")[0]}</span>
                <div style={{display:"flex",alignItems:"center",gap:3,marginTop:1}}>
                  <span style={{width:5,height:5,borderRadius:"50%",backgroundColor:avail?"#10B981":"#FCA5A5",flexShrink:0}}/>
                  <span style={{fontSize:10,color:sel?"#BFDBFE":avail?"#10B981":"#94A3B8"}}>{avail?"Free":"Busy"}</span>
                </div>
              </div>
              {sel && <span style={{fontSize:12,color:"#fff",fontWeight:800,marginLeft:2}}>✓</span>}
            </button>
          );
        })}
      </div>
      {selectedId && <p style={rec.note}>✅ <strong>{drivers.find(d=>d.id===selectedId)?.name}</strong> saved as preferred</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   BookingForm  — main export
   ═══════════════════════════════════════════════════════ */
const BookingForm = ({ visible, onClose, onSuccess, initialDrop, initialTriptype }) => {
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [area,setArea]=useState("");
  const [darea,setDArea]=useState(initialDrop||"");
  const [triptype,setTriptype]=useState(initialTriptype||"");
  const [preferredDriver,setPreferredDriver]=useState(null);
  const [scheduledAt,setScheduledAt]=useState(null);           // ← NEW
  const [suggestions,setSuggestions]=useState([]);
  const [dropSuggestions,setDropSuggestions]=useState([]);
  const [errors,setErrors]=useState({});
  const [locLoading,setLocLoading]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [pickupCoords,setPickupCoords]=useState(null);
  const [bookedId,setBookedId]=useState(null);

  const miniMapDiv=useRef(null); const miniMap=useRef(null); const miniMarker=useRef(null);

  useEffect(()=>{if(initialDrop)setDArea(initialDrop);if(initialTriptype)setTriptype(initialTriptype);},[initialDrop,initialTriptype]);
  useEffect(()=>{if(visible){const s=localStorage.getItem("customerPhone")||"";if(s)setPhone(s);}},[visible]);
  useEffect(()=>{
    if(!visible){
      setName("");setPhone("");setArea("");setDArea(initialDrop||"");setTriptype(initialTriptype||"");
      setPreferredDriver(null);setScheduledAt(null);setSuggestions([]);setDropSuggestions([]);
      setErrors({});setPickupCoords(null);setSubmitting(false);setBookedId(null);
      if(miniMap.current){miniMap.current.remove();miniMap.current=null;}
    }
  },[visible]);

  useEffect(()=>{
    if(!pickupCoords||!miniMapDiv.current)return;
    const build=()=>{
      const L=window.L;if(!L)return;
      if(miniMap.current){miniMap.current.setView([pickupCoords.lat,pickupCoords.lng],15);miniMarker.current?.setLatLng([pickupCoords.lat,pickupCoords.lng]);setTimeout(()=>miniMap.current?.invalidateSize(),100);return;}
      const map=L.map(miniMapDiv.current,{center:[pickupCoords.lat,pickupCoords.lng],zoom:15,zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);
      const icon=L.divIcon({className:"",html:`<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,0.5);"></div>`,iconSize:[18,18],iconAnchor:[9,9]});
      miniMarker.current=L.marker([pickupCoords.lat,pickupCoords.lng],{icon}).addTo(map);miniMap.current=map;setTimeout(()=>map.invalidateSize(),150);
    };
    if(window.L)build();
    else{
      if(!document.getElementById("leaflet-css")){const l=document.createElement("link");l.id="leaflet-css";l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(l);}
      const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=build;document.head.appendChild(s);
    }
  },[pickupCoords]);

  const searchLoc=async(field,query)=>{
    if(!query||query.length<2){field==="area"?setSuggestions([]):setDropSuggestions([]);return;}
    try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,{headers:{"User-Agent":"JJApp/1.0"}});const data=await r.json();field==="area"?setSuggestions(data):setDropSuggestions(data);}catch{}
  };
  const selectPickup=(s)=>{setArea(s.display_name);setSuggestions([]);setPickupCoords({lat:parseFloat(s.lat),lng:parseFloat(s.lon)});setErrors(e=>({...e,area:""}));};
  const selectDrop=(s)=>{setDArea(s.display_name);setDropSuggestions([]);setErrors(e=>({...e,darea:""}));};

  const getCurrentLocation=()=>{
    if(!navigator.geolocation){alert("Geolocation not supported.");return;}
    setLocLoading(true);setSuggestions([]);
    navigator.geolocation.getCurrentPosition(async({coords})=>{
      const{latitude,longitude}=coords;
      try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,{headers:{"User-Agent":"JJApp/1.0"}});const data=await r.json();setArea(data.display_name||`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);setPickupCoords({lat:latitude,lng:longitude});setErrors(e=>({...e,area:""}));}
      catch{setArea(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);setPickupCoords({lat:latitude,lng:longitude});}
      setLocLoading(false);
    },(err)=>{setLocLoading(false);if(err.code===1)alert("Location permission denied.");else if(err.code===2)alert("Location unavailable.");else alert("Timed out.");},{timeout:10000,enableHighAccuracy:true});
  };

  const validate=()=>{
    const e={};
    if(!name.trim())e.name="Name is required";
    if(!phone.trim())e.phone="Phone is required";else if(!/^[6-9]\d{9}$/.test(phone))e.phone="Enter valid 10-digit number";
    if(!area.trim())e.area="Pickup location required";
    if(!darea.trim())e.darea="Drop location required";
    if(!triptype)e.triptype="Select trip type";
    if(scheduledAt && scheduledAt < new Date(Date.now()+29*60*1000))
      e.schedule="Schedule must be at least 30 minutes from now";
    setErrors(e);return Object.keys(e).length===0;
  };

  const handleSubmit=async()=>{
    if(!validate()||submitting)return;
    setSubmitting(true);
    try{
      const bookingphnno=localStorage.getItem("customerPhone")||localStorage.getItem("userPhone")||phone;
      const res=await axios.post(`${BASE_URL}/api/trip-booking`,{
        name,phone,
        pickup:area,pickupLat:pickupCoords?.lat??null,pickupLng:pickupCoords?.lng??null,
        drop:darea,triptype,bookingphnno,
        recommended_driver_id:preferredDriver?.id??null,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,   // ← NEW
        is_scheduled: !!scheduledAt,                                     // ← NEW
      });
      if(res.data.success){
        if(miniMap.current){miniMap.current.remove();miniMap.current=null;}
        setBookedId(res.data.bookingId);onSuccess();
      } else alert(res.data.message||"Booking failed.");
    }catch(err){const msg=err?.response?.data?.message||err?.response?.data?.error;alert(msg?`Server error: ${msg}`:"Failed to submit booking.");}
    finally{setSubmitting(false);}
  };

  const handleRebook=()=>{
    setBookedId(null);setName("");setArea("");setDArea(initialDrop||"");setTriptype(initialTriptype||"");
    setPreferredDriver(null);setScheduledAt(null);setSuggestions([]);setDropSuggestions([]);
    setErrors({});setPickupCoords(null);setSubmitting(false);
    if(miniMap.current){miniMap.current.remove();miniMap.current=null;}
  };

  const handleCloseTracker=async(currentStatus)=>{
    if(bookedId&&["wait5","wait10","wait30","allbusy","pending","scheduled"].includes(currentStatus)){
      try{await fetch(`${BASE_URL}/api/bookings/${bookedId}/cancel`,{method:"POST"});}catch{}
    }
    onClose();
  };

  if(!visible)return null;

  if(bookedId)return(
    <div style={st.overlay} onClick={e=>e.stopPropagation()}>
      <div style={st.sheet}><BookingStatusTracker bookingId={bookedId} onClose={handleCloseTracker} onRebook={handleRebook}/></div>
    </div>
  );

  /* Dynamic submit label */
  const submitLabel = submitting
    ? (scheduledAt ? "⏳ Scheduling…" : "⏳ Booking…")
    : scheduledAt
      ? `📅 Schedule · ${scheduledAt.toLocaleDateString("en-IN",{day:"numeric",month:"short"})} ${scheduledAt.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true})}`
      : preferredDriver
        ? `🚖 Book with ${preferredDriver.name.split(" ")[0]}`
        : "🚖 Book Ride";

  return(
    <div style={st.overlay} onClick={onClose}>
      <div style={st.sheet} onClick={e=>e.stopPropagation()}>
        <button style={st.closeBtn} onClick={onClose}>✕</button>
        <h2 style={st.sheetTitle}>Book a Ride</h2>

        <label style={st.label}>Full Name</label>
        <input style={{...st.input,...(errors.name?st.inputErr:{})}} placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/>
        {errors.name&&<p style={st.err}>{errors.name}</p>}

        <label style={st.label}>Phone Number</label>
        <input style={{...st.input,...(errors.phone?st.inputErr:{})}} placeholder="10-digit mobile number" maxLength={10} value={phone} onChange={e=>{setPhone(e.target.value.replace(/\D/g,""));setPreferredDriver(null);}}/>
        {errors.phone&&<p style={st.err}>{errors.phone}</p>}

        <label style={st.label}>Pickup Location</label>
        <div style={{position:"relative"}}>
          <div style={st.inputRow}>
            <input style={{...st.inputInner,...(errors.area?{borderColor:"#EF4444"}:{})}} placeholder="Search pickup area..." value={area} onChange={e=>{setArea(e.target.value);setPickupCoords(null);searchLoc("area",e.target.value);}}/>
            <button style={st.locBtn} onClick={getCurrentLocation} disabled={locLoading}>
              {locLoading?<div style={st.spinner}/>:(
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" fill="#2563EB" fillOpacity="0.2"/><circle cx="12" cy="12" r="7"/>
                  <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
              )}
            </button>
          </div>
          {suggestions.length>0&&<div style={st.suggBox}>{suggestions.map((s,i)=><div key={i} style={st.suggItem} onClick={()=>selectPickup(s)}><span style={{marginRight:8,fontSize:14}}>📍</span><span style={{fontSize:12,color:"#1E293B",lineHeight:1.4}}>{s.display_name}</span></div>)}</div>}
        </div>
        {errors.area&&<p style={st.err}>{errors.area}</p>}

        {pickupCoords&&(
          <div style={st.miniMapWrap}>
            <div ref={miniMapDiv} style={st.miniMap}/>
            <div style={st.miniMapFooter}>
              <span>📍</span><span style={{fontSize:11,color:"#2563EB",fontWeight:600}}>Pickup location set</span>
              <button style={st.clearLocBtn} onClick={()=>{setArea("");setPickupCoords(null);if(miniMap.current){miniMap.current.remove();miniMap.current=null;}}}>✕ Clear</button>
            </div>
          </div>
        )}

        <label style={st.label}>Drop Location</label>
        <div style={{position:"relative"}}>
          <input style={{...st.input,...(errors.darea?st.inputErr:{})}} placeholder="Search drop area..." value={darea} onChange={e=>{setDArea(e.target.value);searchLoc("darea",e.target.value);}}/>
          {dropSuggestions.length>0&&<div style={st.suggBox}>{dropSuggestions.map((s,i)=><div key={i} style={st.suggItem} onClick={()=>selectDrop(s)}><span style={{marginRight:8,fontSize:14}}>🏁</span><span style={{fontSize:12,color:"#1E293B",lineHeight:1.4}}>{s.display_name}</span></div>)}</div>}
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

        {/* ─── SCHEDULE PICKER ─── */}
        <label style={st.label}>When do you need the ride?</label>
        <SchedulePicker scheduledAt={scheduledAt} onChange={setScheduledAt}/>
        {errors.schedule&&<p style={st.err}>{errors.schedule}</p>}

        <RecommendedDrivers phone={phone} selectedId={preferredDriver?.id??null} onSelect={setPreferredDriver}/>

        <button
          style={{
            ...st.submitBtn,
            opacity: submitting ? 0.7 : 1,
            backgroundColor: scheduledAt ? "#0F766E" : "#2563EB",
            boxShadow: scheduledAt ? "0 4px 14px rgba(15,118,110,0.35)" : "0 4px 14px rgba(37,99,235,0.3)",
          }}
          onClick={handleSubmit} disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
};

export default BookingForm;

/* ═══════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════ */

/* Calendar */
const cal = {
  wrap:  { flex:"1 1 0", minWidth:0 },
  nav:   { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 },
  nb:    { background:"none", border:"none", fontSize:20, fontWeight:700, color:"#2563EB", cursor:"pointer", padding:"0 4px", lineHeight:1 },
  ntitle:{ fontSize:12, fontWeight:800, color:"#1E293B" },
  grid:  { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 },
  dh:    { textAlign:"center", fontSize:9, fontWeight:700, color:"#94A3B8", padding:"2px 0 4px" },
  cell:  { width:"100%", aspectRatio:"1", border:"none", borderRadius:7, backgroundColor:"transparent", fontSize:11, fontWeight:500, color:"#1E293B", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 },
  sel:   { backgroundColor:"#2563EB", color:"#fff", fontWeight:700 },
  tod:   { outline:"2px solid #2563EB", outlineOffset:"-2px", color:"#2563EB", fontWeight:700 },
  dis:   { color:"#CBD5E1", cursor:"not-allowed" },
  empty: { cursor:"default", pointerEvents:"none" },
};

/* Time picker */
const tp = {
  wrap:   { flex:"0 0 82px", display:"flex", flexDirection:"column" },
  hd:     { margin:"0 0 6px", fontSize:9, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.5px" },
  scroll: { flex:1, maxHeight:192, overflowY:"auto", display:"flex", flexDirection:"column", gap:3, paddingRight:2, scrollbarWidth:"thin", scrollbarColor:"#CBD5E1 transparent" },
  slot:   { flexShrink:0, padding:"6px 4px", border:"1.5px solid #E2E8F0", borderRadius:8, backgroundColor:"#F8FAFC", fontSize:10, fontWeight:600, color:"#475569", cursor:"pointer", textAlign:"center", whiteSpace:"nowrap" },
  active: { backgroundColor:"#2563EB", borderColor:"#2563EB", color:"#fff", boxShadow:"0 2px 6px rgba(37,99,235,0.3)" },
  dis:    { color:"#CBD5E1", cursor:"not-allowed", backgroundColor:"#FAFAFA", borderColor:"#F1F5F9" },
};

/* Schedule picker */
const sc = {
  wrap:      { margin:"6px 0 4px" },
  toggleRow: { display:"flex", gap:8, marginBottom:10 },
  btn:       { flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"12px 0", borderRadius:14, border:"1.5px solid #E2E8F0", backgroundColor:"#F8FAFC", fontSize:13, fontWeight:600, color:"#64748B", cursor:"pointer" },
  btnNow:    { backgroundColor:"#2563EB", borderColor:"#2563EB", color:"#fff", boxShadow:"0 3px 10px rgba(37,99,235,0.25)" },
  btnSched:  { backgroundColor:"#0F766E", borderColor:"#0F766E", color:"#fff", boxShadow:"0 3px 10px rgba(15,118,110,0.25)" },
  nowBadge:  { display:"flex", alignItems:"center", gap:8, backgroundColor:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:12, padding:"10px 14px" },
  nowTxt:    { fontSize:12, fontWeight:600, color:"#16A34A" },
  laterWrap: { display:"flex", flexDirection:"column", gap:10 },
  pill:      { display:"flex", alignItems:"center", gap:10, backgroundColor:"#F0FDFA", border:"1.5px solid #99F6E4", borderRadius:14, padding:"10px 14px" },
  pillDate:  { margin:0, fontSize:13, fontWeight:700, color:"#0F766E" },
  pillTime:  { margin:"2px 0 0", fontSize:12, color:"#0D9488", fontWeight:600 },
  pillCheck: { marginLeft:"auto", fontSize:11, color:"#0F766E", fontWeight:700, backgroundColor:"#CCFBF1", borderRadius:6, padding:"3px 8px", whiteSpace:"nowrap" },
  pickerBox: { display:"flex", gap:10, backgroundColor:"#F8FAFC", borderRadius:16, padding:"12px 10px", border:"1.5px solid #E2E8F0" },
  divider:   { width:1, backgroundColor:"#E2E8F0", flexShrink:0 },
};

/* Tracker */
const tr={wrap:{padding:"4px 0 8px"},center:{display:"flex",flexDirection:"column",alignItems:"center",padding:"24px 0"},spinner:{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"},spinnerTxt:{marginTop:10,fontSize:12,color:"#94A3B8"},header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16},headerSub:{margin:0,fontSize:11,color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"},headerTitle:{margin:"3px 0 0",fontSize:18,fontWeight:800,color:"#1E293B"},doneBtn:{backgroundColor:"#2563EB",color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},cancelBtn:{backgroundColor:"#FFF1F2",color:"#9F1239",border:"1.5px solid #FECDD3",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},closeIcon:{width:32,height:32,borderRadius:"50%",backgroundColor:"#F1F5F9",border:"1.5px solid #E2E8F0",fontSize:15,fontWeight:700,color:"#64748B",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
scheduledBox:{backgroundColor:"#F0FDFA",border:"1.5px solid #99F6E4",borderRadius:14,padding:"14px",marginBottom:14},
schedTimeBox:{display:"flex",alignItems:"center",gap:8,backgroundColor:"#CCFBF1",borderRadius:10,padding:"8px 12px",marginBottom:10},
cancelScheduledBtn:{width:"100%",padding:"10px 0",backgroundColor:"#FEE2E2",color:"#9F1239",border:"1.5px solid #FECDD3",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"},
waitBox:{backgroundColor:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:14,padding:"14px",marginBottom:14},countdownBox:{backgroundColor:"#FEF3C7",borderRadius:12,padding:"14px 16px",textAlign:"center",border:"1px solid #FDE68A"},countdownLabel:{margin:"0 0 4px",fontSize:10,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:"0.8px"},countdownTime:{margin:"0 0 10px",fontSize:38,fontWeight:900,color:"#D97706",fontFamily:"monospace",letterSpacing:2},progressBg:{height:8,backgroundColor:"#FDE68A",borderRadius:999,overflow:"hidden",marginBottom:6},progressFill:{height:"100%",borderRadius:999,transition:"width 1s linear, background-color 0.5s"},countdownSub:{margin:0,fontSize:11,color:"#B45309",fontWeight:600},expiredBox:{backgroundColor:"#FFF1F2",border:"1.5px solid #FECDD3",borderRadius:12,padding:"16px",textAlign:"center",marginTop:10},rebookBtn:{width:"100%",padding:"13px 0",backgroundColor:"#2563EB",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"},busyBox:{backgroundColor:"#FFF1F2",border:"1.5px solid #FECDD3",borderRadius:14,padding:"14px",marginBottom:14},bannerTitle:{margin:0,fontSize:13,fontWeight:700},bannerSub:{margin:"3px 0 0",fontSize:12},stepSub:{margin:"2px 0 0",fontSize:11,color:"#64748B"},driverCard:{display:"flex",alignItems:"center",gap:12,backgroundColor:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:14,padding:"12px 14px",marginBottom:12},driverAvatar:{width:42,height:42,borderRadius:"50%",backgroundColor:"#16A34A",color:"#fff",fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},driverName:{margin:0,fontSize:14,fontWeight:700,color:"#1E293B"},driverPhone:{display:"block",margin:"2px 0",fontSize:13,color:"#2563EB",textDecoration:"none",fontWeight:600},driverLabel:{margin:0,fontSize:11,color:"#64748B"},statusPill:{borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700},searchingBox:{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0 12px"},searchingTxt:{margin:0,fontSize:12,color:"#64748B"},routeBox:{backgroundColor:"#F8FAFC",borderRadius:10,padding:"10px 12px",marginBottom:10},routeDot:{width:7,height:7,borderRadius:"50%",flexShrink:0},routeTxt:{margin:0,fontSize:12,color:"#1E293B",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},pollNote:{margin:0,textAlign:"center",fontSize:11,color:"#CBD5E1"}};

/* Form */
const st={overlay:{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},sheet:{position:"relative",width:"100%",maxWidth:420,backgroundColor:"#fff",borderRadius:28,padding:"48px 20px 24px",maxHeight:"92vh",overflowY:"auto"},closeBtn:{position:"absolute",top:14,right:14,width:36,height:36,borderRadius:"50%",backgroundColor:"#F8FAFC",border:"none",fontSize:18,fontWeight:700,cursor:"pointer"},sheetTitle:{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#1E293B",textAlign:"center"},label:{display:"block",fontSize:13,fontWeight:600,color:"#64748B",margin:"10px 0 4px"},input:{width:"100%",boxSizing:"border-box",backgroundColor:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:14,padding:"12px 14px",fontSize:14,color:"#1E293B",outline:"none"},inputErr:{borderColor:"#EF4444"},err:{margin:"4px 0 0",fontSize:12,color:"#EF4444"},inputRow:{display:"flex",alignItems:"center",gap:8},inputInner:{flex:1,boxSizing:"border-box",backgroundColor:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:14,padding:"12px 14px",fontSize:14,color:"#1E293B",outline:"none"},locBtn:{flexShrink:0,width:46,height:46,borderRadius:14,backgroundColor:"#EFF6FF",border:"1.5px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},spinner:{width:18,height:18,border:"2.5px solid #bfdbfe",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite"},suggBox:{position:"absolute",top:"100%",left:0,right:0,backgroundColor:"#fff",borderRadius:14,boxShadow:"0 6px 20px rgba(0,0,0,0.12)",zIndex:20,maxHeight:200,overflowY:"auto",marginTop:4},suggItem:{display:"flex",alignItems:"flex-start",padding:"10px 14px",borderBottom:"1px solid #F1F5F9",cursor:"pointer"},miniMapWrap:{margin:"8px 0 4px",borderRadius:14,overflow:"hidden",border:"1.5px solid #BFDBFE"},miniMap:{width:"100%",height:110},miniMapFooter:{display:"flex",alignItems:"center",gap:6,backgroundColor:"#EFF6FF",padding:"6px 12px"},clearLocBtn:{marginLeft:"auto",background:"none",border:"none",fontSize:11,color:"#EF4444",fontWeight:700,cursor:"pointer"},tripBtn:{flex:1,padding:"12px 0",borderRadius:14,border:"1.5px solid #E2E8F0",backgroundColor:"#F8FAFC",fontSize:14,fontWeight:600,color:"#64748B",cursor:"pointer"},tripActive:{backgroundColor:"#2563EB",borderColor:"#2563EB",color:"#fff"},submitBtn:{width:"100%",padding:"16px 0",border:"none",borderRadius:18,fontSize:16,fontWeight:800,color:"#fff",cursor:"pointer",marginTop:12,transition:"background-color 0.3s, opacity 0.2s"}};

/* Recommended drivers */
const rec={row2:{display:"flex",alignItems:"center",gap:8,margin:"12px 0 4px",padding:"9px 12px",backgroundColor:"#F8FAFC",borderRadius:12},spinSm:{width:13,height:13,border:"2px solid #BFDBFE",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0},wrap:{margin:"12px 0 4px",backgroundColor:"#F0F9FF",borderRadius:14,padding:"10px 10px 8px",border:"1.5px solid #BFDBFE"},heading:{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#1E40AF",textTransform:"uppercase",letterSpacing:"0.4px"},hint:{fontWeight:400,color:"#93C5FD",textTransform:"none",fontSize:11},row:{display:"flex",gap:8,overflowX:"auto",paddingBottom:2},chip:{display:"flex",alignItems:"center",gap:6,flexShrink:0,backgroundColor:"#fff",border:"1.5px solid #E2E8F0",borderRadius:50,padding:"5px 10px 5px 5px",cursor:"pointer",transition:"all 0.15s",outline:"none"},chipSel:{backgroundColor:"#2563EB",borderColor:"#2563EB"},chipBusy:{opacity:0.55},av:{width:26,height:26,borderRadius:"50%",fontSize:11,fontWeight:700,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"},note:{margin:"8px 0 0",fontSize:11,color:"#1D4ED8",backgroundColor:"#EFF6FF",borderRadius:8,padding:"5px 10px"}};