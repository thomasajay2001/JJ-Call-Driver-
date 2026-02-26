import React, { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────
   CustomerHero — Real Leaflet Map
   Default: JJ Call Drivers, Gowrivakkam, Chennai
   Map is STATIC (shows office location always)
   Current location only works in BookingForm
   ───────────────────────────────────────── */

const carouselData = [
  { id: "1", icon: "🌟", title: "Trusted by Thousands",   description: "Over 50,000+ happy customers across Chennai", rating: "4.8/5.0" },
  { id: "2", icon: "💰", title: "Best Prices Guaranteed", description: "Transparent pricing with no hidden charges",   rating: null },
  { id: "3", icon: "🚗", title: "Professional Drivers",   description: "Verified and experienced drivers at your service", rating: null },
  { id: "4", icon: "⏱️", title: "24/7 Service",          description: "Available round the clock for your convenience",  rating: null },
];

// ✅ JJ Call Drivers — Gowrivakkam, Chennai
const OFFICE_LAT = 12.9516;
const OFFICE_LNG = 80.1462;
const OFFICE_NAME = "JJ Call Drivers, Gowrivakkam";

const CustomerHero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const mapDivRef  = useRef(null);
  const leafletMap = useRef(null);

  /* ── Auto-slide carousel ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── Init Leaflet map (fixed to office location) ── */
  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapDivRef.current || leafletMap.current) return;
      const L = window.L;

      const map = L.map(mapDivRef.current, {
        center:           [OFFICE_LAT, OFFICE_LNG],
        zoom:             15,
        zoomControl:      false,
        attributionControl: false,
        // Disable all interaction — purely decorative map
        dragging:         false,
        scrollWheelZoom:  false,
        doubleClickZoom:  false,
        touchZoom:        false,
        keyboard:         false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Office marker with label
      const officeIcon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="
              background:#2563EB;
              color:#fff;
              font-size:11px;
              font-weight:700;
              padding:4px 10px;
              border-radius:20px;
              white-space:nowrap;
              box-shadow:0 2px 8px rgba(37,99,235,0.4);
              margin-bottom:4px;
            ">🏢 JJ Call Drivers</div>
            <div style="
              width:16px;height:16px;
              border-radius:50%;
              background:#2563EB;
              border:3px solid #fff;
              box-shadow:0 2px 8px rgba(37,99,235,0.5);
            "></div>
            <div style="
              width:2px;height:8px;
              background:#2563EB;
            "></div>
          </div>`,
        iconSize:   [140, 60],
        iconAnchor: [70, 60],
      });

      L.marker([OFFICE_LAT, OFFICE_LNG], { icon: officeIcon }).addTo(map);

      leafletMap.current = map;
    };

    if (window.L) {
      initMap();
    } else {
      const script    = document.createElement("script");
      script.src      = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload   = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const slide = carouselData[currentSlide];

  return (
    <section style={s.heroSection}>
      {/* ── Real Map (fixed to office) ── */}
      <div ref={mapDivRef} style={s.mapContainer} />

      {/* Dark gradient overlay */}
      <div style={s.mapOverlay} />

      {/* Office label at top */}
      <div style={s.officeTag}>
        <span style={{ fontSize: 13 }}>📍</span>
        <span style={s.officeTagText}>{OFFICE_NAME}</span>
      </div>

      {/* ── Carousel Card ── */}
      <div style={s.carouselWrap}>
        <div style={s.carouselCard}>
          <div style={s.iconWrap}>
            <span style={{ fontSize: 22 }}>{slide.icon}</span>
          </div>
          <h3 style={s.title}>{slide.title}</h3>
          <p style={s.desc}>{slide.description}</p>
          {slide.rating && (
            <div style={s.ratingWrap}>
              <span style={{ fontSize: 11 }}>⭐⭐⭐⭐⭐</span>
              <span style={s.ratingNum}>{slide.rating}</span>
            </div>
          )}
        </div>

        {/* Dots */}
        <div style={s.dotsRow}>
          {carouselData.map((_, i) => (
            <button
              key={i}
              style={{ ...s.dot, ...(i === currentSlide ? s.dotActive : {}) }}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerHero;

const s = {
  heroSection:  { position: "relative", height: 290, overflow: "hidden", borderRadius: "0 0 28px 28px", marginBottom: 20 },
  mapContainer: { position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 },
  mapOverlay:   { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(15,23,42,0.45) 100%)", zIndex: 1, pointerEvents: "none" },

  // Office label top-left
  officeTag: {
    position:       "absolute",
    top:            12,
    left:           12,
    zIndex:         3,
    display:        "flex",
    alignItems:     "center",
    gap:            5,
    backgroundColor:"rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    borderRadius:   20,
    padding:        "5px 12px",
    boxShadow:      "0 2px 8px rgba(0,0,0,0.12)",
  },
  officeTagText: { fontSize: 11, fontWeight: 700, color: "#2563EB" },

  // Carousel
  carouselWrap:  { position: "absolute", bottom: 14, left: 0, right: 0, padding: "0 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 },
  carouselCard:  { width: "100%", maxWidth: 420, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "12px 18px", backdropFilter: "blur(12px)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", alignItems: "center" },
  iconWrap:      { width: 42, height: 42, borderRadius: "50%", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title:         { margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "#1E293B", textAlign: "center" },
  desc:          { margin: 0, fontSize: 12, color: "#64748B", textAlign: "center" },
  ratingWrap:    { display: "flex", alignItems: "center", gap: 6, marginTop: 5 },
  ratingNum:     { fontSize: 13, fontWeight: 700, color: "#2563EB" },
  dotsRow:       { display: "flex", gap: 6 },
  dot:           { width: 7, height: 7, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.6)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s" },
  dotActive:     { backgroundColor: "#2563EB", width: 20, borderRadius: 4 },
};