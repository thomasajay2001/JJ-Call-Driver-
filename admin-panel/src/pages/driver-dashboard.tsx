// app/(tabs)/driver-dashboard.tsx
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import io from "socket.io-client";

interface Driver {
  id: number;
  name: string;
  mobile: string;
  location: string;
  lat?: string;
  lng?: string;
}

const BASE_URL = "http://192.168.0.4:3000"; // your LAN IP
const SOCKET_URL = "http://192.168.0.4:3000";
const LOCATIONIQ_KEY = "pk.3d89a3dff9f53e4a29a4948c199756e4"; // replace with your key

export default function DriverDashboard() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pagedDrivers, setPagedDrivers] = useState<Driver[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Driver | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState<number[]>([]);

  const [isFormVisible, setFormVisible] = useState(false);
  const [isEditMode, setEditMode] = useState(false);
  const [editDriverId, setEditDriverId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const locationTimerRef = useRef<any>(null);

  const socketRef = useRef<any>(null);
  const [popupMessage, setPopupMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // ---------- Load drivers + socket ----------
  useEffect(() => {
    fetchDrivers();

    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current.on("connect", () => console.log("Socket connected:", socketRef.current.id));
    socketRef.current.on("newbooking", (data: any) => {
      setNotifications((p) => [data, ...p]);
      showPopup(`${data.name} — ${data.area}`);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // ---------- Fetch Drivers ----------
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Driver[]>(`${BASE_URL}/api/drivers`);
      setDrivers(res.data || []);
      calculatePages(res.data || [], pageSize);
      updatePage(res.data || [], currentPage, pageSize, searchText, sortColumn, sortDirection);
    } catch (err) {
      console.warn("Fetch drivers error:", err);
      Alert.alert("Error", "Unable to fetch drivers. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Pagination ----------
  const calculatePages = (data: Driver[], pageSz: number) => {
    const pages = Math.max(1, Math.ceil((data?.length || 0) / pageSz));
    setTotalPages(Array.from({ length: pages }, (_, i) => i + 1));
    if (currentPage > pages) setCurrentPage(pages);
  };

  const updatePage = (
    data: Driver[] = drivers,
    page = currentPage,
    pageSz = pageSize,
    search = searchText,
    sortCol = sortColumn,
    sortDir = sortDirection
  ) => {
    let filtered = [...(data || [])];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (it) =>
          (it.name || "").toLowerCase().includes(s) ||
          (it.location || "").toLowerCase().includes(s) ||
          (it.mobile || "").toLowerCase().includes(s)
      );
    }

    if (sortCol) {
      filtered.sort((a: any, b: any) => {
        const A = (a as any)[sortCol] ?? "";
        const B = (b as any)[sortCol] ?? "";
        if (sortDir === "asc") return A > B ? 1 : A < B ? -1 : 0;
        else return A < B ? 1 : A > B ? -1 : 0;
      });
    }

    const start = (page - 1) * pageSz;
    setPagedDrivers(filtered.slice(start, start + pageSz));
  };

  useEffect(() => {
    calculatePages(drivers, pageSize);
    updatePage(drivers, 1, pageSize, searchText, sortColumn, sortDirection);
    setCurrentPage(1);
  }, [searchText, pageSize, sortColumn, sortDirection, drivers]);

  useEffect(() => {
    updatePage(drivers, currentPage, pageSize, searchText, sortColumn, sortDirection);
  }, [currentPage]);

  // ---------- Sorting ----------
  const handleSort = (col: keyof Driver) => {
    const newDir = sortColumn === col && sortDirection === "asc" ? "desc" : "asc";
    setSortColumn(col);
    setSortDirection(newDir);
    updatePage(drivers, currentPage, pageSize, searchText, col, newDir);
  };

  // ---------- LocationIQ autocomplete ----------
  const searchLocation = (q: string) => {
    setLocation(q);
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    if (q.length < 3) return setLocationSuggestions([]);

    locationTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `https://us1.locationiq.com/v1/autocomplete.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
            q
          )}&limit=5`
        );
        setLocationSuggestions(res.data || []);
      } catch (err) {
        setLocationSuggestions([]);
      }
    }, 400);
  };

  const selectLocation = (item: any) => {
    setLocation(item.display_name);
    setLat(item.lat);
    setLng(item.lon);
    setLocationSuggestions([]);
  };

  // ---------- Form CRUD ----------
  const openCreate = () => {
    setEditMode(false);
    setEditDriverId(null);
    setName("");
    setMobile("");
    setLocation("");
    setLat("");
    setLng("");
    setFormVisible(true);
  };

  const openEdit = (d: Driver) => {
    setEditMode(true);
    setEditDriverId(d.id);
    setName(d.name);
    setMobile(d.mobile);
    setLocation(d.location);
    setLat(d.lat ?? "");
    setLng(d.lng ?? "");
    setFormVisible(true);
  };

  const submitForm = async () => {
    if (!name.trim() || !mobile.trim()) return Alert.alert("Validation", "Name and Mobile are required.");

    try {
      const body = { name, mobile, location, lat, lng };
      if (isEditMode && editDriverId) {
        await axios.put(`${BASE_URL}/api/updatedriver/${editDriverId}`, body);
        showSuccessMsg("Driver updated successfully");
      } else {
        await axios.post(`${BASE_URL}/api/adddrivers`, body);
        showSuccessMsg("Driver added successfully");
      }
      setFormVisible(false);
      fetchDrivers();
    } catch (err) {
      console.warn("save error", err);
      Alert.alert("Error", "Failed to save driver.");
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert("Confirm", "Are you sure delete?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => handleDelete(id) },
    ]);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${BASE_URL}/api/deletedriver/${id}`);
      showSuccessMsg("Driver deleted");
      fetchDrivers();
    } catch (err) {
      Alert.alert("Error", "Delete failed");
    }
  };

  // ---------- Popups ----------
  const showPopup = (msg: string) => {
    setPopupMessage(msg);
    setTimeout(() => setPopupMessage(""), 4000);
  };

  const showSuccessMsg = (msg: string) => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
    showPopup(msg);
  };

  // ---------- Render ----------
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        {popupMessage ? (
          <View style={styles.popup}>
            <Text style={styles.popupText}>{popupMessage}</Text>
          </View>
        ) : null}

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Drivers Management</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>➕ Add Driver</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Page Size */}
        <View style={styles.controls}>
          <TextInput
            placeholder="Search name / location / mobile..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
          <View style={styles.selectRow}>
            <Text style={styles.small}>Rows</Text>
            {[5, 10, 15].map((sz) => (
              <TouchableOpacity key={sz} style={styles.pageBtn} onPress={() => setPageSize(sz)}>
                <Text style={pageSize === sz ? styles.activePageText : undefined}>{sz}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

        {/* Drivers List */}
        <FlatList
          style={{ flex: 1 }}
          data={pagedDrivers}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text>No drivers found.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardId}>#{item.id}</Text>
              </View>
              <Text style={styles.small}>Mobile: {item.mobile}</Text>
              <Text style={styles.small}>Location: {item.location}</Text>
              <Text style={styles.small}>
                Lat: {item.lat || "--"} | Lng: {item.lng || "--"}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => openEdit(item)}>
                  <Text style={styles.btnPrimaryText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={() => confirmDelete(item.id)}>
                  <Text style={styles.btnDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        {/* Pagination */}
        <View style={styles.pagination}>
          <TouchableOpacity disabled={currentPage === 1} onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}>
            <Text style={[styles.pageNav, currentPage === 1 && styles.disabled]}>{"<<"}</Text>
          </TouchableOpacity>
          {totalPages.map((p) => (
            <TouchableOpacity key={p} onPress={() => setCurrentPage(p)}>
              <Text style={[styles.pageNum, p === currentPage && styles.activePageNum]}>{p}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            disabled={currentPage === totalPages.length}
            onPress={() => setCurrentPage((p) => Math.min(totalPages.length, p + 1))}
          >
            <Text style={[styles.pageNav, currentPage === totalPages.length && styles.disabled]}>{">>"}</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Form */}
        <Modal visible={isFormVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{isEditMode ? "Edit Driver" : "Create Driver"}</Text>

                <TextInput placeholder="Full name" value={name} onChangeText={setName} style={styles.input} />
                <TextInput
                  placeholder="Mobile"
                  value={mobile}
                  onChangeText={setMobile}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
                <TextInput
                  placeholder="Location (type...)"
                  value={location}
                  onChangeText={searchLocation}
                  style={styles.input}
                />

                {locationSuggestions.length > 0 && (
                  <View style={styles.suggestBox}>
                    {locationSuggestions.map((s, i) => (
                      <TouchableOpacity key={i} style={styles.suggestItem} onPress={() => selectLocation(s)}>
                        <Text style={styles.suggestText}>{s.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput placeholder="Lat" value={lat} onChangeText={setLat} style={[styles.input, { flex: 1 }]} />
                  <TextInput placeholder="Lng" value={lng} onChangeText={setLng} style={[styles.input, { flex: 1 }]} />
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={submitForm}>
                    <Text style={styles.btnPrimaryText}>{isEditMode ? "Update" : "Create"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => setFormVisible(false)}>
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {showSuccess && (
          <View style={styles.successOverlay}>
            <Text style={styles.successText}>Operation successful</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { flex: 1, padding: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "700" },
  addBtn: { backgroundColor: "#28a745", padding: 8, borderRadius: 6 },
  addBtnText: { color: "white", fontWeight: "700" },
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 6, marginRight: 8 },
  selectRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pageBtn: { padding: 6, borderWidth: 1, borderColor: "#ddd", borderRadius: 6 },
  activePageText: { color: "#007bff", fontWeight: "700" },
  small: { color: "#555" },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#e6e6e6" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardId: { color: "#666" },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnPrimary: { backgroundColor: "#0d6efd", padding: 8, borderRadius: 6 },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
  btnDanger: { backgroundColor: "#dc3545", padding: 8, borderRadius: 6 },
  btnDangerText: { color: "#fff", fontWeight: "600" },
  btnSecondary: { borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 6, alignItems: "center" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 10 },
  pageNum: { padding: 6 },
  activePageNum: { fontWeight: "700", color: "#fff", backgroundColor: "#007bff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  pageNav: { padding: 6, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 800, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10 },
  suggestBox: { maxHeight: 150, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, backgroundColor: "#fff" },
  suggestItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  suggestText: { color: "#333" },
  empty: { padding: 20, alignItems: "center" },
  popup: { position: "absolute", top: 10, left: 20, right: 20, backgroundColor: "#000", padding: 10, borderRadius: 6, zIndex: 10 },
  popupText: { color: "#fff", textAlign: "center" },
  successOverlay: { position: "absolute", top: "50%", left: 0, right: 0, backgroundColor: "#28a745", padding: 12 },
  successText: { color: "#fff", textAlign: "center", fontWeight: "700" },
});
