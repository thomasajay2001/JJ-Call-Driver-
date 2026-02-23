import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Login() {
  const [loginType, setLoginType] = useState("user");
  const BASE_URL = (Constants.expoConfig!.extra as any).BASE_URL;

  // USER LOGIN STATES
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [otpSent, setOtpSent]   = useState(false);

  // DRIVER LOGIN STATES
  const [driverId, setDriverId]         = useState("");
  const [driverPhone, setDriverPhone]   = useState("");

  const [message, setMessage]           = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ── RESEND OTP TIMER ──
  const RESEND_SECONDS = 30;
  const [timer, setTimer]   = useState(0);
  const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigation = useNavigation();

  const startTimer = () => {
    setTimer(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const clearMessages = () => { setMessage(""); setErrorMessage(""); };

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
        startTimer();
        // Show OTP in message if server sends it (test/fallback mode)
        if (res.data.otp) {
          setMessage(`OTP: ${res.data.otp}`); // visible when SMS not working
        } else {
          setMessage("OTP sent to your mobile number!");
        }
      } else {
        setErrorMessage(res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      setErrorMessage("Failed to send OTP. Check your connection.");
    }
  };

  // --------------------------
  // RESEND OTP
  // --------------------------
  const resendOtp = async () => {
    if (timer > 0) return;
    clearMessages();
    try {
      const res = await axios.post(`${BASE_URL}/api/send-otp`, { phone });
      if (res.data.success) {
        setOtp("");
        startTimer();
        if (res.data.otp) {
          setMessage(`OTP: ${res.data.otp}`);
        } else {
          setMessage("New OTP sent to your mobile number!");
        }
      } else {
        setErrorMessage(res.data.message || "Failed to resend OTP");
      }
    } catch (err) {
      setErrorMessage("Failed to resend OTP");
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
        if (timerRef.current) clearInterval(timerRef.current);
        await AsyncStorage.setItem("role", "customer");
        await AsyncStorage.setItem("customerPhone", phone);
        router.push("/screens/settings");
      } else {
        setErrorMessage(res.data.message || "Invalid OTP");
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
    if (!driverId.trim()) { setErrorMessage("Enter Driver ID"); return; }
    if (driverPhone.length !== 10) { setErrorMessage("Enter 10-digit phone number"); return; }
    try {
      const res = await axios.get(`${BASE_URL}/api/drivers`);
      const list = res.data || [];
      const driver = list.find((d: any) => String(d.id) === String(driverId.trim()));
      if (!driver) { setErrorMessage("Driver ID not found"); return; }
      if (String(driver.mobile) !== String(driverPhone)) { setErrorMessage("Phone number does not match"); return; }
      setMessage("Driver Login Success!");
      await AsyncStorage.setItem("role", "driver");
      await AsyncStorage.setItem("driverId", driverId);
      await AsyncStorage.setItem("driverName", driver.name || driver.NAME || "");
      router.push("/screens/settings");
    } catch (err) {
      setErrorMessage("Failed to login driver");
    }
  };

  // --------------------------
  // HANDLE CHANGE PHONE
  // --------------------------
  const handleChangePhone = () => {
    setOtpSent(false); setOtp(""); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clearMessages();
  };

  const handleSwitchToUser = () => {
    setLoginType("user"); setOtpSent(false); setOtp(""); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    clearMessages();
  };

  const handleSwitchToDriver = () => {
    setLoginType("driver"); setDriverId(""); setDriverPhone(""); clearMessages();
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
            onPress={handleSwitchToUser}
          >
            <Text style={[styles.switchText, loginType === "user" && styles.activeSwitchText]}>
              User Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, loginType === "driver" && styles.activeBtn]}
            onPress={handleSwitchToDriver}
          >
            <Text style={[styles.switchText, loginType === "driver" && styles.activeSwitchText]}>
              Driver Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* USER LOGIN */}
        {loginType === "user" && (
          <>
            {!otpSent ? (
              <>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} style={styles.icon} />
                  <TextInput
                    style={styles.input} placeholder="Enter phone number"
                    keyboardType="numeric" maxLength={10}
                    value={phone} onChangeText={setPhone}
                  />
                </View>
                <TouchableOpacity style={styles.btnPrimary} onPress={sendOtp}>
                  <Text style={styles.btnText}>Send OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Phone display row */}
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={16} color="#555" />
                  <Text style={styles.phoneDisplay}>+91 {phone}</Text>
                  <TouchableOpacity onPress={handleChangePhone}>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} style={styles.icon} />
                  <TextInput
                    style={styles.input} placeholder="6-digit OTP"
                    keyboardType="numeric" maxLength={6}
                    value={otp} onChangeText={setOtp}
                  />
                </View>

                <TouchableOpacity style={styles.btnSuccess} onPress={verifyOtp}>
                  <Text style={styles.btnText}>Verify & Login</Text>
                </TouchableOpacity>

                {/* RESEND ROW */}
                <View style={styles.resendRow}>
                  {timer > 0 ? (
                    <>
                      <Text style={styles.resendLabel}>Resend OTP in </Text>
                      <View style={styles.timerBadge}>
                        <Text style={styles.timerText}>00:{String(timer).padStart(2, "0")}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.resendLabel}>Didn't receive the OTP? </Text>
                      <TouchableOpacity onPress={resendOtp}>
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}

        {/* DRIVER LOGIN */}
        {loginType === "driver" && (
          <>
            <Text style={styles.label}>Driver ID</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="id-card-outline" size={20} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="Enter Driver ID"
                value={driverId} onChangeText={setDriverId}
              />
            </View>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="10-digit number"
                keyboardType="numeric" maxLength={10}
                value={driverPhone} onChangeText={setDriverPhone}
              />
            </View>
            <TouchableOpacity style={styles.btnSuccess} onPress={driverLogin}>
              <Text style={styles.btnText}>Login as Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {message      ? <Text style={styles.success}>{message}</Text>      : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text>   : null}

        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  formBox:         { width: "90%", padding: 20, backgroundColor: "#fff", borderRadius: 12, elevation: 5 },
  logoCircle:      { alignSelf: "center", marginBottom: 20 },
  switchRow:       { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  switchBtn:       { padding: 10, width: "45%", backgroundColor: "#ddd", borderRadius: 8 },
  activeBtn:       { backgroundColor: "#007bff" },
  switchText:      { textAlign: "center", color: "#000", fontWeight: "600" },
  activeSwitchText:{ color: "#fff" },
  label:           { fontWeight: "600", marginBottom: 5, marginTop: 10 },
  inputWrapper:    { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#bbb", borderRadius: 8, paddingHorizontal: 10, marginBottom: 5 },
  icon:            { marginRight: 6 },
  input:           { flex: 1, height: 45 },
  btnPrimary:      { backgroundColor: "#007bff", padding: 12, borderRadius: 8, marginTop: 10 },
  btnSuccess:      { backgroundColor: "green", padding: 12, borderRadius: 8, marginTop: 10 },
  btnText:         { color: "#fff", textAlign: "center", fontWeight: "600" },
  phoneRow:        { flexDirection: "row", alignItems: "center", backgroundColor: "#F0F4FF", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4, gap: 6 },
  phoneDisplay:    { flex: 1, fontSize: 14, color: "#333", fontWeight: "600" },
  changeLink:      { fontSize: 13, color: "#007bff", fontWeight: "700" },
  resendRow:       { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14, flexWrap: "wrap", gap: 4 },
  resendLabel:     { fontSize: 13, color: "#555" },
  resendLink:      { fontSize: 13, color: "#007bff", fontWeight: "700" },
  timerBadge:      { backgroundColor: "#FFF3CD", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: "#F59E0B" },
  timerText:       { fontSize: 13, fontWeight: "800", color: "#92400E" },
  success:         { color: "green", marginTop: 10, textAlign: "center" },
  error:           { color: "red", marginTop: 10, textAlign: "center" },
  link:            { textAlign: "center", marginTop: 10, color: "#007bff" },
  footer:          { textAlign: "center", marginTop: 15, color: "#666", fontSize: 12 },
});