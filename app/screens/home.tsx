import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";

const { width, height } = Dimensions.get("window");
const BASE_URL = (Constants.expoConfig!.extra as any).BASE_URL;

/* ================= COLORS ================= */
const COLORS = {
  primary: "#2563EB", // classic blue
  secondary: "#3B82F6", // lighter blue
  bg: "#F8FAFC", // soft background
  surface: "#FFFFFF",
  textMain: "#1E293B",
  textMuted: "#64748B",
  border: "#CBD5E1",
  danger: "#EF4444",
};

/* ================= TYPES ================= */

type role = "customer" | "driver" | "";

type Suggestion = {
  place_id?: string;
  display_name: string;
  lat: string;
  lon: string;
};

type Notification = {
  bookingId: string;
  name: string;
  pickup: string;
  drop: string;
  amount?: number;
};

type ChennaiPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  icon: string;
};

/* ================= CHENNAI PLACES DATA ================= */
const CHENNAI_POPULAR_PLACES: ChennaiPlace[] = [
  {
    id: "1",
    name: "Marina Beach",
    address: "Kamaraj Salai, Chennai",
    lat: 13.0499,
    lon: 80.2824,
    icon: "🏖️",
  },
  {
    id: "2",
    name: "T Nagar",
    address: "Thyagaraya Nagar, Chennai",
    lat: 13.0418,
    lon: 80.2341,
    icon: "🛍️",
  },
  {
    id: "3",
    name: "Chennai Central",
    address: "Railway Station, Chennai",
    lat: 13.0827,
    lon: 80.2707,
    icon: "🚉",
  },
  {
    id: "4",
    name: "Phoenix MarketCity",
    address: "Velachery Main Road, Chennai",
    lat: 12.9926,
    lon: 80.2207,
    icon: "🏬",
  },
  {
    id: "5",
    name: "Besant Nagar Beach",
    address: "Elliot's Beach, Chennai",
    lat: 13.0006,
    lon: 80.2661,
    icon: "🌊",
  },
];

/* ================= TAMIL NADU OUTSTATION PLACES ================= */
const TAMILNADU_OUTSTATION_PLACES: ChennaiPlace[] = [
  {
    id: "1",
    name: "Mahabalipuram",
    address: "Mahabalipuram, Tamil Nadu",
    lat: 12.6208,
    lon: 80.1925,
    icon: "🏛️",
  },
  {
    id: "2",
    name: "Pondicherry",
    address: "Pondicherry, Tamil Nadu",
    lat: 11.9416,
    lon: 79.8083,
    icon: "🌴",
  },
  {
    id: "3",
    name: "Mahabalipuram Temple",
    address: "Shore Temple Road, Mahabalipuram",
    lat: 12.6167,
    lon: 80.1833,
    icon: "⛩️",
  },
  {
    id: "4",
    name: "Yelagiri Hills",
    address: "Yelagiri, Vellore District",
    lat: 12.5833,
    lon: 78.6333,
    icon: "⛰️",
  },
  {
    id: "5",
    name: "Vellore Fort",
    address: "Vellore, Tamil Nadu",
    lat: 12.9165,
    lon: 79.1325,
    icon: "🏰",
  },
];

