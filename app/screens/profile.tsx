import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const BASE_URL = "http://192.168.0.7:3000";

const ProfileTab = () => {
  const [profile, setProfile] = useState<any>([]);
  const [cust, setCust] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  // Edit name states
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  useEffect(() => {
    const getRole = async () => {
      const roleValue = await AsyncStorage.getItem("role");
      setRole(roleValue);
    };
    getRole();
  }, []);

  const fetchProfile = async () => {
    try {
      const driverId = await AsyncStorage.getItem("driverId");

      const res = await axios.get(
        `${BASE_URL}/api/drivers/profile?driverId=${driverId}`,
      );

      setProfile(res.data[0]);
      const phone = await AsyncStorage.getItem("customerPhone");

      const cust = await axios.get(
        `${BASE_URL}/api/customers/profile?phone=${phone}`,
      );
      setCust(cust.data[0]);
    } catch (err) {
      console.log("Profile error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert("Error", "Please enter a valid name");
      return;
    }

    try {
      const phone = await AsyncStorage.getItem("customerPhone");

      await axios.put(`${BASE_URL}/api/customers/update-name`, {
        phone: phone,
        name: tempName.trim(),
      });

      // Update local state
      setCust({ ...cust, NAME: tempName.trim() });

      Alert.alert("Success", "Name updated successfully");
      setIsEditingName(false);
    } catch (err) {
      console.error("Update name error:", err);
      Alert.alert("Error", "Failed to update name");
    }
  };

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
      {role === "driver" && (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.NAME?.charAt(0)}</Text>
            </View>

            <Text style={styles.name}>{profile.NAME}</Text>
            <Text style={styles.role}>Driver</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.label}>📞 Mobile</Text>
            <Text style={styles.value}>{profile.MOBILE}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.label}>🩸 Blood Group</Text>
            <Text style={styles.value}>{profile.BLOODGRP || "-"}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.label}>🪪 Licence No</Text>
            <Text style={styles.value}>{profile.LICENCENO || "-"}</Text>
          </View>

          <View style={styles.rideCard}>
            <Text style={styles.rideTitle}>My Rides</Text>
            <Text style={styles.rideCount}>
              {profile.total_rides || 0} rides completed
            </Text>
          </View>
        </>
      )}
      {role === "customer" && (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>

            <TouchableOpacity
              style={styles.nameContainer}
              onPress={() => {
                setTempName(cust?.NAME || "");
                setIsEditingName(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.name}>{cust?.NAME || cust?.PHONE}</Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>

            <Text style={styles.role}>Customer</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.label}>📞 Mobile</Text>
            <Text style={styles.value}>{cust?.PHONE}</Text>
          </View>

          {/* Edit Name Modal */}
          <Modal
            visible={isEditingName}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsEditingName(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Name</Text>

                <TextInput
                  style={styles.input}
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  autoFocus={true}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsEditingName(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSaveName}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
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
    backgroundColor: "#72bafd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  avatarText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },

  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
  },

  editIcon: {
    fontSize: 16,
    opacity: 0.6,
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
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  label: {
    color: "#888",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  value: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
    color: "#222",
  },

  rideCard: {
    backgroundColor: "#c8e4fe",
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    elevation: 10,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#222",
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: "#222",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },

  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#F0F0F0",
  },

  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 15,
  },

  saveButton: {
    backgroundColor: "#72bafd",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
