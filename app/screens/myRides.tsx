import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Constants from "expo-constants";

const BASE_URL = (Constants.expoConfig!.extra as any).BASE_URL;

const RideTab = () => {
  const [booking, setBooking] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ================= GET BOOKING =================
  const fetchBooking = async () => {
    try {
      const storedRole = await AsyncStorage.getItem("role");
      const storedPhone = await AsyncStorage.getItem("customerPhone");
      const storedDriverId = await AsyncStorage.getItem("driverId");

      setRole(storedRole);
      setPhone(storedPhone);
      setDriverId(storedDriverId);

      let res;

      if (storedRole === "customer") {
        res = await axios.get(
          `${BASE_URL}/api/bookings/customer?phone=${storedPhone}`
        );
      }

      if (storedRole === "driver") {
        res = await axios.get(
          `${BASE_URL}/api/bookings/driver?driverId=${storedDriverId}`
        );
      }

      setBooking(res?.data?.[0] || null);
    } catch (err) {
      console.log("Booking error", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= START =================
  const startRide = async () => {
    await axios.post(`${BASE_URL}/api/bookings/start`, {
      bookingId: booking.id,
    });
    fetchBooking();
  };

  // ================= COMPLETE =================
  const completeRide = async () => {
    await axios.post(`${BASE_URL}/api/complete-ride`, {
      bookingId: booking.id,
    });
    fetchBooking();
  };

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, 4000);
    return () => clearInterval(interval);
  }, []);

  // ================= LOADING =================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F6B100" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text>No active ride today</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ================= CUSTOMER ================= */}
      {role === "customer" && (
        <View style={styles.card}>
          <Text style={styles.title}>🚕 Your Ride</Text>

          <Text style={styles.statusText}>
            Status : {booking.status}
          </Text>

          <View style={styles.locationBox}>
            <Text>📍 {booking.pickup}</Text>
            <Text>🏁 {booking.drop_location}</Text>
          </View>

          {booking.driver_name && (
            <View style={styles.driverBox}>
              <Text>Driver : {booking.driver_name}</Text>
              <Text>Vehicle : {booking.vehicle}</Text>
              <Text>Mobile : {booking.driver_phone}</Text>
            </View>
          )}
        </View>
      )}

      {/* ================= DRIVER ================= */}
      {role === "driver" && (
        <View style={styles.card}>
          <Text style={styles.title}>👨‍✈️ Driver Panel</Text>

          <Text style={styles.statusText}>
            Status : {booking.status}
          </Text>

          {booking.status === "assigned" && (
            <TouchableOpacity style={styles.startBtn} onPress={startRide}>
              <Text style={styles.btnText}>START RIDE</Text>
            </TouchableOpacity>
          )}

          {booking.status === "inride" && (
            <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
              <Text style={styles.btnText}>COMPLETE RIDE</Text>
            </TouchableOpacity>
          )}

          <View style={styles.driverBox}>
            <Text>Customer : {booking.customer_name}</Text>
            <Text>Phone : {booking.customer_mobile}</Text>
            <Text>Pickup : {booking.pickup}</Text>
            <Text>Drop : {booking.drop_location}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default RideTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },

  title: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 14,
  },

  statusText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F6B100",
    marginBottom: 12,
  },

  locationBox: {
    backgroundColor: "#FFF6D6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  locationText: {
    fontSize: 14,
    marginVertical: 4,
  },

  driverBox: {
    backgroundColor: "#F1F3F6",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },

  infoText: {
    fontSize: 14,
    marginVertical: 3,
  },

  startBtn: {
    backgroundColor: "#F6B100",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 15,
  },

  completeBtn: {
    backgroundColor: "#FF8C00",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 15,
  },

  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  emptyText: {
    fontSize: 15,
    color: "#777",
  },
});

