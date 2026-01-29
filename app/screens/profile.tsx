import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

const BASE_URL = "http://192.168.0.5:3000";

const ProfileTab = () => {
  const [profile, setProfile] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const driverId = await AsyncStorage.getItem("driverId");

      const res = await axios.get(
        `${BASE_URL}/api/drivers/profile?driverId=${driverId}`
      );

      setProfile(res.data[0]);
    } catch (err) {
      console.log("Profile error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F6B100" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>No profile data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* PROFILE HEADER */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.NAME?.charAt(0)}
          </Text>
        </View>

        <Text style={styles.name}>{profile.NAME}</Text>
        <Text style={styles.role}>Driver</Text>
      </View>

      {/* INFO CARDS */}
      <View style={styles.infoCard}>
        <Text style={styles.label}>📞 Mobile</Text>
        <Text style={styles.value}>{profile.MOBILE}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>🚗 Vehicle</Text>
        <Text style={styles.value}>{profile.VEHICLE}</Text>
      </View>

      {/* MY RIDES */}
      <View style={styles.rideCard}>
        <Text style={styles.rideTitle}>My Rides</Text>
        <Text style={styles.rideCount}>
          {profile.total_rides || 0} rides completed
        </Text>
      </View>

    </View>
  );
};

export default ProfileTab;
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

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    alignItems: "center",
    paddingVertical: 25,
    marginBottom: 20,
    elevation: 6,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F6B100",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  avatarText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
  },

  role: {
    color: "#777",
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },

  label: {
    color: "#888",
    fontSize: 13,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
  },

  rideCard: {
    backgroundColor: "#FFF6D6",
    borderRadius: 18,
    padding: 20,
    marginTop: 10,
  },

  rideTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  rideCount: {
    fontSize: 15,
    color: "#333",
  },
});
