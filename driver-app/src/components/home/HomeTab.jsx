import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

import CustomerHero    from "./CustomerHero";
import QuickActions    from "./QuickActions";
import DriverHeader    from "./DriverHeader";
import DriverToggle    from "./DriverToggle";
import DriverStats     from "./DriverStats";
import { IncomingRideCard, ActiveTripCard } from "./RideCards";
import RecentBookings       from "./RecentBookings";
import DriverHistoryModal   from "./bookingshistory";
import BookingForm     from "./BookingForm";
import {
  PlacesModal,
  OutstationModal,
  CustomerHistoryModal,
  HelpModal,
  SuccessModal,
} from "./Modals";

/* ═══════════════════════════════════════════════════════
   HomeTab
   FIX 1: role read SYNCHRONOUSLY from localStorage (no async gap)
   FIX 2: poll runs ALWAYS when driver logged in (not gated on isOnline)
           isOnline only controls UI visibility + server status sync
   FIX 3: isOnline fully persisted in localStorage — survives tab switches
   ═══════════════════════════════════════════════════════ */

// Read synchronously inside component call — fresh on every mount/re-login
const HomeTab = () => {
  const role      = localStorage.getItem("role")         || "";
  const DRIVER_ID = localStorage.getItem("driverId")     || "";
  const IS_ONLINE = localStorage.getItem("driverOnline") === "true";

  /* ── Customer modals ── */
  const [showBookingForm,     setShowBookingForm]     = useState(false);
  const [showPlacesPopup,     setShowPlacesPopup]     = useState(false);
  const [showOutstationPopup, setShowOutstationPopup] = useState(false);
  const [showHistory,         setShowHistory]         = useState(false);
  const [showHelp,            setShowHelp]            = useState(false);
  const [showSuccess,         setShowSuccess]         = useState(false);
  const [initialDrop,         setInitialDrop]         = useState("");
  const [initialTriptype,     setInitialTriptype]     = useState("");
  const [bookingHistory,      setBookingHistory]      = useState([]);

  /* ── Driver state ── */
  const [isOnline,          setIsOnline]         = useState(localStorage.getItem('driverOnline') === 'true');
  const [showDriverHistory, setShowDriverHistory] = useState(false);
  const [togglingOnline,    setTogglingOnline]    = useState(false);
  const [pendingRide,       setPendingRide]       = useState(null);
  const [acceptedRide,      setAcceptedRide]      = useState(null);
  const [todayEarnings,     setTodayEarnings]     = useState(0);
  const [driverName,        setDriverName]        = useState(localStorage.getItem('driverName') || 'Driver');
  const [totalTrips,        setTotalTrips]        = useState(0);
  const [profileLoading,    setProfileLoading]    = useState(false);
  const [recentDriverTrips, setRecentDriverTrips] = useState([]);
  const [tripsLoading,      setTripsLoading]      = useState(false);

  const pollRef    = useRef(null);
  const refreshRef = useRef(null);

  /* ── Driver init ── */
  useEffect(() => {
    if (role !== "driver" || !DRIVER_ID) return;
    fetchDriverProfile(DRIVER_ID);
    fetchDriverBookings(DRIVER_ID);
    refreshRef.current = setInterval(() => fetchDriverBookings(DRIVER_ID), 15000);
    return () => {
      clearInterval(refreshRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  /* ── POLL — always runs when driver logged in, regardless of isOnline ──
     isOnline is just a UI/server preference.
     Admin can assign a booking anytime — driver must always see it.       */
  useEffect(() => {
    if (role !== "driver" || !DRIVER_ID) return;

    const poll = async () => {
      if (acceptedRide) return; // already in a ride, skip
      try {
        const res  = await axios.get(`${BASE_URL}/api/bookings`);
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list.find(
          (b) => String(b.driver) === String(DRIVER_ID) && b.status === "assigned"
        );
        setPendingRide(found || null);
      } catch {}
    };

    poll(); // run immediately on mount
    clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, 4000); // poll every 4s
    return () => clearInterval(pollRef.current);
  }, [acceptedRide]); // only re-setup when acceptedRide changes

  /* ── API helpers ── */
  const fetchDriverProfile = async (driverId) => {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers/profile?driverId=${driverId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        const p = res.data[0];
        setDriverName(p.NAME || p.name || "Driver");
        setTotalTrips(p.total_rides || 0);
      }
    } catch {}
    finally { setProfileLoading(false); }
  };

  const fetchDriverBookings = async (driverId) => {
    setTripsLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings/driver/all?driverId=${driverId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setRecentDriverTrips(list.slice(0, 4));
    } catch {}
    finally { setTripsLoading(false); }
  };

  const fetchBookingHistory = async () => {
    const p = localStorage.getItem("customerPhone");
    if (!p) { setBookingHistory([]); return; }
    try {
      const res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${p}`);
      setBookingHistory(Array.isArray(res.data) ? res.data : []);
    } catch { setBookingHistory([]); }
  };

  /* ── GO ONLINE / OFFLINE ──
     UI updates instantly. localStorage persists across tab switches.
     Server sync is fire-and-forget (no blocking, no alerts).           */
  const handleToggleOnline = async () => {
    if (togglingOnline) return;
    const newStatus = !isOnline;

    setIsOnline(newStatus);
    localStorage.setItem("driverOnline", String(newStatus));
    setTogglingOnline(true);

    if (!newStatus) {
      // Going offline — clear pending ride display
      setPendingRide(null);
    }

    try {
      await axios.post(`${BASE_URL}/api/driver/updateStatus`, {
        driverId: DRIVER_ID,
        status: newStatus ? "online" : "offline",
      });
    } catch {
      // silent — localStorage already updated, UI is correct
    } finally {
      setTogglingOnline(false);
    }
  };

  /* ── ACCEPT ── */
  const handleAcceptRide = async () => {
    if (!pendingRide) return;
    try {
      const res = await axios.post(`${BASE_URL}/api/accept-booking`, {
        bookingId: pendingRide.id,
        driverId:  DRIVER_ID,
      });
      if (res.status === 200) {
        setAcceptedRide({
          ...pendingRide,
          status:          "accepted",
          driver_id:       DRIVER_ID,
          customer_name:   pendingRide.name   || pendingRide.customer_name,
          customer_mobile: pendingRide.mobile || pendingRide.customer_mobile,
          pickup:          pendingRide.pickup,
          drop_location:   pendingRide.drop   || pendingRide.drop_location,
          pickup_lat:      pendingRide.pickup_lat,
          pickup_lng:      pendingRide.pickup_lng,
        });
        setPendingRide(null);
      } else {
        alert(res.data?.message || "Could not accept ride.");
      }
    } catch (e) {
      alert("Failed to accept: " + (e?.response?.data?.message || e.message));
    }
  };

  /* ── DECLINE ── */
  const handleDeclineRide = async () => {
    if (!pendingRide) return;
    const bookingId = pendingRide.id;
    setPendingRide(null); // hide instantly
    try {
      await axios.post(`${BASE_URL}/api/decline-booking`, {
        bookingId,
        driverId: DRIVER_ID,
      });
    } catch (e) {
      console.warn("Decline API error:", e.message);
    }
  };

  /* ── COMPLETE ── */
  const handleCompleteRide = async () => {
    const ride = acceptedRide;
    setAcceptedRide(null);
    if (ride?.amount) setTodayEarnings((p) => p + (ride.amount || 0));
    try {
      await axios.post(`${BASE_URL}/api/complete-ride`, {
        bookingId: ride?.id,
        driverId:  DRIVER_ID,
      });
      fetchDriverProfile(DRIVER_ID);
      fetchDriverBookings(DRIVER_ID);
    } catch {}
  };

  /* ── Customer handlers ── */
  const handleFeatureClick = (id) => {
    if      (id === "1") setShowPlacesPopup(true);
    else if (id === "2") setShowOutstationPopup(true);
    else if (id === "3") { fetchBookingHistory(); setShowHistory(true); }
    else if (id === "4") setShowHelp(true);
    else                 setShowBookingForm(true);
  };

  const selectChennaiPlace = (place) => {
    setInitialDrop(place.address); setInitialTriptype("local");
    setShowPlacesPopup(false);     setShowBookingForm(true);
  };

  const selectOutstationPlace = (place) => {
    setInitialDrop(place.address);  setInitialTriptype("outstation");
    setShowOutstationPopup(false);  setShowBookingForm(true);
  };

  /* ══════════════ DRIVER VIEW ══════════════ */
  if (role === "driver") {
    return (
      <div style={st.page}>
        <DriverHeader
          driverName={driverName}
          driverIdDisplay={DRIVER_ID}
          onHelpClick={() => setShowHelp(true)}
        />

        {/* Online / Offline toggle — always visible */}
        <DriverToggle
          isOnline={isOnline}
          onToggle={handleToggleOnline}
          loading={togglingOnline}
        />

        <DriverStats
          todayEarnings={todayEarnings}
          totalTrips={totalTrips}
          weekEarnings={0}
          loading={profileLoading}
        />

        {/* ── Incoming ride — shows even if offline (admin assigned) ── */}
        {pendingRide && !acceptedRide && (
          <section style={st.section}>
            <h2 style={st.sectionHeading}>🔔 New Ride Assigned</h2>
            <IncomingRideCard
              ride={pendingRide}
              onAccept={handleAcceptRide}
              onDecline={handleDeclineRide}
            />
          </section>
        )}

        {/* ── Active trip ── */}
        {acceptedRide && (
          <section style={st.section}>
            <h2 style={st.sectionHeading}>🚕 Active Trip</h2>
            <ActiveTripCard
              ride={acceptedRide}
              onComplete={handleCompleteRide}
              role="driver"
            />
          </section>
        )}

        {/* ── Status info box (only when no ride activity) ── */}
        {!pendingRide && !acceptedRide && (
          isOnline ? (
            <div style={st.waitingBox}>
              <div style={st.spinner} />
              <span style={st.waitingText}>Online — waiting for admin to assign a ride...</span>
            </div>
          ) : (
            <div style={st.offlineBox}>
              <span style={{ fontSize: 44, marginBottom: 10 }}>🌙</span>
              <p style={st.offlineTitle}>You're offline</p>
              <p style={st.offlineSub}>Toggle "Go Online" above to mark yourself available.</p>
            </div>
          )
        )}

        <RecentBookings
          trips={recentDriverTrips}
          loading={tripsLoading}
          onSeeAll={() => setShowDriverHistory(true)}
        />

        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
        <DriverHistoryModal
          visible={showDriverHistory}
          onClose={() => setShowDriverHistory(false)}
        />
      </div>
    );
  }

  /* ══════════════ CUSTOMER VIEW ══════════════ */
  return (
    <div style={st.page}>
      <CustomerHero />
      <QuickActions onFeatureClick={handleFeatureClick} />
      <div style={st.bookBtnWrap}>
        <button style={st.bookBtn} onClick={() => {
          setInitialDrop(""); setInitialTriptype(""); setShowBookingForm(true);
        }}>
          🚖 Book a Ride
        </button>
      </div>
      <BookingForm
        visible={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        onSuccess={() => setShowSuccess(true)}
        initialDrop={initialDrop}
        initialTriptype={initialTriptype}
      />
      <PlacesModal          visible={showPlacesPopup}     onClose={() => setShowPlacesPopup(false)}     onSelect={selectChennaiPlace} />
      <OutstationModal      visible={showOutstationPopup} onClose={() => setShowOutstationPopup(false)} onSelect={selectOutstationPlace} />
      <CustomerHistoryModal visible={showHistory}         onClose={() => setShowHistory(false)}         bookings={bookingHistory} />
      <HelpModal            visible={showHelp}            onClose={() => setShowHelp(false)} />
      <SuccessModal         visible={showSuccess}         onClose={() => setShowSuccess(false)} />
    </div>
  );
};

export default HomeTab;

const st = {
  page:           { flex: 1, backgroundColor: "#F8FAFC", overflowY: "auto", paddingBottom: 80 },
  section:        { padding: "0 0 8px" },
  sectionHeading: { margin: "16px 16px 10px", fontSize: 17, fontWeight: 700, color: "#1E293B" },

  offlineBox:  { margin: "0 16px 14px", backgroundColor: "#fff", borderRadius: 22, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", border: "1.5px dashed #CBD5E1" },
  offlineTitle:{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#1E293B" },
  offlineSub:  { margin: 0, fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 1.5 },

  waitingBox:  { margin: "0 16px 14px", backgroundColor: "#EFF6FF", borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 12 },
  spinner:     { width: 20, height: 20, border: "2.5px solid #bfdbfe", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  waitingText: { fontSize: 14, color: "#2563EB", fontWeight: 600 },

  bookBtnWrap: { padding: "0 16px 16px" },
  bookBtn:     { width: "100%", padding: "18px 0", backgroundColor: "#2563EB", border: "none", borderRadius: 16, fontSize: 18, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" },
};