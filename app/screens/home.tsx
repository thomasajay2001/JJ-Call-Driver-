import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard, Linking, Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Region } from "react-native-maps";

const { width, height } = Dimensions.get("window");
const BASE_URL = (Constants.expoConfig!.extra as any).BASE_URL;

/* ================= COLORS ================= */
const COLORS = {
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

/* ================= TYPES ================= */
type role = "customer" | "driver" | "";

type Suggestion = {
  place_id?: string;
  display_name: string;
  lat: string;
  lon: string;
};

type Notification = {
  bookingId: string;
  name: string;
  pickup: string;
  drop: string;
  amount?: number;
};

type ChennaiPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  icon: string;
};

type DriverProfile = {
  ID: number;
  NAME: string;
  MOBILE: string;
  BLOODGRP: string;
  LICENCENO: string;
  total_rides: number;
};

type DateFilter = "all" | "today" | "yesterday" | "thisweek" | "thismonth";

/* ================= HELPER: status config ================= */
const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: "#D1FAE5", color: "#065F46", label: "✅ Completed" },
  inride:    { bg: "#FEF3C7", color: "#92400E", label: "🟡 In Ride" },
  assigned:  { bg: "#EFF6FF", color: "#1D4ED8", label: "🔵 Assigned" },
  accepted:  { bg: "#EDE9FE", color: "#5B21B6", label: "🟣 Accepted" },
  pending:   { bg: "#F1F5F9", color: "#475569", label: "⏳ Pending" },
};
const getStatusConfig = (status: string) =>
  statusConfig[status?.toLowerCase()] ?? { bg: "#F1F5F9", color: "#475569", label: status || "Unknown" };

/* ================= HELPER: format date ================= */
const formatBookingDate = (dateStr: string) => {
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

/* ================= CHENNAI PLACES DATA ================= */
const CHENNAI_POPULAR_PLACES: ChennaiPlace[] = [
  { id: "1", name: "Marina Beach",       address: "Kamaraj Salai, Chennai",       lat: 13.0499, lon: 80.2824, icon: "🏖️" },
  { id: "2", name: "T Nagar",            address: "Thyagaraya Nagar, Chennai",     lat: 13.0418, lon: 80.2341, icon: "🛍️" },
  { id: "3", name: "Chennai Central",    address: "Railway Station, Chennai",       lat: 13.0827, lon: 80.2707, icon: "🚉" },
  { id: "4", name: "Phoenix MarketCity", address: "Velachery Main Road, Chennai",   lat: 12.9926, lon: 80.2207, icon: "🏬" },
  { id: "5", name: "Besant Nagar Beach", address: "Elliot's Beach, Chennai",        lat: 13.0006, lon: 80.2661, icon: "🌊" },
];

const TAMILNADU_OUTSTATION_PLACES: ChennaiPlace[] = [
  { id: "1", name: "Mahabalipuram",        address: "Mahabalipuram, Tamil Nadu",        lat: 12.6208, lon: 80.1925, icon: "🏛️" },
  { id: "2", name: "Pondicherry",          address: "Pondicherry, Tamil Nadu",          lat: 11.9416, lon: 79.8083, icon: "🌴" },
  { id: "3", name: "Mahabalipuram Temple", address: "Shore Temple Road, Mahabalipuram", lat: 12.6167, lon: 80.1833, icon: "⛩️" },
  { id: "4", name: "Yelagiri Hills",       address: "Yelagiri, Vellore District",       lat: 12.5833, lon: 78.6333, icon: "⛰️" },
  { id: "5", name: "Vellore Fort",         address: "Vellore, Tamil Nadu",              lat: 12.9165, lon: 79.1325, icon: "🏰" },
];

/* ================= DATE FILTER CONFIG ================= */
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all",       label: "All Time" },
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisweek",  label: "This Week" },
  { key: "thismonth", label: "This Month" },
];

