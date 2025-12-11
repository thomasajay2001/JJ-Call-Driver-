import axios from "axios";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import io from "socket.io-client";

/* =======================
   Replace this with your backend IP
   ======================= */
const BASE_URL = "http://192.168.0.107:3000";

type Suggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

type Driver = {
  id: string;
  name: string;
  vehicle?: string;
  lat: number;
  lng: number;
  distanceText?: string;
  etaText?: string;
};

export default function CustomerDetailsScreen() {
  // form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");
  const [showSuccess, setShowSuccess] = useState(false);

  // suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // map & drivers
  const [showMap, setShowMap] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedDriverText, setSelectedDriverText] = useState("");

  // gps & errors
  const [gpsError, setGpsError] = useState("");
  const [coordsPreview, setCoordsPreview] = useState<{ lat: number; lng: number } | null>(null);

  // socket (optional usage)
  const socketRef = useRef<any>(null);

  // interval ref typestable for RN
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // on mount: optionally fetch drivers, init socket
  useEffect(() => {
    fetchDrivers();

    // socket just for demo (optional)
    socketRef.current = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current.on("connect", () => {
      // console.log("socket connected");
    });
    socketRef.current.on("bookingAccepted", (payload: any) => {
      Alert.alert("Booking update", JSON.stringify(payload));
    });

    return () => {
      socketRef.current?.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ---- Location autocomplete using Nominatim (OpenStreetMap) ----
  const searchLocation = async (field: "area" | "darea") => {
    const q = field === "area" ? area : darea;
    if (!q || q.length < 2) {
      if (field === "area") setSuggestions([]);
      else setDropsuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      // Nominatim search
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&addressdetails=1&limit=6`;
      const r = await fetch(url, {
        headers: { "User-Agent": "JJCallDriverApp/1.0 (youremail@example.com)" },
      });
      const data = (await r.json()) as Suggestion[];
      if (field === "area") setSuggestions(data);
      else setDropsuggestions(data);
    } catch (e) {
      console.warn("suggest", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectPlace = (item: Suggestion) => {
    setArea(item.display_name);
    setSuggestions([]);
    Keyboard.dismiss();
    // center map and optionally find nearby drivers
    fetchDriversNearby(Number(item.lat), Number(item.lon));
  };

  const selectDropArea = (item: Suggestion) => {
    setDArea(item.display_name);
    setDropsuggestions([]);
    Keyboard.dismiss();
  };

  // ---- Drivers: fetch from backend; optionally filter by distance ----
  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      // expect array of drivers with lat/lng
      const ds: Driver[] = (res.data || []).map((d: any) => ({
        id: d.id?.toString() ?? d._id?.toString() ?? Math.random().toString(),
        name: d.name || "Driver",
        vehicle: d.vehicle || "Bike",
        lat: Number(d.lat) || 0,
        lng: Number(d.lng) || 0,
      }));
      setDrivers(ds);
    } catch (err) {
      console.warn("fetchDrivers", err);
    }
  };

  const fetchDriversNearby = async (lat: number, lng: number) => {
    // example: call backend API to compute distances or compute here
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`); // you can add query lat/lng on backend
      const ds: Driver[] = (res.data || []).map((d: any) => {
        const dlng = Number(d.lng) || 0;
        const dlat = Number(d.lat) || 0;
        const dist = haversineDistance(lat, lng, dlat, dlng);
        return {
          id: d.id?.toString() ?? d._id?.toString() ?? Math.random().toString(),
          name: d.name,
          vehicle: d.vehicle,
          lat: dlat,
          lng: dlng,
          distanceText: `${(dist).toFixed(2)} km`,
          etaText: `${Math.max(2, Math.round(dist / 0.5))} min`,
        } as Driver;
      });
      // sort by distance
      ds.sort((a, b) => {
        const na = Number(a.distanceText?.split(" ")[0]) || 9999;
        const nb = Number(b.distanceText?.split(" ")[0]) || 9999;
        return na - nb;
      });
      setDrivers(ds);
    } catch (err) {
      console.warn("fetchDriversNearby", err);
    }
  };

  // quick haversine distance in km
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // select driver either from marker or list
  const selectDriver = (d: Driver, setText = true) => {
    setSelectedDriver(d);
    if (setText) setSelectedDriverText(`${d.name} (${d.vehicle || "Bike"})`);
    // center map to driver
    // you may call mapRef.animateToRegion when using MapView ref
  };

  const clearSelectedDriver = () => {
    setSelectedDriver(null);
    setSelectedDriverText("");
  };

  // use current device location (fine-grained)
  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setArea(`Current location (${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)})`);
      setCoordsPreview({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      fetchDriversNearby(loc.coords.latitude, loc.coords.longitude);
    } catch (err) {
      setGpsError("Unable to get location");
      console.warn(err);
    }
  };

  // quick coords preview (coarse)
  const getLocationOnceForPreview = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      setCoordsPreview({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err) {
      setGpsError("Unable to get quick coords");
      console.warn(err);
    }
  };

  // Submit handler (send form + selected driver to backend)
  const onSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter name");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      Alert.alert("Validation", "Enter valid 10-digit phone");
      return;
    }
    if (!area.trim()) {
      Alert.alert("Validation", "Enter pickup area");
      return;
    }
    if (!triptype) {
      Alert.alert("Validation", "Select trip type");
      return;
    }

    try {
      const body = {
        name,
        phone,
        pickup: area,
        drop: darea,
        triptype,
        driverId: selectedDriver?.id ?? null,
        pickupLat: coordsPreview?.lat ?? null,
        pickupLng: coordsPreview?.lng ?? null,
      };
      const res = await axios.post(`${BASE_URL}/api/trip-booking`, body);
      // show success overlay or navigate
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      // Optionally emit to socket
      socketRef.current?.emit("newBooking", res.data);
    } catch (err) {
      console.warn("submit error", err);
      Alert.alert("Error", "Unable to submit. Try again");
    }
  };

  // Render helpers
  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <TouchableOpacity onPress={() => selectPlace(item)} style={styles.suggestionItem}>
      <Text>{item.display_name}</Text>
    </TouchableOpacity>
  );

  const renderDropSuggestion = ({ item }: { item: Suggestion }) => (
    <TouchableOpacity onPress={() => selectDropArea(item)} style={styles.suggestionItem}>
      <Text>{item.display_name}</Text>
    </TouchableOpacity>
  );

  const renderDriverItem = ({ item }: { item: Driver }) => (
    <TouchableOpacity style={styles.driverItem} onPress={() => selectDriver(item, true)}>
      <View>
        <Text style={{ fontWeight: "700" }}>{item.name}</Text>
        <Text style={styles.small}>{item.vehicle || "Bike"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <View style={styles.badge}>
          <Text style={{ fontSize: 12 }}>{item.distanceText ?? "--"}</Text>
        </View>
        <Text style={styles.small}>ETA: {item.etaText ?? "--"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Text style={{ fontWeight: "700" }}>JD</Text>
        </View>
        <Text style={styles.formTitle}>Customer Details</Text>
        <Text style={styles.formSubtitle}>Fill in your travel information</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter 10-digit phone number"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
      </View>

      {/* Pickup */}
      <View style={[styles.formGroup, { position: "relative" }]}>
        <Text style={styles.label}>Pickup Area</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={area}
            onChangeText={(v) => {
              setArea(v);
              searchLocation("area");
            }}
            placeholder="Type your location"
            autoComplete="off"
          />
        </View>

        {loadingSuggestions ? <ActivityIndicator /> : null}
        {suggestions.length > 0 && (
          <FlatList
            data={suggestions}
            keyExtractor={(it) => it.place_id}
            renderItem={renderSuggestion}
            style={styles.suggestionsList}
          />
        )}

        <View style={{ marginTop: 8 }}>
          {selectedDriver && (
            <View style={styles.selectedRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={selectedDriverText} editable={false} />
              <TouchableOpacity style={styles.clearBtn} onPress={clearSelectedDriver}>
                <Text>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {showMap && (
            <View style={{ height: 320, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#ddd", marginTop: 8 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: coordsPreview?.lat ?? 11.0,
                  longitude: coordsPreview?.lng ?? 78.0,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {drivers.map((d) => (
                  <Marker
                    key={d.id}
                    coordinate={{ latitude: d.lat, longitude: d.lng }}
                    title={d.name}
                    onPress={() => selectDriver(d, true)}
                  />
                ))}
                {coordsPreview && <Marker coordinate={{ latitude: coordsPreview.lat, longitude: coordsPreview.lng }} pinColor="blue" />}
              </MapView>
            </View>
          )}

          <FlatList data={drivers} keyExtractor={(d) => d.id} renderItem={renderDriverItem} style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* Drop area */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Drop Area</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={darea}
            onChangeText={(v) => {
              setDArea(v);
              searchLocation("darea");
            }}
            placeholder="Type your location"
            autoComplete="off"
          />
        </View>

        {dropsuggestions.length > 0 && (
          <FlatList data={dropsuggestions} keyExtractor={(it) => it.place_id} renderItem={renderDropSuggestion} style={styles.suggestionsList} />
        )}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity style={styles.smallBtn} onPress={useCurrentLocation}>
            <Text style={styles.smallBtnText}>Use current location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={getLocationOnceForPreview}>
            <Text style={styles.smallBtnText}>Quick coords</Text>
          </TouchableOpacity>
        </View>
        {gpsError ? <Text style={{ color: "red", marginTop: 6 }}>{gpsError}</Text> : null}
      </View>

      {/* Trip type */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Trip Type</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setTriptype("local")}
            style={[styles.typeBtn, triptype === "local" && styles.typeBtnActive]}
          >
            <Text style={triptype === "local" ? styles.typeTextActive : styles.typeText}>Local</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTriptype("outstation")}
            style={[styles.typeBtn, triptype === "outstation" && styles.typeBtnActive]}
          >
            <Text style={triptype === "outstation" ? styles.typeTextActive : styles.typeText}>Outstation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitText}>Submit Details</Text>
      </TouchableOpacity>

      {/* Success popup */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successPopup}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "green" }}>Success!</Text>
            <Text style={{ marginTop: 6 }}>Your details have been submitted successfully</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/* --------------- Styles --------------- */
const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#f9fafb" },

  logoSection: { alignItems: "center", marginBottom: 12 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e7f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  formTitle: { fontSize: 22, fontWeight: "700" },
  formSubtitle: { color: "#666" },

  formGroup: { marginVertical: 8 },
  label: { fontWeight: "600", marginBottom: 6 },
  inputWrapper: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    padding: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  suggestionsList: { maxHeight: 180, marginTop: 6, borderRadius: 8, overflow: "hidden" },
  suggestionItem: { padding: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#eee" },

  selectedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  clearBtn: { padding: 8, marginLeft: 8, borderRadius: 8, backgroundColor: "#f0f0f0" },

  driverItem: {
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 6,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  small: { color: "#666", fontSize: 12 },
  badge: { backgroundColor: "#f2f2f2", padding: 6, borderRadius: 6 },

  smallBtn: { borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 8 },
  smallBtnText: { fontSize: 13 },

  typeBtn: { padding: 10, borderWidth: 1, borderColor: "#ddd", borderRadius: 8 },
  typeBtnActive: { backgroundColor: "#2d4cc8", borderColor: "#2d4cc8" },
  typeText: { color: "#222" },
  typeTextActive: { color: "#fff" },

  submitBtn: {
    marginTop: 16,
    backgroundColor: "#2d4cc8",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  successOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  successPopup: { backgroundColor: "#fff", padding: 20, borderRadius: 12, alignItems: "center" },
});
