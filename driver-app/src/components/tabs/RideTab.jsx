import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ═══════════════════════════════════════════
   RideTab — Current booking with live map
   Customer: sees driver moving on map after assigned
             → When driver completes: shows rating screen
   Driver:   sees accept/start/complete buttons + map
   ═══════════════════════════════════════════ */
const RideTab = () => {
  const role = localStorage.getItem("role") || "";

  const [booking,        setBooking]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [rating,         setRating]         = useState(0);
  const [comment,        setComment]        = useState("");
  const [ratingBooking,  setRatingBooking]  = useState(null); // booking to rate
  const [submitting,     setSubmitting]     = useState(false);
  const [driverPos,      setDriverPos]      = useState(null);

  const prevStatusRef = useRef(null); // tracks last known status
  const intervalRef   = useRef(null);
  const mapDivRef     = useRef(null);
  const leafletMap    = useRef(null);
  const driverMark    = useRef(null);
  const pickupMark    = useRef(null);
  const watchId       = useRef(null);

  /* ─────── Fetch Booking ─────── */
  const fetchBooking = async () => {
    try {
      const storedPhone    = localStorage.getItem("customerPhone") || "";
      const storedDriverId = localStorage.getItem("driverId")      || "";

      let res;
      if (role === "customer") {
        res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${storedPhone}`);
      } else if (role === "driver") {
        res = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${storedDriverId}`);
      }

      const list = Array.isArray(res?.data) ? res.data : [];

      // Find active booking first
      const active = list.find((b) =>
        ["pending", "assigned", "accepted", "inride"].includes(b.status)
      ) || null;

      if (active) {
        // ── STATUS CHANGED TO COMPLETED? Show rating immediately ──
        if (
          role === "customer" &&
          prevStatusRef.current === "inride" &&
          active.status !== "inride"
        ) {
          // edge case: status jumped — handled below
        }
        prevStatusRef.current = active.status;
        setBooking(active);
        return;
      }

      // No active booking — check if just completed (needs rating)
      if (role === "customer") {
        // Find most recent completed booking without rating
        const unrated = list
          .filter((b) => b.status === "completed" && !b.rating)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        // ── KEY FIX: if previous status was active (inride/accepted) and now it's gone
        //    → driver completed the ride → show rating screen ──
        const wasActive = ["inride", "accepted", "assigned", "pending"].includes(prevStatusRef.current);

        if (unrated && wasActive) {
          setRatingBooking(unrated);
          setBooking(null);
          prevStatusRef.current = "completed";
          return;
        }

        // Also show rating if already in rating state (don't clear it)
        if (ratingBooking) return;
      }

      prevStatusRef.current = null;
      setBooking(null);
    } catch (err) {
      console.warn("Booking fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    intervalRef.current = setInterval(fetchBooking, 4000);
    return () => {
      clearInterval(intervalRef.current);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  /* ─────── Init / Update Live Map ─────── */
  useEffect(() => {
    if (!booking || !mapDivRef.current) return;
    if (!["assigned", "accepted", "inride"].includes(booking.status)) return;

    const inject = () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
    };

    const initMap = () => {
      inject();
      if (!mapDivRef.current) return;
      const L = window.L;

      const defLat = parseFloat(booking.pickup_lat) || 13.0827;
      const defLng = parseFloat(booking.pickup_lng) || 80.2707;

      if (leafletMap.current) {
        leafletMap.current.setView([defLat, defLng], 14);
        setTimeout(() => leafletMap.current?.invalidateSize(), 200);
        return;
      }

      const map = L.map(mapDivRef.current, {
        center: [defLat, defLng], zoom: 14,
        zoomControl: false, attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const pickIcon = L.divIcon({
        className: "",
        html: `<div style="background:#10B981;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(16,185,129,0.5)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      pickupMark.current = L.marker([defLat, defLng], { icon: pickIcon }).addTo(map).bindPopup("📍 Pickup");

      const carIcon = L.divIcon({
        className: "",
        html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚕</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });
      driverMark.current = L.marker([defLat, defLng], { icon: carIcon }).addTo(map);
      leafletMap.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    };

    if (window.L) initMap();
    else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [booking?.status]);

  /* ─────── Driver: push GPS ─────── */
  useEffect(() => {
    if (role !== "driver" || !booking) return;
    if (!["accepted", "inride"].includes(booking.status)) return;
    const driverId = localStorage.getItem("driverId");
    if (!driverId || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        setDriverPos({ lat: latitude, lng: longitude });
        if (driverMark.current && leafletMap.current) {
          driverMark.current.setLatLng([latitude, longitude]);
          leafletMap.current.setView([latitude, longitude], 15);
        }
        try {
          await fetch(`${BASE_URL}/api/driver/updateLocation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ driverId, lat: latitude, lng: longitude }),
          });
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
    );
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [booking?.status]);

  /* ─────── Customer: poll driver GPS ─────── */
  useEffect(() => {
    if (role !== "customer" || !booking?.driver_id) return;
    if (!["assigned", "accepted", "inride"].includes(booking.status)) return;

    const poll = async () => {
      try {
        const res  = await axios.get(`${BASE_URL}/api/drivers`);
        const list = Array.isArray(res.data) ? res.data : [];
        const dr   = list.find((d) => d.id == booking.driver_id);
        if (dr?.lat && dr?.lng) {
          const pos = { lat: parseFloat(dr.lat), lng: parseFloat(dr.lng) };
          setDriverPos(pos);
          if (driverMark.current && leafletMap.current) {
            driverMark.current.setLatLng([pos.lat, pos.lng]);
            leafletMap.current.setView([pos.lat, pos.lng], 15);
          }
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [booking?.driver_id, booking?.status]);

  /* ─────── Submit Rating ─────── */
  const submitRating = async () => {
    if (rating === 0) { alert("Please select a star rating"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${BASE_URL}/api/submit-rating`, {
        bookingId: ratingBooking.id,
        rating,
        comment,
      });
      setRatingBooking(null);
      setRating(0);
      setComment("");
    } catch { console.warn("Rating submit error"); }
    finally { setSubmitting(false); }
  };

  const skipRating = () => {
    setRatingBooking(null);
    setRating(0);
    setComment("");
  };

  /* ─────── Driver Actions ─────── */
  const startRide = async () => {
    await axios.post(`${BASE_URL}/api/bookings/start`, {
      bookingId: booking.id,
      driverId:  booking.driver_id,
    });
    fetchBooking();
  };

  const completeRide = async () => {
    await axios.post(`${BASE_URL}/api/complete-ride`, {
      bookingId: booking.id,
      driverId:  booking.driver_id,
    });
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    fetchBooking();
  };

  /* ── Status config ── */
  const getStatusStyle = (status) => ({
    pending:   { bg: "#FFF7ED", color: "#C2410C", label: "⏳ Pending – Finding driver..." },
    assigned:  { bg: "#EFF6FF", color: "#1D4ED8", label: "🔵 Assigned – Driver accepted" },
    accepted:  { bg: "#FEF3C7", color: "#92400E", label: "🟡 Driver is on the way" },
    inride:    { bg: "#D1FAE5", color: "#065F46", label: "🟢 Ride in Progress" },
    completed: { bg: "#F0FDF4", color: "#166534", label: "✅ Completed" },
  }[status] || { bg: "#F1F5F9", color: "#475569", label: status });

  /* ─────── RATING SCREEN (full page, not overlay) ─────── */
  if (ratingBooking) {
    return (
      <div style={st.ratingPage}>
        {/* Success animation top */}
        <div style={st.ratingTop}>
          <div style={st.ratingCircle}>
            <span style={{ fontSize: 52 }}>🎉</span>
          </div>
          <h2 style={st.ratingTitle}>Ride Completed!</h2>
          <p style={st.ratingSubtitle}>How was your experience?</p>
        </div>

        {/* Trip summary */}
        <div style={st.ratingCard}>
          <div style={st.tripSummaryRow}>
            <div style={st.tripSummaryItem}>
              <span style={st.summaryLabel}>From</span>
              <span style={st.summaryVal}>{ratingBooking.pickup || "—"}</span>
            </div>
            <span style={{ fontSize: 20 }}>→</span>
            <div style={{ ...st.tripSummaryItem, alignItems: "flex-end" }}>
              <span style={st.summaryLabel}>To</span>
              <span style={st.summaryVal}>{ratingBooking.drop_location || "—"}</span>
            </div>
          </div>
          {ratingBooking.driver_name && (
            <div style={st.driverChip}>
              <span style={{ fontSize: 20 }}>👨‍✈️</span>
              <span style={st.driverChipName}>{ratingBooking.driver_name}</span>
            </div>
          )}
        </div>

        {/* Stars */}
        <div style={st.ratingCard}>
          <p style={st.starLabel}>Tap to rate</p>
          <div style={st.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} style={st.starBtn} onClick={() => setRating(star)}>
                <span style={{ fontSize: 42, transition: "transform 0.15s", transform: star <= rating ? "scale(1.2)" : "scale(1)" }}>
                  {star <= rating ? "⭐" : "☆"}
                </span>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p style={st.ratingHint}>
              {["", "Poor 😞", "Fair 😐", "Good 🙂", "Great 😊", "Excellent 🤩"][rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div style={st.ratingCard}>
          <p style={st.starLabel}>Leave a comment (optional)</p>
          <textarea
            style={st.commentInput}
            placeholder="Share your experience with the driver..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {/* Buttons */}
        <div style={st.ratingActions}>
          <button style={st.skipBtn} onClick={skipRating}>Skip</button>
          <button
            style={{ ...st.submitBtn, opacity: submitting ? 0.7 : 1 }}
            onClick={submitRating}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit ⭐"}
          </button>
        </div>
      </div>
    );
  }

  /* ─────── Loading ─────── */
  if (loading) return (
    <div style={st.center}>
      <div style={st.spinner} />
      <p style={{ color: "#2563EB", fontWeight: 600, marginTop: 12 }}>Loading...</p>
    </div>
  );

  if (!booking) return (
    <div style={st.center}>
      <span style={{ fontSize: 64, marginBottom: 16 }}>🚗</span>
      <p style={st.noRideText}>No active ride</p>
      <p style={st.noRideSub}>Your current booking will appear here once booked or assigned.</p>
    </div>
  );

  const sc = getStatusStyle(booking.status);
  const showLiveMap = ["assigned", "accepted", "inride"].includes(booking.status);

  return (
    <div style={st.container}>

      {/* ── Status Banner ── */}
      <div style={{ ...st.statusBanner, backgroundColor: sc.bg }}>
        <div style={{ ...st.statusDot, backgroundColor: sc.color }} />
        <span style={{ ...st.statusText, color: sc.color }}>{sc.label}</span>
      </div>

      {/* ── Live Map ── */}
      {showLiveMap && (
        <div style={st.mapSection}>
          <div style={st.mapWrap}>
            <div ref={mapDivRef} style={st.mapBox} />
            <div style={st.liveBadge}>
              <div style={st.liveDot} />
              <span style={st.liveText}>LIVE</span>
            </div>
            {booking.status === "accepted" && (
              <div style={st.etaBadge}>🚕 Driver arriving in ~2 min</div>
            )}
            {booking.status === "inride" && (
              <div style={{ ...st.etaBadge, backgroundColor: "#D1FAE5", color: "#065F46" }}>🟢 Ride in progress</div>
            )}
          </div>
          {driverPos && (
            <div style={st.gpsRow}>
              <span style={{ fontSize: 13 }}>📡</span>
              <span style={st.gpsText}>
                Driver GPS: {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}
              </span>
              <span style={st.gpsBadge}>Live</span>
            </div>
          )}
        </div>
      )}

      {/* ── Driver action buttons ── */}
      {role === "driver" && (
        <div style={st.actionSection}>
          {booking.status === "assigned" && (
            <button style={st.startBtn} onClick={startRide}>🚦 START RIDE</button>
          )}
          {booking.status === "inride" && (
            <button style={st.completeBtn} onClick={completeRide}>✅ COMPLETE RIDE</button>
          )}
        </div>
      )}

      {/* ── Customer info (driver sees) ── */}
      {role === "driver" && (
        <div style={st.card}>
          <p style={st.cardLabel}>👤 Customer</p>
          <div style={st.personRow}>
            <div style={st.avatar}><span style={{ fontSize: 26 }}>👤</span></div>
            <div style={{ flex: 1 }}>
              <p style={st.personName}>{booking.customer_name || "—"}</p>
              <p style={st.personPhone}>📞 {booking.customer_mobile || "—"}</p>
            </div>
            <a href={`tel:${booking.customer_mobile}`} style={st.callBtn}>📞</a>
          </div>
        </div>
      )}

      {/* ── Driver info (customer sees) ── */}
      {role === "customer" && booking.driver_name && (
        <div style={st.card}>
          <p style={st.cardLabel}>👨‍✈️ Your Driver</p>
          <div style={st.personRow}>
            <div style={st.avatar}><span style={{ fontSize: 26 }}>👨‍✈️</span></div>
            <div style={{ flex: 1 }}>
              <p style={st.personName}>{booking.driver_name}</p>
              <p style={st.personPhone}>📞 {booking.driver_phone || "—"}</p>
            </div>
            <a href={`tel:${booking.driver_phone}`} style={st.callBtn}>📞</a>
          </div>
        </div>
      )}

      {/* ── Waiting for driver ── */}
      {role === "customer" && booking.status === "pending" && (
        <div style={st.waitCard}>
          <div style={st.waitSpinner} />
          <div>
            <p style={st.waitTitle}>Finding your driver...</p>
            <p style={st.waitSub}>Usually takes 1–3 minutes</p>
          </div>
        </div>
      )}

      {/* ── Route ── */}
      <div style={st.card}>
        <p style={st.cardLabel}>🗺️ Route</p>
        <div style={st.routeBox}>
          <div style={st.routeRow}>
            <div style={{ ...st.dot, backgroundColor: "#10B981" }} />
            <div>
              <p style={st.locLabel}>Pickup</p>
              <p style={st.locValue}>{booking.pickup || "—"}</p>
            </div>
          </div>
          <div style={st.routeLine} />
          <div style={st.routeRow}>
            <div style={{ ...st.dot, backgroundColor: "#EF4444" }} />
            <div>
              <p style={st.locLabel}>Drop</p>
              <p style={st.locValue}>{booking.drop_location || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Booking details ── */}
      <div style={st.card}>
        <p style={st.cardLabel}>📋 Booking Info</p>
        <div style={st.infoGrid}>
          <div style={st.infoItem}>
            <span style={st.infoKey}>Booking ID</span>
            <span style={st.infoVal}>#{booking.id}</span>
          </div>
          <div style={st.infoItem}>
            <span style={st.infoKey}>Trip Type</span>
            <span style={st.infoVal}>{booking.triptype || "local"}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RideTab;

const st = {
  container:  { flex: 1, backgroundColor: "#F4F6F9", padding: "16px 16px 90px", minHeight: "100vh" },
  center:     { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 24, textAlign: "center" },
  spinner:    { width: 40, height: 40, border: "4px solid #bfdbfe", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  noRideText: { margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1E293B" },
  noRideSub:  { margin: 0, fontSize: 14, color: "#64748B", lineHeight: 1.5 },

  /* ── Rating full page ── */
  ratingPage:      { flex: 1, backgroundColor: "#F8FAFC", minHeight: "100vh", padding: "32px 20px 100px", display: "flex", flexDirection: "column", gap: 16 },
  ratingTop:       { display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 8 },
  ratingCircle:    { width: 96, height: 96, borderRadius: "50%", backgroundColor: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 4px 24px rgba(16,185,129,0.25)" },
  ratingTitle:     { margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#1E293B" },
  ratingSubtitle:  { margin: 0, fontSize: 15, color: "#64748B" },
  ratingCard:      { backgroundColor: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },

  tripSummaryRow:  { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tripSummaryItem: { display: "flex", flexDirection: "column", flex: 1 },
  summaryLabel:    { fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 },
  summaryVal:      { fontSize: 13, fontWeight: 700, color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  driverChip:      { display: "flex", alignItems: "center", gap: 8, marginTop: 14, backgroundColor: "#F8FAFC", borderRadius: 12, padding: "10px 14px" },
  driverChipName:  { fontSize: 14, fontWeight: 700, color: "#1E293B" },

  starLabel:       { margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#64748B", textAlign: "center" },
  starRow:         { display: "flex", justifyContent: "center", gap: 6 },
  starBtn:         { backgroundColor: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 1 },
  ratingHint:      { margin: "12px 0 0", textAlign: "center", fontSize: 15, fontWeight: 700, color: "#2563EB" },

  commentInput:    { width: "100%", boxSizing: "border-box", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "12px 14px", fontSize: 14, backgroundColor: "#F8FAFC", resize: "none", outline: "none", fontFamily: "inherit" },
  ratingActions:   { display: "flex", gap: 10 },
  skipBtn:         { flex: 1, padding: "14px 0", borderRadius: 14, backgroundColor: "#E2E8F0", border: "none", fontWeight: 700, fontSize: 15, color: "#475569", cursor: "pointer" },
  submitBtn:       { flex: 2, padding: "14px 0", borderRadius: 14, backgroundColor: "#2563EB", border: "none", fontWeight: 800, fontSize: 15, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" },

  statusBanner:    { display: "flex", alignItems: "center", gap: 10, borderRadius: 16, padding: "14px 16px", marginBottom: 14 },
  statusDot:       { width: 10, height: 10, borderRadius: "50%", flexShrink: 0, animation: "pulse 1.5s ease infinite" },
  statusText:      { fontSize: 15, fontWeight: 700 },

  mapSection:      { marginBottom: 14 },
  mapWrap:         { position: "relative", width: "100%", height: 220, borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" },
  mapBox:          { width: "100%", height: "100%" },
  liveBadge:       { position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 20, padding: "4px 10px", zIndex: 10 },
  liveDot:         { width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EF4444", animation: "pulse 1s ease infinite" },
  liveText:        { fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 1 },
  etaBadge:        { position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#92400E", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" },
  gpsRow:          { display: "flex", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: "8px 12px", marginTop: 8 },
  gpsText:         { fontSize: 12, color: "#64748B", flex: 1 },
  gpsBadge:        { fontSize: 10, fontWeight: 700, color: "#10B981", backgroundColor: "#D1FAE5", padding: "2px 8px", borderRadius: 10 },

  actionSection:   { marginBottom: 14 },
  startBtn:        { width: "100%", padding: "16px 0", backgroundColor: "#F59E0B", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", marginBottom: 10, boxShadow: "0 4px 12px rgba(245,158,11,0.3)" },
  completeBtn:     { width: "100%", padding: "16px 0", backgroundColor: "#10B981", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", marginBottom: 10, boxShadow: "0 4px 12px rgba(16,185,129,0.3)" },

  card:            { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  cardLabel:       { margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },
  personRow:       { display: "flex", alignItems: "center", gap: 12 },
  avatar:          { width: 50, height: 50, borderRadius: "50%", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  personName:      { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1E293B" },
  personPhone:     { margin: 0, fontSize: 13, color: "#64748B" },
  callBtn:         { width: 42, height: 42, borderRadius: "50%", backgroundColor: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" },

  waitCard:        { display: "flex", alignItems: "center", gap: 14, backgroundColor: "#EFF6FF", borderRadius: 16, padding: 16, marginBottom: 12 },
  waitSpinner:     { width: 32, height: 32, border: "3px solid #bfdbfe", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  waitTitle:       { margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "#1E293B" },
  waitSub:         { margin: 0, fontSize: 12, color: "#64748B" },

  routeBox:        { display: "flex", flexDirection: "column" },
  routeRow:        { display: "flex", alignItems: "flex-start", gap: 12 },
  dot:             { width: 12, height: 12, borderRadius: "50%", marginTop: 3, flexShrink: 0 },
  routeLine:       { width: 2, height: 18, backgroundColor: "#CBD5E1", margin: "5px 0 5px 5px" },
  locLabel:        { margin: "0 0 2px", fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" },
  locValue:        { margin: 0, fontSize: 14, fontWeight: 600, color: "#1E293B" },

  infoGrid:        { display: "flex", gap: 12 },
  infoItem:        { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, padding: "10px 12px" },
  infoKey:         { display: "block", fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 },
  infoVal:         { display: "block", fontSize: 14, fontWeight: 700, color: "#1E293B", textTransform: "capitalize" },
};