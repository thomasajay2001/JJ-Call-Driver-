import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";

const BASE_URL = "http://192.168.0.7:3000";

type Suggestion = {
  place_id?: string;
  display_name: string;
  lat: string;
  lon: string;
};

const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  /* ================= FORM STATE ================= */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [coordsPreview, setCoordsPreview] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("role").then((r) => setRole(r || ""));
  }, []);

  /* ================= LOCATION SUGGESTIONS ================= */
  const searchLocation = async (field: "area" | "darea") => {
    const q = field === "area" ? area : darea;
    if (!q || q.length < 2) {
      if (field === "area") setSuggestions([]);
      else setDropsuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q,
      )}&addressdetails=1&limit=6`;
      const r = await fetch(url, {
        headers: { "User-Agent": "JJCallDriverApp/1.0" },
      });
      const data = (await r.json()) as Suggestion[];
      if (field === "area") setSuggestions(data || []);
      else setDropsuggestions(data || []);
    } catch (e) {
      console.warn("suggest", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectPlace = (item: Suggestion) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    setArea(item.display_name);
    setSuggestions([]);
    Keyboard.dismiss();
    setCoordsPreview({ lat, lng });
    mapRef.current?.animateToRegion(regionFrom(lat, lng), 500);
  };

  const selectDropArea = (item: Suggestion) => {
    setDArea(item.display_name);
    setDropsuggestions([]);
    Keyboard.dismiss();
  };

  /* ================= BOOKING FORM SUBMIT ================= */
  const onSubmit = async () => {
    if (!name.trim()) return alert("Enter name");
    if (!/^\d{10}$/.test(phone)) return alert("Enter valid phone");
    if (!area.trim()) return alert("Enter pickup area");
    if (!darea.trim()) return alert("Enter drop area");
    if (!triptype) return alert("Select trip type");

    try {
      const response = await fetch(`${BASE_URL}/api/trip-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          pickup: area,
          pickupLat: coordsPreview?.lat || null, // optional
          pickupLng: coordsPreview?.lng || null, // optional
          drop: darea,
          driverId: null, // if driver assigned later
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Booking submitted! ID: ${data.bookingId}`);
        setShowBookingForm(false);
        setName("");
        setPhone("");
        setArea("");
        setDArea("");
        setTriptype("");
        setSuggestions([]);
        setDropsuggestions([]);
      } else {
        alert("Failed to submit booking");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting booking");
    }
  };

  return (
    <>
      <StatusBar backgroundColor="#F6B100" translucent={false} />
      <View style={{ flex: 1, backgroundColor: "#FFF9E5" }}>
        {/* ================= TOP BAR ================= */}
        <View style={styles.topBar}>
          <TouchableOpacity>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              }}
              style={styles.profileIcon}
            />
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <TextInput
              placeholder="Where are you going?"
              placeholderTextColor="#999"
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity>
            <Text style={styles.bell}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ================= SLIDER ================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.slider}
        >
          <View style={styles.banner}>
            <Text style={styles.bannerText}>🔥 20% OFF on rides</Text>
          </View>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>🚕 Safe rides everyday</Text>
          </View>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>💛 JJ CallDrivers</Text>
          </View>
        </ScrollView>

        {/* ================= BODY ================= */}
        <ScrollView style={{ padding: 12 }}>
          {/* DRIVER UI */}
          {role === "driver" &&
            notifications.map((b: any) => (
              <View key={b.bookingId} style={styles.driverCard}>
                <View style={styles.row}>
                  <Text style={styles.bold}>{b.name}</Text>
                  <Text style={styles.price}>₹ {b.amount || 120}</Text>
                </View>

                <Text>📍 {b.pickup}</Text>
                <Text>🏁 {b.drop}</Text>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.accept}
                    onPress={() => onAccept(b)}
                  >
                    <Text style={styles.btnText}>ACCEPT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reject}
                    onPress={() => onDecline(b)}
                  >
                    <Text style={styles.btnText}>DECLINE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

          {/* CUSTOMER UI */}
          {role === "customer" &&
            notifications.map((b: any) => (
              <View key={b.bookingId} style={styles.customerCard}>
                <Text style={styles.point}>📍 {b.pickup}</Text>
                <Text style={styles.point}>🏁 {b.drop}</Text>

                <View style={styles.statusBox}>
                  <Text style={styles.statusText}>
                    {b.status || "Searching nearby drivers"}
                  </Text>
                </View>
              </View>
            ))}
        </ScrollView>

        {/* ================= BOOK NOW BUTTON ================= */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => setShowBookingForm(true)}
          >
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>

        {/* ================= BOOKING FORM MODAL ================= */}
        <Modal visible={showBookingForm} animationType="slide" transparent>
          <View style={popupStyles.overlay}>
            <View style={popupStyles.popup}>
              <TouchableOpacity
                style={popupStyles.closeBtn}
                onPress={() => setShowBookingForm(false)}
              >
                <Text style={{ fontSize: 18 }}>✖</Text>
              </TouchableOpacity>

              <ScrollView>
                <Text style={popupStyles.title}>Customer Details</Text>

                <TextInput
                  style={popupStyles.input}
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={popupStyles.input}
                  placeholder="Phone Number"
                  keyboardType="numeric"
                  value={phone}
                  onChangeText={setPhone}
                />

                {/* Pickup Area */}
                <TextInput
                  style={popupStyles.input}
                  placeholder="Pickup Area"
                  value={area}
                  onChangeText={(text) => {
                    setArea(text);
                    searchLocation("area");
                  }}
                />
                {loadingSuggestions && <ActivityIndicator />}
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.place_id || item.display_name}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true} // ✅ Fix warning
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectPlace(item)}>
                      <Text style={popupStyles.suggestionItem}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {/* Drop Area */}
                <TextInput
                  style={popupStyles.input}
                  placeholder="Drop Area"
                  value={darea}
                  onChangeText={(text) => {
                    setDArea(text);
                    searchLocation("darea");
                  }}
                />
                {loadingSuggestions && <ActivityIndicator />}
                <FlatList
                  data={dropsuggestions}
                  keyExtractor={(item) => item.place_id || item.display_name}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true} // ✅ Fix warning
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectDropArea(item)}>
                      <Text style={popupStyles.suggestionItem}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {/* Trip Type */}
                <View style={popupStyles.tripRow}>
                  <TouchableOpacity
                    style={[
                      popupStyles.tripBtn,
                      triptype === "local" && { backgroundColor: "#F6B100" },
                    ]}
                    onPress={() => setTriptype("local")}
                  >
                    <Text>Local</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      popupStyles.tripBtn,
                      triptype === "outstation" && {
                        backgroundColor: "#F6B100",
                      },
                    ]}
                    onPress={() => setTriptype("outstation")}
                  >
                    <Text>Outstation</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={popupStyles.submitBtn}
                  onPress={onSubmit}
                >
                  <Text style={popupStyles.submitText}>Submit Details</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
};

export default HomeTab;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F6B100",
  },
  profileIcon: { width: 36, height: 36, borderRadius: 18 },
  searchBox: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 10,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 42,
    justifyContent: "center",
  },
  searchInput: { fontSize: 14 },
  bell: { fontSize: 22 },
  slider: { marginTop: 10, paddingLeft: 12 },
  banner: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginRight: 12,
    elevation: 3,
    width: 260,
  },
  bannerText: { fontSize: 16, fontWeight: "700", color: "#F6B100" },
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontWeight: "700" },
  price: { fontWeight: "bold", color: "#F6B100" },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  accept: {
    backgroundColor: "#F6B100",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  reject: {
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  bookNowBtn: {
    backgroundColor: "#F6B100",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    elevation: 4,
  },
  bookNowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 15,
  },
  point: { fontSize: 15, marginVertical: 6 },
  statusBox: {
    marginTop: 15,
    backgroundColor: "#FFF3C4",
    padding: 12,
    borderRadius: 10,
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFF9E5",
  },
  statusText: { textAlign: "center", color: "#F6B100", fontWeight: "700" },
});

/* ================= POPUP FORM STYLES ================= */
const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  popup: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  closeBtn: { alignSelf: "flex-end" },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderColor: "#eee" },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  tripBtn: {
    width: "48%",
    padding: 12,
    backgroundColor: "#FFF3C4",
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtn: {
    backgroundColor: "#F6B100",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

/* ================= HELPERS ================= */
const regionFrom = (lat: number, lng: number, delta = 0.01): Region => ({
  latitude: lat,
  longitude: lng,
  latitudeDelta: delta,
  longitudeDelta: delta,
});
