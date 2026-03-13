import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { PaginationBar, usePagination } from "../hooks/Usepagination";

const BASE_URL   = import.meta.env.VITE_BASE_URL;
const REFRESH_MS = 30000;

/* ── How many minutes before the ride to trigger reminder ── */
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
    full: d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) +
          " · " +
          d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true }),
  };
};

/* ── compute urgency colour for reminder cards ── */
const reminderUrgency = (iso) => {
  if (!iso) return "normal";
  const mins = (new Date(iso) - new Date()) / (1000 * 60);
  if (mins <= 15) return "urgent";
  if (mins <= 30) return "warning";
  return "normal";
};

/* ── NEW: compute how far away a future scheduled booking is ── */
const getScheduleInfo = (iso) => {
  if (!iso) return null;
  const now  = new Date();
  const ride = new Date(iso);
  const mins = (ride - now) / (1000 * 60);
  const hrs  = mins / 60;
  const days = hrs  / 24;

  if (mins < 0)      return { type:"overdue",  label:"Overdue",            color:"#DC2626", bg:"#FEF2F2" };
  if (mins <= 60)    return { type:"imminent",  label:`In ${Math.round(mins)} min`,  color:"#D97706", bg:"#FFFBEB" };
  if (hrs  <= 24)    return { type:"today",     label:`In ${Math.round(hrs)} hrs`,   color:"#0F766E", bg:"#F0FDFA" };
  if (days <= 1)     return { type:"tomorrow",  label:"Tomorrow",           color:"#2563EB", bg:"#EFF6FF" };
  return               { type:"future",    label:`In ${Math.floor(days)} days`, color:"#7C3AED", bg:"#F5F3FF" };
};

const ASSIGN_MODES = [
  { value: "assign",  label: "🚗 Assign a Driver",       desc: "Pick a driver from the list" },
  { value: "wait5",   label: "⏱ Ask to Wait — 5 mins",  desc: "Notify customer to wait ~5 min" },
  { value: "wait10",  label: "⏱ Ask to Wait — 10 mins", desc: "Notify customer to wait ~10 min" },
  { value: "wait30",  label: "⏱ Ask to Wait — 30 mins", desc: "Notify customer to wait ~30 min" },
  { value: "allbusy", label: "🚫 All Drivers Busy",      desc: "Mark booking — no driver available" },
];

/* ═══════════════════════════════════════════════════════
   UPCOMING FUTURE BOOKINGS PANEL
   Shows scheduled rides that are > 60 min away
   ═══════════════════════════════════════════════════════ */