/* ================= COMPONENT ================= */
const HomeTab = ({ notifications = [], onAccept, onDecline }: any) => {
  const [role, setRole] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showPlacesPopup, setShowPlacesPopup] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [showOutstationPopup, setShowOutstationPopup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [darea, setDArea] = useState("");
  const [triptype, setTriptype] = useState<"local" | "outstation" | "">("");
  const [bookingphnno, setBookingPhnNo] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropsuggestions, setDropsuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [coordsPreview, setCoordsPreview] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [errors, setErrors] = useState({
    name: "",
    phone: "",
    area: "",
    darea: "",
    triptype: "",
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /* ================= CAROUSEL DATA ================= */
  const carouselData = [
    {
      id: "1",
      icon: "🌟",
      title: "Trusted by Thousands",
      description: "Over 50,000+ happy customers across Chennai",
      rating: "4.8/5.0",
    },
    {
      id: "2",
      icon: "💰",
      title: "Best Prices Guaranteed",
      description: "Transparent pricing with no hidden charges",
      rating: null,
    },
    {
      id: "3",
      icon: "🚗",
      title: "Professional Drivers",
      description: "Verified and experienced drivers at your service",
      rating: null,
    },
    {
      id: "4",
      icon: "⏱️",
      title: "24/7 Service",
      description: "Available round the clock for your convenience",
      rating: null,
    },
  ];

  /* ================= LOAD ROLE ================= */
  useEffect(() => {
    AsyncStorage.getItem("customerPhone").then((p) => setBookingPhnNo(p || ""));
    AsyncStorage.getItem("role").then((r) => {
      setRole((r as role) || "");
    });
  }, []);

  /* ================= AUTO SLIDE CAROUSEL ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % carouselData.length;
        carouselRef.current?.scrollToIndex({
          index: nextSlide,
          animated: true,
        });
        return nextSlide;
      });
    }, 3000); // Auto-slide every 3 seconds

    return () => clearInterval(interval);
  }, []);

  /* ================= FETCH BOOKING HISTORY ================= */
  const fetchBookingHistory = async () => {
    try {
      const phone = await AsyncStorage.getItem("customerPhone");
      if (!phone) {
        console.log("No phone number found");
        setBookingHistory([]);
        return;
      }

      const response = await axios.get(
        `${BASE_URL}/api/bookings/customer?phone=${phone}`
      );

      if (response.data && Array.isArray(response.data)) {
        setBookingHistory(response.data);
      } else {
        setBookingHistory([]);
      }
    } catch (error) {
      console.log("Error fetching history:", error);
      setBookingHistory([]);
    }
  };

  /* ================= LOCATION SEARCH ================= */
  const searchLocation = async (field: "area" | "darea") => {
    const q = field === "area" ? area : darea;
    if (!q || q.length < 2) {
      field === "area" ? setSuggestions([]) : setDropsuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q,
      )}&limit=6`;
      const r = await fetch(url, {
        headers: { "User-Agent": "JJCallDriverApp/1.0" },
      });
      const data = (await r.json()) as Suggestion[];
      field === "area"
        ? setSuggestions(data || [])
        : setDropsuggestions(data || []);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectPlace = (item: Suggestion) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    setArea(item.display_name);
    setSuggestions([]);
    Keyboard.dismiss();
    setCoordsPreview({ latitude, longitude });
    mapRef.current?.animateToRegion(regionFrom(latitude, longitude), 500);
    setErrors({ ...errors, area: "" });
  };

  const selectDropArea = (item: Suggestion) => {
    setDArea(item.display_name);
    setDropsuggestions([]);
    Keyboard.dismiss();
    setErrors({ ...errors, darea: "" });
  };

  /* ================= SELECT CHENNAI PLACE ================= */
  const selectChennaiPlace = (place: ChennaiPlace) => {
    setDArea(place.address);
    setShowPlacesPopup(false);
    setShowBookingForm(true);
    setTriptype("local");
  };

  /* ================= SELECT OUTSTATION PLACE ================= */
  const selectOutstationPlace = (place: ChennaiPlace) => {
    setDArea(place.address);
    setShowOutstationPopup(false);
    setShowBookingForm(true);
    setTriptype("outstation");
  };

  /* ================= GET CURRENT LOCATION ================= */
  const useCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch((err) => {
        console.log("Location error:", err);
        throw new Error("Could not get your location. Please try again.");
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      }).catch((err) => {
        console.log("Geocoding error:", err);
        return [];
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const displayAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
        ]
          .filter(Boolean)
          .join(", ");
        setArea(displayAddress);
      } else {
        setArea(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }

      setCoordsPreview({ latitude, longitude });
      mapRef.current?.animateToRegion(
        regionFrom(latitude, longitude, 0.05),
        500,
      );
      setSuggestions([]);
      setErrors({ ...errors, area: "" }); // Clear area error when location is set
    } catch (error: any) {
      console.log("Location error:", error);
      alert(error.message || "Error getting location. Please try again.");
    } finally {
      setLoadingLocation(false);
    }
  };

  /* ================= FORM VALIDATION ================= */
  const validateForm = () => {
    let newErrors = {
      name: "",
      phone: "",
      area: "",
      darea: "",
      triptype: "",
    };

    if (!name.trim()) newErrors.name = "Name is required";

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      newErrors.phone = "Enter valid 10-digit mobile number";
    }

    // Allow submission if either area text OR coordinates exist
    if (!area.trim() && !coordsPreview) {
      newErrors.area = "Pickup location is required";
    }

    if (!darea.trim()) newErrors.darea = "Drop location is required";
    if (!triptype) newErrors.triptype = "Select trip type";

    setErrors(newErrors);

    return Object.values(newErrors).every((e) => e === "");
  };

  /* ================= SUBMIT BOOKING ================= */
  const onSubmit = async () => {
    if (!validateForm()) return;

    try {
      const bookingPhone = await AsyncStorage.getItem("customerPhone");

      const response = await axios.post(`${BASE_URL}/api/trip-booking`, {
        name,
        phone,
        pickup: area,
        pickupLat: coordsPreview?.latitude || null,
        pickupLng: coordsPreview?.longitude || null,
        drop: darea,
        triptype,
        bookingphnno: bookingPhone,
      });

      if (response.data.success) {
        setShowBookingForm(false);
        setName("");
        setPhone("");
        setArea("");
        setDArea("");
        setTriptype("");
        setCoordsPreview(null);
        setErrors({
          name: "",
          phone: "",
          area: "",
          darea: "",
          triptype: "",
        });

        // Show success modal
        setShowSuccessModal(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit booking. Please try again.");
    }
  };

  /* ================= HANDLE FEATURE CLICK ================= */
  const handleFeatureClick = (featureId: string) => {
    if (featureId === "1") {
      // Local Ride
      setShowPlacesPopup(true);
    } else if (featureId === "2") {
      // Outstation
      setShowOutstationPopup(true);
    } else if (featureId === "3") {
      // History
      fetchBookingHistory();
      setShowHistory(true);
    } else if (featureId === "4") {
      // Help
      setShowHelp(true);
    } else {
      // Other features - show booking form directly
      setShowBookingForm(true);
    }
  };

  /* ================= FAKE DATA ================= */
  const features = [
    { id: "1", title: "Local Ride", icon: "🚖" },
    { id: "2", title: "Outstation", icon: "🛣️" },
    { id: "3", title: "History", icon: "📜" },
    { id: "4", title: "Help", icon: "❓" },
  ];

  const promotions = [
    {
      id: "1",
      image: "https://i.imgur.com/5Rt8VwD.png",
      text: "Refer & Earn!",
    },
    {
      id: "2",
      image: "https://i.imgur.com/X1cU1p5.png",
      text: "20% Off Today",
    },
  ];

  const liveRides = [
    { id: "1", name: "Ravi", pickup: "MG Road", drop: "Airport", amount: 120 },
    {
      id: "2",
      name: "Anita",
      pickup: "Main Street",
      drop: "City Mall",
      amount: 150,
    },
  ];

  /* ================= DRIVER UI ================= */

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* CHENNAI PLACES POPUP */}
      <Modal visible={showPlacesPopup} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowPlacesPopup(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Popular Places in Chennai</Text>
            <Text style={modal.subtitle}>
              Select a destination for your local ride
            </Text>

            <View style={{ marginTop: 16 }}>
              {CHENNAI_POPULAR_PLACES.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={modal.placeCard}
                  onPress={() => selectChennaiPlace(place)}
                >
                  <View style={modal.placeIconContainer}>
                    <Text style={modal.placeIcon}>{place.icon}</Text>
                  </View>
                  <View style={modal.placeInfo}>
                    <Text style={modal.placeName}>{place.name}</Text>
                    <Text style={modal.placeAddress}>{place.address}</Text>
                  </View>
                  <Text style={modal.placeArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* OUTSTATION PLACES POPUP */}
      <Modal visible={showOutstationPopup} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowOutstationPopup(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Popular Outstation Places</Text>
            <Text style={modal.subtitle}>
              Select your destination in Tamil Nadu
            </Text>

            <View style={{ marginTop: 16 }}>
              {TAMILNADU_OUTSTATION_PLACES.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={modal.placeCard}
                  onPress={() => selectOutstationPlace(place)}
                >
                  <View style={modal.placeIconContainer}>
                    <Text style={modal.placeIcon}>{place.icon}</Text>
                  </View>
                  <View style={modal.placeInfo}>
                    <Text style={modal.placeName}>{place.name}</Text>
                    <Text style={modal.placeAddress}>{place.address}</Text>
                  </View>
                  <Text style={modal.placeArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* HISTORY MODAL */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowHistory(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Booking History</Text>
            <Text style={modal.subtitle}>Your previous rides</Text>

            <FlatList
              data={bookingHistory}
              keyExtractor={(item) => item.id}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={modal.emptyState}>
                  <Text style={modal.emptyIcon}>📜</Text>
                  <Text style={modal.emptyText}>No booking history yet</Text>
                  <Text style={modal.emptySubtext}>
                    Your completed rides will appear here
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={modal.historyCard}>
                  <View style={modal.historyHeader}>
                    <View style={modal.historyTypeBadge}>
                      <Text style={modal.historyTypeText}>
                        {item.triptype?.toUpperCase() || "LOCAL"}
                      </Text>
                    </View>
                    <Text style={modal.historyDate}>
                      {new Date(item.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(item.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                  </View>

                  <View style={modal.historyRoute}>
                    <View style={modal.historyLocation}>
                      <Text style={modal.historyLocationIcon}>📍</Text>
                      <Text
                        style={modal.historyLocationText}
                        numberOfLines={1}
                      >
                        {item.pickup}
                      </Text>
                    </View>
                    <View style={modal.historyDivider} />
                    <View style={modal.historyLocation}>
                      <Text style={modal.historyLocationIcon}>🏁</Text>
                      <Text
                        style={modal.historyLocationText}
                        numberOfLines={1}
                      >
                        {item.drop_location}
                      </Text>
                    </View>
                  </View>

                  <View style={modal.historyFooter}>
                    <Text style={modal.historyStatus}>{item.status}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* HELP MODAL */}
      <Modal visible={showHelp} animationType="fade" transparent>
        <View style={modal.overlay}>
          <View style={modal.helpContainer}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowHelp(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <View style={modal.helpIconContainer}>
              <Text style={modal.helpIcon}>📞</Text>
            </View>

            <Text style={modal.helpTitle}>Need Help?</Text>
            <Text style={modal.helpSubtitle}>
              Our support team is here to assist you
            </Text>

            <View style={modal.supportCard}>
              <Text style={modal.supportLabel}>JJ Call Drivers</Text>
              <Text style={modal.supportTeam}>Support Team</Text>

              <View style={modal.phoneContainer}>
                <Text style={modal.phoneNumber}>787XXX6447</Text>
              </View>

              <TouchableOpacity style={modal.callButton}>
                <Text style={modal.callButtonText}>📱 Call Now</Text>
              </TouchableOpacity>
            </View>

            <Text style={modal.helpNote}>
              Available 24/7 for your assistance
            </Text>
          </View>
        </View>
      </Modal>

      {/* BOOKING MODAL */}
      <Modal visible={showBookingForm} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity
              style={modal.closeBtn}
              onPress={() => setShowBookingForm(false)}
            >
              <Text style={modal.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={modal.title}>Trip Details</Text>

            <TextInput
              style={[modal.input, errors.name && modal.errorInput]}
              placeholder="Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors({ ...errors, name: "" });
              }}
            />
            {errors.name ? (
              <Text style={modal.errorText}>{errors.name}</Text>
            ) : null}

            <TextInput
              style={[modal.input, errors.phone && modal.errorInput]}
              placeholder="Phone Number"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => {
                const v = text.replace(/\D/g, "");
                setPhone(v);
                setErrors({ ...errors, phone: "" });
              }}
            />
            {errors.phone ? (
              <Text style={modal.errorText}>{errors.phone}</Text>
            ) : null}

            {phoneError ? (
              <Text
                style={{ color: COLORS.danger, marginTop: 6, fontSize: 12 }}
              >
                {phoneError}
              </Text>
            ) : null}

            <View style={[modal.inputWrapper, { marginTop: 10 }]}>
              <TextInput
                style={[
                  modal.input,
                  errors.area && modal.errorInput,
                  { flex: 1 },
                ]}
                placeholder="Pickup Area"
                value={area}
                onChangeText={(text) => {
                  setArea(text);
                  searchLocation("area");
                  setErrors({ ...errors, area: "" });
                }}
              />
              <TouchableOpacity
                style={modal.locationButton}
                onPress={useCurrentLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Text style={modal.locationIcon}>📍</Text>
                )}
              </TouchableOpacity>
            </View>
            {errors.area ? (
              <Text style={modal.errorText}>{errors.area}</Text>
            ) : null}

            <FlatList
              data={suggestions}
              keyExtractor={(i) => i.place_id || i.display_name}
              keyboardShouldPersistTaps="handled"
              style={modal.suggestionList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.suggestionItem}
                  onPress={() => selectPlace(item)}
                >
                  <Text style={modal.suggestionText}>
                    📍 {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TextInput
              style={[modal.input, errors.darea && modal.errorInput]}
              placeholder="Drop Area"
              value={darea}
              onChangeText={(text) => {
                setDArea(text);
                searchLocation("darea");
                setErrors({ ...errors, darea: "" });
              }}
            />
            {errors.darea ? (
              <Text style={modal.errorText}>{errors.darea}</Text>
            ) : null}

            <FlatList
              data={dropsuggestions}
              keyExtractor={(i) => i.place_id || i.display_name}
              keyboardShouldPersistTaps="handled"
              style={modal.suggestionList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.suggestionItem}
                  onPress={() => selectDropArea(item)}
                >
                  <Text style={modal.suggestionText}>
                    🏁 {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={modal.tripRow}>
              {["local", "outstation"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[modal.tripBtn, triptype === t && modal.tripActive]}
                  onPress={() => {
                    setTriptype(t as any);
                    setErrors({ ...errors, triptype: "" });
                  }}
                >
                  <Text
                    style={{
                      color: triptype === t ? "#FFF" : COLORS.textMain,
                      fontWeight: "700",
                    }}
                  >
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.triptype ? (
              <Text style={modal.errorText}>{errors.triptype}</Text>
            ) : null}

            <TouchableOpacity style={modal.submitBtn} onPress={onSubmit}>
              <Text style={modal.submitText}>Confirm Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={modal.overlay}>
          <View style={modal.successContainer}>
            <View style={modal.successIconContainer}>
              <Text style={modal.successIcon}>✅</Text>
            </View>

            <Text style={modal.successTitle}>Booking Successful!</Text>
            <Text style={modal.successMessage}>
              Your ride has been booked successfully. A driver will be assigned
              shortly.
            </Text>

            <TouchableOpacity
              style={modal.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={modal.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {role == "driver" ? (
        <>
          {/* DRIVER MAP */}
          <View style={styles.heroContainer}>
            <MapView
              ref={mapRef}
              style={styles.heroMap}
              initialRegion={{
                latitude: 13.0827,
                longitude: 80.2707,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            />
          </View>
          {/* DRIVER QUICK ACTIONS */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.featuresGrid}>
              {features.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.featureCard}
                  onPress={() => handleFeatureClick(f.id)}
                >
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DRIVER DASHBOARD */}
          <View style={styles.driverDashboard}>
            <Text style={styles.sectionTitle}>Driver Dashboard</Text>

            <TouchableOpacity style={styles.driverCard}>
              <Text style={styles.driverCardText}>📋 View Assigned Rides</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.driverCard}>
              <Text style={styles.driverCardText}>💰 Earnings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.driverCard}>
              <Text style={styles.driverCardText}>⭐ My Rating</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ================= CUSTOMER UI ================= */
        <>
          {/* MAP SECTION */}
          <View style={styles.heroContainer}>
            <MapView
              ref={mapRef}
              style={styles.heroMap}
              initialRegion={{
                latitude: 13.0827,
                longitude: 80.2707,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            />

            {/* CAROUSEL SLIDER */}
            <View style={styles.carouselContainer}>
              <FlatList
                ref={carouselRef}
                horizontal
                data={carouselData}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={width * 0.85 + 12}
                decelerationRate="fast"
                contentContainerStyle={styles.carouselContent}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => (
                  <View style={styles.carouselCard}>
                    <View style={styles.carouselIconContainer}>
                      <Text style={styles.carouselIcon}>{item.icon}</Text>
                    </View>
                    <Text style={styles.carouselTitle}>{item.title}</Text>
                    <Text style={styles.carouselDescription}>
                      {item.description}
                    </Text>
                    {item.rating && (
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingStars}>⭐⭐⭐⭐⭐</Text>
                        <Text style={styles.ratingText}>{item.rating}</Text>
                      </View>
                    )}
                  </View>
                )}
              />
            </View>
          </View>
          {/* QUICK ACTIONS */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.featuresGrid}>
              {features.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.featureCard}
                  onPress={() => handleFeatureClick(f.id)}
                >
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BOOK BUTTON */}
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => setShowBookingForm(true)}
          >
            <Text style={styles.bookBtnText}>Book a Ride</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default HomeTab;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  quickActionsSection: {
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
    color: COLORS.textMain,
  },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },

  featureCard: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  featureIcon: {
    fontSize: 36,
    marginBottom: 10,
  },

  featureText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: COLORS.textMain,
  },

  heroContainer: {
    width,
    height: height * 0.4,
    position: "relative",
  },

  heroMap: {
    width: "100%",
    height: "100%",
  },

  carouselContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    height: 160,
  },

  carouselContent: {
    paddingHorizontal: (width - width * 0.85) / 2,
  },

  carouselCard: {
    width: width * 0.85,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    alignItems: "center",
  },

  carouselIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  carouselIcon: {
    fontSize: 28,
  },

  carouselTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 6,
    textAlign: "center",
  },

  carouselDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  ratingContainer: {
    marginTop: 10,
    alignItems: "center",
  },

  ratingStars: {
    fontSize: 14,
    marginBottom: 4,
  },

  ratingText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  bookBtn: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  bookBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
  },

  driverDashboard: {
    padding: 16,
    flex: 1,
  },

  driverCard: {
    backgroundColor: "#FFF8E1",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  driverCardText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMain,
  },
});

/* ================= MODAL ================= */
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  errorInput: {
    borderColor: COLORS.danger,
    borderWidth: 1,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  sheet: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: height * 0.85,
  },

  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: { fontSize: 18, fontWeight: "700" },

  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: COLORS.textMain,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: COLORS.textMuted,
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
    fontSize: 14,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  locationButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  locationIcon: {
    fontSize: 20,
  },

  suggestionList: {
    maxHeight: 180,
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },

  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  suggestionText: { fontSize: 14 },

  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 18,
  },

  tripBtn: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },

  tripActive: { backgroundColor: COLORS.primary },

  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },

  submitText: { fontSize: 16, fontWeight: "800", color: "#FFF" },

  // Chennai Places Popup Styles
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  placeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  placeIcon: {
    fontSize: 24,
  },

  placeInfo: {
    flex: 1,
  },

  placeName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 4,
  },

  placeAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  placeArrow: {
    fontSize: 28,
    color: COLORS.textMuted,
    marginLeft: 8,
  },

  // History Modal Styles
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  historyCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  historyTypeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  historyTypeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },

  historyDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  historyRoute: {
    marginBottom: 12,
  },

  historyLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  historyLocationIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  historyLocationText: {
    fontSize: 14,
    color: COLORS.textMain,
    flex: 1,
  },

  historyDivider: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.border,
    marginLeft: 8,
    marginBottom: 8,
  },

  historyFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },

  historyStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },

  // Help Modal Styles
  helpContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 32,
    marginHorizontal: 24,
    alignItems: "center",
  },

  helpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  helpIcon: {
    fontSize: 40,
  },

  helpTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
  },

  helpSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },

  supportCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },

  supportLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },

  supportTeam: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 20,
  },

  phoneContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  phoneNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1,
  },

  callButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },

  callButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },

  helpNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 20,
  },

  // Success Modal Styles
  successContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 32,
    alignItems: "center",
  },

  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  successIcon: {
    fontSize: 48,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: "center",
  },

  successMessage: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  successButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    minWidth: 120,
  },

  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
  },
});

/* ================= HELPER ================= */
const regionFrom = (
  latitude: number,
  longitude: number,
  delta = 0.01,
): Region => ({
  latitude,
  longitude,
  latitudeDelta: delta,
  longitudeDelta: delta,
});