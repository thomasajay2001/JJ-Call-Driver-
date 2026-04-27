import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { PaginationBar, usePagination } from "../hooks/Usepagination";
import RideCompletionModal from "../../../driver-app/src/components/home/Ridecompletionmodel"; // adjust path if needed

const BASE_URL   = import.meta.env.VITE_BASE_URL;
const REFRESH_MS = 30000;
const REMINDER_WINDOW_MINS = 60;

const STATUS_CLASS = {
  completed:       "badge badge-green",
  assigned:        "badge badge-blue",
  accepted:        "badge badge-amber",
  inride:          "badge badge-orange",
  pending:         "badge badge-red",
  allbusy:         "badge badge-red",
  wait5:           "badge badge-amber",
  wait10:          "badge badge-amber",
  wait30:          "badge badge-amber",
  cancelled:       "badge badge-gray",
  preferred_query: "badge badge-amber",
  scheduled:       "badge badge-teal",
};
const STATUS_LABEL = {
  completed:       "✓ Completed",
  assigned:        "✓ Assigned",
  accepted:        "⏳ Accepted",
  inride:          "🚗 In Ride",
  pending:         "⏳ Pending",
  allbusy:         "🚫 All Busy",
  wait5:           "⏱ Wait 5 min",
  wait10:          "⏱ Wait 10 min",
  wait30:          "⏱ Wait 30 min",
  cancelled:       "🚫 Cancelled",
  preferred_query: "⏳ Awaiting Customer",
  scheduled:       "📅 Scheduled",
};
const getStatusClass = (s) => STATUS_CLASS[s?.toLowerCase()] || "badge badge-gray";
const getStatusLabel = (s) => STATUS_LABEL[s?.toLowerCase()] || s || "Pending";

const fmtScheduled = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }),
    time: d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true }),
    full: d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) + " · " +
          d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true }),
  };
};

const reminderUrgency = (iso) => {
  if (!iso) return "normal";
  const mins = (new Date(iso) - new Date()) / (1000 * 60);
  if (mins <= 15) return "urgent";
  if (mins <= 30) return "warning";
  return "normal";
};

const getScheduleInfo = (iso) => {
  if (!iso) return null;
  const now = new Date(), ride = new Date(iso);
  const mins = (ride - now) / (1000 * 60);
  const hrs = mins / 60, days = hrs / 24;
  if (mins < 0)   return { type:"overdue",  label:"Overdue",                    color:"#DC2626", bg:"#FEF2F2" };
  if (mins <= 60) return { type:"imminent", label:`In ${Math.round(mins)} min`, color:"#D97706", bg:"#FFFBEB" };
  if (hrs  <= 24) return { type:"today",    label:`In ${Math.round(hrs)} hrs`,  color:"#0F766E", bg:"#F0FDFA" };
  if (days <= 1)  return { type:"tomorrow", label:"Tomorrow",                   color:"#2563EB", bg:"#EFF6FF" };
  return                  { type:"future",  label:`In ${Math.floor(days)} days`,color:"#7C3AED", bg:"#F5F3FF" };
};

const ASSIGN_MODES = [
  { value:"assign",  label:"🚗 Assign a Driver",       desc:"Pick a driver from the list" },
  { value:"wait5",   label:"⏱ Ask to Wait — 5 mins",  desc:"Notify customer to wait ~5 min" },
  { value:"wait10",  label:"⏱ Ask to Wait — 10 mins", desc:"Notify customer to wait ~10 min" },
  { value:"wait30",  label:"⏱ Ask to Wait — 30 mins", desc:"Notify customer to wait ~30 min" },
  { value:"allbusy", label:"🚫 All Drivers Busy",      desc:"Mark booking — no driver available" },
];