const UpcomingPanel = ({ bookings, onAssign }) => {
  const [collapsed, setCollapsed] = useState(true);

  const future = bookings.filter((b) => {
    if (!b.is_scheduled || !b.scheduled_at) return false;
    const s = b.status?.toLowerCase();
    if (["cancelled","completed","inride","accepted","assigned"].includes(s)) return false;
    const mins = (new Date(b.scheduled_at) - new Date()) / (1000 * 60);
    return mins > REMINDER_WINDOW_MINS; // beyond reminder window = future
  }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  if (!future.length) return null;

  return (
    <div style={U.panel}>
      <button style={U.header} onClick={() => setCollapsed((v) => !v)}>
        <div style={U.headerLeft}>
          <span style={{ fontSize: 20 }}>📆</span>
          <div>
            <p style={U.title}>Upcoming Scheduled Rides</p>
            <p style={U.sub}>
              {future.length} ride{future.length !== 1 ? "s" : ""} scheduled more than {REMINDER_WINDOW_MINS} min from now
            </p>
          </div>
          <span style={U.countBadge}>{future.length}</span>
        </div>
        <span style={{ fontSize: 16, color: "#7C3AED", transition: "transform 0.2s", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
      </button>

      {!collapsed && (
        <div style={U.grid}>
          {future.map((b) => {
            const info = getScheduleInfo(b.scheduled_at);
            const fmt  = fmtScheduled(b.scheduled_at);
            return (
              <div key={b.id} style={{ ...U.card, backgroundColor: info?.bg, borderColor: info?.color + "55" }}>
                {/* Time badge */}
                <div style={U.cardTop}>
                  <span style={{ ...U.timeBadge, backgroundColor: info?.color + "18", color: info?.color }}>
                    📅 {info?.label}
                  </span>
                  <span style={U.bookingId}>#{b.id}</span>
                </div>

                {/* Customer */}
                <div style={U.customerRow}>
                  <div style={U.avatar}>{(b.name || "?")[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={U.name}>{b.name}</p>
                    <p style={U.phone}>{b.mobile}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ ...U.rideTime, color: info?.color }}>{fmt?.time}</p>
                    <p style={U.rideDate}>{fmt?.date}</p>
                  </div>
                </div>

                {/* Route */}
                <div style={U.routeBox}>
                  <div style={U.routeRow}><div style={{ ...U.dot, backgroundColor: "#10B981" }} /><span style={U.routeTxt}>{b.pickup}</span></div>
                  <div style={U.routeLine} />
                  <div style={U.routeRow}><div style={{ ...U.dot, backgroundColor: "#EF4444" }} /><span style={U.routeTxt}>{b.drop || b.drop_location}</span></div>
                </div>

                {/* Footer */}
                <div style={U.cardFooter}>
                  <span style={U.tripTag}>{b.triptype === "outstation" ? "🗺️ Outstation" : "🏙️ Local"}</span>
                  {b.driver ? (
                    <span style={U.assignedTag}>✅ Driver Pre-assigned</span>
                  ) : (
                    <button style={U.preAssignBtn} onClick={() => onAssign(b)}>
                      ⚡ Pre-assign Driver
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   REMINDER PANEL  (rides due within 60 min)
   ═══════════════════════════════════════════════════════ */
const ReminderPanel = ({ reminders, onAssign, onDismiss }) => {
  if (!reminders.length) return null;

  return (
    <div style={R.panel}>
      <div style={R.panelHeader}>
        <div style={R.panelHeaderLeft}>
          <div style={R.bellWrap}>
            <span style={{ fontSize: 20 }}>🔔</span>
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
          const urgency  = reminderUrgency(b.scheduled_at);
          const minsLeft = Math.max(0, Math.round((new Date(b.scheduled_at) - new Date()) / (1000 * 60)));
          const fmt      = fmtScheduled(b.scheduled_at);
          const colors   = urgency === "urgent"
            ? { bg:"#FEF2F2", border:"#FECACA", badge:"#DC2626", badgeBg:"#FEE2E2", time:"#B91C1C" }
            : urgency === "warning"
              ? { bg:"#FFFBEB", border:"#FDE68A", badge:"#D97706", badgeBg:"#FEF3C7", time:"#B45309" }
              : { bg:"#F0FDFA", border:"#99F6E4", badge:"#0F766E", badgeBg:"#CCFBF1", time:"#0F766E" };

          return (
            <div key={b.id} style={{ ...R.card, backgroundColor: colors.bg, borderColor: colors.border }}>
              <div style={R.cardTop}>
                <span style={{ ...R.urgencyBadge, backgroundColor: colors.badgeBg, color: colors.badge }}>
                  {urgency === "urgent" ? "🔴 URGENT" : urgency === "warning" ? "🟡 Soon" : "🟢 Upcoming"}
                </span>
                <span style={{ ...R.minsLeft, color: colors.time }}>⏱ {minsLeft} min</span>
                <button style={R.dismissBtn} onClick={() => onDismiss(b.id)} title="Dismiss reminder">✕</button>
              </div>

              <div style={R.cardBody}>
                <div style={R.infoRow}>
                  <div style={R.avatar}>{(b.name || "?")[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={R.customerName}>{b.name}</p>
                    <p style={R.customerPhone}>{b.mobile}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ ...R.rideTime, color: colors.time }}>{fmt?.time}</p>
                    <p style={R.rideDate}>{fmt?.date}</p>
                  </div>
                </div>

                <div style={R.routeBox}>
                  <div style={R.routeRow}>
                    <div style={{ ...R.routeDot, backgroundColor:"#10B981" }} />
                    <span style={R.routeTxt}>{b.pickup}</span>
                  </div>
                  <div style={R.routeLine} />
                  <div style={R.routeRow}>
                    <div style={{ ...R.routeDot, backgroundColor:"#EF4444" }} />
                    <span style={R.routeTxt}>{b.drop || b.drop_location}</span>
                  </div>
                </div>

                <div style={R.cardFooter}>
                  <span style={R.tripTag}>{b.triptype === "outstation" ? "🗺️ Outstation" : "🏙️ Local"}</span>
                  {b.driver ? (
                    <span style={R.assignedTag}>✅ Driver Assigned</span>
                  ) : (
                    <button style={R.assignBtn} onClick={() => onAssign(b)}>🚗 Assign Now</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN BOOKING COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function Booking() {
  const [bookings,    setBookings]    = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [allDrivers,  setAllDrivers]  = useState([]);
  const [search,      setSearch]      = useState("");
  const [filterTab,   setFilterTab]   = useState("all");

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

  const [showAcceptedPopup, setShowAcceptedPopup] = useState(false);
  const [acceptedBooking,   setAcceptedBooking]   = useState(null);
  const [acceptedDriver,    setAcceptedDriver]    = useState("");
  const [acceptedSaving,    setAcceptedSaving]    = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(REFRESH_MS / 1000);
  const ivRef  = useRef(null);
  const cdRef  = useRef(REFRESH_MS / 1000);

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
          if (b) { setAcceptedBooking(b); setAcceptedDriver(""); setShowAcceptedPopup(true); }
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
    } catch {}
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const openEdit = (b) => {
    setEditId(b.id); setEditBooking(b);
    setAssignMode("assign"); setDriver(""); setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false); setEditId(null);
    setEditBooking(null); setDriver(""); setAssignMode("assign");
  };

  const dismissReminder = (bookingId) => {
    setDismissedIds((prev) => new Set([...prev, bookingId]));
  };

  const submitForm = async () => {
    if (assignMode === "assign" && !driver) { alert("Please select a driver."); return; }
    if (
      assignMode === "assign" &&
      editBooking?.recommended_driver_id &&
      String(driver) !== String(editBooking.recommended_driver_id)
    ) { setShowPrefWarn(true); return; }
    await doSubmit();
  };

  const doSubmit = async (overrideId, overrideDriver) => {
    setSaving(true);
    const bid = overrideId || editId;
    try {
      if (assignMode === "assign" || overrideDriver) {
        await axios.put(`${BASE_URL}/api/bookings/${bid}`, { driver: overrideDriver || driver, status: "assigned" });
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
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "preferred_query" } : b));
    } catch (e) { alert("Failed to notify customer: " + (e?.response?.data?.message || e.message)); }
  };

  const handlePrefWarnYes = async () => { setShowPrefWarn(false); await doSubmit(); };
  const handlePrefWarnNo  = async () => {
    setShowPrefWarn(false); setSaving(true);
    try {
      await axios.put(`${BASE_URL}/api/bookings/${editId}`, { driver: null, status: "cancelled" });
      closeForm(); fetchBookings();
    } catch (e) { alert("Failed: " + (e?.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const handleAcceptedAssign = async () => {
    if (!acceptedDriver) { alert("Please select a driver."); return; }
    setAcceptedSaving(true);
    try {
      await axios.put(`${BASE_URL}/api/bookings/${acceptedBooking.id}`, { driver: acceptedDriver, status: "assigned" });
      setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver(""); fetchBookings();
    } catch (e) { alert("Failed: " + (e?.response?.data?.message || e.message)); }
    finally { setAcceptedSaving(false); }
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
    (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(b.mobile || "").includes(search)
  );
  const pg = usePagination(filtered, 10);

  const totalB     = bookings.length;
  const assignedB  = bookings.filter((b) => b.status?.toLowerCase() === "assigned").length;
  const pendingB   = bookings.filter((b) => !b.driver).length;
  const completedB = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;

  const R2 = 10, circ = 2 * Math.PI * R2;
  const dash = circ * (autoRefresh ? countdown / (REFRESH_MS / 1000) : 0);
  const STATS = [
    { icon:"📋", label:"Total Bookings", value:totalB,     cls:"stat-icon-box-blue"   },
    { icon:"✓",  label:"Assigned",       value:assignedB,  cls:"stat-icon-box-green"  },
    { icon:"⏳", label:"Pending",         value:pendingB,   cls:"stat-icon-box-amber"  },
    { icon:"🎉", label:"Completed",       value:completedB, cls:"stat-icon-box-purple" },
  ];
  const selMode = ASSIGN_MODES.find((m) => m.value === assignMode);

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Booking Management</h1>
          <p className="page-subtitle">Track and manage all customer bookings</p>
        </div>
        <div className="refresh-bar">
          {lastUpdated && (
            <div className="refresh-timestamp">
              <span className="refresh-live-dot" />
              {lastUpdated.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
            </div>
          )}
          {autoRefresh && (
            <div className="refresh-ring-wrap">
              <svg width="28" height="28" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="14" cy="14" r={R2} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="14" cy="14" r={R2} fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  style={{ transition:"stroke-dasharray 1s linear" }} />
              </svg>
              <span className="refresh-ring-label">{countdown}s</span>
            </div>
          )}
          <button className={autoRefresh ? "refresh-toggle-on" : "refresh-toggle-off"}
            onClick={() => { setAutoRefresh((v) => !v); cdRef.current = REFRESH_MS/1000; setCountdown(REFRESH_MS/1000); }}>
            {autoRefresh ? "🔄 Auto ON" : "⏸ Auto OFF"}
          </button>
          <button className="refresh-manual-btn" onClick={fetchAll}>↻ Refresh</button>
          <div className="live-badge"><span className="live-badge-dot" />Live</div>
        </div>
      </div>

      {/* ── Urgent Reminder Panel (≤60 min) ── */}
      <ReminderPanel
        reminders={reminders}
        onAssign={openEdit}
        onDismiss={dismissReminder}
      />

      {/* ── NEW: Future Upcoming Panel (>60 min) ── */}
      <UpcomingPanel bookings={bookings} onAssign={openEdit} />

      {/* Stats */}
      <div className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon-box ${s.cls}`}><span>{s.icon}</span></div>
            <div><p className="stat-label">{s.label}</p><h3 className="stat-value">{s.value}</h3></div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search row */}
      <div style={S.filterRow}>
        <div style={S.tabs}>
          {[
            { key:"all",       label:"All Bookings",  count: bookings.length },
            { key:"scheduled", label:"📅 Scheduled",  count: scheduledCount  },
            { key:"immediate", label:"⚡ Immediate",  count: immediateCount  },
          ].map((tab) => (
            <button key={tab.key}
              style={{ ...S.tab, ...(filterTab === tab.key ? S.tabActive : {}) }}
              onClick={() => { setFilterTab(tab.key); pg.setPage(1); }}>
              {tab.label}
              <span style={{ ...S.tabCount, ...(filterTab === tab.key ? S.tabCountActive : {}) }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="search-wrap" style={{ flex:1, maxWidth:320 }}>
          <span className="search-icon-pos">🔍</span>
          <input className="search-input" placeholder="Search by name or mobile..."
            value={search} onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }} />
        </div>
        <span className="search-result-count">
          Showing <strong>{pg.startDisplay}–{pg.endDisplay}</strong> of <strong>{pg.total}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-card-header">
          <h3 className="table-card-title">All Bookings</h3>
          <span className="table-record-badge">{filtered.length} Records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["ID","Customer","Mobile","Pickup","Drop","Schedule","Preferred Driver","Assigned Driver","Trip","Status","Action"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr><td colSpan="11">
                  <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <p className="empty-state-title">No bookings found</p>
                  </div>
                </td></tr>
              ) : pg.slice.map((b) => {
                const s           = b.status?.toLowerCase();
                const isCancelled = s === "cancelled";
                const isDone      = s === "completed";
                const isLocked    = s === "preferred_query";
                const isScheduled = !!b.is_scheduled;
                const schedFmt    = fmtScheduled(b.scheduled_at);
                const isReminder  = reminders.some((r) => r.id === b.id);
                /* NEW: future booking info for table rows */
                const schedInfo   = isScheduled && b.scheduled_at ? getScheduleInfo(b.scheduled_at) : null;
                const isFuture    = schedInfo && schedInfo.type === "future";
                const isTomorrow  = schedInfo && schedInfo.type === "tomorrow";
                const isToday     = schedInfo && schedInfo.type === "today";

                return (
                  <tr key={b.id} style={{
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
                        {isScheduled && <span style={S.schedBadge}>📅 Sched</span>}
                        {isReminder  && <span style={S.reminderBadge}>🔔 Due Soon</span>}
                        {/* NEW: future time-away badge */}
                        {isScheduled && schedInfo && !isReminder && (
                          <span style={{ ...S.futureBadge, backgroundColor: schedInfo.color + "18", color: schedInfo.color }}>
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
                    <td><div className="cell-loc"><span>📍</span><span className="cell-loc-text">{b.pickup}</span></div></td>
                    <td><div className="cell-loc"><span>🎯</span><span className="cell-loc-text">{b.drop||b.drop_location}</span></div></td>

                    <td>
                      {isScheduled && schedFmt ? (
                        <div style={S.schedCell}>
                          <span style={S.schedDate}>{schedFmt.date}</span>
                          <span style={S.schedTime}>{schedFmt.time}</span>
                          {/* NEW: countdown label */}
                          {schedInfo && (
                            <span style={{ ...S.schedCountdown, color: schedInfo.color }}>
                              {schedInfo.label}
                            </span>
                          )}
                          {b.scheduled_status && (
                            <span style={{
                              ...S.schedStatus,
                              ...(b.scheduled_status === "dispatched"
                                ? { backgroundColor:"#DCFCE7", color:"#166534" }
                                : { backgroundColor:"#FEF9C3", color:"#854D0E" }),
                            }}>
                              {b.scheduled_status === "dispatched" ? "✓ Dispatched" : "⏳ Pending"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={S.schedNow}>⚡ Now</span>
                      )}
                    </td>

                    <td>
                      {b.recommended_driver_id
                        ? <span className="badge badge-purple" style={{ display:"inline-flex", gap:4 }}>⭐ {getDriverName(b.recommended_driver_id)}</span>
                        : <span style={{ color:"#94A3B8", fontSize:12 }}>—</span>}
                    </td>

                    <td>
                      {b.driver
                        ? <span className="badge badge-green">✓ {getDriverName(b.driver)}</span>
                        : <span className="badge badge-red">Not Assigned</span>}
                    </td>

                    <td>
                      {b.triptype
                        ? <span className={`badge ${b.triptype==="outstation"?"badge-purple":"badge-blue"}`}>{b.triptype}</span>
                        : "—"}
                    </td>

                    <td><span className={getStatusClass(b.status)}>{getStatusLabel(b.status)}</span></td>

                    <td>
                      {isDone ? (
                        <span className="badge badge-green">✅ Done</span>
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
                        <button className="action-edit" onClick={() => openEdit(b)}>
                          ✏️ {b.driver ? "Reassign" : isFuture || isTomorrow ? "Pre-assign" : "Assign"}
                        </button>
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

      {/* ═══════════════════ ASSIGN MODAL ═══════════════════ */}
      {showForm && editBooking && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:24 }}>🚗</span>
                <span className="modal-title">
                  {/* NEW: show pre-assign label for future bookings */}
                  {editBooking.is_scheduled && editBooking.scheduled_at && getScheduleInfo(editBooking.scheduled_at)?.type !== "imminent"
                    ? `Pre-assign — Booking #${editId}`
                    : `Assign — Booking #${editId}`}
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
                    <div style={{
                      ...S.modalSchedBanner,
                      /* NEW: color the banner based on how far away the ride is */
                      backgroundColor: getScheduleInfo(editBooking.scheduled_at)?.bg || "#F0FDFA",
                      borderColor: (getScheduleInfo(editBooking.scheduled_at)?.color || "#0F766E") + "66",
                    }}>
                      <span style={{ fontSize:22 }}>📅</span>
                      <div style={{ flex:1 }}>
                        <p style={S.modalSchedLabel}>
                          {getScheduleInfo(editBooking.scheduled_at)?.type === "future" ? "Future Scheduled Ride" : "Scheduled Ride"}
                        </p>
                        <p style={S.modalSchedTime}>{fmtScheduled(editBooking.scheduled_at)?.full}</p>
                      </div>
                      {/* NEW: time-away pill */}
                      <span style={{
                        ...S.modalSchedPill,
                        backgroundColor: (getScheduleInfo(editBooking.scheduled_at)?.color || "#0F766E") + "18",
                        color: getScheduleInfo(editBooking.scheduled_at)?.color || "#0F766E",
                      }}>
                        ⏰ {getScheduleInfo(editBooking.scheduled_at)?.label}
                      </span>
                    </div>
                    {/* NEW: future booking notice */}
                    {["future","tomorrow"].includes(getScheduleInfo(editBooking.scheduled_at)?.type) && (
                      <div style={S.futureNotice}>
                        <span style={{ fontSize:16 }}>💡</span>
                        <p style={S.futureNoticeText}>
                          This ride is scheduled for the future. Pre-assigning now reserves a driver in advance.
                          The driver will be notified closer to the ride time.
                        </p>
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
                      <button style={S.notAvailBtn} onClick={() => handleNotAvailable(editBooking)}>
                        🚫 Not Available
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-section-label" style={{ marginTop:8 }}>🧑‍✈️ Choose Action</div>
                <div className="form-section-divider" />

                <div className="form-field form-full">
                  <label className="form-label">What would you like to do?</label>
                  <select className="form-select" value={assignMode}
                    onChange={(e) => { setAssignMode(e.target.value); setDriver(""); }}>
                    {ASSIGN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {selMode && <p style={{ margin:"6px 0 0", fontSize:12, color:"#64748B", fontStyle:"italic" }}>{selMode.desc}</p>}
                </div>

                {assignMode === "assign" && (
                  <div className="form-field form-full">
                    <label className="form-label">
                      Select Driver <span className="form-required">*</span>
                      <span className="badge badge-green" style={{ marginLeft:8 }}>{drivers.length} online</span>
                    </label>
                    {drivers.length === 0 ? (
                      <div style={{ padding:14, background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:10, fontSize:13, color:"#92400e" }}>
                        ⚠️ No drivers online right now.
                      </div>
                    ) : (
                      <>
                        <select className="form-select" value={driver} onChange={(e) => setDriver(e.target.value)}>
                          <option value="">— Choose a driver —</option>
                          {drivers.map((d) => {
                            const isPref = String(d.id) === String(editBooking.recommended_driver_id);
                            const trips  = completedByDriver[String(d.id)] || 0;
                            return (
                              <option key={d.id} value={d.id}>
                                {isPref?"⭐ ":""}{d.name||d.NAME} — {d.car_type||"N/A"} (ID:{d.id}) · {trips} trip{trips!==1?"s completed":""}
                              </option>
                            );
                          })}
                        </select>
                        {driver && (() => {
                          const sel   = drivers.find((d) => String(d.id) === String(driver));
                          const trips = completedByDriver[String(driver)] || 0;
                          if (!sel) return null;
                          return (
                            <div style={S.driverCard}>
                              <div style={S.driverAvatar}>{(sel.name||sel.NAME||"?")[0].toUpperCase()}</div>
                              <div style={{ flex:1 }}>
                                <p style={S.driverCardName}>{sel.name||sel.NAME}</p>
                                <p style={S.driverCardSub}>{sel.car_type||"N/A"} · ID: {sel.id}</p>
                              </div>
                              <div style={S.tripBadge}>
                                <span style={S.tripBadgeNum}>{trips}</span>
                                <span style={S.tripBadgeLbl}>trips done</span>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {assignMode !== "assign" && (
                  <div className="form-field form-full">
                    <div style={{ padding:"12px 14px", backgroundColor:assignMode==="allbusy"?"#FFF1F2":"#FFFBEB", border:`1.5px solid ${assignMode==="allbusy"?"#FECDD3":"#FDE68A"}`, borderRadius:10, fontSize:13, color:assignMode==="allbusy"?"#9F1239":"#92400E", lineHeight:1.6 }}>
                      {assignMode==="allbusy"
                        ? "🚫 All drivers busy — customer will be notified."
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

      {/* ═══════════════════ PREFERRED WARNING ═══════════════════ */}
      {showPrefWarn && editBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <div className="modal-header-inner"><span style={{ fontSize:22 }}>⚠️</span><span className="modal-title">Different Driver Selected</span></div>
            </div>
            <div className="modal-body" style={{ textAlign:"center", padding:"16px 0 8px" }}>
              <div style={{ fontSize:50, marginBottom:12 }}>🚕</div>
              <p style={{ fontSize:15, fontWeight:700, color:"#1E293B", margin:"0 0 12px" }}>Customer has a preferred driver</p>
              <div style={{ backgroundColor:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:12, padding:"10px 14px", textAlign:"left", margin:"0 0 12px" }}>
                <p style={{ margin:0, fontSize:13, color:"#92400E", fontWeight:600 }}>⭐ Preferred: <strong>{getDriverName(editBooking.recommended_driver_id)}</strong></p>
                <p style={{ margin:"5px 0 0", fontSize:13, color:"#92400E", fontWeight:600 }}>🚗 You selected: <strong>{getDriverName(driver)}</strong></p>
              </div>
              <p style={{ fontSize:14, color:"#475569", margin:0 }}>Assign a different driver anyway?</p>
            </div>
            <div className="modal-footer" style={{ gap:10 }}>
              <button style={{ flex:1, padding:"12px 0", backgroundColor:"#FEE2E2", color:"#9F1239", border:"1.5px solid #FECDD3", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer" }}
                onClick={handlePrefWarnNo} disabled={saving}>❌ Cancel Order</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handlePrefWarnYes} disabled={saving}>✅ Assign Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ CUSTOMER ACCEPTED POPUP ═══════════════════ */}
      {showAcceptedPopup && acceptedBooking && (
        <div className="modal-overlay" style={{ zIndex:9999 }}>
          <div className="modal modal-md" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <span style={{ fontSize:22 }}>✅</span>
                <span className="modal-title">Customer Accepted — Assign a Driver</span>
              </div>
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
                <label className="form-label">
                  Select Alternate Driver <span className="form-required">*</span>
                  <span className="badge badge-green" style={{ marginLeft:8 }}>{drivers.length} online</span>
                </label>
                {drivers.length === 0 ? (
                  <div style={{ padding:14, background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:10, fontSize:13, color:"#92400e" }}>⚠️ No drivers online right now.</div>
                ) : (
                  <>
                    <select className="form-select" value={acceptedDriver} onChange={(e) => setAcceptedDriver(e.target.value)}>
                      <option value="">— Choose a driver —</option>
                      {drivers.map((d) => {
                        const trips = completedByDriver[String(d.id)] || 0;
                        return <option key={d.id} value={d.id}>{d.name||d.NAME} — {d.car_type||"N/A"} (ID:{d.id}) · ✅ {trips} trip{trips!==1?"s":""}</option>;
                      })}
                    </select>
                    {acceptedDriver && (() => {
                      const sel   = drivers.find((d) => String(d.id) === String(acceptedDriver));
                      const trips = completedByDriver[String(acceptedDriver)] || 0;
                      if (!sel) return null;
                      return (
                        <div style={S.driverCard}>
                          <div style={S.driverAvatar}>{(sel.name||sel.NAME||"?")[0].toUpperCase()}</div>
                          <div style={{ flex:1 }}>
                            <p style={S.driverCardName}>{sel.name||sel.NAME}</p>
                            <p style={S.driverCardSub}>{sel.car_type||"N/A"} · ID: {sel.id}</p>
                          </div>
                          <div style={S.tripBadge}>
                            <span style={S.tripBadgeNum}>{trips}</span>
                            <span style={S.tripBadgeLbl}>trips done</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ gap:10 }}>
              <button className="btn btn-ghost"
                onClick={() => { setShowAcceptedPopup(false); setAcceptedBooking(null); setAcceptedDriver(""); }}>Later</button>
              <button className="btn btn-primary" style={{ flex:2 }}
                onClick={handleAcceptedAssign} disabled={acceptedSaving||!acceptedDriver}>
                {acceptedSaving ? "⏳ Assigning…" : "🚗 Assign Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 15%{transform:rotate(12deg)} 30%{transform:rotate(-10deg)}
          45%{transform:rotate(8deg)} 60%{transform:rotate(-6deg)} 75%{transform:rotate(4deg)} 90%{transform:rotate(-2deg)}
        }
        .badge-teal { background:#CCFBF1; color:#0F766E; border:1px solid #99F6E4; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   UPCOMING PANEL STYLES
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   REMINDER PANEL STYLES
   ═══════════════════════════════════════════════════════ */
const R = {
  panel:       { backgroundColor:"#FFF7ED", border:"2px solid #FED7AA", borderRadius:16, padding:"14px 16px", marginBottom:20 },
  panelHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 },
  panelHeaderLeft: { display:"flex", alignItems:"center", gap:12 },
  bellWrap:    { position:"relative", width:40, height:40, backgroundColor:"#FEF3C7", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", animation:"bellShake 2s ease infinite", flexShrink:0 },
  bellBadge:   { position:"absolute", top:-4, right:-4, width:18, height:18, backgroundColor:"#DC2626", color:"#fff", borderRadius:"50%", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" },
  panelTitle:  { margin:"0 0 2px", fontSize:14, fontWeight:800, color:"#92400E" },
  panelSub:    { margin:0, fontSize:12, color:"#B45309" },
  cardGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 },
  card:        { borderRadius:14, border:"1.5px solid", padding:"12px 14px" },
  cardTop:     { display:"flex", alignItems:"center", gap:6, marginBottom:10 },
  urgencyBadge:{ fontSize:10, fontWeight:800, borderRadius:20, padding:"3px 8px" },
  minsLeft:    { marginLeft:"auto", fontSize:12, fontWeight:700 },
  dismissBtn:  { width:22, height:22, borderRadius:"50%", border:"none", backgroundColor:"rgba(0,0,0,0.06)", color:"#64748B", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardBody:    { display:"flex", flexDirection:"column", gap:8 },
  infoRow:     { display:"flex", alignItems:"center", gap:10 },
  avatar:      { width:36, height:36, borderRadius:"50%", backgroundColor:"#2563EB", color:"#fff", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  customerName:{ margin:0, fontSize:13, fontWeight:700, color:"#1E293B" },
  customerPhone:{ margin:"1px 0 0", fontSize:11, color:"#64748B" },
  rideTime:    { margin:0, fontSize:14, fontWeight:800 },
  rideDate:    { margin:"1px 0 0", fontSize:11, color:"#94A3B8" },
  routeBox:    { backgroundColor:"rgba(255,255,255,0.6)", borderRadius:10, padding:"8px 10px" },
  routeRow:    { display:"flex", alignItems:"flex-start", gap:7 },
  routeDot:    { width:7, height:7, borderRadius:"50%", flexShrink:0, marginTop:3 },
  routeLine:   { width:2, height:8, backgroundColor:"#CBD5E1", marginLeft:2 },
  routeTxt:    { fontSize:11, color:"#475569", lineHeight:1.4 },
  cardFooter:  { display:"flex", alignItems:"center", justifyContent:"space-between" },
  tripTag:     { fontSize:11, fontWeight:600, color:"#64748B" },
  assignedTag: { fontSize:11, fontWeight:700, color:"#16A34A", backgroundColor:"#DCFCE7", borderRadius:20, padding:"4px 10px" },
  assignBtn:   { padding:"7px 14px", backgroundColor:"#2563EB", color:"#fff", border:"none", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer" },
};

/* ═══════════════════════════════════════════════════════
   TABLE / MODAL STYLES
   ═══════════════════════════════════════════════════════ */
const S = {
  filterRow:      { display:"flex", alignItems:"center", gap:12, margin:"0 0 16px", flexWrap:"wrap" },
  tabs:           { display:"flex", gap:3, backgroundColor:"#F1F5F9", borderRadius:10, padding:4 },
  tab:            { padding:"6px 14px", borderRadius:8, border:"none", backgroundColor:"transparent", fontSize:13, fontWeight:600, color:"#64748B", cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
  tabActive:      { backgroundColor:"#fff", color:"#1E293B", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  tabCount:       { fontSize:11, fontWeight:700, backgroundColor:"#E2E8F0", color:"#64748B", borderRadius:20, padding:"1px 7px" },
  tabCountActive: { backgroundColor:"#2563EB", color:"#fff" },
  schedCell:      { display:"flex", flexDirection:"column", gap:2 },
  schedDate:      { fontSize:12, fontWeight:700, color:"#0F766E" },
  schedTime:      { fontSize:12, fontWeight:600, color:"#0D9488" },
  schedStatus:    { fontSize:10, fontWeight:700, borderRadius:6, padding:"2px 6px", display:"inline-block", marginTop:1 },
  /* NEW */
  schedCountdown: { fontSize:10, fontWeight:700 },
  schedNow:       { fontSize:11, color:"#94A3B8", fontWeight:500 },
  schedBadge:     { fontSize:10, fontWeight:700, backgroundColor:"#CCFBF1", color:"#0F766E", borderRadius:5, padding:"2px 5px", display:"inline-block" },
  reminderBadge:  { fontSize:10, fontWeight:700, backgroundColor:"#FEF3C7", color:"#D97706", borderRadius:5, padding:"2px 5px", display:"inline-block", animation:"pulse 1.5s ease infinite" },
  /* NEW: future badge in table ID cell */
  futureBadge:    { fontSize:10, fontWeight:700, borderRadius:5, padding:"2px 5px", display:"inline-block" },
  modalSchedBanner: { display:"flex", alignItems:"center", gap:12, borderRadius:12, border:"1.5px solid", padding:"12px 14px", marginBottom:4 },
  modalSchedLabel:  { margin:0, fontSize:11, fontWeight:700, color:"#0D9488", textTransform:"uppercase", letterSpacing:"0.4px" },
  modalSchedTime:   { margin:"3px 0 0", fontSize:14, fontWeight:800, color:"#0F766E" },
  modalSchedPill:   { fontSize:11, fontWeight:700, borderRadius:8, padding:"4px 10px", whiteSpace:"nowrap" },
  /* NEW: future booking notice in modal */
  futureNotice:   { display:"flex", alignItems:"flex-start", gap:8, backgroundColor:"#EFF6FF", border:"1.5px solid #BFDBFE", borderRadius:10, padding:"10px 12px", marginTop:8 },
  futureNoticeText:{ margin:0, fontSize:12, color:"#1E40AF", lineHeight:1.5 },
  lockedCell:     { display:"flex", alignItems:"center", gap:8 },
  lockedDot:      { width:8, height:8, borderRadius:"50%", backgroundColor:"#F59E0B", flexShrink:0, animation:"pulse 1.2s ease infinite" },
  lockedTitle:    { fontSize:12, fontWeight:700, color:"#92400E" },
  lockedSub:      { fontSize:11, color:"#B45309", marginTop:2 },
  prefBanner:     { display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, backgroundColor:"#F0F9FF", border:"1.5px solid #BFDBFE", borderRadius:10, padding:"10px 14px" },
  prefLabel:      { margin:0, fontSize:11, fontWeight:700, color:"#1E40AF" },
  prefName:       { margin:"2px 0 0", fontSize:13, color:"#1E293B", fontWeight:600 },
  notAvailBtn:    { padding:"6px 12px", backgroundColor:"#FEE2E2", color:"#9F1239", border:"1.5px solid #FECDD3", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 },
  acceptedBanner: { display:"flex", alignItems:"center", gap:12, backgroundColor:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:14, padding:"14px 16px", marginBottom:16 },
  acceptedBannerTitle: { margin:0, fontSize:14, fontWeight:800, color:"#15803D" },
  acceptedBannerSub:   { margin:"3px 0 0", fontSize:12, color:"#166534" },
  bookingCard:    { backgroundColor:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:12, padding:"12px 14px", marginBottom:16 },
  cardMeta:       { fontSize:11, color:"#94A3B8", fontWeight:700, textTransform:"uppercase" },
  routeRow:       { display:"flex", alignItems:"flex-start", gap:6 },
  routeTxt:       { fontSize:12, color:"#475569", lineHeight:1.4 },
  prefNote:       { marginTop:10, padding:"6px 10px", backgroundColor:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, fontSize:12, color:"#92400E", fontWeight:600 },
  driverCard:     { display:"flex", alignItems:"center", gap:10, marginTop:10, backgroundColor:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:12, padding:"10px 12px" },
  driverAvatar:   { width:36, height:36, borderRadius:"50%", backgroundColor:"#16A34A", color:"#fff", fontSize:15, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  driverCardName: { margin:0, fontSize:13, fontWeight:700, color:"#1E293B" },
  driverCardSub:  { margin:"2px 0 0", fontSize:11, color:"#64748B" },
  tripBadge:      { display:"flex", flexDirection:"column", alignItems:"center", backgroundColor:"#DCFCE7", border:"1.5px solid #BBF7D0", borderRadius:10, padding:"6px 10px", flexShrink:0, minWidth:56 },
  tripBadgeNum:   { fontSize:18, fontWeight:900, color:"#15803D", lineHeight:1 },
  tripBadgeLbl:   { fontSize:9, fontWeight:700, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.3px", marginTop:2 },
};