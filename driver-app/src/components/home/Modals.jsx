import React from "react";
import { CHENNAI_POPULAR_PLACES, TAMILNADU_OUTSTATION_PLACES, SUPPORT_NUMBER } from "../../utils/constants";

/* ─────────────────────────────────────────
   Modal Wrapper
   ───────────────────────────────────────── */
const ModalOverlay = ({ visible, onClose, children, wide }) => {
  if (!visible) return null;
  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={{ ...sheet, ...(wide ? { maxWidth: 500 } : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={closeBtn} onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
};

const overlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};
const sheet = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  backgroundColor: "#fff",
  borderRadius: 28,
  padding: "48px 20px 24px",
  maxHeight: "85vh",
  overflowY: "auto",
};
const closeBtn = {
  position: "absolute",
  top: 14,
  right: 14,
  width: 36,
  height: 36,
  borderRadius: "50%",
  backgroundColor: "#F8FAFC",
  border: "none",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

/* ─────────────────────────────────────────
   PlacesModal — Chennai popular places
   ───────────────────────────────────────── */
export const PlacesModal = ({ visible, onClose, onSelect }) => (
  <ModalOverlay visible={visible} onClose={onClose}>
    <h2 style={mTitle}>Popular Places in Chennai</h2>
    <p style={mSub}>Select a destination for your local ride</p>
    <div style={{ marginTop: 16 }}>
      {CHENNAI_POPULAR_PLACES.map((place) => (
        <button key={place.id} style={placeCard} onClick={() => onSelect(place)}>
          <div style={placeIconWrap}>
            <span style={{ fontSize: 24 }}>{place.icon}</span>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{place.name}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>{place.address}</p>
          </div>
          <span style={{ fontSize: 28, color: "#CBD5E1" }}>›</span>
        </button>
      ))}
    </div>
  </ModalOverlay>
);

/* ─────────────────────────────────────────
   OutstationModal — Tamil Nadu outstation places
   ───────────────────────────────────────── */
export const OutstationModal = ({ visible, onClose, onSelect }) => (
  <ModalOverlay visible={visible} onClose={onClose}>
    <h2 style={mTitle}>Outstation Places</h2>
    <p style={mSub}>Select a destination for your outstation trip</p>
    <div style={{ marginTop: 16 }}>
      {TAMILNADU_OUTSTATION_PLACES.map((place) => (
        <button key={place.id} style={placeCard} onClick={() => onSelect(place)}>
          <div style={placeIconWrap}>
            <span style={{ fontSize: 24 }}>{place.icon}</span>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{place.name}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>{place.address}</p>
          </div>
          <span style={{ fontSize: 28, color: "#CBD5E1" }}>›</span>
        </button>
      ))}
    </div>
  </ModalOverlay>
);

/* ─────────────────────────────────────────
   CustomerHistoryModal — booking history list
   ───────────────────────────────────────── */
export const CustomerHistoryModal = ({ visible, onClose, bookings }) => (
  <ModalOverlay visible={visible} onClose={onClose}>
    <h2 style={mTitle}>Booking History</h2>
    <p style={mSub}>Your previous rides</p>
    <div style={{ marginTop: 16 }}>
      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <span style={{ fontSize: 48 }}>📜</span>
          <p style={{ fontWeight: 700, color: "#1E293B", margin: "12px 0 4px" }}>No booking history yet</p>
          <p style={{ color: "#64748B", fontSize: 13 }}>Your completed rides will appear here</p>
        </div>
      ) : (
        bookings.map((item) => (
          <div key={item.id} style={histCard}>
            <div style={histHeader}>
              <span style={histBadge}>{item.triptype?.toUpperCase() || "LOCAL"}</span>
              <span style={histDate}>
                {new Date(item.created_at).toLocaleDateString("en-GB")} at{" "}
                {new Date(item.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </span>
            </div>
            <div style={histRoute}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span>📍</span>
                <p style={histLocText}>{item.pickup}</p>
              </div>
              <div style={{ width: 2, height: 12, backgroundColor: "#CBD5E1", marginLeft: 4, marginBottom: 8 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🏁</span>
                <p style={histLocText}>{item.drop_location}</p>
              </div>
            </div>
            <div style={histFooter}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#10B981" }}>{item.status}</span>
            </div>
          </div>
        ))
      )}
    </div>
  </ModalOverlay>
);

/* ─────────────────────────────────────────
   HelpModal — support contact
   ───────────────────────────────────────── */
export const HelpModal = ({ visible, onClose }) => {
  const callSupport = () => {
    window.location.href = `tel:${SUPPORT_NUMBER}`;
  };

  return (
    <ModalOverlay visible={visible} onClose={onClose}>
      <div style={{ textAlign: "center", padding: "0 8px" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 40 }}>
          📞
        </div>
        <h2 style={{ ...mTitle, marginBottom: 8 }}>Need Help?</h2>
        <p style={mSub}>Our support team is here to assist you</p>
        <div style={{ backgroundColor: "#F8FAFC", borderRadius: 20, padding: 24, marginTop: 20 }}>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#2563EB" }}>JJ Call Drivers</p>
          <p style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1E293B" }}>Support Team</p>
          <button
            style={{ width: "100%", padding: "14px 0", backgroundColor: "#2563EB", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer" }}
            onClick={callSupport}
          >
            📱 Call Now
          </button>
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: "#64748B" }}>Available 24/7 for your assistance</p>
      </div>
    </ModalOverlay>
  );
};

/* ─────────────────────────────────────────
   SuccessModal — booking confirmed
   ───────────────────────────────────────── */
export const SuccessModal = ({ visible, onClose }) => (
  <ModalOverlay visible={visible} onClose={onClose}>
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 48 }}>
        ✅
      </div>
      <h2 style={{ ...mTitle, marginBottom: 12 }}>Booking Confirmed!</h2>
      <p style={{ color: "#64748B", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
        Your ride has been booked successfully. A driver will be assigned shortly.
      </p>
      <button
        style={{ backgroundColor: "#2563EB", border: "none", borderRadius: 16, padding: "14px 48px", fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer" }}
        onClick={onClose}
      >
        OK
      </button>
    </div>
  </ModalOverlay>
);

/* Shared style values */
const mTitle = { margin: "0 0 6px", fontSize: 19, fontWeight: 700, textAlign: "center", color: "#1E293B" };
const mSub = { margin: 0, fontSize: 14, textAlign: "center", color: "#64748B", marginBottom: 8 };
const placeCard = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  backgroundColor: "#F8FAFC",
  border: "none",
  borderRadius: 18,
  padding: 16,
  marginBottom: 12,
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
};
const placeIconWrap = {
  width: 50,
  height: 50,
  borderRadius: "50%",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};
const histCard = {
  backgroundColor: "#F8FAFC",
  borderRadius: 18,
  padding: 16,
  marginBottom: 12,
  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
};
const histHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};
const histBadge = {
  backgroundColor: "#2563EB",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 700,
};
const histDate = { fontSize: 13, color: "#64748B", fontWeight: 600 };
const histRoute = { marginBottom: 12 };
const histLocText = {
  margin: 0,
  fontSize: 14,
  color: "#1E293B",
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const histFooter = {
  borderTop: "1px solid #CBD5E1",
  paddingTop: 12,
};
