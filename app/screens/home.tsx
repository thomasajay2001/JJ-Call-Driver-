import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";

const { width, height } = Dimensions.get("window");
const BASE_URL = (Constants.expoConfig!.extra as any).BASE_URL;

/* ================= COLORS ================= */
const COLORS = {
  primary: "#2563EB", // classic blue
  secondary: "#3B82F6", // lighter blue
  bg: "#F8FAFC", // soft background
  surface: "#FFFFFF",
  textMain: "#1E293B",
  textMuted: "#64748B",
  border: "#CBD5E1",
  danger: "#EF4444",
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

/* ================= CHENNAI PLACES DATA ================= */
const CHENNAI_POPULAR_PLACES: ChennaiPlace[] = [
  {
    id: "1",
    name: "Marina Beach",
    address: "Kamaraj Salai, Chennai",
    lat: 13.0499,
    lon: 80.2824,
    icon: "🏖️",
  },
  {
    id: "2",
    name: "T Nagar",
    address: "Thyagaraya Nagar, Chennai",
    lat: 13.0418,
    lon: 80.2341,
    icon: "🛍️",
  },
  {
    id: "3",
    name: "Chennai Central",
    address: "Railway Station, Chennai",
    lat: 13.0827,
    lon: 80.2707,
    icon: "🚉",
  },
  {
    id: "4",
    name: "Phoenix MarketCity",
    address: "Velachery Main Road, Chennai",
    lat: 12.9926,
    lon: 80.2207,
    icon: "🏬",
  },
  {
    id: "5",
    name: "Besant Nagar Beach",
    address: "Elliot's Beach, Chennai",
    lat: 13.0006,
    lon: 80.2661,
    icon: "🌊",
  },
];

/* ================= TAMIL NADU OUTSTATION PLACES ================= */
const TAMILNADU_OUTSTATION_PLACES: ChennaiPlace[] = [
  {
    id: "1",
    name: "Mahabalipuram",
    address: "Mahabalipuram, Tamil Nadu",
    lat: 12.6208,
    lon: 80.1925,
    icon: "🏛️",
  },
  {
    id: "2",
    name: "Pondicherry",
    address: "Pondicherry, Tamil Nadu",
    lat: 11.9416,
    lon: 79.8083,
    icon: "🌴",
  },
  {
    id: "3",
    name: "Mahabalipuram Temple",
    address: "Shore Temple Road, Mahabalipuram",
    lat: 12.6167,
    lon: 80.1833,
    icon: "⛩️",
  },
  {
    id: "4",
    name: "Yelagiri Hills",
    address: "Yelagiri, Vellore District",
    lat: 12.5833,
    lon: 78.6333,
    icon: "⛰️",
  },
  {
    id: "5",
    name: "Vellore Fort",
    address: "Vellore, Tamil Nadu",
    lat: 12.9165,
    lon: 79.1325,
    icon: "🏰",
  },
];

/* ================= COMPONENT ================= */
const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showPlacesPopup, setShowPlacesPopup] = useState(false);
  const [showOutstationPopup, setShowOutstationPopup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");
  const [bookingphnno, setBookingPhnNo] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [coordsPreview, setCoordsPreview] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView | null>(null);

  /* ================= LOAD ROLE ================= */
  useEffect(() => {
    AsyncStorage.getItem("customerPhone").then((p) => setBookingPhnNo(p || ""));
    AsyncStorage.getItem("role").then((r) => {
      setRole((r as role) || "");
    });
  }, []);

  /* ================= FETCH BOOKING HISTORY ================= */
  const fetchBookingHistory = async () => {
    try {
      const phone = await AsyncStorage.getItem("customerPhone");
      if (!phone) return;

      const response = await axios.get(`${BASE_URL}/api/bookings/customer?phone=${phone}`,)
      setBookingHistory(response.data);
    } catch (error) {
      console.log("Error fetching history:", error);
      // Show some mock data for demo


    }
  };

  /* ================= LOCATION SEARCH ================= */
  const searchLocation = async (field: "area" | "darea") => {
    const q = field === "area" ? area : darea;
    if (!q || q.length < 2) {
      field === "area" ? setSuggestions([]) : setDropsuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q,
      )}&limit=6`;
      const r = await fetch(url, {
        headers: { "User-Agent": "JJCallDriverApp/1.0" },
      });
      const data = (await r.json()) as Suggestion[];
      field === "area"
        ? setSuggestions(data || [])
        : setDropsuggestions(data || []);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectPlace = (item: Suggestion) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    setArea(item.display_name);
    setSuggestions([]);
    Keyboard.dismiss();
    setCoordsPreview({ latitude, longitude });
    mapRef.current?.animateToRegion(regionFrom(latitude, longitude), 500);
  };

  const selectDropArea = (item: Suggestion) => {
    setDArea(item.display_name);
    setDropsuggestions([]);
    Keyboard.dismiss();
  };

  /* ================= SELECT CHENNAI PLACE ================= */
  const selectChennaiPlace = (place: ChennaiPlace) => {
    setDArea(place.address);
    setShowPlacesPopup(false);
    setShowBookingForm(true);
    setTriptype("local");
  };

  /* ================= SELECT OUTSTATION PLACE ================= */
  const selectOutstationPlace = (place: ChennaiPlace) => {
    setDArea(place.address);
    setShowOutstationPopup(false);
    setShowBookingForm(true);
    setTriptype("outstation");
  };

  /* ================= GET CURRENT LOCATION ================= */
  const useCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const displayAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
        ]
          .filter(Boolean)
          .join(", ");
        setArea(displayAddress);
      } else {
        setArea(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }

      setCoordsPreview({ latitude, longitude });
      mapRef.current?.animateToRegion(
        regionFrom(latitude, longitude, 0.05),
        500,
      );
      setSuggestions([]);
    } catch (error) {
      alert("Error getting location: " + error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const onSubmit = async () => {
    if (!name || !phone || !area || !darea || !triptype)
      return alert("Please fill all fields");
    try {
      const response = await fetch(`${BASE_URL}/api/trip-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          pickup: area,
          pickupLat: coordsPreview?.latitude || null,
          pickupLng: coordsPreview?.longitude || null,
          drop: darea,
          driverId: null,
          bookingphnno: await AsyncStorage.getItem("customerPhone")
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowBookingForm(false);
        setName("");
        setPhone("");
        setArea("");
        setDArea("");
        setTriptype("");
        alert("Booking submitted successfully");
      }
    } catch {
      alert("Something went wrong");
    }
  };

  /* ================= HANDLE FEATURE CLICK ================= */
  const handleFeatureClick = (featureId: string) => {
    if (featureId === "1") {
      // Local Ride
      setShowPlacesPopup(true);
    } else if (featureId === "2") {
      // Outstation
      setShowOutstationPopup(true);
    } else if (featureId === "3") {
      // History
      fetchBookingHistory();
      setShowHistory(true);
    } else if (featureId === "4") {
      // Help
      setShowHelp(true);
    } else {
      // Other features - show booking form directly
      setShowBookingForm(true);
    }
  };

  /* ================= FAKE DATA ================= */
  const features = [
    { id: "1", title: "Local Ride", icon: "🚖" },
    { id: "2", title: "Outstation", icon: "🛣️" },
    { id: "3", title: "History", icon: "📜" },
    { id: "4", title: "Help", icon: "❓" },
  ];

  const promotions = [
    {
      id: "1",
      image: "https://i.imgur.com/5Rt8VwD.png",
      text: "Refer & Earn!",
    },
    {
      id: "2",
      image: "https://i.imgur.com/X1cU1p5.png",
      text: "20% Off Today",
    },
  ];

  const liveRides = [
    { id: "1", name: "Ravi", pickup: "MG Road", drop: "Airport", amount: 120 },
    {
      id: "2",
      name: "Anita",
      pickup: "Main Street",
      drop: "City Mall",
      amount: 150,
    },
  ];

  /* ================= DRIVER UI ================= */
  if (role === "driver") {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>
          🚕 Driver Dashboard
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* MAP SECTION */}
      <View style={styles.heroContainer}>
        <MapView
          ref={mapRef}
          style={styles.heroMap}
          initialRegion={{
            latitude: 13.0827,
            longitude: 80.2707,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />

        {/* FLOATING PICKUP CARD */}
        <View style={styles.floatingCard}>
          <Text style={styles.floatingTitle}>Pickup Location</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter pickup location"
              value={area}
              onChangeText={(t) => {
                setArea(t);
                searchLocation("area");
              }}
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={useCurrentLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.locationIcon}>📍</Text>
              )}
            </TouchableOpacity>
          </View>

          {loadingSuggestions && area.length > 2 && (
            <ActivityIndicator style={{ marginTop: 8 }} />
          )}

          <FlatList
            data={suggestions}
            keyExtractor={(i) => i.place_id || i.display_name}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => selectPlace(item)}
              >
                <Text style={styles.suggestionText}>
                  📍 {item.display_name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* QUICK ACTIONS */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.featuresGrid}>
        {features.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.featureCard}
            onPress={() => handleFeatureClick(f.id)}
          >
            <Text style={{ fontSize: 28 }}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* BOOK BUTTON */}
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => setShowBookingForm(true)}
      >
        <Text style={styles.bookBtnText}>Book a Ride</Text>
      </TouchableOpacity>

      {/* CHENNAI PLACES POPUP */}
      <Modal visible={showPlacesPopup} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowPlacesPopup(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Popular Places in Chennai</Text>
            <Text style={modal.subtitle}>
              Select a destination for your local ride
            </Text>

            <View style={{ marginTop: 16 }}>
              {CHENNAI_POPULAR_PLACES.map((place) => (
                <TouchableOpacity
                  key={place.id}
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

      {/* OUTSTATION PLACES POPUP */}
      <Modal visible={showOutstationPopup} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowOutstationPopup(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Popular Outstation Places</Text>
            <Text style={modal.subtitle}>
              Select your destination in Tamil Nadu
            </Text>

            <View style={{ marginTop: 16 }}>
              {TAMILNADU_OUTSTATION_PLACES.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={modal.placeCard}
                  onPress={() => selectOutstationPlace(place)}
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

      {/* HISTORY MODAL */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowHistory(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Booking History</Text>
            <Text style={modal.subtitle}>Your previous rides</Text>

            <FlatList
              data={bookingHistory}
              keyExtractor={(item) => item.id}
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
                    <Text style={modal.historyDate}>{new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })} at {new Date(item.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}</Text>
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

      {/* HELP MODAL */}
      <Modal visible={showHelp} animationType="fade" transparent>
        <View style={modal.overlay}>
          <View style={modal.helpContainer}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowHelp(false)}
            >
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

              <View style={modal.phoneContainer}>
                <Text style={modal.phoneNumber}>787XXX6447</Text>
              </View>

              <TouchableOpacity style={modal.callButton}>
                <Text style={modal.callButtonText}>📱 Call Now</Text>
              </TouchableOpacity>
            </View>

            <Text style={modal.helpNote}>
              Available 24/7 for your assistance
            </Text>
          </View>
        </View>
      </Modal>

      {/* BOOKING MODAL */}
      <Modal visible={showBookingForm} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowBookingForm(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Trip Details</Text>

            <TextInput
              style={modal.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={modal.input}
              placeholder="Phone Number"
              keyboardType="numeric"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={[styles.inputWrapper, { marginTop: 10 }]}>
              <TextInput
                style={[modal.input, { flex: 1, marginTop: 0 }]}
                placeholder="Pickup location"
                value={area}
                onChangeText={(t) => {
                  setArea(t);
                  searchLocation("area");
                }}
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={useCurrentLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Text style={styles.locationIcon}>📍</Text>
                )}
              </TouchableOpacity>
            </View>

            <FlatList
              data={suggestions}
              keyExtractor={(i) => i.place_id || i.display_name}
              keyboardShouldPersistTaps="handled"
              style={modal.suggestionList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.suggestionItem}
                  onPress={() => selectPlace(item)}
                >
                  <Text style={modal.suggestionText}>
                    📍 {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TextInput
              style={modal.input}
              placeholder="Drop location"
              value={darea}
              onChangeText={(t) => {
                setDArea(t);
                searchLocation("darea");
              }}
            />

            <FlatList
              data={dropsuggestions}
              keyExtractor={(i) => i.place_id || i.display_name}
              keyboardShouldPersistTaps="handled"
              style={modal.suggestionList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.suggestionItem}
                  onPress={() => selectDropArea(item)}
                >
                  <Text style={modal.suggestionText}>
                    🏁 {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={modal.tripRow}>
              {["local", "outstation"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[modal.tripBtn, triptype === t && modal.tripActive]}
                  onPress={() => setTriptype(t as any)}
                >
                  <Text
                    style={{
                      color: triptype === t ? "#FFF" : COLORS.textMain,
                      fontWeight: "700",
                    }}
                  >
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={modal.submitBtn} onPress={onSubmit}>
              <Text style={modal.submitText}>Confirm Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeTab;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  heroContainer: { width, height: height * 0.38 },
  heroMap: { width: "100%", height: "100%" },

  floatingCard: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    zIndex: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  floatingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: COLORS.textMain,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  input: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textMain,
  },

  locationButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  locationIcon: {
    fontSize: 20,
  },

  suggestionList: {
    maxHeight: 160,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },

  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  suggestionText: { fontSize: 14, color: COLORS.textMain },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.textMain,
  },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    rowGap: 14,
  },

  featureCard: {
    width: width * 0.44,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    elevation: 3,
  },

  featureText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    color: COLORS.textMain,
  },

  bookBtn: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: "center",
    elevation: 6,
  },

  bookBtnText: { fontSize: 18, fontWeight: "800", color: "#FFF" },
});

/* ================= MODAL ================= */
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },

  sheet: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: height * 0.85,
  },

  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: { fontSize: 18, fontWeight: "700" },

  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: COLORS.textMain,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: COLORS.textMuted,
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
    fontSize: 14,
  },

  suggestionList: {
    maxHeight: 180,
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },

  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  suggestionText: { fontSize: 14 },

  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 18,
  },

  tripBtn: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },

  tripActive: { backgroundColor: COLORS.primary },

  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },

  submitText: { fontSize: 16, fontWeight: "800", color: "#FFF" },

  // Chennai Places Popup Styles
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  placeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  placeIcon: {
    fontSize: 24,
  },

  placeInfo: {
    flex: 1,
  },

  placeName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 4,
  },

  placeAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  placeArrow: {
    fontSize: 28,
    color: COLORS.textMuted,
    marginLeft: 8,
  },

  // History Modal Styles
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  historyCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  historyTypeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  historyTypeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },

  historyDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  historyRoute: {
    marginBottom: 12,
  },

  historyLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  historyLocationIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  historyLocationText: {
    fontSize: 14,
    color: COLORS.textMain,
    flex: 1,
  },

  historyDivider: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.border,
    marginLeft: 8,
    marginBottom: 8,
  },

  historyFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },

  historyStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },

  // Help Modal Styles
  helpContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 32,
    marginHorizontal: 24,
    alignItems: "center",
  },

  helpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  helpIcon: {
    fontSize: 40,
  },

  helpTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
  },

  helpSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },

  supportCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },

  supportLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },

  supportTeam: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 20,
  },

  phoneContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  phoneNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1,
  },

  callButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },

  callButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },

  helpNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 20,
  },
});

/* ================= HELPER ================= */
const regionFrom = (
  latitude: number,
  longitude: number,
  delta = 0.01,
): Region => ({
  latitude,
  longitude,
  latitudeDelta: delta,
  longitudeDelta: delta,
});
