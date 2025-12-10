import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import io from "socket.io-client";

const LOCATIONIQ_KEY = "pk.3d89a3dff9f53e4a29a4948c199756e4"; // Put your key

export default function CustomerPage() {
  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState("");

  // Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);

  // Map + Drivers
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [showMap, setShowMap] = useState(false);

  const [coords, setCoords] = useState({
    latitude: 13.0827,
    longitude: 80.2707,
  });

 const SOCKET_URL = "http://192.168.0.105:3000";

const socketRef = useRef<ReturnType<typeof io> | null>(null);
  useEffect(() => {
    // Connect socket
    socketRef.current = io("http://10.0.2.2:3000", {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("Connected:", socketRef.current?.id);
    });

    // Listen driver updates
    socketRef.current.on("driver-updates", (data:any) => {
      setDrivers(data);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Location search
  const searchLocation = async (text: string, type: "pickup" | "drop") => {
    if (text.length < 3) {
      type === "pickup" ? setSuggestions([]) : setDropSuggestions([]);
      return;
    }

    const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${text}&format=json`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      type === "pickup" ? setSuggestions(data) : setDropSuggestions(data);
    } catch {
      console.log("Location search failed");
    }
  };

  const selectPlace = (item: any) => {
    setArea(item.display_name);
    setCoords({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    });
    setShowMap(true);
    setSuggestions([]);
  };

  const selectDrop = (item: any) => {
    setDArea(item.display_name);
    setDropSuggestions([]);
  };

  // Get phone GPS
  const useCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    let location = await Location.getCurrentPositionAsync();

    setCoords({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    setShowMap(true);
  };

  // Submit booking
  const submitDetails = () => {
    if (!name || !phone || !area || !darea || !triptype) {
      alert("Fill all details");
      return;
    }

    socketRef.current?.emit("customer-booking", {
      name,
      phone,
      pickup: area,
      drop: darea,
      triptype,
      selectedDriver,
    });

    alert("Details submitted!");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Customer Details</Text>

      {/* Name */}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />

      {/* Phone */}
      <TextInput
        style={styles.input}
        placeholder="10-digit Phone"
        value={phone}
        maxLength={10}
        keyboardType="number-pad"
        onChangeText={setPhone}
      />

      {/* Pickup Area */}
      <TextInput
        style={styles.input}
        placeholder="Pickup Area"
        value={area}
        onChangeText={(t) => {
          setArea(t);
          searchLocation(t, "pickup");
        }}
      />

      {/* Pickup Suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          style={styles.list}
          data={suggestions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => selectPlace(item)}
            >
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Drop Area */}
      <TextInput
        style={styles.input}
        placeholder="Drop Area"
        value={darea}
        onChangeText={(t) => {
          setDArea(t);
          searchLocation(t, "drop");
        }}
      />

      {/* Drop Suggestions */}
      {dropSuggestions.length > 0 && (
        <FlatList
          style={styles.list}
          data={dropSuggestions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => selectDrop(item)}
            >
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Current Location */}
      <TouchableOpacity style={styles.btn} onPress={useCurrentLocation}>
        <Text style={styles.btnText}>Use Current Location</Text>
      </TouchableOpacity>

      {/* Map */}
      {showMap && (
        <MapView
          style={styles.map}
          region={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={coords} title="Pickup" pinColor="red" />

          {drivers.map((d, idx) => (
            <Marker
              key={idx}
              coordinate={{
                latitude: d.lat,
                longitude: d.lng,
              }}
              title={d.name}
              pinColor="blue"
              onPress={() => setSelectedDriver(d)}
            />
          ))}
        </MapView>
      )}

      {/* Driver List */}
      {drivers.length > 0 && (
        <View style={styles.driverBox}>
          <Text style={styles.driverTitle}>Nearby Drivers</Text>

          {drivers.map((d, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.driverCard}
              onPress={() => setSelectedDriver(d)}
            >
              <Text style={styles.driverName}>{d.name}</Text>
              <Text style={styles.driverInfo}>ETA: {d.eta || "--"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={submitDetails}>
        <Text style={styles.submitText}>Submit Details ✓</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  map: { width: "100%", height: 300, marginVertical: 15 },
  driverBox: { marginTop: 10 },
  driverTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  driverCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  driverName: { fontWeight: "bold" },
  driverInfo: { color: "#555" },
  submitBtn: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  submitText: { color: "#fff", textAlign: "center", fontSize: 18 },
  list: { maxHeight: 200, backgroundColor: "#f7f7f7" },
  listItem: { padding: 10, borderBottomWidth: 1, borderColor: "#eee" },
});