/* ================= REUSABLE BOOKING CARD ================= */
const BookingCard = ({ item }: { item: any }) => {
  const sc = getStatusConfig(item.status);
  return (
    <View style={bCard.card}>
      <View style={bCard.topRow}>
        <View style={bCard.iconBox}>
          <Text style={{ fontSize: 20 }}>🚗</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={bCard.customerName} numberOfLines={1}>
            {item.customer_name || item.name || "—"}
          </Text>
          <Text style={bCard.dateText}>{formatBookingDate(item.created_at)}</Text>
        </View>
        <View style={[bCard.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[bCard.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>
      <View style={bCard.routeBox}>
        <View style={bCard.routeRow}>
          <View style={[bCard.dot, { backgroundColor: COLORS.success }]} />
          <Text style={bCard.routeText} numberOfLines={1}>{item.pickup}</Text>
        </View>
        <View style={bCard.routeLine} />
        <View style={bCard.routeRow}>
          <View style={[bCard.dot, { backgroundColor: COLORS.danger }]} />
          <Text style={bCard.routeText} numberOfLines={1}>{item.drop_location || item.drop}</Text>
        </View>
      </View>
      {item.triptype ? (
        <View style={bCard.typePill}>
          <Text style={bCard.typeText}>{item.triptype.toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
};

const bCard = StyleSheet.create({
  card:         { backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, marginHorizontal: 16, marginBottom: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  topRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  iconBox:      { width: 42, height: 42, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  customerName: { fontSize: 14, fontWeight: "700", color: COLORS.textMain },
  dateText:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge:  { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText:   { fontSize: 11, fontWeight: "700" },
  routeBox:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 10 },
  routeRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  routeLine:    { width: 2, height: 10, backgroundColor: COLORS.border, marginLeft: 3, marginVertical: 2 },
  routeText:    { fontSize: 12, color: COLORS.textMain, flex: 1 },
  typePill:     { alignSelf: "flex-start", marginTop: 8, backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  typeText:     { fontSize: 10, fontWeight: "700", color: COLORS.primary },
});

/* ================= COMPONENT ================= */
const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");

  /* ── Shared modal state ── */
  const [showBookingForm,     setShowBookingForm]     = useState(false);
  const [showPlacesPopup,     setShowPlacesPopup]     = useState(false);
  const [showOutstationPopup, setShowOutstationPopup] = useState(false);
  const [showHistory,         setShowHistory]         = useState(false);
  const [showHelp,            setShowHelp]            = useState(false);
  const [showSuccessModal,    setShowSuccessModal]    = useState(false);

  /* ── Driver full history modal ── */
  const [showDriverHistory, setShowDriverHistory] = useState(false);
  const [historyFilter,     setHistoryFilter]     = useState<DateFilter>("all");
  const [allDriverBookings, setAllDriverBookings] = useState<any[]>([]);
  const [historyLoading,    setHistoryLoading]    = useState(false);

  /* ── Customer form state ── */
  const [phoneError,         setPhoneError]         = useState("");
  const [bookingHistory,     setBookingHistory]     = useState<any[]>([]);
  const [name,               setName]               = useState("");
  const [phone,              setPhone]              = useState("");
  const [area,               setArea]               = useState("");
  const [darea,              setDArea]              = useState("");
  const [triptype,           setTriptype]           = useState<"local" | "outstation" | "">("");
  const [bookingphnno,       setBookingPhnNo]       = useState("");
  const [suggestions,        setSuggestions]        = useState<Suggestion[]>([]);
  const [dropsuggestions,    setDropsuggestions]    = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingLocation,    setLoadingLocation]    = useState(false);
  const [coordsPreview,      setCoordsPreview]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [errors,             setErrors]             = useState({ name: "", phone: "", area: "", darea: "", triptype: "" });

  /* ── Driver state ── */
  const [isOnline,      setIsOnline]      = useState(false);
  const [activeRide,    setActiveRide]    = useState<Notification | null>(null);
  const [rideAccepted,  setRideAccepted]  = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings]                   = useState(4200);
  const [driverName,    setDriverName]    = useState("Driver");

  /* ── Driver profile ── */
  const [driverIdDisplay, setDriverIdDisplay] = useState<string>("");
  const [totalTrips,      setTotalTrips]      = useState<number>(0);
  const [profileLoading,  setProfileLoading]  = useState(false);

  /* ── Driver recent bookings (max 4, shown inside offline box) ── */
  const [recentDriverTrips, setRecentDriverTrips] = useState<any[]>([]);
  const [tripsLoading,      setTripsLoading]      = useState(false);

  const mapRef        = useRef<MapView | null>(null);
  const carouselRef   = useRef<FlatList | null>(null);
  const refreshRef    = useRef<any>(null);                // auto-refresh for bookings
  const [currentSlide, setCurrentSlide] = useState(0);

  const carouselData = [
    { id: "1", icon: "🌟", title: "Trusted by Thousands",   description: "Over 50,000+ happy customers across Chennai", rating: "4.8/5.0" },
    { id: "2", icon: "💰", title: "Best Prices Guaranteed", description: "Transparent pricing with no hidden charges",   rating: null },
    { id: "3", icon: "🚗", title: "Professional Drivers",   description: "Verified and experienced drivers at your service", rating: null },
    { id: "4", icon: "⏱️", title: "24/7 Service",          description: "Available round the clock for your convenience",   rating: null },
  ];

  const features = [
    { id: "1", title: "Local Ride", icon: "🚖" },
    { id: "2", title: "Outstation", icon: "🛣️" },
    { id: "3", title: "History",    icon: "📜" },
    { id: "4", title: "Help",       icon: "🎧" },
  ];

  /* ================= INIT ================= */
  useEffect(() => {
    AsyncStorage.getItem("customerPhone").then((p) => setBookingPhnNo(p || ""));
    AsyncStorage.getItem("role").then((r) => setRole((r as role) || ""));
    AsyncStorage.getItem("driverName").then((n) => { if (n) setDriverName(n); });
    AsyncStorage.getItem("driverId").then((id) => {
      if (id) {
        setDriverIdDisplay(id);
        fetchDriverProfile(id);
        fetchDriverBookings(id);          // initial load
        // ── Same auto-refresh pattern as RideTab (4 s interval) ──
        refreshRef.current = setInterval(() => fetchDriverBookings(id), 4000);
      }
    });
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, []);

  /* ================= FETCH DRIVER PROFILE ================= */
  const fetchDriverProfile = async (driverId: string) => {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers/profile?driverId=${driverId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        const p: DriverProfile = res.data[0];
        setDriverName(p.NAME);
        setTotalTrips(p.total_rides || 0);
      }
    } catch (e) {
      console.warn("Profile fetch error:", e);
    } finally {
      setProfileLoading(false);
    }
  };

  /* ===============================================================
     ✅ FETCH 4 RECENT BOOKINGS — same dual-endpoint logic as RideTab
     Called on mount + every 4 s via refreshRef interval
     =============================================================== */
  const fetchDriverBookings = async (driverId: string) => {
    setTripsLoading(true);
    try {
      let list: any[] = [];
      try {
        const res = await axios.get(
          `${BASE_URL}/api/bookings/driver/all?driverId=${driverId}`
        );
        list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      } catch {
        // Fall back to the same endpoint RideTab uses
        const res2 = await axios.get(
          `${BASE_URL}/api/bookings/driver?driverId=${driverId}`
        );
        list = Array.isArray(res2.data) ? res2.data : [];
      }
      setRecentDriverTrips(list.slice(0, 4));
    } catch (e) {
      console.warn("Bookings fetch error:", e);
      setRecentDriverTrips([]);
    } finally {
      setTripsLoading(false);
    }
  };

  /* ================= FETCH ALL BOOKINGS (history modal) ================= */
  const fetchAllDriverBookings = async (driverId: string, filter: DateFilter) => {
    setHistoryLoading(true);
    try {
      const params = filter !== "all" ? `&filter=${filter}` : "";
      let list: any[] = [];
      try {
        const res = await axios.get(`${BASE_URL}/api/bookings/driver/all?driverId=${driverId}${params}`);
        list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      } catch {
        const res2 = await axios.get(`${BASE_URL}/api/bookings/driver?driverId=${driverId}`);
        list = Array.isArray(res2.data) ? res2.data : [];
      }
      setAllDriverBookings(list);
    } catch (e) {
      console.warn("All bookings fetch error:", e);
      setAllDriverBookings([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (showDriverHistory && driverIdDisplay) {
      fetchAllDriverBookings(driverIdDisplay, historyFilter);
    }
  }, [showDriverHistory, historyFilter]);

  /* ================= INCOMING RIDE ================= */
  useEffect(() => {
    if (role === "driver" && isOnline && notifications.length > 0 && !rideAccepted) {
      setActiveRide(notifications[0]);
    }
  }, [notifications, isOnline, rideAccepted]);

  /* ================= CAROUSEL AUTO-SCROLL ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % carouselData.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ================= CUSTOMER BOOKING HISTORY ================= */
  const fetchBookingHistory = async () => {
    try {
      const p = await AsyncStorage.getItem("customerPhone");
      if (!p) { setBookingHistory([]); return; }
      const res = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${p}`);
      setBookingHistory(Array.isArray(res.data) ? res.data : []);
    } catch { setBookingHistory([]); }
  };

  /* ================= LOCATION SEARCH ================= */
  const searchLocation = async (field: "area" | "darea") => {
    const q = field === "area" ? area : darea;
    if (!q || q.length < 2) { field === "area" ? setSuggestions([]) : setDropsuggestions([]); return; }
    try {
      setLoadingSuggestions(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`;
      const r = await fetch(url, { headers: { "User-Agent": "JJCallDriverApp/1.0" } });
      const data = (await r.json()) as Suggestion[];
      field === "area" ? setSuggestions(data || []) : setDropsuggestions(data || []);
    } finally { setLoadingSuggestions(false); }
  };

  const selectPlace = (item: Suggestion) => {
    const latitude = Number(item.lat); const longitude = Number(item.lon);
    setArea(item.display_name); setSuggestions([]); Keyboard.dismiss();
    setCoordsPreview({ latitude, longitude });
    mapRef.current?.animateToRegion(regionFrom(latitude, longitude), 500);
    setErrors({ ...errors, area: "" });
  };
  const selectDropArea = (item: Suggestion) => {
    setDArea(item.display_name); setDropsuggestions([]); Keyboard.dismiss();
    setErrors({ ...errors, darea: "" });
  };
  const selectChennaiPlace = (place: ChennaiPlace) => {
    setDArea(place.address); setShowPlacesPopup(false); setShowBookingForm(true); setTriptype("local");
  };
  const selectOutstationPlace = (place: ChennaiPlace) => {
    setDArea(place.address); setShowOutstationPopup(false); setShowBookingForm(true); setTriptype("outstation");
  };

  /* ================= GET CURRENT LOCATION ================= */
  const useCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { alert("Permission denied"); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
      if (addresses.length > 0) {
        const a = addresses[0];
        setArea([a.name, a.street, a.city, a.region].filter(Boolean).join(", "));
      } else {
        setArea(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
      setCoordsPreview({ latitude, longitude });
      mapRef.current?.animateToRegion(regionFrom(latitude, longitude, 0.05), 500);
      setSuggestions([]); setErrors({ ...errors, area: "" });
    } catch (e: any) { alert(e.message || "Error getting location"); }
    finally { setLoadingLocation(false); }
  };

  /* ================= FORM VALIDATE ================= */
  const validateForm = () => {
    let e = { name: "", phone: "", area: "", darea: "", triptype: "" };
    if (!name.trim()) e.name = "Name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter valid 10-digit mobile number";
    if (!area.trim() && !coordsPreview) e.area = "Pickup location is required";
    if (!darea.trim()) e.darea = "Drop location is required";
    if (!triptype) e.triptype = "Select trip type";
    setErrors(e);
    return Object.values(e).every((v) => v === "");
  };

  /* ================= SUBMIT BOOKING ================= */
  const onSubmit = async () => {
    if (!validateForm()) return;
    try {
      const bookingPhone = await AsyncStorage.getItem("customerPhone");
      const res = await axios.post(`${BASE_URL}/api/trip-booking`, {
        name, phone, pickup: area,
        pickupLat: coordsPreview?.latitude || null,
        pickupLng: coordsPreview?.longitude || null,
        drop: darea, triptype, bookingphnno: bookingPhone,
      });
      if (res.data.success) {
        setShowBookingForm(false);
        setName(""); setPhone(""); setArea(""); setDArea(""); setTriptype(""); setCoordsPreview(null);
        setErrors({ name: "", phone: "", area: "", darea: "", triptype: "" });
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      }
    } catch { alert("Failed to submit booking. Please try again."); }
  };

  const SUPPORT_NUMBER = "7550118666"; // use full number when live

const callSupport = () => {
  const phoneUrl = `tel:${SUPPORT_NUMBER}`;

  Linking.canOpenURL(phoneUrl)
    .then((supported) => {
      if (!supported) {
        alert("Phone call not supported on this device");
      } else {
        return Linking.openURL(phoneUrl);
      }
    })
    .catch((err) => console.log("Call error", err));
};

  /* ================= FEATURE CLICK ================= */
  const handleFeatureClick = (featureId: string) => {
    if (featureId === "1") setShowPlacesPopup(true);
    else if (featureId === "2") setShowOutstationPopup(true);
    else if (featureId === "3") { fetchBookingHistory(); setShowHistory(true); }
    else if (featureId === "4") setShowHelp(true);
    else setShowBookingForm(true);
  };

  /* ================= DRIVER HANDLERS ================= */
  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      await axios.post(`${BASE_URL}/api/driver/updateStatus`, { driverId, status: newStatus ? "online" : "offline" });
      setIsOnline(newStatus);
      if (!newStatus) { setActiveRide(null); setRideAccepted(false); }
    } catch { alert("Failed to update status."); }
  };

  const handleAcceptRide = async () => {
    if (!activeRide) return;
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      onAccept && onAccept(activeRide.bookingId);
      await axios.post(`${BASE_URL}/api/bookings/start`, { bookingId: activeRide.bookingId, driverId });
      setRideAccepted(true);
    } catch { alert("Failed to accept ride."); }
  };

  const handleDeclineRide = () => {
    if (activeRide) onDecline && onDecline(activeRide.bookingId);
    setActiveRide(null); setRideAccepted(false);
  };

  const handleCompleteRide = async () => {
    const ride = activeRide;
    setActiveRide(null); setRideAccepted(false);
    if (ride) setTodayEarnings((prev) => prev + (ride.amount || 0));
    try {
      const driverId = await AsyncStorage.getItem("driverId");
      await axios.post(`${BASE_URL}/api/driver/updateStatus`, { driverId, status: "online" });
      if (driverId) { fetchDriverProfile(driverId); fetchDriverBookings(driverId); }
    } catch { console.warn("Could not sync driver status."); }
  };

  /* =====================================================
     ✅ RECENT BOOKINGS — always visible (online + offline)
     Same fetch pattern as RideTab, auto-refreshed every 4 s
     ===================================================== */
  const renderRecentBookings = () => (
    <>
      {/* ── Recent Bookings header ── */}
      <View style={driverStyle.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        <TouchableOpacity
          style={driverStyle.seeAllBtn}
          onPress={() => { setHistoryFilter("all"); setShowDriverHistory(true); }}
        >
          <Text style={driverStyle.seeAllText}>See All →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Loading spinner ── */}
      {tripsLoading && recentDriverTrips.length === 0 && (
        <View style={driverStyle.waitingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={driverStyle.waitingText}>Loading recent bookings...</Text>
        </View>
      )}

      {/* ── Empty state ── */}
      {!tripsLoading && recentDriverTrips.length === 0 && (
        <View style={driverStyle.emptyBookingsBox}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🚖</Text>
          <Text style={driverStyle.offlineTitle}>No bookings yet</Text>
          <Text style={driverStyle.offlineSub}>Your completed rides will appear here.</Text>
        </View>
      )}

      {/* ── Up to 4 BookingCards (same component as RideTab) ── */}
      {recentDriverTrips.map((item) => (
        <BookingCard key={String(item.id)} item={item} />
      ))}

      {/* ── View all footer button ── */}
      {recentDriverTrips.length > 0 && (
        <TouchableOpacity
          style={driverStyle.viewAllBtn}
          onPress={() => { setHistoryFilter("all"); setShowDriverHistory(true); }}
        >
          <Text style={driverStyle.viewAllText}>View All Bookings →</Text>
        </TouchableOpacity>
      )}
    </>
  );

  /* ================= DRIVER HISTORY MODAL ================= */
  const renderDriverHistoryModal = () => (
    <Modal visible={showDriverHistory} animationType="slide" transparent={false}>
      <View style={dhModal.container}>
        <View style={dhModal.header}>
          <TouchableOpacity style={dhModal.backBtn} onPress={() => setShowDriverHistory(false)}>
            <Text style={dhModal.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={dhModal.title}>All Bookings</Text>
            <Text style={dhModal.subtitle}>
              {historyLoading ? "Loading..." : `${allDriverBookings.length} booking${allDriverBookings.length !== 1 ? "s" : ""}`}
              {historyFilter !== "all" ? `  ·  ${DATE_FILTERS.find(f => f.key === historyFilter)?.label}` : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={dhModal.refreshBtn}
            onPress={() => fetchAllDriverBookings(driverIdDisplay, historyFilter)}
          >
            <Text style={dhModal.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={dhModal.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dhModal.filterScroll}>
            {DATE_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[dhModal.filterPill, historyFilter === f.key && dhModal.filterPillActive]}
                onPress={() => setHistoryFilter(f.key)}
              >
                <Text style={[dhModal.filterText, historyFilter === f.key && dhModal.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {!historyLoading && allDriverBookings.length > 0 && (
          <View style={dhModal.statsRow}>
            {(["completed", "inride", "assigned", "pending"] as const).map((s) => {
              const count = allDriverBookings.filter((b) => b.status === s).length;
              const sc = getStatusConfig(s);
              return (
                <View key={s} style={[dhModal.statChip, { backgroundColor: sc.bg }]}>
                  <Text style={[dhModal.statChipCount, { color: sc.color }]}>{count}</Text>
                  <Text style={[dhModal.statChipLabel, { color: sc.color }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {historyLoading ? (
          <View style={dhModal.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={dhModal.loadingText}>Loading bookings...</Text>
          </View>
        ) : allDriverBookings.length === 0 ? (
          <View style={dhModal.center}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🚖</Text>
            <Text style={dhModal.emptyTitle}>No bookings found</Text>
            <Text style={dhModal.emptySubtitle}>
              {historyFilter !== "all"
                ? "Try a different date range."
                : "Your bookings will appear here once you start accepting rides."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={allDriverBookings}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
            renderItem={({ item }) => <BookingCard item={item} />}
          />
        )}
      </View>
    </Modal>
  );

  /* ================= SHARED MODALS ================= */
const renderSharedModals = () => (
  <>
    {/* CHENNAI PLACES */}
    <Modal visible={showPlacesPopup} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <TouchableOpacity style={modal.closeBtn} onPress={() => setShowPlacesPopup(false)}>
            <Text style={modal.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={modal.title}>Popular Places in Chennai</Text>
          <Text style={modal.subtitle}>Select a destination for your local ride</Text>

          <View style={{ marginTop: 16 }}>
            {CHENNAI_POPULAR_PLACES.map((place) => (
              <TouchableOpacity
                key={String(place.id)}
                style={modal.placeCard}
                onPress={() => selectChennaiPlace(place)}
              >
                <View style={modal.placeIconContainer}>
                  <Text style={modal.placeIcon}>{place.icon}</Text>
                </View>

                <View style={modal.placeInfo}>
                  <Text style={modal.placeName}>{place.name}</Text>
                  <Text style={modal.placeAddress}>{place.address}</Text>
                </View>

                <Text style={modal.placeArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>

    {/* CUSTOMER HISTORY */}
    <Modal visible={showHistory} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <TouchableOpacity style={modal.closeBtn} onPress={() => setShowHistory(false)}>
            <Text style={modal.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={modal.title}>Booking History</Text>
          <Text style={modal.subtitle}>Your previous rides</Text>

          <FlatList
            data={bookingHistory}
            keyExtractor={(item) => String(item.id)}   
            style={{ marginTop: 16 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={modal.emptyState}>
                <Text style={modal.emptyIcon}>📜</Text>
                <Text style={modal.emptyText}>No booking history yet</Text>
                <Text style={modal.emptySubtext}>
                  Your completed rides will appear here
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={modal.historyCard}>
                <View style={modal.historyHeader}>
                  <View style={modal.historyTypeBadge}>
                    <Text style={modal.historyTypeText}>
                      {item.triptype?.toUpperCase() || "LOCAL"}
                    </Text>
                  </View>

                  <Text style={modal.historyDate}>
                    {new Date(item.created_at).toLocaleDateString("en-GB")} at{" "}
                    {new Date(item.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </View>

                <View style={modal.historyRoute}>
                  <View style={modal.historyLocation}>
                    <Text style={modal.historyLocationIcon}>📍</Text>
                    <Text style={modal.historyLocationText} numberOfLines={1}>
                      {item.pickup}
                    </Text>
                  </View>

                  <View style={modal.historyDivider} />

                  <View style={modal.historyLocation}>
                    <Text style={modal.historyLocationIcon}>🏁</Text>
                    <Text style={modal.historyLocationText} numberOfLines={1}>
                      {item.drop_location}
                    </Text>
                  </View>
                </View>

                <View style={modal.historyFooter}>
                  <Text style={modal.historyStatus}>{item.status}</Text>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>

    {/* HELP */}
    <Modal visible={showHelp} animationType="fade" transparent>
      <View style={modal.overlay}>
        <View style={modal.helpContainer}>
          <TouchableOpacity style={modal.closeBtn} onPress={() => setShowHelp(false)}>
            <Text style={modal.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={modal.helpIconContainer}>
            <Text style={modal.helpIcon}>📞</Text>
          </View>

          <Text style={modal.helpTitle}>Need Help?</Text>
          <Text style={modal.helpSubtitle}>
            Our support team is here to assist you
          </Text>

          <View style={modal.supportCard}>
            <Text style={modal.supportLabel}>JJ Call Drivers</Text>
            <Text style={modal.supportTeam}>Support Team</Text>

            <TouchableOpacity style={modal.callButton} onPress={callSupport}>
              <Text style={modal.callButtonText}>📱 Call Now</Text>
            </TouchableOpacity>
          </View>

          <Text style={modal.helpNote}>
            Available 24/7 for your assistance
          </Text>
        </View>
      </View>
    </Modal>
  </>
);

  /* ================= DRIVER UI ================= */
  if (role === "driver") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        {renderSharedModals()}
        {renderDriverHistoryModal()}

        <FlatList
          data={[]}                              // data driven from ListHeaderComponent
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* ── Header ── */}
              <View style={driverStyle.header}>
                <View style={driverStyle.headerLeft}>
                  <View style={driverStyle.avatarRing}>
                    <View style={driverStyle.avatarInner}>
                      <Text style={driverStyle.avatarInitials}>
                        {driverName ? driverName.charAt(0).toUpperCase() : "D"}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Text style={driverStyle.greetText}>Welcome back!</Text>
                    <Text style={driverStyle.driverName}>{driverName}</Text>
                    {driverIdDisplay ? (
                      <View style={driverStyle.driverIdBadge}>
                        <Text style={driverStyle.driverIdText}>ID: #{driverIdDisplay}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity style={driverStyle.helpIconBtn} onPress={() => setShowHelp(true)}>
                  <Text style={driverStyle.helpIconText}>🎧</Text>
                </TouchableOpacity>
              </View>

              {/* ── Toggle ── */}
              <View style={[driverStyle.toggleCard, { backgroundColor: isOnline ? COLORS.primary : "#334155" }]}>
                <View>
                  <Text style={driverStyle.toggleLabel}>{isOnline ? "You're Online" : "You're Offline"}</Text>
                  <Text style={driverStyle.toggleSub}>{isOnline ? "Waiting for ride requests..." : "Go online to receive rides"}</Text>
                </View>
                <TouchableOpacity
                  style={[driverStyle.toggleBtn, isOnline ? driverStyle.toggleBtnOnline : { backgroundColor: COLORS.primary }]}
                  onPress={handleToggleOnline}
                >
                  <View style={[driverStyle.statusDot, { backgroundColor: isOnline ? "#34d399" : "#94a3b8" }]} />
                  <Text style={driverStyle.toggleBtnText}>{isOnline ? "Go Offline" : "Go Online"}</Text>
                </TouchableOpacity>
              </View>

              {/* ── Stats ── */}
              <View style={driverStyle.statsRow}>
                <View style={driverStyle.statCard}>
                  <Text style={driverStyle.statValue}>₹{todayEarnings}</Text>
                  <Text style={driverStyle.statLabel}>Today</Text>
                </View>
                <View style={driverStyle.statCard}>
                  {profileLoading
                    ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 2 }} />
                    : <Text style={driverStyle.statValue}>{totalTrips}</Text>}
                  <Text style={driverStyle.statLabel}>Total Trips</Text>
                </View>
                <View style={driverStyle.statCard}>
                  <Text style={driverStyle.statValue}>₹{weekEarnings.toLocaleString()}</Text>
                  <Text style={driverStyle.statLabel}>This Week</Text>
                </View>
              </View>

              {/* ── Incoming Ride ── */}
              {isOnline && activeRide && !rideAccepted && (
                <View style={driverStyle.requestCard}>
                  <View style={driverStyle.requestHeader}>
                    <View style={driverStyle.requestBadge}>
                      <Text style={driverStyle.requestBadgeText}>🔔 New Ride Request</Text>
                    </View>
                    <Text style={driverStyle.requestAmount}>₹{activeRide.amount ?? "—"}</Text>
                  </View>
                  <View style={driverStyle.passengerRow}>
                    <View style={driverStyle.passengerAvatar}><Text style={{ fontSize: 24 }}>👤</Text></View>
                    <View>
                      <Text style={driverStyle.passengerName}>{activeRide.name}</Text>
                      <View style={driverStyle.metaRow}>
                        <View style={driverStyle.metaTag}><Text style={driverStyle.metaTagText}>📍 Nearby</Text></View>
                        <View style={driverStyle.metaTag}><Text style={driverStyle.metaTagText}>⏱️ ~20 min</Text></View>
                      </View>
                    </View>
                  </View>
                  <View style={driverStyle.routeBox}>
                    <View style={driverStyle.routeRow}>
                      <View style={[driverStyle.routeDot, { backgroundColor: COLORS.success }]} />
                      <Text style={driverStyle.routeText} numberOfLines={2}>{activeRide.pickup}</Text>
                    </View>
                    <View style={driverStyle.routeDivider} />
                    <View style={driverStyle.routeRow}>
                      <View style={[driverStyle.routeDot, { backgroundColor: COLORS.danger }]} />
                      <Text style={driverStyle.routeText} numberOfLines={2}>{activeRide.drop}</Text>
                    </View>
                  </View>
                  <View style={driverStyle.actionRow}>
                    <TouchableOpacity style={driverStyle.declineBtn} onPress={handleDeclineRide}>
                      <Text style={driverStyle.declineBtnText}>✕ Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={driverStyle.acceptBtn} onPress={handleAcceptRide}>
                      <Text style={driverStyle.acceptBtnText}>✓ Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── Active Trip ── */}
              {rideAccepted && activeRide && (
                <View style={driverStyle.activeTripCard}>
                  <View style={driverStyle.activeTripHeader}>
                    <View style={driverStyle.activeBadge}><Text style={driverStyle.activeBadgeText}>🟢 Active Trip</Text></View>
                    <Text style={driverStyle.activeTripAmount}>₹{activeRide.amount ?? "—"}</Text>
                  </View>
                  <View style={driverStyle.passengerRow}>
                    <View style={driverStyle.passengerAvatar}><Text style={{ fontSize: 24 }}>👤</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={driverStyle.passengerName}>{activeRide.name}</Text>
                      <Text style={driverStyle.statLabel}>Passenger</Text>
                    </View>
                    <TouchableOpacity style={driverStyle.callBtn}><Text style={{ fontSize: 20 }}>📞</Text></TouchableOpacity>
                  </View>
                  <View style={driverStyle.routeBox}>
                    <View style={driverStyle.routeRow}>
                      <View style={[driverStyle.routeDot, { backgroundColor: COLORS.success }]} />
                      <Text style={driverStyle.routeText} numberOfLines={2}>{activeRide.pickup}</Text>
                    </View>
                    <View style={driverStyle.routeDivider} />
                    <View style={driverStyle.routeRow}>
                      <View style={[driverStyle.routeDot, { backgroundColor: COLORS.danger }]} />
                      <Text style={driverStyle.routeText} numberOfLines={2}>{activeRide.drop}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={driverStyle.completeBtn} onPress={handleCompleteRide}>
                    <Text style={driverStyle.completeBtnText}>✅ Complete Trip</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Offline status card (only when offline) ── */}
              {!isOnline && (
                <View style={driverStyle.offlineBox}>
                  <Text style={driverStyle.offlineIcon}>🌙</Text>
                  <Text style={driverStyle.offlineTitle}>You're offline</Text>
                  <Text style={driverStyle.offlineSub}>
                    Tap "Go Online" above to start receiving ride requests.
                  </Text>
                </View>
              )}

              {/* ── Online but waiting ── */}
              {isOnline && !activeRide && !rideAccepted && (
                <View style={driverStyle.waitingBox}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={driverStyle.waitingText}>Looking for nearby rides...</Text>
                </View>
              )}

              {/* ================================================================
                  ✅ RECENT BOOKINGS — always visible (online + offline)
                  Same fetch pattern as RideTab, auto-refreshed every 4 s
                  ================================================================ */}
              {renderRecentBookings()}
            </>
          }
        />
      </View>
    );
  }

  /* ================= CUSTOMER UI ================= */
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      {renderSharedModals()}
      <View style={styles.heroContainer}>
        <MapView ref={mapRef} style={styles.heroMap}
          initialRegion={{ latitude: 13.0827, longitude: 80.2707, latitudeDelta: 0.05, longitudeDelta: 0.05 }} />
        <View style={styles.carouselContainer}>
          <FlatList ref={carouselRef} horizontal data={carouselData} keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false} pagingEnabled
            snapToInterval={width * 0.85 + 12} decelerationRate="fast"
            contentContainerStyle={styles.carouselContent} onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => (
              <View style={styles.carouselCard}>
                <View style={styles.carouselIconContainer}><Text style={styles.carouselIcon}>{item.icon}</Text></View>
                <Text style={styles.carouselTitle}>{item.title}</Text>
                <Text style={styles.carouselDescription}>{item.description}</Text>
                {item.rating && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingStars}>⭐⭐⭐⭐⭐</Text>
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                )}
              </View>
            )}
          />
        </View>
      </View>
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.featuresGrid}>
          {features.map((f) => (
            <TouchableOpacity key={f.id} style={styles.featureCard} onPress={() => handleFeatureClick(f.id)}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={() => setShowBookingForm(true)}>
        <Text style={styles.bookBtnText}>Book a Ride</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeTab;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: COLORS.bg },
  quickActionsSection:   { paddingTop: 16, paddingBottom: 12, backgroundColor: COLORS.surface },
  sectionTitle:          { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginHorizontal: 16, marginBottom: 12 },
  featuresGrid:          { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, gap: 12 },
  featureCard:           { width: (width - 44) / 2, backgroundColor: COLORS.bg, borderRadius: 16, padding: 20, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  featureIcon:           { fontSize: 36, marginBottom: 10 },
  featureText:           { fontSize: 14, fontWeight: "600", textAlign: "center", color: COLORS.textMain },
  heroContainer:         { width, height: height * 0.4, position: "relative" },
  heroMap:               { width: "100%", height: "100%" },
  carouselContainer:     { position: "absolute", bottom: 16, left: 0, right: 0, height: 160 },
  carouselContent:       { paddingHorizontal: (width - width * 0.85) / 2 },
  carouselCard:          { width: width * 0.85, backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginHorizontal: 6, elevation: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, alignItems: "center" },
  carouselIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  carouselIcon:          { fontSize: 28 },
  carouselTitle:         { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginBottom: 6, textAlign: "center" },
  carouselDescription:   { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
  ratingContainer:       { marginTop: 10, alignItems: "center" },
  ratingStars:           { fontSize: 14, marginBottom: 4 },
  ratingText:            { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  bookBtn:               { position: "absolute", bottom: 12, left: 16, right: 16, backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: "center", elevation: 6, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  bookBtnText:           { fontSize: 18, fontWeight: "800", color: "#FFF" },
});

/* ================= DRIVER STYLES ================= */
const driverStyle = StyleSheet.create({
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft:       { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarRing:       { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderColor: COLORS.primary, alignItems: "center", justifyContent: "center", padding: 2 },
  avatarInner:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarInitials:   { fontSize: 20, fontWeight: "800", color: "#FFF" },
  greetText:        { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  driverName:       { fontSize: 17, fontWeight: "800", color: COLORS.textMain },
  driverIdBadge:    { marginTop: 3, backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" },
  driverIdText:     { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  helpIconBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: COLORS.border },
  helpIconText:     { fontSize: 20 },
  toggleCard:       { margin: 16, borderRadius: 22, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleLabel:      { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  toggleSub:        { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  toggleBtn:        { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
  toggleBtnOnline:  { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  toggleBtnText:    { color: "#FFF", fontSize: 14, fontWeight: "700" },
  statusDot:        { width: 8, height: 8, borderRadius: 4 },
  statsRow:         { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  statCard:         { flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statIcon:         { fontSize: 22, marginBottom: 4 },
  statValue:        { fontSize: 15, fontWeight: "800", color: COLORS.textMain, marginBottom: 2 },
  statLabel:        { fontSize: 11, color: COLORS.textMuted, fontWeight: "500" },
  requestCard:      { marginHorizontal: 16, marginBottom: 14, backgroundColor: COLORS.surface, borderRadius: 22, padding: 18, borderWidth: 2, borderColor: COLORS.primary, elevation: 6, shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  requestHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  requestBadge:     { backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  requestBadgeText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  requestAmount:    { fontSize: 24, fontWeight: "800", color: COLORS.primary },
  passengerRow:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  passengerAvatar:  { width: 46, height: 46, borderRadius: 23, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  passengerName:    { fontSize: 16, fontWeight: "700", color: COLORS.textMain, marginBottom: 4 },
  metaRow:          { flexDirection: "row", gap: 8 },
  metaTag:          { backgroundColor: COLORS.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  metaTagText:      { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  routeBox:         { backgroundColor: COLORS.bg, borderRadius: 14, padding: 14, marginBottom: 14 },
  routeRow:         { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeDot:         { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeDivider:     { width: 2, height: 14, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 4 },
  routeText:        { fontSize: 14, color: COLORS.textMain, fontWeight: "500", flex: 1, lineHeight: 20 },
  actionRow:        { flexDirection: "row", gap: 10 },
  declineBtn:       { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: COLORS.danger, alignItems: "center" },
  declineBtnText:   { fontSize: 15, fontWeight: "700", color: COLORS.danger },
  acceptBtn:        { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center" },
  acceptBtnText:    { fontSize: 15, fontWeight: "700", color: "#FFF" },
  activeTripCard:   { marginHorizontal: 16, marginBottom: 14, backgroundColor: COLORS.surface, borderRadius: 22, padding: 18, borderWidth: 2, borderColor: "#10B981", elevation: 6, shadowColor: "#10B981", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  activeTripHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  activeBadge:      { backgroundColor: "#D1FAE5", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  activeBadgeText:  { fontSize: 13, fontWeight: "700", color: "#065F46" },
  activeTripAmount: { fontSize: 24, fontWeight: "800", color: "#10B981" },
  callBtn:          { marginLeft: "auto" as any, width: 42, height: 42, borderRadius: 21, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  completeBtn:      { backgroundColor: "#10B981", paddingVertical: 15, borderRadius: 15, alignItems: "center", elevation: 4, shadowColor: "#10B981", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  completeBtnText:  { fontSize: 16, fontWeight: "800", color: "#FFF" },
  // ── offline section ──
  offlineBox:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: 22, padding: 28, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, borderStyle: "dashed" as any },
  offlineIcon:      { fontSize: 44, marginBottom: 10 },
  offlineTitle:     { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginBottom: 6 },
  offlineSub:       { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
  emptyBookingsBox: { marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: 18, padding: 28, alignItems: "center" },
  // ── waiting / online ──
  waitingBox:       { marginHorizontal: 16, marginBottom: 14, backgroundColor: "#EFF6FF", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  waitingText:      { fontSize: 14, color: COLORS.primary, fontWeight: "600" },
  // ── section headers / buttons ──
  sectionHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  seeAllBtn:        { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#EFF6FF", borderRadius: 10 },
  seeAllText:       { fontSize: 13, color: COLORS.primary, fontWeight: "700" },
  viewAllBtn:       { marginHorizontal: 16, marginTop: 4, marginBottom: 16, backgroundColor: "#EFF6FF", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  viewAllText:      { fontSize: 14, fontWeight: "700", color: COLORS.primary },
});

/* ================= DRIVER HISTORY MODAL STYLES ================= */
const dhModal = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, elevation: 2 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  backIcon:      { fontSize: 20, color: COLORS.textMain, fontWeight: "700" },
  title:         { fontSize: 18, fontWeight: "800", color: COLORS.textMain },
  subtitle:      { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  refreshBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  refreshIcon:   { fontSize: 20, color: COLORS.primary, fontWeight: "700" },
  filterWrapper: { backgroundColor: COLORS.surface, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterScroll:  { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filterPill:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.border },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:    { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  filterTextActive: { color: "#FFF" },
  statsRow:      { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  statChip:      { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: "center" },
  statChipCount: { fontSize: 16, fontWeight: "800" },
  statChipLabel: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  loadingText:   { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  emptyTitle:    { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
});

/* ================= MODAL STYLES ================= */
const modal = StyleSheet.create({
  overlay:              { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" },
  errorInput:           { borderColor: COLORS.danger, borderWidth: 1 },
  errorText:            { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
  sheet:                { width: "90%", alignSelf: "center", backgroundColor: COLORS.surface, borderRadius: 30, paddingTop: 48, paddingHorizontal: 20, paddingBottom: 24, maxHeight: height * 0.85 },
  closeBtn:             { position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  closeText:            { fontSize: 18, fontWeight: "700" },
  title:                { fontSize: 19, fontWeight: "700", textAlign: "center", marginBottom: 6, color: COLORS.textMain },
  subtitle:             { fontSize: 14, textAlign: "center", color: COLORS.textMuted, marginBottom: 8 },
  input:                { backgroundColor: COLORS.bg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, marginTop: 10, fontSize: 14 },
  inputWrapper:         { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bg, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  locationButton:       { paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center", alignItems: "center" },
  locationIcon:         { fontSize: 20 },
  suggestionList:       { maxHeight: 180, marginTop: 6, borderRadius: 14, backgroundColor: COLORS.surface },
  suggestionItem:       { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  suggestionText:       { fontSize: 14 },
  tripRow:              { flexDirection: "row", justifyContent: "space-between", marginVertical: 18 },
  tripBtn:              { width: "48%", paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.bg, alignItems: "center" },
  tripActive:           { backgroundColor: COLORS.primary },
  submitBtn:            { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  submitText:           { fontSize: 16, fontWeight: "800", color: "#FFF" },
  placeCard:            { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bg, borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2 },
  placeIconContainer:   { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", marginRight: 14 },
  placeIcon:            { fontSize: 24 },
  placeInfo:            { flex: 1 },
  placeName:            { fontSize: 16, fontWeight: "700", color: COLORS.textMain, marginBottom: 4 },
  placeAddress:         { fontSize: 13, color: COLORS.textMuted },
  placeArrow:           { fontSize: 28, color: COLORS.textMuted, marginLeft: 8 },
  emptyState:           { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIcon:            { fontSize: 48, marginBottom: 16 },
  emptyText:            { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginBottom: 8 },
  emptySubtext:         { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  historyCard:          { backgroundColor: COLORS.bg, borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2 },
  historyHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  historyTypeBadge:     { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  historyTypeText:      { color: "#FFF", fontSize: 12, fontWeight: "700" },
  historyDate:          { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  historyRoute:         { marginBottom: 12 },
  historyLocation:      { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  historyLocationIcon:  { fontSize: 16, marginRight: 8 },
  historyLocationText:  { fontSize: 14, color: COLORS.textMain, flex: 1 },
  historyDivider:       { width: 2, height: 12, backgroundColor: COLORS.border, marginLeft: 8, marginBottom: 8 },
  historyFooter:        { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  historyStatus:        { fontSize: 14, fontWeight: "600", color: "#10B981" },
  helpContainer:        { backgroundColor: COLORS.surface, borderRadius: 30, padding: 32, marginHorizontal: 24, alignItems: "center" },
  helpIconContainer:    { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  helpIcon:             { fontSize: 40 },
  helpTitle:            { fontSize: 24, fontWeight: "700", color: COLORS.textMain, marginBottom: 8 },
  helpSubtitle:         { fontSize: 14, color: COLORS.textMuted, textAlign: "center", marginBottom: 24 },
  supportCard:          { backgroundColor: COLORS.bg, borderRadius: 20, padding: 24, width: "100%", alignItems: "center" },
  supportLabel:         { fontSize: 16, fontWeight: "700", color: COLORS.primary, marginBottom: 4 },
  supportTeam:          { fontSize: 18, fontWeight: "700", color: COLORS.textMain, marginBottom: 20 },
  phoneContainer:       { backgroundColor: COLORS.surface, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary },
  phoneNumber:          { fontSize: 20, fontWeight: "700", color: COLORS.primary, letterSpacing: 1 },
  callButton:           { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, width: "100%", alignItems: "center" },
  callButtonText:       { fontSize: 16, fontWeight: "800", color: "#FFF" },
  helpNote:             { fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginTop: 20 },
  successContainer:     { backgroundColor: COLORS.surface, borderRadius: 24, padding: 32, marginHorizontal: 32, alignItems: "center" },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successIcon:          { fontSize: 48 },
  successTitle:         { fontSize: 24, fontWeight: "700", color: COLORS.textMain, marginBottom: 12, textAlign: "center" },
  successMessage:       { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  successButton:        { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 48, borderRadius: 16, minWidth: 120 },
  successButtonText:    { fontSize: 16, fontWeight: "700", color: "#FFF", textAlign: "center" },
});

/* ================= HELPER ================= */
const regionFrom = (latitude: number, longitude: number, delta = 0.01): Region => ({
  latitude, longitude, latitudeDelta: delta, longitudeDelta: delta,
});