import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BASE_URL } from "../../utils/constants";

const OFFICE_LAT  = 12.9516;
const OFFICE_LNG  = 80.1462;
const OFFICE_NAME = "JJ Call Drivers, Gowrivakkam";

const CustomerHero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fareInfo, setFareInfo] = useState({ base_hours: null, base_fare: null, extra_per_hr: null });
  const mapDivRef  = useRef(null);
  const leafletMap = useRef(null);

  /* ── Fetch fare rates ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/master-settings`);
        setFareInfo({
          base_hours:   data.base_hours   ?? null,
          base_fare:    data.base_fare    ?? null,
          extra_per_hr: data.extra_per_hr ?? null,
        });
      } catch {}
    })();
  }, []);

  /* ── Build carousel dynamically ── */
  const carouselData = [
    {
      id: "1",
      icon: "⭐",
      title: "Trusted by Thousands",
      description: "Over 50,000+ happy customers across Chennai",
      rating: "4.8/5.0",
    },
    {
      id: "2",
      icon: "💰",
      title: fareInfo.base_fare != null && fareInfo.base_hours != null
        ? `₹${fareInfo.base_fare} for ${fareInfo.base_hours} Hours`
        : "Best Prices Guaranteed",
      description: fareInfo.base_fare != null && fareInfo.extra_per_hr != null && fareInfo.base_hours != null
        ? `Flat ₹${fareInfo.base_fare} up to ${fareInfo.base_hours} hrs · +₹${fareInfo.extra_per_hr}/hr after that`
        : "Transparent pricing with no hidden charges",
      rating: null,
    },
    {
      id: "3",
      icon: "🚗",
      title: "Professional Drivers",
      description: "Verified and experienced drivers at your service",
      rating: null,
    },
    {
      id: "4",
      icon: "⏱️",
      title: "24/7 Service",
      description: "Available round the clock for your convenience",
      rating: null,
    },
  ];

  /* ── Auto-slide ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [carouselData.length]);

  /* ── Swipe handlers ── */
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      setCurrentSlide((prev) =>
        diff > 0
          ? (prev + 1) % carouselData.length
          : (prev - 1 + carouselData.length) % carouselData.length
      );
    }
    touchStartX.current = null;
  };

  /* ── Init Leaflet map ── */
  useEffect(() => {
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
        center: [OFFICE_LAT, OFFICE_LNG], zoom: 15,
        zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false,
        doubleClickZoom: false, touchZoom: false, keyboard: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const officeIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:#2563EB;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(37,99,235,0.4);margin-bottom:4px;">🏢 JJ Call Drivers</div>
          <div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>
          <div style="width:2px;height:8px;background:#2563EB;"></div>
        </div>`,
        iconSize: [140, 60], iconAnchor: [70, 60],
      });
      L.marker([OFFICE_LAT, OFFICE_LNG], { icon: officeIcon }).addTo(map);
      leafletMap.current = map;
    };

    if (window.L) initMap();
    else {
      const script  = document.createElement("script");
      script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, []);

  const slide = carouselData[currentSlide];

  return (
    <section style={s.heroSection}>
      <div ref={mapDivRef} style={s.mapContainer} />
      <div style={s.mapOverlay} />

      <div style={s.officeTag}>
        <span style={{ fontSize: 13 }}>📍</span>
        <span style={s.officeTagText}>{OFFICE_NAME}</span>
      </div>

      {/* Fare badge — only when rates loaded */}
      {fareInfo.base_fare != null && (
        <div style={s.fareBadge}>
          <span style={s.fareBadgeText}>
            ₹{fareInfo.base_fare} / {fareInfo.base_hours}hrs
          </span>
        </div>
      )}

      <div style={s.carouselWrap}>
        <div style={s.carouselCard} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
  heroSection:   { position: "relative", height: 290, overflow: "hidden", borderRadius: "0 0 28px 28px", marginBottom: 20 },
  mapContainer:  { position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 },
  mapOverlay:    { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(15,23,42,0.45) 100%)", zIndex: 1, pointerEvents: "none" },
  officeTag:     { position: "absolute", top: 12, left: 12, zIndex: 3, display: "flex", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "5px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" },
  officeTagText: { fontSize: 11, fontWeight: 700, color: "#2563EB" },
  fareBadge:     { position: "absolute", top: 12, right: 12, zIndex: 3, backgroundColor: "#2563EB", borderRadius: 20, padding: "5px 14px", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" },
  fareBadgeText: { fontSize: 12, fontWeight: 800, color: "#fff" },
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
