import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("role").then(r => setRole(r || ""));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF9E5" }}>

      {/* ================= TOP BAR ================= */}
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
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
          <Text style={styles.bannerText}>💛 Rapido Partner</Text>
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
    </View>
  );
};

export default HomeTab;
const styles = StyleSheet.create({
  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F6B100",
  },

  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  searchBox: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 10,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 42,
    justifyContent: "center",
  },

  searchInput: {
    fontSize: 14,
  },

  bell: {
    fontSize: 22,
  },

  /* SLIDER */
  slider: {
    marginTop: 10,
    paddingLeft: 12,
  },

  banner: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginRight: 12,
    elevation: 3,
    width: 260,
  },

  bannerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F6B100",
  },

  /* DRIVER CARD */
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  bold: {
    fontWeight: "700",
  },

  price: {
    fontWeight: "bold",
    color: "#F6B100",
  },

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

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  /* CUSTOMER CARD */
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 15,
  },

  point: {
    fontSize: 15,
    marginVertical: 6,
  },

  statusBox: {
    marginTop: 15,
    backgroundColor: "#FFF3C4",
    padding: 12,
    borderRadius: 10,
  },

  statusText: {
    textAlign: "center",
    color: "#F6B100",
    fontWeight: "700",
  },
});
