import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

import CustomerHero    from "./CustomerHero";
import QuickActions    from "./QuickActions";
import DriverHeader    from "./DriverHeader";
import DriverToggle    from "./DriverToggle";
import DriverStats     from "./DriverStats";
import { IncomingRideCard, ActiveTripCard } from "./RideCards";
import RecentBookings  from "./RecentBookings";
import BookingForm     from "./BookingForm";
import {
  PlacesModal,
  OutstationModal,
  CustomerHistoryModal,
  HelpModal,
  SuccessModal,
} from "./Modals";

const HomeTab = () => {
  const [role, setRole] = useState("");

  const [showBookingForm,     setShowBookingForm]     = useState(false);
  const [showPlacesPopup,     setShowPlacesPopup]     = useState(false);
  const [showOutstationPopup, setShowOutstationPopup] = useState(false);
  const [showHistory,         setShowHistory]         = useState(false);
  const [showHelp,            setShowHelp]            = useState(false);
  const [showSuccess,         setShowSuccess]         = useState(false);

  const [initialDrop,     setInitialDrop]     = useState("");
  const [initialTriptype, setInitialTriptype] = useState("");
  const [bookingHistory,  setBookingHistory]  = useState([]);

  /* ── Driver state ── */
  // isOnline persisted in localStorage so it survives tab switches
  const [isOnline,          setIsOnline]         = useState(() => {
    return localStorage.getItem("driverOnline") === "true";
  });
  const [pendingRide,       setPendingRide]       = useState(null);
  const [acceptedRide,      setAcceptedRide]      = useState(null);
  const [togglingOnline,    setTogglingOnline]    = useState(false); // prevent double-click
  const [todayEarnings,     setTodayEarnings]     = useState(0);
  const [weekEarnings]                            = useState(4200);
  const [driverName,        setDriverName]        = useState("Driver");
  const [driverIdDisplay,   setDriverIdDisplay]   = useState("");
  const [totalTrips,        setTotalTrips]        = useState(0);
  const [profileLoading,    setProfileLoading]    = useState(false);
  const [recentDriverTrips, setRecentDriverTrips] = useState([]);
  const [tripsLoading,      setTripsLoading]      = useState(false);

  const refreshRef = useRef(null);
  const pollRef    = useRef(null);

  /* ── Init ── */
  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "";
    setRole(storedRole);

    if (storedRole === "driver") {
      const id   = localStorage.getItem("driverId")   || "";
      const name = localStorage.getItem("driverName") || "Driver";
      setDriverIdDisplay(id);
      setDriverName(name);
      if (id) {
        fetchDriverProfile(id);
        fetchDriverBookings(id);
        refreshRef.current = setInterval(() => fetchDriverBookings(id), 10000);
      }
    }
    return () => {
      clearInterval(refreshRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  /* ── Poll for rides assigned to THIS driver ── */
  useEffect(() => {
    const driverId = localStorage.getItem("driverId");
    if (!driverId || !isOnline) {
      clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      // don't poll if already in an active ride
      if (acceptedRide) return;
      try {
        const res  = await axios.get(`${BASE_URL}/api/bookings`);
        const list = Array.isArray(res.data) ? res.data : [];
        // Look for booking assigned to this driver with status "assigned"
        const found = list.find(
          (b) => String(b.driver) === String(driverId) && b.status === "assigned"
        );
        setPendingRide(found || null);
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [isOnline, acceptedRide]);

  /* ── API ── */
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
      let list = [];
      try {
        const res = await axios.get(`${BASE_URL}/api/bookings/driver/all?driverId=${driverId}`);
        list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      } catch {
        const res2 = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${driverId}`);
        list = Array.isArray(res2.data) ? res2.data : [];
      }
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

  /* ── Handlers ── */
  const handleFeatureClick = (id) => {
    if      (id === "1") setShowPlacesPopup(true);
    else if (id === "2") setShowOutstationPopup(true);
    else if (id === "3") { fetchBookingHistory(); setShowHistory(true); }
    else if (id === "4") setShowHelp(true);
    else setShowBookingForm(true);
  };

  const selectChennaiPlace = (place) => {
    setInitialDrop(place.address); setInitialTriptype("local");
    setShowPlacesPopup(false); setShowBookingForm(true);
  };

  const selectOutstationPlace = (place) => {
    setInitialDrop(place.address); setInitialTriptype("outstation");
    setShowOutstationPopup(false); setShowBookingForm(true);
  };

  /* ── GO ONLINE / OFFLINE — persists in localStorage, never alert-fails ── */
  const handleToggleOnline = async () => {
    if (togglingOnline) return; // prevent spam clicks
    const driverId  = localStorage.getItem("driverId");
    const newStatus = !isOnline;
    setTogglingOnline(true);

    // ✅ Update UI immediately — don't wait for server
    setIsOnline(newStatus);
    localStorage.setItem("driverOnline", String(newStatus));

    if (!newStatus) {
      setPendingRide(null);
      setAcceptedRide(null);
    }

    // Then try to sync with server (fire-and-forget, no blocking)
    try {
      await axios.post(`${BASE_URL}/api/driver/updateStatus`, {
        driverId,
        status: newStatus ? "online" : "offline",
      });
    } catch {
      // Server sync failed silently — UI stays correct
      console.warn("Status sync failed, but UI updated locally");
    } finally {
      setTogglingOnline(false);
    }
  };

  /* ── ACCEPT — checks 'assigned' status (not 'pending') ── */
  const handleAcceptRide = async () => {
    if (!pendingRide) return;
    const driverId = localStorage.getItem("driverId");
    try {
      const res = await axios.post(`${BASE_URL}/api/accept-booking`, {
        bookingId: pendingRide.id,
        driverId,
      });
      // Accept always succeeds if server returns 200
      if (res.status === 200) {
        setAcceptedRide({
          ...pendingRide,
          status:          "accepted",
          driver_id:       driverId,
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

  /* ── DECLINE — calls API to reset driver_id=NULL, status=pending in DB ── */
  const handleDeclineRide = async () => {
    if (!pendingRide) return;
    const bookingId = pendingRide.id;
    const driverId  = localStorage.getItem("driverId");

    // Hide card immediately for instant UI feedback
    setPendingRide(null);

    // Call server to reset booking so admin can reassign
    try {
      await axios.post(`${BASE_URL}/api/decline-booking`, { bookingId, driverId });
      console.log(`Booking ${bookingId} declined — returned to admin`);
    } catch (e) {
      console.warn("Decline API error:", e.message);
      // Card is already hidden — no need to do anything else
    }
  };

  /* ── COMPLETE ── */
  const handleCompleteRide = async () => {
    const ride = acceptedRide;
    setAcceptedRide(null);
    if (ride?.amount) setTodayEarnings((prev) => prev + (ride.amount || 0));
    try {
      const driverId = localStorage.getItem("driverId");
      await axios.post(`${BASE_URL}/api/complete-ride`, { bookingId: ride?.id, driverId });
      if (driverId) { fetchDriverProfile(driverId); fetchDriverBookings(driverId); }
    } catch { console.warn("Could not sync driver status."); }
  };

  /* ═══ DRIVER VIEW ═══ */
  if (role === "driver") {
    return (
      <div style={styles.page}>
        <DriverHeader
          driverName={driverName}
          driverIdDisplay={driverIdDisplay}
          onHelpClick={() => setShowHelp(true)}
        />

        <DriverToggle
          isOnline={isOnline}
          onToggle={handleToggleOnline}
          loading={togglingOnline}
        />

        <DriverStats
          todayEarnings={todayEarnings}
          totalTrips={totalTrips}
          weekEarnings={weekEarnings}
          loading={profileLoading}
        />

        {/* Incoming ride */}
        {isOnline && pendingRide && !acceptedRide && (
          <section style={styles.section}>
            <h2 style={styles.sectionHeading}>🔔 New Ride Assigned</h2>
            <IncomingRideCard
              ride={pendingRide}
              onAccept={handleAcceptRide}
              onDecline={handleDeclineRide}
            />
          </section>
        )}

        {/* Active trip */}
        {acceptedRide && (
          <section style={styles.section}>
            <h2 style={styles.sectionHeading}>🚕 Active Trip</h2>
            <ActiveTripCard
              ride={acceptedRide}
              onComplete={handleCompleteRide}
              role="driver"
            />
          </section>
        )}

        {/* Offline */}
        {!isOnline && !acceptedRide && (
          <div style={styles.offlineBox}>
            <span style={{ fontSize: 44, marginBottom: 10 }}>🌙</span>
            <p style={styles.offlineTitle}>You're offline</p>
            <p style={styles.offlineSub}>Tap "Go Online" above to start receiving ride requests.</p>
          </div>
        )}

        {/* Waiting */}
        {isOnline && !pendingRide && !acceptedRide && (
          <div style={styles.waitingBox}>
            <div style={styles.spinner} />
            <span style={styles.waitingText}>Waiting for admin to assign a ride...</span>
          </div>
        )}

        <RecentBookings
          trips={recentDriverTrips}
          loading={tripsLoading}
          onSeeAll={() => alert("Full history coming soon")}
        />

        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    );
  }

  /* ═══ CUSTOMER VIEW ═══ */
  return (
    <div style={styles.page}>
      <CustomerHero />
      <QuickActions onFeatureClick={handleFeatureClick} />
      <div style={styles.bookBtnWrap}>
        <button style={styles.bookBtn} onClick={() => {
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
      <PlacesModal     visible={showPlacesPopup}     onClose={() => setShowPlacesPopup(false)}     onSelect={selectChennaiPlace} />
      <OutstationModal visible={showOutstationPopup} onClose={() => setShowOutstationPopup(false)} onSelect={selectOutstationPlace} />
      <CustomerHistoryModal visible={showHistory} onClose={() => setShowHistory(false)} bookings={bookingHistory} />
      <HelpModal   visible={showHelp}    onClose={() => setShowHelp(false)} />
      <SuccessModal visible={showSuccess} onClose={() => setShowSuccess(false)} />
    </div>
  );
};

export default HomeTab;

const styles = {
  page:           { flex: 1, backgroundColor: "#F8FAFC", overflowY: "auto", paddingBottom: 80 },
  section:        { padding: "0 0 8px" },
  sectionHeading: { margin: "16px 16px 10px", fontSize: 17, fontWeight: 700, color: "#1E293B" },
  offlineBox:     { margin: "0 16px 14px", backgroundColor: "#fff", borderRadius: 22, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", border: "1.5px dashed #CBD5E1" },
  offlineTitle:   { margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#1E293B" },
  offlineSub:     { margin: 0, fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 1.5 },
  waitingBox:     { margin: "0 16px 14px", backgroundColor: "#EFF6FF", borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 12 },
  spinner:        { width: 20, height: 20, border: "2.5px solid #bfdbfe", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  waitingText:    { fontSize: 14, color: "#2563EB", fontWeight: 600 },
  bookBtnWrap:    { padding: "0 16px 16px" },
  bookBtn:        { width: "100%", padding: "18px 0", backgroundColor: "#2563EB", border: "none", borderRadius: 16, fontSize: 18, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" },
};