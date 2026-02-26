export const BASE_URL = "http://localhost:3000";

export const COLORS = {
  primary: "#2563EB",
  secondary: "#3B82F6",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  textMain: "#1E293B",
  textMuted: "#64748B",
  border: "#CBD5E1",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
};

export const CHENNAI_POPULAR_PLACES = [
  { id: "1", name: "Marina Beach", address: "Kamaraj Salai, Chennai", lat: 13.0499, lon: 80.2824, icon: "🏖️" },
  { id: "2", name: "T Nagar", address: "Thyagaraya Nagar, Chennai", lat: 13.0418, lon: 80.2341, icon: "🛍️" },
  { id: "3", name: "Chennai Central", address: "Railway Station, Chennai", lat: 13.0827, lon: 80.2707, icon: "🚉" },
  { id: "4", name: "Phoenix MarketCity", address: "Velachery Main Road, Chennai", lat: 12.9926, lon: 80.2207, icon: "🏬" },
  { id: "5", name: "Besant Nagar Beach", address: "Elliot's Beach, Chennai", lat: 13.0006, lon: 80.2661, icon: "🌊" },
];

export const TAMILNADU_OUTSTATION_PLACES = [
  { id: "1", name: "Mahabalipuram", address: "Mahabalipuram, Tamil Nadu", lat: 12.6208, lon: 80.1925, icon: "🏛️" },
  { id: "2", name: "Pondicherry", address: "Pondicherry, Tamil Nadu", lat: 11.9416, lon: 79.8083, icon: "🌴" },
  { id: "3", name: "Mahabalipuram Temple", address: "Shore Temple Road, Mahabalipuram", lat: 12.6167, lon: 80.1833, icon: "⛩️" },
  { id: "4", name: "Yelagiri Hills", address: "Yelagiri, Vellore District", lat: 12.5833, lon: 78.6333, icon: "⛰️" },
  { id: "5", name: "Vellore Fort", address: "Vellore, Tamil Nadu", lat: 12.9165, lon: 79.1325, icon: "🏰" },
];

export const STATUS_CONFIG = {
  completed: { bg: "#D1FAE5", color: "#065F46", label: "✅ Completed" },
  inride:    { bg: "#FEF3C7", color: "#92400E", label: "🟡 In Ride" },
  assigned:  { bg: "#EFF6FF", color: "#1D4ED8", label: "🔵 Assigned" },
  accepted:  { bg: "#EDE9FE", color: "#5B21B6", label: "🟣 Accepted" },
  pending:   { bg: "#F1F5F9", color: "#475569", label: "⏳ Pending" },
};

export const DATE_FILTERS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisweek", label: "This Week" },
  { key: "thismonth", label: "This Month" },
];

export const SUPPORT_NUMBER = "7550118666";

export const getStatusConfig = (status) =>
  STATUS_CONFIG[status?.toLowerCase()] ?? { bg: "#F1F5F9", color: "#475569", label: status || "Unknown" };

export const formatBookingDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ` · ${time}`;
};
