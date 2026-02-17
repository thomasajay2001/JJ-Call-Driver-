import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const BASE_URL = "http://192.168.0.5:3000";

const RideTab = () => {
  const [booking, setBooking] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
const intervalRef = useRef<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showRating, setShowRating] = useState(false);

  // ================= FETCH BOOKING =================
  const fetchBooking = async () => {
    try {
      const storedRole = await AsyncStorage.getItem("role");
      const storedPhone = await AsyncStorage.getItem("customerPhone");
      const storedDriverId = await AsyncStorage.getItem("driverId");

      setRole(storedRole);

      let res;
      const todayStr = new Date().toDateString();

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
            const todayBookings =
        res?.data?.filter(
          (b: any) =>
            new Date(b.created_at).toDateString() === todayStr
        ) || [];

    const currentBooking = todayBookings[0] || null;

if (!currentBooking) {
  setBooking(null);
  setShowRating(false);
  return;
}

// If ride completed
if (
  storedRole === "customer" &&
  currentBooking.status === "completed"
) {
  setBooking(currentBooking);

  // If rating not yet given → show popup
  if (!currentBooking.rating) {
    setShowRating(true);
  } else {
    // Rating already given → remove ride
    setBooking(null);
    setShowRating(false);
  }

  return;
}

// Normal ride flow
setBooking(currentBooking);
setShowRating(false);
    } catch (err) {
      console.log("Booking error", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= SUBMIT RATING =================
  const submitRating = async () => {
    if (rating === 0) {
      alert("Please select rating");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/api/submit-rating`, {
        bookingId: booking.id,
        rating,
        comment,
      });

      alert("Thank you for your feedback!");
// Stop auto refresh after rating
if (intervalRef.current) {
  clearInterval(intervalRef.current);
}
setShowRating(false);
setRating(0);
setComment("");

// Remove ride immediately after rating
setBooking(null);
    } catch (err) {
      console.log("Rating error", err);
    }
  };

  // ================= DRIVER ACTIONS =================
  const startRide = async () => {
    await axios.post(`${BASE_URL}/api/bookings/start`, {
      bookingId: booking.id,
    });
    fetchBooking();
  };

  const completeRide = async () => {
    await axios.post(`${BASE_URL}/api/complete-ride`, {
      bookingId: booking.id,
    });
    fetchBooking();
  };

 useEffect(() => {
  fetchBooking();

  intervalRef.current = setInterval(fetchBooking, 4000);

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
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
      
      {/* ⭐ MODERN RATING OVERLAY */}
      {showRating && (
        <View style={styles.overlay}>
          <View style={styles.modernRatingCard}>
            <Text style={styles.ratingHeader}>Rate Your Driver</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={styles.starIcon}>
                    {star <= rating ? "⭐" : "☆"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Share your experience..."
              value={comment}
              onChangeText={setComment}
              style={styles.commentInputModern}
              multiline
              placeholderTextColor="#999"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButtonModern}
                onPress={() => setShowRating(false)}
              >
                <Text style={styles.cancelTextModern}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButtonModern}
                onPress={() => setShowRating(false)}
              >
                <Text style={styles.skipTextModern}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButtonModern}
                onPress={submitRating}
              >
                <Text style={styles.submitTextModern}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================= CUSTOMER VIEW ================= */}
      {role === "customer" && (
        <View style={styles.card}>
          <Text style={styles.title}>🚕 Your Ride</Text>
          <Text style={styles.statusText}>
            Status : {booking.status}
          </Text>

          <View style={styles.locationBox}>
            <Text>📍 Pickup: {booking.pickup}</Text>
            <Text>🏁 Drop: {booking.drop_location}</Text>
          </View>

          {booking.driver_name && (
            <View style={styles.driverBox}>
              <Text>Driver: {booking.driver_name}</Text>
              <Text>Mobile: {booking.driver_mobile}</Text>
            </View>
          )}
        </View>
      )}

      {/* ================= DRIVER VIEW ================= */}
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
            <Text>Customer: {booking.customer_name}</Text>
            <Text>Phone: {booking.customer_mobile}</Text>
            <Text>Pickup: {booking.pickup}</Text>
            <Text>Drop: {booking.drop_location}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default RideTab;

/* ================= STYLES ================= */

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

  driverBox: {
    backgroundColor: "#F1F3F6",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
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
  },

  /* ⭐ MODERN RATING OVERLAY */

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  modernRatingCard: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 25,
    elevation: 10,
  },

  ratingHeader: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 15,
  },

  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },

  starIcon: {
    fontSize: 34,
    marginHorizontal: 6,
  },

  commentInputModern: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 14,
    padding: 14,
    minHeight: 70,
    backgroundColor: "#F9F9F9",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  cancelButtonModern: {
    backgroundColor: "#ECECEC",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  skipButtonModern: {
    backgroundColor: "#C4C4C4",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  submitButtonModern: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  cancelTextModern: {
    fontWeight: "600",
    color: "#444",
  },

  skipTextModern: {
    fontWeight: "600",
    color: "#fff",
  },

  submitTextModern: {
    fontWeight: "700",
    color: "#fff",
  },
});