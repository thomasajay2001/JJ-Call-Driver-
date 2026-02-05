import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
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

/* ================= COMPONENT ================= */
const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");
  const [bookingphnno,setBookingPhnNo]=useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
          bookingphnno,
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

          <TextInput
            style={styles.input}
            placeholder="Enter pickup location"
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

      {/* QUICK ACTIONS */}
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

  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textMain,
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
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    marginBottom: 14,
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
