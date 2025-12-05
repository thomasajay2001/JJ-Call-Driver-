
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigation = useNavigation();
  const BASE_URL = "http://192.168.0.105:3000"; // replace with your laptop IP

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

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
        console.log("OTP for testing:", res.data.otp); // TEMP: show OTP
      } else {
        setErrorMessage(res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to send OTP. Please try again.");
    }
  };

  const verifyOtp = async () => {
    clearMessages();
    if (otp.length !== 6) {
      setErrorMessage("Enter a valid 6-digit OTP");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/verify-otp`, { phone, otp });
      if (res.data.success) {
        setMessage("OTP verified successfully! Login success.");
        await AsyncStorage.setItem("loggedInUser", "true");
        // navigation.navigate("home");
      } else {
        setErrorMessage(res.data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to verify OTP. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formBox}>
        <View style={styles.logoCircle}>
          <Ionicons name="person-circle-outline" size={50} />
        </View>

        <Text style={styles.title}>Welcome to JJ Call Drivers</Text>
        <Text style={styles.subtitle}>
          {otpSent ? "Enter the OTP sent to your phone" : "Sign in to continue"}
        </Text>

        {!otpSent && (
          <View>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit phone number"
                keyboardType="numeric"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={sendOtp}>
              <Text style={styles.btnText}>Send OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {otpSent && (
          <View>
            <Text style={styles.label}>Verification Code</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
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
          </View>
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
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 20, color: "#444" },
  label: { fontWeight: "600", marginBottom: 5 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#bbb", borderRadius: 8, paddingHorizontal: 10, marginBottom: 15 },
  icon: { marginRight: 6 },
  input: { flex: 1, height: 45 },
  btnPrimary: { backgroundColor: "#007bff", padding: 12, borderRadius: 8 },
  btnSuccess: { backgroundColor: "green", padding: 12, borderRadius: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  link: { textAlign: "center", marginTop: 10, color: "#007bff" },
  success: { color: "green", marginTop: 10, textAlign: "center" },
  error: { color: "red", marginTop: 10, textAlign: "center" },
  footer: { textAlign: "center", marginTop: 15, color: "#666", fontSize: 12 }
});
