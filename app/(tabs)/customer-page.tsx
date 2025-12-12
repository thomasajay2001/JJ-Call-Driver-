import axios from "axios";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import io from "socket.io-client";

/* =======================
   CONFIG - set your backend
   ======================= */
const BASE_URL = "http://192.168.0.102:3000"; // change if needed
/* ======================= */

type Suggestion = {
  place_id?: string;
  display_name: string;
  lat: string;
  lon: string;
};

type Driver = {
  id: string | number;
  name: string;
  vehicle?: string;
  lat: number;
  lng: number;
  distanceText?: string;
  etaText?: string;
  status?: string;
};

export default function CustomerDetailsScreen() {
  // form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");

  // suggestions (small lists rendered as Views)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // map & drivers
  const [showMap, setShowMap] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedDriverText, setSelectedDriverText] = useState("");

  // gps & preview
  const [gpsError, setGpsError] = useState("");
  const [coordsPreview, setCoordsPreview] = useState<{ lat: number; lng: number } | null>(null);

  // misc
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUsingGps, setIsUsingGps] = useState(false);

  // refs
  const socketRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    // initial fetch of drivers (non-filtered)
    fetchDrivers();

    // socket (optional)
    try {
      socketRef.current = io(BASE_URL, { transports: ["websocket"] });
      socketRef.current.on("connect", () => {
        // connected
      });

      socketRef.current.on("updateDriverLocation", (driver: any) => {
        // update driver in list
        updateDriverInList(driver);
      });

      socketRef.current.on("bookingAccepted", (payload: any) => {
        Alert.alert("Booking update", JSON.stringify(payload));
      });

      socketRef.current.on("updateDriverStatus", (data: any) => {
        setDrivers(prev => prev.map(d => (String(d.id) === String(data.driverId) ? { ...d, status: data.status } : d)));
      });
    } catch (e) {
      console.warn("Socket init failed", e);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when selected coordsPreview changes, auto load nearby drivers and animate map
  useEffect(() => {
    if (coordsPreview) {
      loadDrivers(coordsPreview.lat, coordsPreview.lng);
      // auto-refresh drivers every 3s
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadDrivers(coordsPreview.lat, coordsPreview.lng), 3000);
      // animate map
      mapRef.current?.animateToRegion(regionFrom(coordsPreview.lat, coordsPreview.lng, 0.01), 500);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [coordsPreview]);

  // -------------------------
  // Autocomplete (Nominatim)
  // -------------------------
  const searchLocation = async (field: "area" | "darea") => {
    const q = field === "area" ? area : darea;
    if (!q || q.length < 2) {
      if (field === "area") setSuggestions([]);
      else setDropsuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`;
      const r = await fetch(url, { headers: { "User-Agent": "JJCallDriverApp/1.0" } });
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
    const lon = Number(item.lon);
    setArea(item.display_name);
    setSuggestions([]);
    Keyboard.dismiss();
    setCoordsPreview({ lat, lng: lon });
    setShowMap(true);
  };

  const selectDropArea = (item: Suggestion) => {
    setDArea(item.display_name);
    setDropsuggestions([]);
    Keyboard.dismiss();
  };

  // -------------------------
  // Drivers fetch / filter
  // -------------------------
  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const ds: Driver[] = (res.data || []).map((d: any) => ({
        id: d.id ?? d._id ?? Math.random().toString(),
        name: d.name ?? "Driver",
        vehicle: d.vehicle,
        lat: Number(d.lat) || 0,
        lng: Number(d.lng) || 0,
        status: d.status,
      }));
      setDrivers(ds);
    } catch (err) {
      console.warn("fetchDrivers", err);
    }
  };

  const loadDrivers = async (lat: number, lng: number) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const list: Driver[] = (res.data || [])
        .map((d: any) => {
          const dlat = Number(d.lat);
          const dlng = Number(d.lng);
          const distKm = haversineDistance(lat, lng, dlat, dlng);
          return {
            id: d.id ?? d._id ?? Math.random().toString(),
            name: d.name,
            lat: dlat,
            lng: dlng,
            vehicle: d.vehicle,
            status: (d.status || "").toLowerCase(),
            distanceText: `${distKm.toFixed(2)} km`,
            etaText: `${Math.max(2, Math.round(distKm / 0.5))} min`,
          } as Driver;
        })
        .filter((d:any) => d.status === "online" && parseFloat(d.distanceText) <= 5)
        .sort((a:any, b:any) => parseFloat(a.distanceText || "9999") - parseFloat(b.distanceText || "9999"));

      setDrivers(list);
    } catch (err) {
      console.warn("loadDrivers", err);
    }
  };

  const updateDriverInList = (driver: any) => {
    setDrivers(prev => {
      const idx = prev.findIndex(p => String(p.id) === String(driver.id));
      const dObj: Driver = {
        id: driver.id,
        name: driver.name,
        lat: Number(driver.lat),
        lng: Number(driver.lng),
        vehicle: driver.vehicle,
        status: driver.status,
        distanceText: prev.length && coordsPreview
          ? `${haversineDistance(coordsPreview.lat, coordsPreview.lng, Number(driver.lat), Number(driver.lng)).toFixed(2)} km`
          : undefined,
        etaText: undefined,
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...dObj };
        return copy;
      } else {
        return [dObj, ...prev];
      }
    });
  };

  // -------------------------
  // Current location button (inside pickup input)
  // -------------------------
  const useCurrentLocation = async () => {
    setGpsError("");
    setIsUsingGps(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Permission denied");
        setIsUsingGps(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // reverse geocode using expo-location
      const addr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const first = addr && addr.length > 0 ? addr[0] : null;
      let display = `Current location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      if (first) {
        // build a friendly address
        const parts = [
          first.name,
          first.street,
          first.city || first.region,
          first.postalCode,
          first.country
        ].filter(Boolean);
        display = parts.join(", ");
      }

      setArea(display);
      setCoordsPreview({ lat, lng });
      setShowMap(true);
      setIsUsingGps(false);
    } catch (err) {
      console.error("useCurrentLocation err", err);
      setIsUsingGps(false);
      setGpsError("Unable to get location.");
    }
  };

  const getLocationOnceForPreview = async () => {
    setGpsError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      setGpsError(`Coords: ${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`);
      setCoordsPreview({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err) {
      console.warn(err);
      setGpsError("Unable to read coords.");
    }
  };

  // -------------------------
  // Submit booking
  // -------------------------
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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      socketRef.current?.emit("newBooking", res.data);
      // clear fields
      setName(""); setPhone(""); setArea(""); setDArea(""); setTriptype(""); setSelectedDriver(null); setSelectedDriverText("");
    } catch (err) {
      console.warn("submit error", err);
      Alert.alert("Error", "Unable to submit. Try again");
    }
  };

  // ---------- helpers ----------
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
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

  const regionFrom = (lat: number, lng: number, delta = 0.01): Region => ({
    latitude: lat,
    longitude: lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  });

  // ---------- render helpers ----------
  const renderDriverItem = ({ item }: { item: Driver }) => (
    <TouchableOpacity style={styles.driverItem} onPress={() => { setSelectedDriver(item); setSelectedDriverText(`${item.name} (${item.distanceText})`); mapRef.current?.animateToRegion(regionFrom(item.lat, item.lng, 0.01), 500); }}>
      <View>
        <Text style={{ fontWeight: "700" }}>{item.name}</Text>
        <Text style={styles.small}>{item.vehicle || "Bike"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <View style={styles.badge}><Text style={{ fontSize: 12 }}>{item.distanceText}</Text></View>
        <Text style={styles.small}>ETA: {item.etaText ?? "--"}</Text>
      </View>
    </TouchableOpacity>
  );

  // ---------- main UI ----------
  return (
    <FlatList
      data={drivers}
      keyExtractor={(d) => String(d.id)}
      renderItem={renderDriverItem}
      ListHeaderComponent={
        <>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}><Text style={{ fontWeight: "700" }}>JD</Text></View>
            <Text style={styles.formTitle}>Customer Details</Text>
            <Text style={styles.formSubtitle}>Fill in your travel information</Text>
          </View>

          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" />
          </View>

          {/* Phone */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter 10-digit phone number" keyboardType="numeric" maxLength={10} />
          </View>

          {/* Pickup */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Pickup Area</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={area}
                onChangeText={(v) => { setArea(v); searchLocation("area"); }}
                placeholder="Type your location"
                autoComplete="off"
              />
              <TouchableOpacity onPress={useCurrentLocation} style={styles.pickupIcon}>
                {isUsingGps ? <ActivityIndicator /> : <Text style={{ fontSize: 18 }}>📍</Text>}
              </TouchableOpacity>
            </View>

            {/* suggestions rendered as simple Views to avoid nested VirtualizedList */}
            {loadingSuggestions ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((s, idx) => (
                  <TouchableOpacity key={s.place_id ?? idx} onPress={() => selectPlace(s)} style={styles.suggestionItem}>
                    <Text>{s.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* selected driver text */}
            {selectedDriver && (
              <View style={styles.selectedRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={selectedDriverText} editable={false} />
                <TouchableOpacity style={styles.clearBtn} onPress={() => { setSelectedDriver(null); setSelectedDriverText(""); }}>
                  <Text>Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Map */}
            {showMap && (
              <View style={styles.mapWrapper}>
                <MapView
  ref={(r) => {
    mapRef.current = r;  // store map reference
  }}
  style={styles.map}
  initialRegion={
    coordsPreview
      ? regionFrom(coordsPreview.lat, coordsPreview.lng, 0.05)
      : regionFrom(11.0, 78.0, 5)
  }
>

                  {coordsPreview && <Marker coordinate={{ latitude: coordsPreview.lat, longitude: coordsPreview.lng }} pinColor="blue" />}
                  {drivers.map(d => <Marker key={String(d.id)} coordinate={{ latitude: d.lat, longitude: d.lng }} title={d.name} />)}
                </MapView>
              </View>
            )}
          </View>

          {/* Drop */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Drop Area</Text>
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={darea} onChangeText={(v) => { setDArea(v); searchLocation("darea"); }} placeholder="Type your location" autoComplete="off" />
            </View>

            {dropsuggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {dropsuggestions.map((s, idx) => (
                  <TouchableOpacity key={s.place_id ?? idx} onPress={() => selectDropArea(s)} style={styles.suggestionItem}>
                    <Text>{s.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <TouchableOpacity style={styles.smallBtn} onPress={useCurrentLocation}>
                <Text style={styles.smallBtnText}>Use current location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { marginLeft: 8 }]} onPress={getLocationOnceForPreview}>
                <Text style={styles.smallBtnText}>Quick coords</Text>
              </TouchableOpacity>
            </View>
            {!!gpsError && <Text style={{ color: "red", marginTop: 6 }}>{gpsError}</Text>}
          </View>

          {/* Trip type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Trip Type</Text>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <TouchableOpacity onPress={() => setTriptype("local")} style={[styles.typeBtn, triptype === "local" && styles.typeBtnActive]}>
                <Text style={triptype === "local" ? styles.typeTextActive : styles.typeText}>Local</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTriptype("outstation")} style={[styles.typeBtn, triptype === "outstation" && styles.typeBtnActive, { marginLeft: 8 }]}>
                <Text style={triptype === "outstation" ? styles.typeTextActive : styles.typeText}>Outstation</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <View style={{ paddingVertical: 12 }}>
            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
              <Text style={styles.submitText}>Submit Details</Text>
            </TouchableOpacity>
          </View>

          {/* success popup (simple) */}
          {showSuccess && (
            <View style={styles.successOverlay}>
              <View style={styles.successPopup}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "green" }}>Success!</Text>
                <Text style={{ marginTop: 6 }}>Your details have been submitted successfully</Text>
              </View>
            </View>
          )}
        </>
      }
      // style the drivers list area
      contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: "#f9fafb" }}
      ListEmptyComponent={() => (
        <View style={{ padding: 12 }}>
          <Text style={{ color: "#666" }}>No drivers found nearby</Text>
        </View>
      )}
    />
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  logoSection: { alignItems: "center", marginBottom: 12 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#e7f0ff", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  formTitle: { fontSize: 22, fontWeight: "700" },
  formSubtitle: { color: "#666" },

  formGroup: { marginVertical: 8 },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    padding: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  pickupIcon: { padding: 8, marginLeft: 8, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },

  suggestionsList: { maxHeight: 180, marginTop: 6, borderRadius: 8, overflow: "hidden" },
  suggestionItem: { padding: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#eee" },

  mapWrapper: { height: 320, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#ddd", marginTop: 8 },
  map: { flex: 1 },

  selectedRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  clearBtn: { padding: 8, marginLeft: 8, borderRadius: 8, backgroundColor: "#f0f0f0" },

  driverItem: { padding: 12, backgroundColor: "#fff", marginBottom: 6, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { color: "#666", fontSize: 12 },
  badge: { backgroundColor: "#f2f2f2", padding: 6, borderRadius: 6 },

  smallBtn: { borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 8 },
  smallBtnText: { fontSize: 13 },

  typeBtn: { padding: 10, borderWidth: 1, borderColor: "#ddd", borderRadius: 8 },
  typeBtnActive: { backgroundColor: "#2d4cc8", borderColor: "#2d4cc8" },
  typeText: { color: "#222" },
  typeTextActive: { color: "#fff" },

  submitBtn: { backgroundColor: "#2d4cc8", padding: 14, borderRadius: 10, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  successOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  successPopup: { backgroundColor: "#fff", padding: 20, borderRadius: 12, alignItems: "center" },
});
