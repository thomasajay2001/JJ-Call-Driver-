import AsyncStorage from "@react-native-async-storage/async-storage";
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
const BASE_URL = "http://192.168.0.10:3000";

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

/* ================= COMPONENT ================= */
const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [coordsPreview, setCoordsPreview] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("role").then((r) => setRole(r || ""));
  }, []);

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

  /* ================= FAKE DATA ================= */
  const features = [
    { id: "1", title: "Local Ride", icon: "🚖" },
    { id: "2", title: "Outstation", icon: "🛣️" },
    { id: "3", title: "Schedule", icon: "⏰" },
    { id: "4", title: "Trips", icon: "📜" },
  ];

  const tips = [
    "Drive smart & safe! 🚀",
    "Check your earnings daily 💰",
    "Keep vehicle clean 🧽",
    "Top drivers are punctual ⏱️",
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* HERO MAP */}
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

        <View style={styles.floatingCard}>
          <Text style={styles.floatingTitle}>Pickup Location</Text>
          <TextInput
            style={styles.floatingInput}
            placeholder="Enter Pickup Location"
            value={area}
            onChangeText={(t) => {
              setArea(t);
              searchLocation("area");
            }}
          />
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

      {/* FEATURES */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.featuresGrid}>
        {features.map((f) => (
          <TouchableOpacity key={f.id} style={styles.featureCard}>
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

            <TextInput
              style={modal.input}
              placeholder="Pickup location"
              value={area}
              onChangeText={(t) => {
                setArea(t);
                searchLocation("area");
              }}
            />
            {loadingSuggestions && area.length > 2 && (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            )}
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
            {loadingSuggestions && darea.length > 2 && (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            )}
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
                  <Text>{t.toUpperCase()}</Text>
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
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  floatingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: COLORS.textMain,
  },
  floatingInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textMain,
  },
  suggestionList: { maxHeight: 120, marginTop: 8, borderRadius: 12 },
  suggestionItem: {
    padding: 12,
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
  },
  featureCard: {
    width: width * 0.44,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    color: COLORS.textMain,
  },

  promoCard: {
    width: width * 0.7,
    height: 140,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
  },
  promoImage: { width: "100%", height: "100%" },
  promoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 8,
  },
  promoText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  quoteCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quoteText: { fontSize: 13, fontWeight: "500", color: COLORS.textMain },

  liveRideCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textMain },
  location: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700", color: COLORS.primary },

  bookBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  bookBtnText: { fontSize: 18, fontWeight: "800", color: "#FFF" },
});

/* ================= MODAL ================= */
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingTop: 40,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, fontWeight: "700" },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMain,
  },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 18,
  },
  tripBtn: {
    width: "48%",
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  tripActive: { backgroundColor: COLORS.primary },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  submitText: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  suggestionList: { maxHeight: 180, marginTop: 6, borderRadius: 14 },
  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: { fontSize: 14, color: COLORS.textMain },
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
