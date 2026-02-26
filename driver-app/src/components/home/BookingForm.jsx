import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

/* ─────────────────────────────────────────
   BookingForm
   • Pickup field has 📍 icon → fills ONLY the input text
   • Mini map shows pickup pin after selection
   • Home map (CustomerHero) is NOT affected
   ───────────────────────────────────────── */

const BookingForm = ({ visible, onClose, onSuccess, initialDrop, initialTriptype }) => {
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [area,     setArea]     = useState("");
  const [darea,    setDArea]    = useState(initialDrop     || "");
  const [triptype, setTriptype] = useState(initialTriptype || "");

  const [suggestions,     setSuggestions]     = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [errors,          setErrors]          = useState({});
  const [locLoading,      setLocLoading]      = useState(false);
  const [pickupCoords,    setPickupCoords]    = useState(null);

  // Mini map inside booking form only
  const miniMapDiv = useRef(null);
  const miniMap    = useRef(null);
  const miniMarker = useRef(null);

  useEffect(() => {
    if (initialDrop)     setDArea(initialDrop);
    if (initialTriptype) setTriptype(initialTriptype);
  }, [initialDrop, initialTriptype]);

  /* ── Reset on close ── */
  useEffect(() => {
    if (!visible) {
      setName(""); setPhone(""); setArea(""); setDArea(initialDrop || "");
      setTriptype(initialTriptype || ""); setSuggestions([]); setDropSuggestions([]);
      setErrors({}); setPickupCoords(null);
      if (miniMap.current) { miniMap.current.remove(); miniMap.current = null; }
    }
  }, [visible]);

  /* ── Mini map for pickup preview (inside form only) ── */
  useEffect(() => {
    if (!pickupCoords || !miniMapDiv.current) return;

    const build = () => {
      const L = window.L;
      if (!L) return;

      if (miniMap.current) {
        miniMap.current.setView([pickupCoords.lat, pickupCoords.lng], 15);
        miniMarker.current?.setLatLng([pickupCoords.lat, pickupCoords.lng]);
        setTimeout(() => miniMap.current?.invalidateSize(), 100);
        return;
      }

      const map = L.map(miniMapDiv.current, {
        center:           [pickupCoords.lat, pickupCoords.lng],
        zoom:             15,
        zoomControl:      false,
        attributionControl: false,
        dragging:         false,
        scrollWheelZoom:  false,
        doubleClickZoom:  false,
        touchZoom:        false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#2563EB;border:3px solid #fff;
          box-shadow:0 2px 6px rgba(37,99,235,0.5);
        "></div>`,
        iconSize:   [18, 18],
        iconAnchor: [9, 9],
      });

      miniMarker.current = L.marker([pickupCoords.lat, pickupCoords.lng], { icon }).addTo(map);
      miniMap.current    = map;
      setTimeout(() => map.invalidateSize(), 150);
    };

    // Leaflet already loaded by CustomerHero — reuse it
    if (window.L) {
      build();
    } else {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const script    = document.createElement("script");
      script.src      = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload   = build;
      document.head.appendChild(script);
    }
  }, [pickupCoords]);

  /* ── Nominatim search ── */
  const searchLocation = async (field, query) => {
    if (!query || query.length < 2) {
      field === "area" ? setSuggestions([]) : setDropSuggestions([]);
      return;
    }
    try {
      const r    = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { "User-Agent": "JJCallDriverApp/1.0" } }
      );
      const data = await r.json();
      field === "area" ? setSuggestions(data) : setDropSuggestions(data);
    } catch {}
  };

  const selectPickup = (s) => {
    setArea(s.display_name);
    setSuggestions([]);
    setPickupCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setErrors((e) => ({ ...e, area: "" }));
  };

  const selectDrop = (s) => {
    setDArea(s.display_name);
    setDropSuggestions([]);
    setErrors((e) => ({ ...e, darea: "" }));
  };

  /* ── 📍 Current Location → fills ONLY the pickup text box ── */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocLoading(true);
    setSuggestions([]);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          // Reverse geocode to get address string
          const r    = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "User-Agent": "JJCallDriverApp/1.0" } }
          );
          const data = await r.json();
          const addr = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

          // ✅ Only fill the input — home map is untouched
          setArea(addr);
          setPickupCoords({ lat: latitude, lng: longitude });
          setErrors((e) => ({ ...e, area: "" }));
        } catch {
          setArea(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setPickupCoords({ lat: latitude, lng: longitude });
        }
        setLocLoading(false);
      },
      (err) => {
        setLocLoading(false);
        if (err.code === 1) {
          alert(
            "Location permission denied.\n\nTo fix in Chrome:\n1. Click 🔒 in address bar\n2. Set Location → Allow\n3. Refresh the page"
          );
        } else if (err.code === 2) {
          alert("Location unavailable. Please check your device GPS.");
        } else {
          alert("Location request timed out. Please try again.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  /* ── Validate ── */
  const validate = () => {
    const e = {};
    if (!name.trim())  e.name  = "Name is required";
    if (!phone.trim()) e.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter valid 10-digit number";
    if (!area.trim())  e.area  = "Pickup location required";
    if (!darea.trim()) e.darea = "Drop location required";
    if (!triptype)     e.triptype = "Select trip type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit ── */
 const handleSubmit = async () => {
  if (!validate()) return;
  try {
    const bookingPhone = localStorage.getItem("customerPhone") 
                      || localStorage.getItem("userPhone") 
                      || phone; // ← fallback to the phone entered in form

    if (!bookingPhone) {
      alert("Session expired. Please login again.");
      return;
    }

    const res = await axios.post(`${BASE_URL}/api/trip-booking`, {
      name,
      phone,
      pickup:      area,
      pickupLat:   pickupCoords?.lat || null,
      pickupLng:   pickupCoords?.lng || null,
      drop:        darea,
      triptype,
      bookingphnno: bookingPhone,
    });
    if (res.data.success) {
      if (miniMap.current) { miniMap.current.remove(); miniMap.current = null; }
      onClose();
      onSuccess();
    }
  } catch (err) {
    console.error("Booking error:", err.response?.data);
    alert("Failed to submit booking. Please try again.");
  }
};
  if (!visible) return null;

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.sheet} onClick={(e) => e.stopPropagation()}>
        <button style={st.closeBtn} onClick={onClose}>✕</button>
        <h2 style={st.sheetTitle}>Book a Ride</h2>

        {/* Name */}
        <label style={st.label}>Full Name</label>
        <input
          style={{ ...st.input, ...(errors.name ? st.inputErr : {}) }}
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p style={st.err}>{errors.name}</p>}

        {/* Phone */}
        <label style={st.label}>Phone Number</label>
        <input
          style={{ ...st.input, ...(errors.phone ? st.inputErr : {}) }}
          placeholder="10-digit mobile number"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />
        {errors.phone && <p style={st.err}>{errors.phone}</p>}

        {/* ── Pickup with current location button ── */}
        <label style={st.label}>Pickup Location</label>
        <div style={{ position: "relative" }}>
          <div style={st.inputRow}>
            <input
              style={{
                ...st.inputInner,
                ...(errors.area ? { borderColor: "#EF4444" } : {}),
              }}
              placeholder="Search pickup area..."
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setPickupCoords(null);
                searchLocation("area", e.target.value);
              }}
            />

            {/* 📍 Current location button */}
            <button
              style={st.locBtn}
              onClick={getCurrentLocation}
              title="Use my current location"
              disabled={locLoading}
            >
              {locLoading ? (
                <div style={st.spinner} />
              ) : (
                /* Location crosshair icon */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" fill="#2563EB" fillOpacity="0.2"/>
                  <circle cx="12" cy="12" r="7"/>
                  <line x1="12" y1="2"  x2="12" y2="5"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="2"  y1="12" x2="5"  y2="12"/>
                  <line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
              )}
            </button>
          </div>

          {/* Pickup suggestions */}
          {suggestions.length > 0 && (
            <div style={st.suggBox}>
              {suggestions.map((s, i) => (
                <div key={i} style={st.suggItem} onClick={() => selectPickup(s)}>
                  <span style={{ marginRight: 8, flexShrink: 0, fontSize: 14 }}>📍</span>
                  <span style={{ fontSize: 12, color: "#1E293B", lineHeight: 1.4 }}>{s.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {errors.area && <p style={st.err}>{errors.area}</p>}

        {/* ── Mini map preview (only inside form, home map unchanged) ── */}
        {pickupCoords && (
          <div style={st.miniMapWrap}>
            <div ref={miniMapDiv} style={st.miniMap} />
            <div style={st.miniMapFooter}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>
                Pickup location set
              </span>
              <button
                style={st.clearLocBtn}
                onClick={() => { setArea(""); setPickupCoords(null); if (miniMap.current) { miniMap.current.remove(); miniMap.current = null; } }}
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}

        {/* Drop */}
        <label style={st.label}>Drop Location</label>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...st.input, ...(errors.darea ? st.inputErr : {}) }}
            placeholder="Search drop area..."
            value={darea}
            onChange={(e) => { setDArea(e.target.value); searchLocation("darea", e.target.value); }}
          />
          {dropSuggestions.length > 0 && (
            <div style={st.suggBox}>
              {dropSuggestions.map((s, i) => (
                <div key={i} style={st.suggItem} onClick={() => selectDrop(s)}>
                  <span style={{ marginRight: 8, flexShrink: 0, fontSize: 14 }}>🏁</span>
                  <span style={{ fontSize: 12, color: "#1E293B", lineHeight: 1.4 }}>{s.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {errors.darea && <p style={st.err}>{errors.darea}</p>}

        {/* Trip Type */}
        <label style={st.label}>Trip Type</label>
        <div style={{ display: "flex", gap: 10, margin: "6px 0 4px" }}>
          {["local", "outstation"].map((t) => (
            <button
              key={t}
              style={{ ...st.tripBtn, ...(triptype === t ? st.tripActive : {}) }}
              onClick={() => setTriptype(t)}
            >
              {t === "local" ? "🏙️ Local" : "🛣️ Outstation"}
            </button>
          ))}
        </div>
        {errors.triptype && <p style={st.err}>{errors.triptype}</p>}

        <button style={st.submitBtn} onClick={handleSubmit}>
          🚖 Book Ride
        </button>
      </div>
    </div>
  );
};

export default BookingForm;

const st = {
  overlay:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  sheet:      { position: "relative", width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 28, padding: "48px 20px 24px", maxHeight: "92vh", overflowY: "auto" },
  closeBtn:   { position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", backgroundColor: "#F8FAFC", border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer" },
  sheetTitle: { margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "#1E293B", textAlign: "center" },
  label:      { display: "block", fontSize: 13, fontWeight: 600, color: "#64748B", margin: "10px 0 4px" },
  input:      { width: "100%", boxSizing: "border-box", backgroundColor: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#1E293B", outline: "none" },
  inputErr:   { borderColor: "#EF4444" },
  err:        { margin: "4px 0 0", fontSize: 12, color: "#EF4444" },

  inputRow:   { display: "flex", alignItems: "center", gap: 8 },
  inputInner: { flex: 1, boxSizing: "border-box", backgroundColor: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#1E293B", outline: "none" },

  locBtn: {
    flexShrink: 0, width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#EFF6FF", border: "1.5px solid #BFDBFE",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "background 0.2s",
  },
  spinner: {
    width: 18, height: 18,
    border: "2.5px solid #bfdbfe", borderTopColor: "#2563EB",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },

  suggBox:  { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#fff", borderRadius: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", zIndex: 20, maxHeight: 200, overflowY: "auto", marginTop: 4 },
  suggItem: { display: "flex", alignItems: "flex-start", padding: "10px 14px", borderBottom: "1px solid #F1F5F9", cursor: "pointer" },

  miniMapWrap:   { margin: "8px 0 4px", borderRadius: 14, overflow: "hidden", border: "1.5px solid #BFDBFE" },
  miniMap:       { width: "100%", height: 110 },
  miniMapFooter: { display: "flex", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", padding: "6px 12px" },
  clearLocBtn:   { marginLeft: "auto", background: "none", border: "none", fontSize: 11, color: "#EF4444", fontWeight: 700, cursor: "pointer" },

  tripBtn:    { flex: 1, padding: "12px 0", borderRadius: 14, border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC", fontSize: 14, fontWeight: 600, color: "#64748B", cursor: "pointer" },
  tripActive: { backgroundColor: "#2563EB", borderColor: "#2563EB", color: "#fff" },
  submitBtn:  { width: "100%", padding: "16px 0", backgroundColor: "#2563EB", border: "none", borderRadius: 18, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", marginTop: 12, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" },
};