/* ═══ UPCOMING PANEL ═══ */
const UpcomingPanel = ({ bookings, onAssign }) => {
  const [collapsed, setCollapsed] = useState(true);
  const future = bookings.filter((b) => {
    if (!b.is_scheduled || !b.scheduled_at) return false;
    const s = b.status?.toLowerCase();
    if (["cancelled","completed","inride","accepted","assigned"].includes(s)) return false;
    return (new Date(b.scheduled_at) - new Date()) / (1000 * 60) > REMINDER_WINDOW_MINS;
  }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (!future.length) return null;
  return (
    <div style={U.panel}>
      <button style={U.header} onClick={() => setCollapsed(v => !v)}>
        <div style={U.headerLeft}>
          <span style={{ fontSize:20 }}>📆</span>
          <div>
            <p style={U.title}>Upcoming Scheduled Rides</p>
            <p style={U.sub}>{future.length} ride{future.length !== 1 ? "s" : ""} scheduled more than {REMINDER_WINDOW_MINS} min from now</p>
          </div>
          <span style={U.countBadge}>{future.length}</span>
        </div>
        <span style={{ fontSize:16, color:"#7C3AED", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
      </button>
      {!collapsed && (
        <div style={U.grid}>
          {future.map((b) => {
            const info = getScheduleInfo(b.scheduled_at), fmt = fmtScheduled(b.scheduled_at);
            return (
              <div key={b.id} style={{ ...U.card, backgroundColor:info?.bg, borderColor:info?.color+"55" }}>
                <div style={U.cardTop}>
                  <span style={{ ...U.timeBadge, backgroundColor:info?.color+"18", color:info?.color }}>📅 {info?.label}</span>
                  <span style={U.bookingId}>#{b.id}</span>
                </div>
                <div style={U.customerRow}>
                  <div style={U.avatar}>{(b.name||"?")[0].toUpperCase()}</div>
                  <div style={{ flex:1 }}><p style={U.name}>{b.name}</p><p style={U.phone}>{b.mobile}</p></div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ ...U.rideTime, color:info?.color }}>{fmt?.time}</p>
                    <p style={U.rideDate}>{fmt?.date}</p>
                  </div>
                </div>
                <div style={U.routeBox}>
                  <div style={U.routeRow}><div style={{ ...U.dot, backgroundColor:"#10B981" }}/><span style={U.routeTxt}>{b.pickup}</span></div>
                  <div style={U.routeLine}/>
                  <div style={U.routeRow}><div style={{ ...U.dot, backgroundColor:"#EF4444" }}/><span style={U.routeTxt}>{b.drop||b.drop_location}</span></div>
                </div>
                <div style={U.cardFooter}>
                  <span style={U.tripTag}>{b.triptype==="outstation"?"🗺️ Outstation":"🏙️ Local"}</span>
                  {b.driver ? <span style={U.assignedTag}>✅ Driver Pre-assigned</span>
                             : <button style={U.preAssignBtn} onClick={() => onAssign(b)}>⚡ Pre-assign Driver</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══ REMINDER PANEL ═══ */
const ReminderPanel = ({ reminders, onAssign, onDismiss }) => {
  if (!reminders.length) return null;
  return (
    <div style={R.panel}>
      <div style={R.panelHeader}>
        <div style={R.panelHeaderLeft}>
          <div style={R.bellWrap}>
            <span style={{ fontSize:20 }}>🔔</span>
            <span style={R.bellBadge}>{reminders.length}</span>
          </div>
          <div>
            <p style={R.panelTitle}>Upcoming Scheduled Rides</p>
            <p style={R.panelSub}>These rides are due within {REMINDER_WINDOW_MINS} minutes — assign a driver now</p>
          </div>
        </div>
      </div>
      <div style={R.cardGrid}>
        {reminders.map((b) => {
          const urgency = reminderUrgency(b.scheduled_at);
          const minsLeft = Math.max(0, Math.round((new Date(b.scheduled_at) - new Date()) / (1000*60)));
          const fmt = fmtScheduled(b.scheduled_at);
          const colors = urgency==="urgent"
            ? { bg:"#FEF2F2", border:"#FECACA", badge:"#DC2626", badgeBg:"#FEE2E2", time:"#B91C1C" }
            : urgency==="warning"
              ? { bg:"#FFFBEB", border:"#FDE68A", badge:"#D97706", badgeBg:"#FEF3C7", time:"#B45309" }
              : { bg:"#F0FDFA", border:"#99F6E4", badge:"#0F766E", badgeBg:"#CCFBF1", time:"#0F766E" };
          return (
            <div key={b.id} style={{ ...R.card, backgroundColor:colors.bg, borderColor:colors.border }}>
              <div style={R.cardTop}>
                <span style={{ ...R.urgencyBadge, backgroundColor:colors.badgeBg, color:colors.badge }}>
                  {urgency==="urgent"?"🔴 URGENT":urgency==="warning"?"🟡 Soon":"🟢 Upcoming"}
                </span>
                <span style={{ ...R.minsLeft, color:colors.time }}>⏱ {minsLeft} min</span>
                <button style={R.dismissBtn} onClick={() => onDismiss(b.id)}>✕</button>
              </div>
              <div style={R.cardBody}>
                <div style={R.infoRow}>
                  <div style={R.avatar}>{(b.name||"?")[0].toUpperCase()}</div>
                  <div style={{ flex:1 }}><p style={R.customerName}>{b.name}</p><p style={R.customerPhone}>{b.mobile}</p></div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ ...R.rideTime, color:colors.time }}>{fmt?.time}</p>
                    <p style={R.rideDate}>{fmt?.date}</p>
                  </div>
                </div>
                <div style={R.routeBox}>
                  <div style={R.routeRow}><div style={{ ...R.routeDot, backgroundColor:"#10B981" }}/><span style={R.routeTxt}>{b.pickup}</span></div>
                  <div style={R.routeLine}/>
                  <div style={R.routeRow}><div style={{ ...R.routeDot, backgroundColor:"#EF4444" }}/><span style={R.routeTxt}>{b.drop||b.drop_location}</span></div>
                </div>
                <div style={R.cardFooter}>
                  <span style={R.tripTag}>{b.triptype==="outstation"?"🗺️ Outstation":"🏙️ Local"}</span>
                  {b.driver ? <span style={R.assignedTag}>✅ Driver Assigned</span>
                             : <button style={R.assignBtn} onClick={() => onAssign(b)}>🚗 Assign Now</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══ MAIN BOOKING COMPONENT ═══ */
export default function Booking() {
  const [bookings,       setBookings]       = useState([]);
  const [drivers,        setDrivers]        = useState([]);
  const [offlineDrivers, setOfflineDrivers] = useState([]);
  const [allDrivers,     setAllDrivers]     = useState([]);
  const [driverMode,     setDriverMode]     = useState("online");
  const [search,         setSearch]         = useState("");
  const [filterTab,      setFilterTab]      = useState("all");

  const [reminders,    setReminders]    = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const reminderCheckRef = useRef(null);

  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [assignMode,  setAssignMode]  = useState("assign");
  const [driver,      setDriver]      = useState("");
  const [saving,      setSaving]      = useState(false);

  const [showPrefWarn, setShowPrefWarn] = useState(false);

  // ── Offline driver completion modal ──
  const [showCompleteModal,  setShowCompleteModal]  = useState(false);
  const [completingBooking,  setCompletingBooking]  = useState(null);
  const [adminCompleting,    setAdminCompleting]    = useState(false);

  // ── Popups ──
  const [showCompletedPopup, setShowCompletedPopup] = useState(false);
  const [showPendingPopup,   setShowPendingPopup]   = useState(false);
  const [showAssignedPopup,  setShowAssignedPopup]  = useState(false);

  // ── Scroll animation states ──
  const [scrollToPending, setScrollToPending] = useState(false);
  const [scrollToCompleted, setScrollToCompleted] = useState(false);

  const [showAcceptedPopup,  setShowAcceptedPopup]  = useState(false);
  const [acceptedBooking,    setAcceptedBooking]    = useState(null);
  const [acceptedDriver,     setAcceptedDriver]     = useState("");
  const [acceptedSaving,     setAcceptedSaving]     = useState(false);
  const [acceptedDriverMode, setAcceptedDriverMode] = useState("online");

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(REFRESH_MS / 1000);
  const ivRef = useRef(null);
  const cdRef = useRef(REFRESH_MS / 1000);

  // ── CREATE BOOKING STATE ──
  const [showCreateForm,     setShowCreateForm]     = useState(false);
  const [newBooking,         setNewBooking]         = useState({
    customer_name:"", customer_mobile:"", pickup:"", pickup_lat:null, pickup_lng:null,
    drop_location:"", triptype:"local", is_scheduled:false, scheduled_at:null, vehicle:""
  });
  const [creating,           setCreating]           = useState(false);
  const [pickupSugg,         setPickupSugg]         = useState([]);
  const [dropSugg,           setDropSugg]           = useState([]);
  const [locLoading,         setLocLoading]         = useState(false);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [successBookingName, setSuccessBookingName] = useState("");

  const [showEditDetailsForm, setShowEditDetailsForm] = useState(false);
  const [editBookingData,     setEditBookingData]     = useState({
    customer_name:"", customer_mobile:"", pickup:"", drop_location:"", triptype:"local", scheduled_at:""
  });

  const computeReminders = (allBookings) => {
    const now = new Date();
    return allBookings.filter((b) => {
      if (!b.is_scheduled || !b.scheduled_at) return false;
      const s = b.status?.toLowerCase();
      if (["cancelled","completed","inride","accepted"].includes(s)) return false;
      const minsUntil = (new Date(b.scheduled_at) - now) / (1000 * 60);
      return minsUntil >= 0 && minsUntil <= REMINDER_WINDOW_MINS;
    });
  };

  const fetchAll = async () => {
    await Promise.all([fetchBookings(), fetchDrivers()]);
    setLastUpdated(new Date());
    cdRef.current = REFRESH_MS / 1000;
    setCountdown(REFRESH_MS / 1000);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    reminderCheckRef.current = setInterval(() => {
      setBookings((prev) => {
        const due = computeReminders(prev);
        setReminders(due.filter((b) => !dismissedIds.has(b.id)));
        return prev;
      });
    }, 60_000);
    return () => clearInterval(reminderCheckRef.current);
  }, [dismissedIds]);

  useEffect(() => {
    const due = computeReminders(bookings);
    setReminders(due.filter((b) => !dismissedIds.has(b.id)));
  }, [bookings, dismissedIds]);

  useEffect(() => {
    const SOCK = import.meta.env.VITE_SOCKET_URL || BASE_URL;
    if (!SOCK) return;
    let socket;
    import("socket.io-client").then(({ io }) => {
      socket = io(SOCK);
      socket.emit("joinAdminRoom");
      socket.on("customerAcceptedAlternate", ({ bookingId }) => {
        setBookings((prev) => {
          const b = prev.find((x) => String(x.id) === String(bookingId));
          if (b) { setAcceptedBooking(b); setAcceptedDriver(""); setAcceptedDriverMode("online"); setShowAcceptedPopup(true); }
          return prev;
        });
        fetchBookings();
      });
      socket.on("bookingCancelled", () => fetchBookings());
    });
    return () => { if (socket) socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current);
    if (!autoRefresh) return;
    ivRef.current = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(ivRef.current);
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return; }
    const t = setInterval(() => { cdRef.current = Math.max(0, cdRef.current - 1); setCountdown(cdRef.current); }, 1000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const all = Array.isArray(res.data) ? res.data : [];
      setAllDrivers(all);
      setDrivers(all.filter((d) => d.status?.toLowerCase() === "online" && d.payactive?.toLowerCase() === "active"));
      setOfflineDrivers(all.filter((d) => d.status?.toLowerCase() === "offline" && d.payactive?.toLowerCase() === "active"));
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const openEdit = (b) => {
    setEditId(b.id); setEditBooking(b);
    setAssignMode("assign"); setDriver(""); setDriverMode("online"); setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false); setEditId(null); setEditBooking(null);
    setDriver(""); setAssignMode("assign"); setDriverMode("online");
  };

  const openBookingEdit = (b) => {
    setEditId(b.id);
    setEditBooking(b);
    setEditBookingData({
      customer_name: b.name || "",
      customer_mobile: b.mobile || "",
      pickup: b.pickup || "",
      drop_location: b.drop || b.drop_location || "",
      triptype: b.triptype || "local",
      scheduled_at: b.is_scheduled && b.scheduled_at
        ? new Date(b.scheduled_at).toISOString().slice(0, 16)
        : "",
    });
    setShowEditDetailsForm(true);
  };

  const closeEditDetailsForm = () => {
    setShowEditDetailsForm(false);
    setEditId(null);
    setEditBooking(null);
    setEditBookingData({ customer_name:"", customer_mobile:"", pickup:"", drop_location:"", triptype:"local", scheduled_at:"" });
  };

  const submitEditBooking = async () => {
    if (!editBookingData.customer_name.trim()) { alert("Enter customer name."); return; }
    if (!editBookingData.customer_mobile.trim() || !/^[6-9]\d{9}$/.test(editBookingData.customer_mobile.trim())) { alert("Enter a valid 10-digit mobile number."); return; }
    if (!editBookingData.pickup.trim()) { alert("Enter pickup location."); return; }
    if (!editBookingData.drop_location.trim()) { alert("Enter drop location."); return; }
    if (!["local","outstation"].includes(editBookingData.triptype)) { alert("Select a trip type."); return; }
    if (editBooking?.is_scheduled && editBookingData.scheduled_at && isNaN(new Date(editBookingData.scheduled_at).getTime())) {
      alert("Enter a valid scheduled time."); return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_name: editBookingData.customer_name.trim(),
        customer_mobile: editBookingData.customer_mobile.trim(),
        pickup: editBookingData.pickup.trim(),
        drop_location: editBookingData.drop_location.trim(),
        triptype: editBookingData.triptype,
      };
      if (editBooking?.is_scheduled) {
        payload.scheduled_at = editBookingData.scheduled_at
          ? new Date(editBookingData.scheduled_at).toISOString()
          : null;
      }
      await axios.put(`${BASE_URL}/api/bookings/${editId}/edit`, payload);
      closeEditDetailsForm();
      fetchBookings();
    } catch (e) {
      alert("Failed to update booking: " + (e?.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Cancel booking #${booking.id}? This will release any assigned driver.`)) return;
    setSaving(true);
    try {
      await axios.post(`${BASE_URL}/api/bookings/${booking.id}/admin-cancel`, { reason: "Cancelled by admin" });
      fetchBookings();
    } catch (e) {
      alert("Failed to cancel booking: " + (e?.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const dismissReminder = (bookingId) => setDismissedIds((prev) => new Set([...prev, bookingId]));

  // ── Location search ──
  const searchLocation = async (field, query) => {
    if (!query || query.length < 2) { field==="pickup" ? setPickupSugg([]) : setDropSugg([]); return; }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, { headers:{"User-Agent":"JJApp/1.0"} });
      const data = await r.json();
      field==="pickup" ? setPickupSugg(data) : setDropSugg(data);
    } catch {}
  };
  const selectPickupSugg = (s) => { setNewBooking(p=>({...p, pickup:s.display_name, pickup_lat:parseFloat(s.lat), pickup_lng:parseFloat(s.lon)})); setPickupSugg([]); };
  const selectDropSugg   = (s) => { setNewBooking(p=>({...p, drop_location:s.display_name})); setDropSugg([]); };

  const getAdminCurrentLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    setLocLoading(true); setPickupSugg([]);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, { headers:{"User-Agent":"JJApp/1.0"} });
        const data = await r.json();
        setNewBooking(p=>({...p, pickup:data.display_name||`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, pickup_lat:latitude, pickup_lng:longitude}));
      } catch {
        setNewBooking(p=>({...p, pickup:`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, pickup_lat:latitude, pickup_lng:longitude}));
      }
      setLocLoading(false);
    }, () => setLocLoading(false), { timeout:10000, enableHighAccuracy:true });
  };

  // ── Create booking ──
  const submitCreateBooking = async () => {
    const { customer_name, customer_mobile, pickup } = newBooking;
    if (!customer_name.trim())                               { alert("Please enter customer name."); return; }
    if (!/^[6-9]\d{9}$/.test(customer_mobile))              { alert("Enter a valid 10-digit mobile number."); return; }
    if (!pickup.trim())                                      { alert("Please enter pickup location."); return; }
    if (!newBooking.drop_location.trim())                    { alert("Please enter drop location."); return; }
    if (!newBooking.triptype)                                { alert("Please select trip type."); return; }
    if (newBooking.is_scheduled && !newBooking.scheduled_at) { alert("Please select scheduled date & time."); return; }
    setCreating(true);
    try {
      await axios.post(`${BASE_URL}/api/trip-booking`, {
        name: newBooking.customer_name.trim(), phone: newBooking.customer_mobile.trim(),
        bookingphnno: newBooking.customer_mobile.trim(), pickup: newBooking.pickup.trim(),
        pickupLat: newBooking.pickup_lat ?? null, pickupLng: newBooking.pickup_lng ?? null,
        drop: newBooking.drop_location.trim(), triptype: newBooking.triptype,
        is_scheduled: newBooking.is_scheduled ? 1 : 0,
        scheduled_at: newBooking.is_scheduled && newBooking.scheduled_at ? newBooking.scheduled_at.toISOString() : null,
        vehicle: newBooking.vehicle.trim() || null,
        recommended_driver_id: null,
      });
      setShowCreateForm(false);
      setSuccessBookingName(newBooking.customer_name.trim());
      setShowBookingSuccess(true);
      setTimeout(() => setShowBookingSuccess(false), 3500);
      setNewBooking({
        customer_name:"", customer_mobile:"", pickup:"", pickup_lat:null, pickup_lng:null,
        drop_location:"", triptype:"local", is_scheduled:false, scheduled_at:null, vehicle:""
      });
      setPickupSugg([]); setDropSugg([]);
      fetchBookings();
    } catch (e) { alert("Failed to create booking: " + (e?.response?.data?.message || e.message)); }
    finally { setCreating(false); }
  };

  // ── Assign flow ──
  const submitForm = async () => {
    if (assignMode === "assign" && !driver) { alert("Please select a driver."); return; }
    if (
      assignMode === "assign" &&
      editBooking?.recommended_driver_id &&
      String(driver) !== String(editBooking.recommended_driver_id)
    ) {
      setShowPrefWarn(true); return;
    }
    await doSubmit();
  };

  const doSubmit = async (overrideId, overrideDriver) => {
    setSaving(true);
    const bid            = overrideId || editId;
    const assignedDriver = overrideDriver || driver;
    try {
      if (assignMode === "assign" || overrideDriver) {
        const isOffline = offlineDrivers.some((d) => String(d.id) === String(assignedDriver));
        const newStatus = isOffline ? "accepted" : "assigned";
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: assignedDriver, status: newStatus });
      } else if (assignMode === "allbusy") {
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: null, status: "allbusy" });
      } else {
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: null, status: assignMode });
      }
      closeForm(); fetchBookings();
    } catch (e) { alert("Failed: " + (e?.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const handleNotAvailable = async (booking) => {
    closeForm();
    try {
      await axios.post(`${BASE_URL}/api/bookings/${booking.id}/preferred-unavailable`);
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status:"preferred_query" } : b));
    } catch (e) { alert("Failed to notify customer: " + (e?.response?.data?.message || e.message)); }
  };

  const handlePrefWarnYes = async () => { setShowPrefWarn(false); await doSubmit(); };

  const handleAcceptedAssign = async () => {
    if (!acceptedDriver) { alert("Please select a driver."); return; }
    setAcceptedSaving(true);
    try {
      const isOffline = acceptedDriverMode === "offline";
      const newStatus = isOffline ? "accepted" : "assigned";
      await axios.put(`${BASE_URL}/api/bookings/${acceptedBooking.id}`, { driver: acceptedDriver, status: newStatus });
      setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver(""); setAcceptedDriverMode("online"); fetchBookings();
    } catch (e) { alert("Failed: " + (e?.response?.data?.message || e.message)); }
    finally { setAcceptedSaving(false); }
  };

  const handleComplete = (booking) => {
    setCompletingBooking(booking);
    setShowCompleteModal(true);
  };

  const handleCompleteConfirm = async ({ hours, minutes, totalAmount }) => {
    setAdminCompleting(true);
    try {
      await axios.post(`${BASE_URL}/api/completes-ride`, {
        bookingId:    completingBooking.id,
        driverId:     completingBooking.driver,
        amount:       totalAmount,
        ride_hours:   hours,
        ride_minutes: minutes,
      });
      setShowCompleteModal(false);
      setCompletingBooking(null);
      fetchBookings();
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.message || e.message));
    } finally {
      setAdminCompleting(false);
    }
  };

  const getDriverName = (id) => {
    if (!id) return null;
    const d = allDrivers.find((d) => String(d.id) === String(id));
    return d ? (d.name || d.NAME) : `Driver #${id}`;
  };

  const completedByDriver = bookings.reduce((acc, b) => {
    if (b.status?.toLowerCase() === "completed" && b.driver) {
      acc[String(b.driver)] = (acc[String(b.driver)] || 0) + 1;
    }
    return acc;
  }, {});

  const scheduledCount = bookings.filter((b) => b.is_scheduled).length;
  const immediateCount = bookings.filter((b) => !b.is_scheduled).length;

  const afterTab = bookings.filter((b) => {
    if (filterTab === "scheduled") return b.is_scheduled;
    if (filterTab === "immediate") return !b.is_scheduled;
    return true;
  });
  const filtered = afterTab.filter((b) =>
    (b.name||"").toLowerCase().includes(search.toLowerCase()) ||
    String(b.mobile||"").includes(search)
  );
  const pg = usePagination(filtered, 10);

  const totalB     = bookings.length;
  const assignedB  = bookings.filter((b) => b.status?.toLowerCase() === "assigned").length;
  const pendingB   = bookings.filter((b) => !b.driver).length;
  const completedB = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;

  // ── Scroll animation handlers ──
  const handlePendingClick = () => {
    setFilterTab("all"); // Reset to show all bookings
    setSearch(""); // Clear search
    pg.setPage(1); // Go to first page
    setScrollToPending(true);
    // Scroll to table after a short delay
    setTimeout(() => {
      const tableElement = document.querySelector('.table-card');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    setTimeout(() => setScrollToPending(false), 1000); // Reset animation after 1 second
  };

  const handleCompletedClick = () => {
    setFilterTab("all"); // Reset to show all bookings
    setSearch(""); // Clear search
    pg.setPage(1); // Go to first page
    setScrollToCompleted(true);
    // Scroll to table after a short delay
    setTimeout(() => {
      const tableElement = document.querySelector('.table-card');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    setTimeout(() => setScrollToCompleted(false), 1000); // Reset animation after 1 second
  };

  const STATS = [
    { icon:"📋", label:"Total Bookings", value:totalB,     cls:"stat-icon-box-blue"                               },
    { icon:"✓",  label:"Assigned",       value:assignedB,  cls:"stat-icon-box-green",  onClick:() => setShowAssignedPopup(true)  },
    { icon:"⏳", label:"Pending",         value:pendingB,   cls:"stat-icon-box-amber",  onClick:() => setShowPendingPopup(true)   },
    { icon:"🎉", label:"Completed",       value:completedB, cls:"stat-icon-box-purple", onClick:() => setShowCompletedPopup(true) },
  ];

  const selMode            = ASSIGN_MODES.find((m) => m.value === assignMode);
  const currentDriverList  = driverMode === "online" ? drivers : offlineDrivers;

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div>

      {/* ── Page header ── */}
      <div className="page-header page-header-mobile">
        <div className="page-header-left">
          <h1 className="page-title">Booking Management</h1>
          <p className="page-subtitle">Track and manage all customer bookings</p>
        </div>
        <div className="refresh-bar page-header-right-mobile">
          <button onClick={() => setShowCreateForm(true)} style={S.createBtn}>＋ New Booking</button>
          <button className="refresh-manual-btn" onClick={fetchAll}>↻ Refresh</button>
          <div className="live-badge live-badge-mobile"><span className="live-badge-dot" />Live</div>
        </div>
      </div>

      <ReminderPanel reminders={reminders} onAssign={openEdit} onDismiss={dismissReminder} />
      <UpcomingPanel bookings={bookings} onAssign={openEdit} />

      {/* ── Stats ── */}
      <div className="stats-grid">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="stat-card"
            onClick={s.onClick}
            style={s.onClick ? { cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s" } : {}}
            onMouseEnter={s.onClick ? (e) => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.12)"; } : undefined}
            onMouseLeave={s.onClick ? (e) => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; } : undefined}
          >
            <div className={`stat-icon-box ${s.cls}`}><span>{s.icon}</span></div>
            <div>
              <p className="stat-label">{s.label}</p>
              <h3 className="stat-value">{s.value}</h3>
              {s.onClick && s.value > 0 && (
                <p style={{ margin:"2px 0 0", fontSize:10, color:"#64748B", fontWeight:600 }}>Click to view →</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs + search ── */}
      <div style={S.filterRow} className="filter-row-mobile">
        <div style={S.tabs} className="filter-tabs-mobile">
          {[
            { key:"all",       label:"All Bookings", count:bookings.length },
            { key:"scheduled", label:"📅 Scheduled", count:scheduledCount  },
            { key:"immediate", label:"⚡ Immediate",  count:immediateCount  },
          ].map((tab) => (
            <button key={tab.key}
              style={{ ...S.tab, ...(filterTab===tab.key ? S.tabActive : {}) }}
              onClick={() => { setFilterTab(tab.key); pg.setPage(1); }}>
              {tab.label}
              <span style={{ ...S.tabCount, ...(filterTab===tab.key ? S.tabCountActive : {}) }}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="search-wrap search-bar-mobile" style={{ flex:1, maxWidth:320 }}>
          <span className="search-icon-pos">🔍</span>
          <input className="search-input" placeholder="Search by name or mobile..."
            value={search} onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }} />
        </div>
        <span className="search-result-count search-result-mobile">
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
                {["ID","Customer","Mobile","Date","Pickup","Drop","Assigned Driver","Status","Action"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr><td colSpan="9">
                  <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <p className="empty-state-title">No bookings found</p>
                  </div>
                </td></tr>
              ) : pg.slice.map((b) => {
                const s              = b.status?.toLowerCase();
                const isCancelled    = s === "cancelled";
                const isDone         = s === "completed";
                const isLocked       = s === "preferred_query";
                const isScheduled    = !!b.is_scheduled;
                const schedFmt       = fmtScheduled(b.scheduled_at);
                const isReminder     = reminders.some((r) => r.id === b.id);
                const schedInfo      = isScheduled && b.scheduled_at ? getScheduleInfo(b.scheduled_at) : null;
                const isFuture       = schedInfo?.type === "future";
                const isTomorrow     = schedInfo?.type === "tomorrow";
                const isToday        = schedInfo?.type === "today";
                const isOfflineAssigned = b.offline_assigned && (s === "accepted" || s === "inride") && b.driver;
                const isOnlineAssigned  = !b.offline_assigned && (s === "assigned" || s === "accepted" || s === "inride") && b.driver;

                return (
                  <tr key={b.id} className={`${
                    scrollToPending && !b.driver ? 'scroll-highlight-pending' : ''
                  } ${
                    scrollToCompleted && b.status?.toLowerCase() === 'completed' ? 'scroll-highlight-completed' : ''
                  }`} style={{
                    ...(isCancelled ? { opacity:0.6, backgroundColor:"#FFF8F8" } : {}),
                    ...(isLocked    ? { opacity:0.55, backgroundColor:"#FFFBEB" } : {}),
                    ...(isReminder  ? { backgroundColor:"#FFF7ED", outline:"2px solid #FED7AA" } : {}),
                    ...(isFuture    ? { backgroundColor:"#F5F3FF" } : {}),
                    ...(isTomorrow  ? { backgroundColor:"#EFF6FF" } : {}),
                    ...(isToday && !isReminder ? { backgroundColor:"#F0FDFA" } : {}),
                    ...(isScheduled && !isCancelled && !isDone && !isReminder && !isFuture && !isTomorrow && !isToday
                      ? { backgroundColor:"#F0FDFA" } : {}),
                  }}>
                    <td>
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        <span className="cell-id">{b.id}</span>
                        {b.driver_no && (
                          <span style={{ fontSize:10, fontWeight:700, color:"#2563EB", backgroundColor:"#EFF6FF", borderRadius:5, padding:"2px 6px", display:"inline-block", fontFamily:"var(--font-mono,monospace)", letterSpacing:"0.3px" }}>
                            {b.driver_no}
                          </span>
                        )}
                        {isScheduled && <span style={S.schedBadge}>📅 Sched</span>}
                        {isReminder  && <span style={S.reminderBadge}>🔔 Due Soon</span>}
                        {isScheduled && schedInfo && !isReminder && (
                          <span style={{ ...S.futureBadge, backgroundColor:schedInfo.color+"18", color:schedInfo.color }}>
                            {schedInfo.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="cell-name">
                        <div className="avatar">{(b.name||"?").charAt(0).toUpperCase()}</div>
                        <span className="cell-name-text">{b.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{b.mobile}</td>
                    <td style={{ fontSize:12, color:"#64748B" }}>
                      {b.is_scheduled && b.scheduled_at
                        ? new Date(b.scheduled_at).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" })
                        : b.created_at
                          ? new Date(b.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" })
                          : "—"}
                    </td>
                    <td><div className="cell-loc"><span>📍</span><span className="cell-loc-text">{b.pickup}</span></div></td>
                    <td><div className="cell-loc"><span>🎯</span><span className="cell-loc-text">{b.drop||b.drop_location}</span></div></td>
                    <td>
                      {b.driver
                        ? <span className="badge badge-green">✓ {getDriverName(b.driver)}</span>
                        : <span className="badge badge-red">Not Assigned</span>}
                    </td>
                    <td><span className={getStatusClass(b.status)}>{getStatusLabel(b.status)}</span></td>
                    <td>
                      {isDone ? (
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          <span className="badge badge-green">✅ Done</span>
                          <button className="action-edit" style={{ padding:"6px 10px" }} onClick={() => openBookingEdit(b)}>
                            ✏️ Edit
                          </button>
                        </div>
                      ) : isCancelled ? (
                        <span className="badge badge-gray" style={{ backgroundColor:"#FFF1F2", color:"#9F1239", border:"1px solid #FECDD3" }}>
                          🚫 Cancelled
                        </span>
                      ) : isLocked ? (
                        <div style={S.lockedCell}>
                          <div style={S.lockedDot} />
                          <div>
                            <div style={S.lockedTitle}>Waiting for customer…</div>
                            <div style={S.lockedSub}>Locked until customer responds</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {isOfflineAssigned ? (
                            <button
                              style={{ padding:"6px 10px", backgroundColor:"#10B981", border:"none", color:"#fff", fontWeight:700, borderRadius:7, fontSize:12, cursor:"pointer" }}
                              onClick={() => handleComplete(b)}>
                              ✅ Complete
                            </button>
                          ) : (
                            <button className="action-edit" onClick={() => openEdit(b)}>
                              ✏️ {b.driver ? "Reassign" : isFuture||isTomorrow ? "Pre-assign" : "Assign"}
                            </button>
                          )}
                          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            <button className="action-edit" style={{ padding:"6px 10px" }} onClick={() => openBookingEdit(b)}>
                              ✏️ Edit
                            </button>
                            <button className="action-edit" style={{ padding:"6px 10px", backgroundColor:"#FEE2E2", color:"#B91C1C" }} onClick={() => handleCancelBooking(b)}>
                              🚫 Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <PaginationBar pg={pg} onPageChange={pg.setPage}
            onSizeChange={(size) => { pg.setPageSize(size); pg.setPage(1); }} />
        )}
      </div>

      {/* ═══════════════════════════════════════════
          CREATE BOOKING MODAL
      ═══════════════════════════════════════════ */}
      {showCreateForm && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>🚖</span>
                <span className="modal-title">Create New Booking</span>
              </div>
              <button className="modal-close" onClick={() => { setShowCreateForm(false); setPickupSugg([]); setDropSugg([]); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-section-label">👤 Customer Details</div>
                <div className="form-section-divider" />
                <div className="form-field">
                  <label className="form-label">Customer Name <span className="form-required">*</span></label>
                  <input className="form-input" placeholder="Enter full name" value={newBooking.customer_name}
                    onChange={(e) => setNewBooking(p=>({...p, customer_name:e.target.value}))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Mobile Number <span className="form-required">*</span></label>
                  <input className="form-input" placeholder="10-digit mobile" maxLength={10} value={newBooking.customer_mobile}
                    onChange={(e) => setNewBooking(p=>({...p, customer_mobile:e.target.value.replace(/\D/g,"")}))} />
                </div>
                <div className="form-section-label" style={{ marginTop:8 }}>📍 Ride Details</div>
                <div className="form-section-divider" />
                <div className="form-field form-full">
                  <label className="form-label">Pickup Location <span className="form-required">*</span></label>
                  <div style={{ position:"relative" }}>
                    <div style={{ display:"flex", gap:8 }}>
                      <input className="form-input" style={{ flex:1 }} placeholder="Search pickup area..." value={newBooking.pickup}
                        onChange={(e) => { setNewBooking(p=>({...p, pickup:e.target.value, pickup_lat:null, pickup_lng:null})); searchLocation("pickup", e.target.value); }} />
                      <button type="button" onClick={getAdminCurrentLocation} disabled={locLoading}
                        style={{ flexShrink:0, width:46, height:46, borderRadius:14, backgroundColor:"#EFF6FF", border:"1.5px solid #BFDBFE", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                        {locLoading
                          ? <div style={{ width:18, height:18, border:"2.5px solid #bfdbfe", borderTopColor:"#2563EB", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3" fill="#2563EB" fillOpacity="0.2"/><circle cx="12" cy="12" r="7"/>
                              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                            </svg>
                        }
                      </button>
                    </div>
                    {pickupSugg.length > 0 && (
                      <div style={S.suggBox}>
                        {pickupSugg.map((s,i) => (
                          <div key={i} style={S.suggItem} onClick={() => selectPickupSugg(s)}>
                            <span style={{ marginRight:8, fontSize:14 }}>📍</span>
                            <span style={{ fontSize:12, color:"#1E293B", lineHeight:1.4 }}>{s.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {newBooking.pickup_lat && (
                    <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6, backgroundColor:"#EFF6FF", border:"1.5px solid #BFDBFE", borderRadius:10, padding:"6px 12px" }}>
                      <span style={{ fontSize:12, color:"#2563EB", fontWeight:600 }}>📌 Pickup location set</span>
                      <button onClick={() => setNewBooking(p=>({...p, pickup:"", pickup_lat:null, pickup_lng:null}))}
                        style={{ marginLeft:"auto", background:"none", border:"none", fontSize:11, color:"#EF4444", fontWeight:700, cursor:"pointer" }}>✕ Clear</button>
                    </div>
                  )}
                </div>
                <div className="form-field form-full">
                  <label className="form-label">Drop Location <span className="form-required">*</span></label>
                  <div style={{ position:"relative" }}>
                    <input className="form-input" placeholder="Search drop area..." value={newBooking.drop_location}
                      onChange={(e) => { setNewBooking(p=>({...p, drop_location:e.target.value})); searchLocation("drop", e.target.value); }} />
                    {dropSugg.length > 0 && (
                      <div style={S.suggBox}>
                        {dropSugg.map((s,i) => (
                          <div key={i} style={S.suggItem} onClick={() => selectDropSugg(s)}>
                            <span style={{ marginRight:8, fontSize:14 }}>🏁</span>
                            <span style={{ fontSize:12, color:"#1E293B", lineHeight:1.4 }}>{s.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Trip Type</label>
                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    {["local","outstation"].map((t) => (
                      <button key={t} type="button"
                        style={{ flex:1, padding:"10px 0", borderRadius:12, border:"1.5px solid", fontSize:13, fontWeight:600, cursor:"pointer",
                          backgroundColor:newBooking.triptype===t?"#2563EB":"#F8FAFC",
                          borderColor:newBooking.triptype===t?"#2563EB":"#E2E8F0",
                          color:newBooking.triptype===t?"#fff":"#64748B" }}
                        onClick={() => setNewBooking(p=>({...p, triptype:t}))}>
                        {t==="local"?"🏙️ Local":"🗺️ Outstation"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Vehicle Type</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Sedan, SUV, Auto..."
                    value={newBooking.vehicle}
                    onChange={(e) => setNewBooking(p=>({...p, vehicle:e.target.value}))}
                  />
                </div>
                <div className="form-field" style={{ display:"flex", alignItems:"center", paddingTop:22 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, fontWeight:600, color:"#374151" }}>
                    <input type="checkbox" checked={newBooking.is_scheduled}
                      onChange={(e) => setNewBooking(p=>({...p, is_scheduled:e.target.checked, scheduled_at:null}))}
                      style={{ width:16, height:16, cursor:"pointer" }} />
                    📅 Schedule for later
                  </label>
                </div>
                {newBooking.is_scheduled && (
                  <div className="form-field form-full">
                    <label className="form-label">Scheduled Date & Time <span className="form-required">*</span></label>
                    <input type="datetime-local" className="form-input" min={new Date().toISOString().slice(0,16)}
                      onChange={(e) => setNewBooking(p=>({...p, scheduled_at:e.target.value?new Date(e.target.value):null}))} />
                    {newBooking.scheduled_at && (
                      <div style={{ marginTop:6, backgroundColor:"#F0FDFA", border:"1.5px solid #99F6E4", borderRadius:10, padding:"6px 12px" }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"#0F766E" }}>📅 {fmtScheduled(newBooking.scheduled_at)?.full}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowCreateForm(false); setPickupSugg([]); setDropSugg([]); }}>Cancel</button>
              <button className="btn btn-primary" onClick={submitCreateBooking} disabled={creating} style={{ background:creating?"#94A3B8":undefined }}>
                {creating ? "⏳ Creating…" : "🚖 Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditDetailsForm && editBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>✏️</span>
                <span className="modal-title">Edit Booking #{editId}</span>
              </div>
              <button className="modal-close" onClick={closeEditDetailsForm}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-section-label">Booking Details</div>
                <div className="form-section-divider" />
                <div className="form-field">
                  <label className="form-label">Customer Name</label>
                  <input className="form-input" value={editBookingData.customer_name}
                    onChange={(e) => setEditBookingData((p) => ({ ...p, customer_name: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Customer Mobile</label>
                  <input className="form-input" value={editBookingData.customer_mobile}
                    onChange={(e) => setEditBookingData((p) => ({ ...p, customer_mobile: e.target.value.replace(/\D/g,"") }))} maxLength={10} />
                </div>
                <div className="form-field">
                  <label className="form-label">Pickup Location</label>
                  <input className="form-input" value={editBookingData.pickup}
                    onChange={(e) => setEditBookingData((p) => ({ ...p, pickup: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Drop Location</label>
                  <input className="form-input" value={editBookingData.drop_location}
                    onChange={(e) => setEditBookingData((p) => ({ ...p, drop_location: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Trip Type</label>
                  <select className="form-select" value={editBookingData.triptype}
                    onChange={(e) => setEditBookingData((p) => ({ ...p, triptype: e.target.value }))}>
                    <option value="local">Local</option>
                    <option value="outstation">Outstation</option>
                  </select>
                </div>
                {editBooking.is_scheduled && (
                  <div className="form-field form-full">
                    <label className="form-label">Scheduled Date & Time</label>
                    <input type="datetime-local" className="form-input"
                      value={editBookingData.scheduled_at}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setEditBookingData((p) => ({ ...p, scheduled_at: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeEditDetailsForm}>Cancel</button>
              <button className="btn btn-primary" onClick={submitEditBooking} disabled={saving}>
                {saving ? "⏳ Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ASSIGN MODAL
      ═══════════════════════════════════════════ */}
      {showForm && editBooking && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>🚗</span>
                <span className="modal-title">
                  {editBooking.is_scheduled && editBooking.scheduled_at && getScheduleInfo(editBooking.scheduled_at)?.type !== "imminent"
                    ? `Pre-assign — Booking #${editId}` : `Assign — Booking #${editId}`}
                </span>
              </div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-section-label">📋 Booking Details</div>
                <div className="form-section-divider" />

                {editBooking.is_scheduled && editBooking.scheduled_at && (
                  <div className="form-field form-full">
                    <div style={{ ...S.modalSchedBanner, backgroundColor:getScheduleInfo(editBooking.scheduled_at)?.bg||"#F0FDFA", borderColor:(getScheduleInfo(editBooking.scheduled_at)?.color||"#0F766E")+"66" }}>
                      <span style={{ fontSize:22 }}>📅</span>
                      <div style={{ flex:1 }}>
                        <p style={S.modalSchedLabel}>{getScheduleInfo(editBooking.scheduled_at)?.type==="future"?"Future Scheduled Ride":"Scheduled Ride"}</p>
                        <p style={S.modalSchedTime}>{fmtScheduled(editBooking.scheduled_at)?.full}</p>
                      </div>
                      <span style={{ ...S.modalSchedPill, backgroundColor:(getScheduleInfo(editBooking.scheduled_at)?.color||"#0F766E")+"18", color:getScheduleInfo(editBooking.scheduled_at)?.color||"#0F766E" }}>
                        ⏰ {getScheduleInfo(editBooking.scheduled_at)?.label}
                      </span>
                    </div>
                    {["future","tomorrow"].includes(getScheduleInfo(editBooking.scheduled_at)?.type) && (
                      <div style={S.futureNotice}>
                        <span style={{ fontSize:16 }}>💡</span>
                        <p style={S.futureNoticeText}>This ride is scheduled for the future. Pre-assigning now reserves a driver in advance.</p>
                      </div>
                    )}
                  </div>
                )}

                {[["Customer",editBooking.name],["Mobile",editBooking.mobile],["Pickup",editBooking.pickup],["Drop",editBooking.drop||editBooking.drop_location]].map(([lbl,val]) => (
                  <div key={lbl} className="form-field">
                    <label className="form-label">{lbl}</label>
                    <input value={val||"—"} readOnly className="form-input form-input-readonly" />
                  </div>
                ))}

                {editBooking.recommended_driver_id && (
                  <div className="form-field form-full">
                    <div style={S.prefBanner}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:20 }}>⭐</span>
                        <div>
                          <p style={S.prefLabel}>Customer's Preferred Driver</p>
                          <p style={S.prefName}>{getDriverName(editBooking.recommended_driver_id)}</p>
                        </div>
                      </div>
                      <button style={S.notAvailBtn} onClick={() => handleNotAvailable(editBooking)}>🚫 Not Available</button>
                    </div>
                  </div>
                )}

                <div className="form-section-label" style={{ marginTop:8 }}>🧑‍✈️ Choose Action</div>
                <div className="form-section-divider" />

                <div className="form-field form-full">
                  <label className="form-label">What would you like to do?</label>
                  <select className="form-select" value={assignMode} onChange={(e) => { setAssignMode(e.target.value); setDriver(""); }}>
                    {ASSIGN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {selMode && <p style={{ margin:"6px 0 0", fontSize:12, color:"#64748B", fontStyle:"italic" }}>{selMode.desc}</p>}
                </div>

                {assignMode === "assign" && (
                  <div className="form-field form-full">
                    <label className="form-label">Select Driver <span className="form-required">*</span></label>

                    <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                      {[
                        { mode:"online",  label:"🟢 Online",  count:drivers.length,        color:"#2563EB" },
                        { mode:"offline", label:"⚫ Offline", count:offlineDrivers.length, color:"#64748B" },
                      ].map(({ mode, label, count, color }) => (
                        <button key={mode} type="button"
                          style={{ flex:1, padding:"8px 0", borderRadius:10, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer",
                            backgroundColor:driverMode===mode ? color : "#F8FAFC",
                            borderColor:    driverMode===mode ? color : "#E2E8F0",
                            color:          driverMode===mode ? "#fff" : "#64748B" }}
                          onClick={() => { setDriverMode(mode); setDriver(""); }}>
                          {label}
                          <span style={{ marginLeft:6, backgroundColor:driverMode===mode?"rgba(255,255,255,0.25)":"#E2E8F0", color:driverMode===mode?"#fff":"#64748B", borderRadius:20, fontSize:10, fontWeight:800, padding:"1px 7px" }}>
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {currentDriverList.length === 0 ? (
                      <div style={{ padding:14, background:driverMode==="online"?"#fff7ed":"#F8FAFC", border:`1.5px solid ${driverMode==="online"?"#fed7aa":"#E2E8F0"}`, borderRadius:10, fontSize:13, color:driverMode==="online"?"#92400e":"#64748B" }}>
                        {driverMode==="online" ? "⚠️ No drivers online right now." : "ℹ️ No offline active drivers."}
                      </div>
                    ) : (
                      <>
                        <select className="form-select" value={driver} onChange={(e) => setDriver(e.target.value)}>
                          <option value="">— Choose a {driverMode} driver —</option>
                          {currentDriverList.map((d) => {
                            const isPref = String(d.id) === String(editBooking.recommended_driver_id);
                            const trips  = completedByDriver[String(d.id)] || 0;
                            return (
                              <option key={d.id} value={d.id}>
                                {isPref?"⭐ ":""}{d.name||d.NAME} — {d.car_type||"N/A"} (ID:{d.driver_no}) · {trips} trip{trips!==1?"s completed":""}
                              </option>
                        
                            );
                          })}
                        </select>

                        {driver && (() => {
                          const sel   = currentDriverList.find((d) => String(d.id) === String(driver));
                          const trips = completedByDriver[String(driver)] || 0;
                          if (!sel) return null;
                          const isOff = driverMode === "offline";
                          return (
                            <div style={{ ...S.driverCard, ...(isOff ? { backgroundColor:"#F8FAFC", borderColor:"#E2E8F0" } : {}) }}>
                              <div style={{ ...S.driverAvatar, backgroundColor:isOff?"#64748B":"#16A34A" }}>
                                {(sel.name||sel.NAME||"?")[0].toUpperCase()}
                              </div>
                              <div style={{ flex:1 }}>
                                <p style={S.driverCardName}>{sel.name||sel.NAME}</p>
                                <p style={S.driverCardSub}>{sel.car_type||"N/A"} · ID: {sel.id}
                                  <span style={{ marginLeft:8, fontSize:10, fontWeight:700, color:isOff?"#64748B":"#16A34A" }}>
                                    ● {isOff?"Offline":"Online"}
                                  </span>
                                </p>
                              </div>
                              <div style={{ ...S.tripBadge, ...(isOff?{backgroundColor:"#F1F5F9",borderColor:"#E2E8F0"}:{}) }}>
                                <span style={{ ...S.tripBadgeNum, color:isOff?"#475569":"#15803D" }}>{trips}</span>
                                <span style={{ ...S.tripBadgeLbl, color:isOff?"#64748B":"#16A34A" }}>trips done</span>
                              </div>
                            </div>
                          );
                        })()}

                        {driverMode === "offline" && (
                          <div style={{ marginTop:8, display:"flex", alignItems:"flex-start", gap:8, backgroundColor:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:10, padding:"8px 12px" }}>
                            <span style={{ fontSize:14 }}>⚠️</span>
                            <p style={{ margin:0, fontSize:11, color:"#92400E", lineHeight:1.5 }}>
                              Assigning an <strong>offline driver</strong> will immediately show their details to the customer and mark the ride as <strong>Accepted</strong>. Complete the trip manually from the bookings table.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {assignMode !== "assign" && (
                  <div className="form-field form-full">
                    <div style={{ padding:"12px 14px", backgroundColor:assignMode==="allbusy"?"#FFF1F2":"#FFFBEB", border:`1.5px solid ${assignMode==="allbusy"?"#FECDD3":"#FDE68A"}`, borderRadius:10, fontSize:13, color:assignMode==="allbusy"?"#9F1239":"#92400E", lineHeight:1.6 }}>
                      {assignMode==="allbusy" ? "🚫 All drivers busy — customer will be notified."
                        : `⏱ Customer will be asked to wait ${assignMode==="wait5"?"5":assignMode==="wait10"?"10":"30"} minutes.`}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={submitForm} disabled={saving||(assignMode==="assign"&&!driver)}>
                {saving ? "⏳ Saving..." : assignMode==="assign"
                  ? (editBooking.is_scheduled && ["future","tomorrow"].includes(getScheduleInfo(editBooking.scheduled_at)?.type)
                      ? "⚡ Pre-assign Driver" : "✅ Assign Driver")
                  : "✅ Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PREFERRED WARNING
      ═══════════════════════════════════════════ */}
      {showPrefWarn && editBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:22 }}>⚠️</span>
                <span className="modal-title">Different Driver Selected</span>
              </div>
              <button className="modal-close" onClick={() => setShowPrefWarn(false)} title="Close">✕</button>
            </div>
            <div className="modal-body" style={{ textAlign:"center", padding:"16px 0 8px" }}>
              <div style={{ fontSize:50, marginBottom:12 }}>🚕</div>
              <p style={{ fontSize:15, fontWeight:700, color:"#1E293B", margin:"0 0 12px" }}>
                Customer has a preferred driver
              </p>
              <div style={{ backgroundColor:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:12, padding:"10px 14px", textAlign:"left", margin:"0 0 12px" }}>
                <p style={{ margin:0, fontSize:13, color:"#92400E", fontWeight:600 }}>
                  ⭐ Preferred: <strong>{getDriverName(editBooking.recommended_driver_id)}</strong>
                </p>
                <p style={{ margin:"5px 0 0", fontSize:13, color:"#92400E", fontWeight:600 }}>
                  🚗 You selected: <strong>{getDriverName(driver)}</strong>
                </p>
              </div>
              <p style={{ fontSize:14, color:"#475569", margin:0 }}>
                Assign a different driver anyway?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handlePrefWarnYes} disabled={saving}>
                {saving ? "⏳ Saving…" : "✅ Assign Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CUSTOMER ACCEPTED POPUP
      ═══════════════════════════════════════════ */}
      {showAcceptedPopup && acceptedBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:22 }}>✅</span>
                <span className="modal-title">Customer Accepted — Assign a Driver</span>
              </div>
              <button className="modal-close" onClick={() => { setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver(""); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={S.acceptedBanner}>
                <span style={{ fontSize:28 }}>🎉</span>
                <div>
                  <p style={S.acceptedBannerTitle}>Customer agreed to an alternate driver!</p>
                  <p style={S.acceptedBannerSub}>Please assign an available driver now.</p>
                </div>
              </div>
              <div style={S.bookingCard}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={S.cardMeta}>Booking #{acceptedBooking.id}</span>
                  <span style={S.cardMeta}>{acceptedBooking.name}</span>
                </div>
                <div style={S.routeRow}><span>📍</span><span style={S.routeTxt}>{acceptedBooking.pickup}</span></div>
                <div style={{ width:2, height:8, backgroundColor:"#CBD5E1", marginLeft:6 }} />
                <div style={S.routeRow}><span>🎯</span><span style={S.routeTxt}>{acceptedBooking.drop||acceptedBooking.drop_location}</span></div>
                {acceptedBooking.recommended_driver_id && (
                  <div style={S.prefNote}>⭐ Preferred (unavailable): {getDriverName(acceptedBooking.recommended_driver_id)}</div>
                )}
              </div>
              <div className="form-field" style={{ marginBottom:0 }}>
                <label className="form-label">Select Alternate Driver <span className="form-required">*</span></label>
                <div style={{ display:"flex", gap:6, margin:"8px 0 10px" }}>
                  {[
                    { mode:"online",  label:"🟢 Online",  count:drivers.length,        color:"#2563EB" },
                    { mode:"offline", label:"⚫ Offline", count:offlineDrivers.length, color:"#64748B" },
                  ].map(({ mode, label, count, color }) => (
                    <button key={mode} type="button"
                      style={{ flex:1, padding:"8px 0", borderRadius:10, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer",
                        backgroundColor:acceptedDriverMode===mode ? color : "#F8FAFC",
                        borderColor:    acceptedDriverMode===mode ? color : "#E2E8F0",
                        color:          acceptedDriverMode===mode ? "#fff" : "#64748B" }}
                      onClick={() => { setAcceptedDriverMode(mode); setAcceptedDriver(""); }}>
                      {label}
                      <span style={{ marginLeft:6, backgroundColor:acceptedDriverMode===mode?"rgba(255,255,255,0.25)":"#E2E8F0", color:acceptedDriverMode===mode?"#fff":"#64748B", borderRadius:20, fontSize:10, fontWeight:800, padding:"1px 7px" }}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
                {(() => {
                  const list = acceptedDriverMode === "online" ? drivers : offlineDrivers;
                  if (list.length === 0) return (
                    <div style={{ padding:14, background:acceptedDriverMode==="online"?"#fff7ed":"#F8FAFC", border:`1.5px solid ${acceptedDriverMode==="online"?"#fed7aa":"#E2E8F0"}`, borderRadius:10, fontSize:13, color:acceptedDriverMode==="online"?"#92400e":"#64748B" }}>
                      {acceptedDriverMode==="online" ? "⚠️ No drivers online right now." : "ℹ️ No offline active drivers."}
                    </div>
                  );
                  return (
                    <>
                      <select className="form-select" value={acceptedDriver} onChange={(e) => setAcceptedDriver(e.target.value)}>
                        <option value="">— Choose a {acceptedDriverMode} driver —</option>
                        {list.map((d) => {
                          const trips = completedByDriver[String(d.id)] || 0;
                          return <option key={d.id} value={d.id}>{d.name||d.NAME} — {d.car_type||"N/A"} (ID:{d.id}) · ✅ {trips} trip{trips!==1?"s":""}</option>;
                        })}
                      </select>
                      {acceptedDriver && (() => {
                        const sel   = list.find((d) => String(d.id) === String(acceptedDriver));
                        const trips = completedByDriver[String(acceptedDriver)] || 0;
                        if (!sel) return null;
                        const isOff = acceptedDriverMode === "offline";
                        return (
                          <>
                            <div style={{ ...S.driverCard, ...(isOff?{backgroundColor:"#F8FAFC",borderColor:"#E2E8F0"}:{}) }}>
                              <div style={{ ...S.driverAvatar, backgroundColor:isOff?"#64748B":"#16A34A" }}>
                                {(sel.name||sel.NAME||"?")[0].toUpperCase()}
                              </div>
                              <div style={{ flex:1 }}>
                                <p style={S.driverCardName}>{sel.name||sel.NAME}</p>
                                <p style={S.driverCardSub}>{sel.car_type||"N/A"} · ID: {sel.id}
                                  <span style={{ marginLeft:8, fontSize:10, fontWeight:700, color:isOff?"#64748B":"#16A34A" }}>
                                    ● {isOff?"Offline":"Online"}
                                  </span>
                                </p>
                              </div>
                              <div style={{ ...S.tripBadge, ...(isOff?{backgroundColor:"#F1F5F9",borderColor:"#E2E8F0"}:{}) }}>
                                <span style={{ ...S.tripBadgeNum, color:isOff?"#475569":"#15803D" }}>{trips}</span>
                                <span style={{ ...S.tripBadgeLbl, color:isOff?"#64748B":"#16A34A" }}>trips done</span>
                              </div>
                            </div>
                            {isOff && (
                              <div style={{ marginTop:8, display:"flex", alignItems:"flex-start", gap:8, backgroundColor:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:10, padding:"8px 12px" }}>
                                <span style={{ fontSize:14 }}>⚠️</span>
                                <p style={{ margin:0, fontSize:11, color:"#92400E", lineHeight:1.5 }}>
                                  Assigning an <strong>offline driver</strong> will immediately show their details to the customer and mark the ride as <strong>Accepted</strong>.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer" style={{ gap:10 }}>
              <button className="btn btn-ghost" onClick={() => { setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver(""); }}>Later</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={handleAcceptedAssign} disabled={acceptedSaving||!acceptedDriver}>
                {acceptedSaving ? "⏳ Assigning…" : "🚗 Assign Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          BOOKING SUCCESS TOAST
      ═══════════════════════════════════════════ */}
      {showBookingSuccess && (
        <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", zIndex:99999, animation:"slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, backgroundColor:"#fff", borderRadius:20, padding:"16px 24px", minWidth:320, boxShadow:"0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(37,99,235,0.12)", border:"1.5px solid #BBF7D0" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", backgroundColor:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>✅</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#15803D" }}>Booking Created!</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#64748B" }}>
                Ride booked for <strong>{successBookingName}</strong> — pending driver assignment
              </p>
            </div>
            <button onClick={() => setShowBookingSuccess(false)}
              style={{ background:"none", border:"none", fontSize:16, color:"#94A3B8", cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PENDING BOOKINGS POPUP
      ═══════════════════════════════════════════ */}
      {showPendingPopup && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-lg" style={{ maxWidth:760 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>⏳</span>
                <div>
                  <span className="modal-title">Pending Bookings</span>
                  <span className="badge badge-amber" style={{ marginLeft:10 }}>{pendingB} Total</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowPendingPopup(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding:"0 0 4px" }}>
              {pendingB === 0 ? (
                <div className="empty-state" style={{ padding:"48px 0" }}>
                  <span className="empty-state-icon">📭</span>
                  <p className="empty-state-title">No pending bookings</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {["ID","Customer","Mobile","Pickup","Drop","Status","Action"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.filter((b) => !b.driver).map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                              <span className="cell-id">{b.id}</span>
                              {b.is_scheduled && <span style={S.schedBadge}>📅 Sched</span>}
                            </div>
                          </td>
                          <td>
                            <div className="cell-name">
                              <div className="avatar">{(b.name||"?").charAt(0).toUpperCase()}</div>
                              <span className="cell-name-text">{b.name}</span>
                            </div>
                          </td>
                          <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{b.mobile}</td>
                          <td style={{ fontSize:12, color:"#64748B" }}>{b.pickup}</td>
                          <td style={{ fontSize:12, color:"#64748B" }}>{b.drop || b.drop_location}</td>
                          <td>
                            <span className={getStatusClass(b.status)} style={{ fontSize:11, padding:"4px 8px" }}>{getStatusLabel(b.status)}</span>
                          </td>
                          <td>
                            <button className="action-edit" onClick={() => { setShowPendingPopup(false); openEdit(b); }}>
                              ✏️ Assign
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPendingPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ASSIGNED BOOKINGS POPUP
      ═══════════════════════════════════════════ */}
      {showAssignedPopup && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-lg" style={{ maxWidth:760 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>✓</span>
                <div>
                  <span className="modal-title">Assigned Bookings</span>
                  <span className="badge badge-green" style={{ marginLeft:10 }}>{assignedB} Total</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowAssignedPopup(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding:"0 0 4px" }}>
              {assignedB === 0 ? (
                <div className="empty-state" style={{ padding:"48px 0" }}>
                  <span className="empty-state-icon">📭</span>
                  <p className="empty-state-title">No assigned bookings</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {["ID","Customer","Mobile","Pickup","Drop","Driver","Status"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.filter((b) => b.status?.toLowerCase() === "assigned").map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                              <span className="cell-id">{b.id}</span>
                              {b.driver_no && (
                                <span style={{ fontSize:10, fontWeight:700, color:"#2563EB", backgroundColor:"#EFF6FF", borderRadius:5, padding:"2px 6px", display:"inline-block", fontFamily:"var(--font-mono,monospace)", letterSpacing:"0.3px" }}>
                                  {b.driver_no}
                                </span>
                              )}
                              {b.is_scheduled && <span style={S.schedBadge}>📅 Sched</span>}
                            </div>
                          </td>
                          <td>
                            <div className="cell-name">
                              <div className="avatar">{(b.name||"?").charAt(0).toUpperCase()}</div>
                              <span className="cell-name-text">{b.name}</span>
                            </div>
                          </td>
                          <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{b.mobile}</td>
                          <td style={{ fontSize:12, color:"#64748B" }}>{b.pickup}</td>
                          <td style={{ fontSize:12, color:"#64748B" }}>{b.drop || b.drop_location}</td>
                          <td style={{ fontSize:12 }}>{b.driver ? getDriverName(b.driver) : '—'}</td>
                          <td>
                            <span className={getStatusClass(b.status)} style={{ fontSize:11, padding:"4px 8px" }}>{getStatusLabel(b.status)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAssignedPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          COMPLETED RIDES POPUP
      ═══════════════════════════════════════════ */}
      {showCompletedPopup && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-lg" style={{ maxWidth:760 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>🎉</span>
                <div>
                  <span className="modal-title">Completed Rides</span>
                  <span className="badge badge-green" style={{ marginLeft:10 }}>{completedB} Total</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCompletedPopup(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding:"0 0 4px" }}>
              {completedB === 0 ? (
                <div className="empty-state" style={{ padding:"48px 0" }}>
                  <span className="empty-state-icon">📭</span>
                  <p className="empty-state-title">No completed rides yet</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {["ID","Customer","Mobile","Pickup","Drop","Driver","Amount","Completed"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings
                        .filter((b) => b.status?.toLowerCase() === "completed")
                        .map((b) => (
                          <tr key={b.id}>
                            <td>
                              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                <span className="cell-id">{b.id}</span>
                                {b.driver_no && (
                                  <span style={{ fontSize:10, fontWeight:700, color:"#2563EB", backgroundColor:"#EFF6FF", borderRadius:5, padding:"2px 6px", display:"inline-block", fontFamily:"var(--font-mono,monospace)", letterSpacing:"0.3px" }}>
                                    {b.driver_no}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="cell-name">
                                <div className="avatar">{(b.name||"?").charAt(0).toUpperCase()}</div>
                                <span className="cell-name-text">{b.name}</span>
                              </div>
                            </td>
                            <td style={{ fontFamily:"var(--font-mono)", fontSize:13 }}>{b.mobile}</td>
                            <td style={{ fontSize:12, color:"#64748B" }}>{b.pickup}</td>
                            <td style={{ fontSize:12, color:"#64748B" }}>{b.drop || b.drop_location}</td>
                            <td style={{ fontSize:12 }}>{b.driver ? getDriverName(b.driver) : '—'}</td>
                            <td style={{ fontSize:12, fontWeight:600, color:"#059669" }}>{b.amount != null ? `₹${b.amount}` : '—'}</td>
                            <td>
                              <span className="badge badge-green" style={{ fontSize:11, padding:"4px 8px" }}>✓ Completed</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCompletedPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          RIDE COMPLETION MODAL (admin completing offline driver ride)
      ═══════════════════════════════════════════ */}
      <RideCompletionModal
        visible={showCompleteModal}
        ride={completingBooking}
        onConfirm={handleCompleteConfirm}
        onClose={() => {
          if (!adminCompleting) {
            setShowCompleteModal(false);
            setCompletingBooking(null);
          }
        }}
      />

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 15%{transform:rotate(12deg)} 30%{transform:rotate(-10deg)}
          45%{transform:rotate(8deg)} 60%{transform:rotate(-6deg)} 75%{transform:rotate(4deg)} 90%{transform:rotate(-2deg)}
        }
        .badge-teal { background:#CCFBF1; color:#0F766E; border:1px solid #99F6E4; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STYLES
═══════════════════════════════════════════ */
const U = {
  panel:       { backgroundColor:"#F5F3FF", border:"2px solid #DDD6FE", borderRadius:16, padding:"14px 16px", marginBottom:20 },
  header:      { width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" },
  headerLeft:  { display:"flex", alignItems:"center", gap:12 },
  title:       { margin:"0 0 2px", fontSize:14, fontWeight:800, color:"#5B21B6" },
  sub:         { margin:0, fontSize:12, color:"#7C3AED" },
  countBadge:  { backgroundColor:"#7C3AED", color:"#fff", borderRadius:20, fontSize:11, fontWeight:800, padding:"2px 9px" },
  grid:        { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12, marginTop:14 },
  card:        { borderRadius:14, border:"1.5px solid", padding:"12px 14px" },
  cardTop:     { display:"flex", alignItems:"center", gap:8, marginBottom:10 },
  timeBadge:   { fontSize:11, fontWeight:800, borderRadius:20, padding:"3px 9px" },
  bookingId:   { marginLeft:"auto", fontSize:11, color:"#94A3B8", fontWeight:700 },
  customerRow: { display:"flex", alignItems:"center", gap:10, marginBottom:8 },
  avatar:      { width:36, height:36, borderRadius:"50%", backgroundColor:"#7C3AED", color:"#fff", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  name:        { margin:0, fontSize:13, fontWeight:700, color:"#1E293B" },
  phone:       { margin:"1px 0 0", fontSize:11, color:"#64748B" },
  rideTime:    { margin:0, fontSize:14, fontWeight:800 },
  rideDate:    { margin:"1px 0 0", fontSize:11, color:"#94A3B8" },
  routeBox:    { backgroundColor:"rgba(255,255,255,0.5)", borderRadius:10, padding:"8px 10px", marginBottom:8 },
  routeRow:    { display:"flex", alignItems:"flex-start", gap:7 },
  dot:         { width:7, height:7, borderRadius:"50%", flexShrink:0, marginTop:3 },
  routeLine:   { width:2, height:8, backgroundColor:"#CBD5E1", marginLeft:2 },
  routeTxt:    { fontSize:11, color:"#475569", lineHeight:1.4 },
  cardFooter:  { display:"flex", alignItems:"center", justifyContent:"space-between" },
  tripTag:     { fontSize:11, fontWeight:600, color:"#64748B" },
  assignedTag: { fontSize:11, fontWeight:700, color:"#16A34A", backgroundColor:"#DCFCE7", borderRadius:20, padding:"4px 10px" },
  preAssignBtn:{ padding:"7px 14px", backgroundColor:"#7C3AED", color:"#fff", border:"none", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer" },
};

const R = {
  panel:         { backgroundColor:"#FFF7ED", border:"2px solid #FED7AA", borderRadius:16, padding:"14px 16px", marginBottom:20 },
  panelHeader:   { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 },
  panelHeaderLeft:{ display:"flex", alignItems:"center", gap:12 },
  bellWrap:      { position:"relative", width:40, height:40, backgroundColor:"#FEF3C7", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", animation:"bellShake 2s ease infinite", flexShrink:0 },
  bellBadge:     { position:"absolute", top:-4, right:-4, width:18, height:18, backgroundColor:"#DC2626", color:"#fff", borderRadius:"50%", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" },
  panelTitle:    { margin:"0 0 2px", fontSize:14, fontWeight:800, color:"#92400E" },
  panelSub:      { margin:0, fontSize:12, color:"#B45309" },
  cardGrid:      { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 },
  card:          { borderRadius:14, border:"1.5px solid", padding:"12px 14px" },
  cardTop:       { display:"flex", alignItems:"center", gap:6, marginBottom:10 },
  urgencyBadge:  { fontSize:10, fontWeight:800, borderRadius:20, padding:"3px 8px" },
  minsLeft:      { marginLeft:"auto", fontSize:12, fontWeight:700 },
  dismissBtn:    { width:22, height:22, borderRadius:"50%", border:"none", backgroundColor:"rgba(0,0,0,0.06)", color:"#64748B", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardBody:      { display:"flex", flexDirection:"column", gap:8 },
  infoRow:       { display:"flex", alignItems:"center", gap:10 },
  avatar:        { width:36, height:36, borderRadius:"50%", backgroundColor:"#2563EB", color:"#fff", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  customerName:  { margin:0, fontSize:13, fontWeight:700, color:"#1E293B" },
  customerPhone: { margin:"1px 0 0", fontSize:11, color:"#64748B" },
  rideTime:      { margin:0, fontSize:14, fontWeight:800 },
  rideDate:      { margin:"1px 0 0", fontSize:11, color:"#94A3B8" },
  routeBox:      { backgroundColor:"rgba(255,255,255,0.6)", borderRadius:10, padding:"8px 10px" },
  routeRow:      { display:"flex", alignItems:"flex-start", gap:7 },
  routeDot:      { width:7, height:7, borderRadius:"50%", flexShrink:0, marginTop:3 },
  routeLine:     { width:2, height:8, backgroundColor:"#CBD5E1", marginLeft:2 },
  routeTxt:      { fontSize:11, color:"#475569", lineHeight:1.4 },
  cardFooter:    { display:"flex", alignItems:"center", justifyContent:"space-between" },
  tripTag:       { fontSize:11, fontWeight:600, color:"#64748B" },
  assignedTag:   { fontSize:11, fontWeight:700, color:"#16A34A", backgroundColor:"#DCFCE7", borderRadius:20, padding:"4px 10px" },
  assignBtn:     { padding:"7px 14px", backgroundColor:"#2563EB", color:"#fff", border:"none", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer" },
};

const S = {
  createBtn:          { padding:"9px 18px", backgroundColor:"#2563EB", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:"0 2px 8px rgba(37,99,235,0.3)", whiteSpace:"nowrap" },
  suggBox:            { position:"absolute", top:"100%", left:0, right:0, backgroundColor:"#fff", borderRadius:14, boxShadow:"0 6px 20px rgba(0,0,0,0.12)", zIndex:9999, maxHeight:200, overflowY:"auto", marginTop:4, border:"1.5px solid #E2E8F0" },
  suggItem:           { display:"flex", alignItems:"flex-start", padding:"10px 14px", borderBottom:"1px solid #F1F5F9", cursor:"pointer" },
  filterRow:          { display:"flex", alignItems:"center", gap:12, margin:"0 0 16px", flexWrap:"wrap" },
  tabs:               { display:"flex", gap:3, backgroundColor:"#F1F5F9", borderRadius:10, padding:4 },
  tab:                { padding:"6px 14px", borderRadius:8, border:"none", backgroundColor:"transparent", fontSize:13, fontWeight:600, color:"#64748B", cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
  tabActive:          { backgroundColor:"#fff", color:"#1E293B", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  tabCount:           { fontSize:11, fontWeight:700, backgroundColor:"#E2E8F0", color:"#64748B", borderRadius:20, padding:"1px 7px" },
  tabCountActive:     { backgroundColor:"#2563EB", color:"#fff" },
  schedCell:          { display:"flex", flexDirection:"column", gap:2 },
  schedDate:          { fontSize:12, fontWeight:700, color:"#0F766E" },
  schedTime:          { fontSize:12, fontWeight:600, color:"#0D9488" },
  schedStatus:        { fontSize:10, fontWeight:700, borderRadius:6, padding:"2px 6px", display:"inline-block", marginTop:1 },
  schedCountdown:     { fontSize:10, fontWeight:700 },
  schedNow:           { fontSize:11, color:"#94A3B8", fontWeight:500 },
  schedBadge:         { fontSize:10, fontWeight:700, backgroundColor:"#CCFBF1", color:"#0F766E", borderRadius:5, padding:"2px 5px", display:"inline-block" },
  reminderBadge:      { fontSize:10, fontWeight:700, backgroundColor:"#FEF3C7", color:"#D97706", borderRadius:5, padding:"2px 5px", display:"inline-block", animation:"pulse 1.5s ease infinite" },
  futureBadge:        { fontSize:10, fontWeight:700, borderRadius:5, padding:"2px 5px", display:"inline-block" },
  modalSchedBanner:   { display:"flex", alignItems:"center", gap:12, borderRadius:12, border:"1.5px solid", padding:"12px 14px", marginBottom:4 },
  modalSchedLabel:    { margin:0, fontSize:11, fontWeight:700, color:"#0D9488", textTransform:"uppercase", letterSpacing:"0.4px" },
  modalSchedTime:     { margin:"3px 0 0", fontSize:14, fontWeight:800, color:"#0F766E" },
  modalSchedPill:     { fontSize:11, fontWeight:700, borderRadius:8, padding:"4px 10px", whiteSpace:"nowrap" },
  futureNotice:       { display:"flex", alignItems:"flex-start", gap:8, backgroundColor:"#EFF6FF", border:"1.5px solid #BFDBFE", borderRadius:10, padding:"10px 12px", marginTop:8 },
  futureNoticeText:   { margin:0, fontSize:12, color:"#1E40AF", lineHeight:1.5 },
  lockedCell:         { display:"flex", alignItems:"center", gap:8 },
  lockedDot:          { width:8, height:8, borderRadius:"50%", backgroundColor:"#F59E0B", flexShrink:0, animation:"pulse 1.2s ease infinite" },
  lockedTitle:        { fontSize:12, fontWeight:700, color:"#92400E" },
  lockedSub:          { fontSize:11, color:"#B45309", marginTop:2 },
  prefBanner:         { display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, backgroundColor:"#F0F9FF", border:"1.5px solid #BFDBFE", borderRadius:10, padding:"10px 14px" },
  prefLabel:          { margin:0, fontSize:11, fontWeight:700, color:"#1E40AF" },
  prefName:           { margin:"2px 0 0", fontSize:13, color:"#1E293B", fontWeight:600 },
  notAvailBtn:        { padding:"6px 12px", backgroundColor:"#FEE2E2", color:"#9F1239", border:"1.5px solid #FECDD3", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 },
  acceptedBanner:     { display:"flex", alignItems:"center", gap:12, backgroundColor:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:14, padding:"14px 16px", marginBottom:16 },
  acceptedBannerTitle:{ margin:0, fontSize:14, fontWeight:800, color:"#15803D" },
  acceptedBannerSub:  { margin:"3px 0 0", fontSize:12, color:"#166534" },
  bookingCard:        { backgroundColor:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:12, padding:"12px 14px", marginBottom:16 },
  cardMeta:           { fontSize:11, color:"#94A3B8", fontWeight:700, textTransform:"uppercase" },
  routeRow:           { display:"flex", alignItems:"flex-start", gap:6 },
  routeTxt:           { fontSize:12, color:"#475569", lineHeight:1.4 },
  prefNote:           { marginTop:10, padding:"6px 10px", backgroundColor:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, fontSize:12, color:"#92400E", fontWeight:600 },
  driverCard:         { display:"flex", alignItems:"center", gap:10, marginTop:10, backgroundColor:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:12, padding:"10px 12px" },
  driverAvatar:       { width:36, height:36, borderRadius:"50%", backgroundColor:"#16A34A", color:"#fff", fontSize:15, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  driverCardName:     { margin:0, fontSize:13, fontWeight:700, color:"#1E293B" },
  driverCardSub:      { margin:"2px 0 0", fontSize:11, color:"#64748B" },
  tripBadge:          { display:"flex", flexDirection:"column", alignItems:"center", backgroundColor:"#DCFCE7", border:"1.5px solid #BBF7D0", borderRadius:10, padding:"6px 10px", flexShrink:0, minWidth:56 },
  tripBadgeNum:       { fontSize:18, fontWeight:900, color:"#15803D", lineHeight:1 },
  tripBadgeLbl:       { fontSize:9, fontWeight:700, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.3px", marginTop:2 },
};
