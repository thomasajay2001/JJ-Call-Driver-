import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";



export default function Login() {
const BASE_URL = 'http://192.168.0.8:3000';
  const [loginType, setLoginType] = useState("user"); // user | driver

  // USER LOGIN STATES
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // DRIVER LOGIN STATES
  const [driverId, setDriverId] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigation = useNavigation();

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  // --------------------------
  // USER LOGIN - SEND OTP
  // --------------------------
  const sendOtp = async () => {
    clearMessages();
    if (phone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/send-otp`, { phone });
      if (res.data.success) {
        setOtpSent(true);
        setMessage("OTP sent successfully!");
        console.log("OTP:", res.data.otp);
      } else {
        setErrorMessage(res.data.message);
      }
    } catch (err) {
      setErrorMessage("Failed to send OTP");
    }
  };

  // --------------------------
  // USER LOGIN - VERIFY OTP
  // --------------------------
  const verifyOtp = async () => {
    clearMessages();
    if (otp.length !== 6) {
      setErrorMessage("Enter a valid 6-digit OTP");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/verify-otp`, { phone, otp });
      if (res.data.success) {
        setMessage("OTP Verified! Login Success");
        await AsyncStorage.setItem("loggedInUser", "true");
        router.push("/customer-page");

        // navigation.navigate("home"); // After login
      } else {  
        setErrorMessage("Invalid OTP");
      }
    } catch (err) {
      setErrorMessage("Verification failed");
    }
  };

  // --------------------------
  // DRIVER LOGIN
  // --------------------------
const driverLogin = async () => {
  clearMessages();

  if (!driverId.trim()) {
    setErrorMessage("Enter Driver ID");
    return;
  }

  if (driverPhone.length !== 10) {
    setErrorMessage("Enter 10-digit phone number");
    return;
  }

  try {
    const res = await axios.get(`${BASE_URL}/api/drivers`);

    const list = res.data || [];

    const driver = list.find(
      (d:any) => String(d.id) === String(driverId.trim())
    );

    if (!driver) {
      setErrorMessage("Driver ID not found");
      return;
    }

    if (String(driver.mobile) !== String(driverPhone)) {
      setErrorMessage("Phone number does not match");
      return;
    }

    // SUCCESS
    setMessage("Driver Login Success!");

    await AsyncStorage.setItem("role", "driver");
    await AsyncStorage.setItem("driverId", driverId);

    router.push("/driver-page");

  } catch (err) {
    console.log("Login error:", err);
    setErrorMessage("Failed to login driver");
  }
};




  return (
    <View style={styles.container}>
      <View style={styles.formBox}>
        <View style={styles.logoCircle}>
          <Ionicons name="person-circle-outline" size={50} />
        </View>

        {/* SWITCH LOGIN TYPE */}
        <View style={styles.switchRow}>
          <TouchableOpacity 
            style={[styles.switchBtn, loginType === "user" && styles.activeBtn]}
            onPress={() => { setLoginType("user"); setOtpSent(false); }}
          >
            <Text style={styles.switchText}>User Login</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.switchBtn, loginType === "driver" && styles.activeBtn]}
            onPress={() => setLoginType("driver")}
          >
            <Text style={styles.switchText}>Driver Login</Text>
          </TouchableOpacity>
        </View>

        {/* ---------------- USER LOGIN ---------------- */}
        {loginType === "user" && (
          <>
            {/* <Text style={styles.subtitle}>
              {otpSent ? "Enter the OTP" : "Enter your phone number"}
            </Text> */}

            {!otpSent ? (
              <>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    keyboardType="numeric"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <TouchableOpacity style={styles.btnPrimary} onPress={sendOtp}>
                  <Text style={styles.btnText}>Send OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>OTP</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter OTP"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                </View>

                <TouchableOpacity style={styles.btnSuccess} onPress={verifyOtp}>
                  <Text style={styles.btnText}>Verify & Login</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setOtpSent(false)}>
                  <Text style={styles.link}>Change Phone Number</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ---------------- DRIVER LOGIN ---------------- */}
        {loginType === "driver" && (
          <>
            <Text style={styles.label}>Driver ID</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="id-card-outline" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Driver ID"
                value={driverId}
                onChangeText={setDriverId}
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="10-digit number"
                keyboardType="numeric"
                maxLength={10}
                value={driverPhone}
                onChangeText={setDriverPhone}
              />
            </View>

            <TouchableOpacity style={styles.btnSuccess} onPress={driverLogin}>
              <Text style={styles.btnText}>Login as Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  formBox: { width: "90%", padding: 20, backgroundColor: "#fff", borderRadius: 12, elevation: 5 },
  logoCircle: { alignSelf: "center", marginBottom: 20 },
  switchRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  switchBtn: { padding: 10, width: "45%", backgroundColor: "#ddd", borderRadius: 8 },
  activeBtn: { backgroundColor: "#007bff" },
  switchText: { textAlign: "center", color: "#000", fontWeight: "600" },
  subtitle: { textAlign: "center", marginBottom: 20, color: "#555" },
  label: { fontWeight: "600", marginBottom: 5, marginTop: 10 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#bbb", borderRadius: 8, paddingHorizontal: 10, marginBottom: 5 },
  icon: { marginRight: 6 },
  input: { flex: 1, height: 45 },
  btnPrimary: { backgroundColor: "#007bff", padding: 12, borderRadius: 8, marginTop: 10 },
  btnSuccess: { backgroundColor: "green", padding: 12, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  link: { textAlign: "center", marginTop: 10, color: "#007bff" },
  success: { color: "green", marginTop: 10, textAlign: "center" },
  error: { color: "red", marginTop: 10, textAlign: "center" },
  footer: { textAlign: "center", marginTop: 15, color: "#666", fontSize: 12 }
});
