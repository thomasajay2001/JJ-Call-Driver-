import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import io from 'socket.io-client';

interface Booking {
  bookingId: number;
  name: string;
  pickup: string;
  drop:string;
  phone: string;
}

const BASE_URL = 'http://192.168.0.6:3000'; // replace with your IP

const DriverDashboard = () => {
  const [driverId, setDriverId] = useState<string>('');
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState('Vehicle');
const [status, setStatus] = useState<'online' | 'offline' | 'inride' | 'completed'>('offline');
  const [mobile, setMobile] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [locationError, setLocationError] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [popupMessage, setPopupMessage] = useState('');

const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<any>(null);
  // Fetch driver profile and initialize socket
useEffect(() => {
  const init = async () => {
    const role = await AsyncStorage.getItem("role");
    if (role !== "driver") return;

    const id = await AsyncStorage.getItem("driverId");
    if (!id) return;

    setDriverId(id);

    const socket = io(BASE_URL, {
      transports: ["websocket"],
    });

 loadDriverProfile(id);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Driver socket connected", socket.id);
      socket.emit("joinDriverRoom", { driverId: id });
    });

    socket.on("newBooking", (data) => {
      console.log("📩 New Booking:", data);
      setNotifications(prev => [...prev, data]);
      showPopup(data);
    });

    socket.on("bookingConfirmed", (data) => {
  console.log("Booking accepted:", data);
});
  };

  init();

  return () => socketRef.current?.disconnect();
}, []);




  const loadDriverProfile = async (id: string) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const driver = res.data.find((d: any) => d.id == id);
      if (driver) {
        setName(driver.name);
        setVehicle(driver.vehicle);
        setStatus(driver.status);
        setMobile(driver.mobile);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showPopup = (booking: Booking) => {
    setPopupMessage(`New Booking from ${booking.name}, Area: ${booking.pickup}`);
    setTimeout(() => setPopupMessage(''), 4000);
    console.log(booking);

  };
const startRide = async () => {
  setStatus('inride');
  await sendStatusToBackend('inride');
  alert("Ride Started");
};

const completeRide = async () => {
  setStatus('completed');
  await sendStatusToBackend('completed');
  alert("Ride Completed");
};

  const sendStatusToBackend = async (s:any) => {
    if (!driverId) return;
    try {
      await axios.post(`${BASE_URL}/api/driver/updateStatus`, {
        driverId,
        status: s,
      });
    } catch (err) {
      console.error(err);
    }
  };

  

const sendLocationToBackend = async (latVal: number, lngVal: number) => {
  if (!driverId) return;
  try {
    await axios.post(`${BASE_URL}/api/driver/updateLocation`, {
      driverId,
      lat: latVal,
      lng: lngVal,
    });
  } catch (err) {
    console.error(err);
  }
};


  const updateLocationOnce = async () => {
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setLat(coords.latitude);
    setLng(coords.longitude);

    sendLocationToBackend(coords.latitude, coords.longitude);
  } catch (err) {
    setLocationError('Unable to fetch location.');
  }
};

  const startSharing = async () => {
    console.log("START SHARING CLICKED");
  console.log("DriverId:", driverId);
  const { status: permStatus } =
    await Location.requestForegroundPermissionsAsync();

  if (permStatus !== 'granted') {
    setLocationError('Permission to access location was denied');
    return;
  }

  setIsSharing(true);
  await sendStatusToBackend('online');
  setStatus('online');

  updateLocationOnce();
  intervalRef.current = setInterval(updateLocationOnce, 5000);
};


  const stopSharing = async() => {
    setIsSharing(false);
   await sendStatusToBackend('offline');
setStatus('offline');

    if (intervalRef.current) clearInterval(intervalRef.current);
  };

const onAccept = async (booking: Booking) => {
  try {
    const res = await axios.post(`${BASE_URL}/api/accept-booking`, {
      bookingId: booking.bookingId,   // ✅ IMPORTANT
      driverId: driverId       // ✅ From AsyncStorage / state
    });

    if (res.data.success) {
      alert("Booking accepted");

      setNotifications(prev =>
        prev.filter(b => b.bookingId !== booking.bookingId)
      );
    } else {
      alert(res.data.message);
    }

  } catch (err) {
    console.error("Accept booking error:", err);
  }
};



  const onDecline = (booking: Booking) => {
    setNotifications(prev => prev.filter(b => b !== booking));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>

      {popupMessage ? <Text style={styles.popup}>{popupMessage}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Driver Details</Text>
        <Text>Name: {name}</Text>
        <Text>Vehicle: {vehicle}</Text>
        <Text>{status === 'online' && (
  <Button title="Start Ride" onPress={startRide} color="green" />
)}

{status === 'inride' && (
  <Button title="Complete Ride" onPress={completeRide} color="orange" />
)}
</Text>

        {notifications.map((n, idx) => (
          <View key={idx} style={styles.booking}>
            <Text>
              New Booking → {n.name} | {n.pickup} | {n.phone} | {n.drop}
            </Text>
            <Button title="Accept" onPress={() => onAccept(n)} />
            <Button title="Decline" onPress={() => onDecline(n)} color="red" />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Sharing</Text>
        {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

        {!isSharing ? (
          <Button title="Go Online" onPress={startSharing} />
        ) : (
          <Button title="Go Offline" onPress={stopSharing} color="red" />
        )}

        {isSharing && (
          <MapView
            style={styles.map}
            region={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} title={name} />
          </MapView>
        )}
      </View>
    </ScrollView>
  );
};

export default DriverDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  booking: { marginVertical: 5 },
  popup: {
    backgroundColor: '#e0ecff',
    color: '#1a3ca2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 10,
  },
  map: { width: '100%', height: 400, marginTop: 10, borderRadius: 12 },
  error: { color: 'red', marginBottom: 5 },
});
