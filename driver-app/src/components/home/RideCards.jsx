import React, { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../utils/constants";

/* ─────────────────────────────────────────
   IncomingRideCard
   ───────────────────────────────────────── */
export const IncomingRideCard = ({ ride, onAccept, onDecline }) => {
  const [accepting, setAccepting] = useState(false);
  const [timer,     setTimer]     = useState(60);

  useEffect(() => {
    if (timer <= 0) { onDecline && onDecline(); return; }
    const t = setTimeout(() => setTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleAccept = async () => {
    setAccepting(true);
    await onAccept?.();
    setAccepting(false);
  };

  const pct        = (timer / 60) * 100;
  const isUrgent   = timer <= 15;
  const timerColor = isUrgent ? "#EF4444" : "#2563EB";

  return (
    <div style={s.requestCard}>
      {/* Timer bar */}
      <div style={s.timerBarBg}>
        <div style={{ ...s.timerBarFill, width: `${pct}%`, backgroundColor: timerColor }} />
      </div>

      {/* Header */}
      <div style={s.requestHeader}>
        <div style={s.requestBadge}>
          <span style={s.requestBadgeText}>🔔 Ride Assigned To You</span>
        </div>
        <div style={{ ...s.timerCircle, borderColor: isUrgent ? "#FCA5A5" : "#E2E8F0" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: timerColor }}>{timer}s</span>
        </div>
      </div>

      {/* Customer info */}
      <div style={s.passengerRow}>
        <div style={s.avatar}><span style={{ fontSize: 24 }}>👤</span></div>
        <div style={{ flex: 1 }}>
          <p style={s.passengerName}>{ride.customer_name || ride.name || "Customer"}</p>
          <div style={s.metaRow}>
            <span style={s.metaTag}>{ride.triptype === "outstation" ? "🛣️ Outstation" : "🏙️ Local"}</span>
            <span style={s.metaTag}>📞 {ride.customer_mobile || ride.mobile || "—"}</span>
          </div>
        </div>
      </div>

      {/* Route */}
      <div style={s.routeBox}>
        <div style={s.routeRow}>
          <div style={{ ...s.dot, backgroundColor: "#10B981" }} />
          <div>
            <p style={s.routeLabel}>Pickup</p>
            <p style={s.routeText}>{ride.pickup || "—"}</p>
          </div>
        </div>
        <div style={s.routeDivider} />
        <div style={s.routeRow}>
          <div style={{ ...s.dot, backgroundColor: "#EF4444" }} />
          <div>
            <p style={s.routeLabel}>Drop</p>
            <p style={s.routeText}>{ride.drop_location || ride.drop || "—"}</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={s.actionRow}>
        <button
          style={{ ...s.declineBtn, opacity: accepting ? 0.5 : 1 }}
          onClick={onDecline}
          disabled={accepting}
        >
          ✕ Decline
        </button>
        <button
          style={{ ...s.acceptBtn, opacity: accepting ? 0.7 : 1 }}
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting ? "Accepting..." : "✓ Accept Ride"}
        </button>
      </div>

      <div style={s.declineNote}>
        ℹ️ Declining returns this booking to admin for reassignment
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   ActiveTripCard — ride accepted / in progress
   Shows live driver location map (Rapido style)
   ───────────────────────────────────────── */
export const ActiveTripCard = ({ ride, onComplete, role = "driver" }) => {
  const mapDivRef  = useRef(null);
  const leafletMap = useRef(null);
  const driverMark = useRef(null);
  const [driverPos, setDriverPos] = useState(null);
  const watchId    = useRef(null);

  /* ── Init Leaflet map ── */
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapDivRef.current || leafletMap.current) return;
      const L = window.L;

      const defLat = parseFloat(ride.pickup_lat) || 13.0827;
      const defLng = parseFloat(ride.pickup_lng) || 80.2707;

      const map = L.map(mapDivRef.current, {
        center: [defLat, defLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      // Pickup marker (green)
      const pickupIcon = L.divIcon({
        className: "",
        html: `<div style="background:#10B981;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(16,185,129,0.5)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      L.marker([defLat, defLng], { icon: pickupIcon }).addTo(map).bindPopup("📍 Pickup");

      // Driver car icon
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

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, []);

  /* ── Driver: stream real GPS to server + update map ── */
  useEffect(() => {
    if (role !== "driver") return;
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
  }, [role]);

  /* ── Customer: poll driver GPS every 4s ── */
  useEffect(() => {
    if (role !== "customer") return;
    const driverId = ride.driver_id;
    if (!driverId) return;

    const poll = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/drivers`);
        const data = await res.json();
        const dr   = Array.isArray(data) ? data.find((d) => d.id == driverId) : null;
        if (dr?.lat && dr?.lng && driverMark.current && leafletMap.current) {
          driverMark.current.setLatLng([parseFloat(dr.lat), parseFloat(dr.lng)]);
          leafletMap.current.setView([parseFloat(dr.lat), parseFloat(dr.lng)], 15);
          setDriverPos({ lat: parseFloat(dr.lat), lng: parseFloat(dr.lng) });
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [role, ride.driver_id]);

  const statusLabel = ride.status === "accepted" ? "🟡 Driver On The Way" :
                      ride.status === "inride"   ? "🟢 Ride In Progress"  : "⏳ Accepted";
  const statusColor = ride.status === "inride"   ? "#10B981" : "#F59E0B";
  const statusBg    = ride.status === "inride"   ? "#D1FAE5" : "#FEF3C7";

  return (
    <div style={s.activeTripCard}>
      {/* Status badge */}
      <div style={{ ...s.statusBadge, backgroundColor: statusBg }}>
        <div style={{ ...s.statusDot, backgroundColor: statusColor }} />
        <span style={{ ...s.statusBadgeText, color: statusColor }}>{statusLabel}</span>
        {ride.status === "accepted" && <span style={s.etaText}>ETA ~2 min</span>}
      </div>

      {/* Live Map */}
      <div style={s.mapWrap}>
        <div ref={mapDivRef} style={s.mapBox} />
        <div style={s.liveBadge}>
          <div style={s.liveDot} />
          <span style={s.liveText}>LIVE</span>
        </div>
        {role === "customer" && driverPos && (
          <div style={s.driverLocBadge}>🚕 Driver is nearby</div>
        )}
      </div>

      {/* Person info */}
      <div style={s.personRow}>
        <div style={s.avatar}>
          <span style={{ fontSize: 24 }}>{role === "driver" ? "👤" : "👨‍✈️"}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={s.personName}>
            {role === "driver" ? (ride.customer_name || "Customer") : (ride.driver_name || "Your Driver")}
          </p>
          <p style={s.personPhone}>
            📞 {role === "driver" ? (ride.customer_mobile || "—") : (ride.driver_phone || "—")}
          </p>
        </div>
        <a
          href={`tel:${role === "driver" ? ride.customer_mobile : ride.driver_phone}`}
          style={s.callBtn}
        >📞</a>
      </div>

      {/* Route */}
      <div style={s.routeBox}>
        <div style={s.routeRow}>
          <div style={{ ...s.dot, backgroundColor: "#10B981" }} />
          <div>
            <p style={s.routeLabel}>Pickup</p>
            <p style={s.routeText}>{ride.pickup || "—"}</p>
          </div>
        </div>
        <div style={s.routeDivider} />
        <div style={s.routeRow}>
          <div style={{ ...s.dot, backgroundColor: "#EF4444" }} />
          <div>
            <p style={s.routeLabel}>Drop</p>
            <p style={s.routeText}>{ride.drop_location || ride.drop || "—"}</p>
          </div>
        </div>
      </div>

      {/* Driver actions */}
      {role === "driver" && (
        <>
          {ride.status === "accepted" && (
            <div style={s.infoNote}>📢 Head to pickup location to start the ride</div>
          )}
          {(ride.status === "accepted" || ride.status === "inride") && (
            <button style={s.completeBtn} onClick={onComplete}>✅ Complete Trip</button>
          )}
        </>
      )}
    </div>
  );
};

/* ── Styles ── */
const s = {
  requestCard:      { margin: "0 16px 14px", backgroundColor: "#fff", borderRadius: 22, overflow: "hidden", border: "2px solid #2563EB", boxShadow: "0 4px 20px rgba(37,99,235,0.18)" },
  timerBarBg:       { width: "100%", height: 5, backgroundColor: "#EFF6FF" },
  timerBarFill:     { height: 5, transition: "width 1s linear, background-color 0.3s" },
  requestHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px" },
  requestBadge:     { backgroundColor: "#EFF6FF", padding: "5px 12px", borderRadius: 10 },
  requestBadgeText: { fontSize: 13, fontWeight: 700, color: "#2563EB" },
  timerCircle:      { width: 46, height: 46, borderRadius: "50%", backgroundColor: "#F8FAFC", border: "2px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" },
  passengerRow:     { display: "flex", alignItems: "center", gap: 12, padding: "0 16px 12px" },
  avatar:           { width: 46, height: 46, borderRadius: "50%", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  passengerName:    { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1E293B" },
  metaRow:          { display: "flex", gap: 8, flexWrap: "wrap" },
  metaTag:          { backgroundColor: "#F8FAFC", padding: "3px 9px", borderRadius: 8, fontSize: 12, color: "#64748B", fontWeight: 600 },
  routeBox:         { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 14, margin: "0 16px 14px" },
  routeRow:         { display: "flex", alignItems: "flex-start", gap: 10 },
  dot:              { width: 10, height: 10, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  routeDivider:     { width: 2, height: 14, backgroundColor: "#CBD5E1", marginLeft: 4, marginTop: 4, marginBottom: 4 },
  routeLabel:       { margin: 0, fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" },
  routeText:        { margin: 0, fontSize: 13, color: "#1E293B", fontWeight: 600, lineHeight: 1.4 },
  actionRow:        { display: "flex", gap: 10, padding: "0 16px 10px" },
  declineBtn:       { flex: 1, padding: "14px 0", borderRadius: 14, border: "2px solid #EF4444", backgroundColor: "transparent", color: "#EF4444", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  acceptBtn:        { flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" },
  declineNote:      { margin: "0 16px 14px", fontSize: 11, color: "#94A3B8", textAlign: "center", fontStyle: "italic" },

  activeTripCard:  { margin: "0 16px 14px", backgroundColor: "#fff", borderRadius: 22, overflow: "hidden", border: "2px solid #10B981", boxShadow: "0 4px 20px rgba(16,185,129,0.15)" },
  statusBadge:     { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px" },
  statusDot:       { width: 10, height: 10, borderRadius: "50%", animation: "pulse 1.5s ease infinite", flexShrink: 0 },
  statusBadgeText: { fontSize: 14, fontWeight: 700 },
  etaText:         { marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "3px 10px", borderRadius: 20 },
  mapWrap:         { position: "relative", width: "100%", height: 180 },
  mapBox:          { width: "100%", height: "100%" },
  liveBadge:       { position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 20, padding: "4px 10px", zIndex: 10 },
  liveDot:         { width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EF4444", animation: "pulse 1s ease infinite" },
  liveText:        { fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 1 },
  driverLocBadge:  { position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#1E293B", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
  personRow:       { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" },
  personName:      { margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "#1E293B" },
  personPhone:     { margin: 0, fontSize: 13, color: "#64748B" },
  callBtn:         { width: 42, height: 42, borderRadius: "50%", backgroundColor: "#D1FAE5", border: "none", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" },
  infoNote:        { margin: "0 16px 12px", backgroundColor: "#FEF3C7", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#92400E", fontWeight: 600 },
  completeBtn:     { width: "calc(100% - 32px)", margin: "0 16px 16px", padding: "15px 0", borderRadius: 15, border: "none", backgroundColor: "#10B981", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" },
};