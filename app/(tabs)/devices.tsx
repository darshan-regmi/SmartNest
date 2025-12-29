import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/authContext";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

// ============================================
// COLORS & DESIGN TOKENS
// ============================================

const Colors = {
  light: {
    background: "#FCFCF9",
    surface: "#FFFFFF",
    text: "#1F2121",
    textSecondary: "#626C7C",
    tertiary: "#8B93A1",
    primary: "#208A95",
    primaryLight: "#E0F7FA",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    success: "#10B981",
    successLight: "#ECFDF5",
    warning: "#F59E0B",
    border: "#E5E7EB",
    overlay: "rgba(31, 33, 33, 0.04)",
  },
  dark: {
    background: "#1F2121",
    surface: "#2A2C2C",
    text: "#F5F5F5",
    textSecondary: "#A7A9A9",
    tertiary: "#7A7E7E",
    primary: "#32B8C6",
    primaryLight: "#1B4D54",
    error: "#FF5459",
    errorLight: "#3B1A1C",
    success: "#10B981",
    successLight: "#1B3D2D",
    warning: "#F59E0B",
    border: "#3A3C3C",
    overlay: "rgba(255, 255, 255, 0.04)",
  },
};

// ============================================
// CONSTANTS
// ============================================

const DEVICES = [
  {
    id: 1,
    name: "Front Door Lock",
    type: "door",
    status: "locked",
    icon: "lock-closed",
    deviceId: "front-door-lock",
  },
];

// ============================================
// TYPES
// ============================================

interface PIN {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  firestoreId?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function DevicesScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { height } = useWindowDimensions();

  // State
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinName, setPinName] = useState("");
  const [pins, setPins] = useState<PIN[]>([]);
  const [showPinList, setShowPinList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (user?.uid) {
      loadPinsFromFirestore();
    }
  }, [user?.uid]);

  // ============================================
  // HANDLERS
  // ============================================

  const loadPinsFromFirestore = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const pinsRef = collection(db, "users", user.uid, "pins");
      const querySnapshot = await getDocs(pinsRef);

      const loadedPins: PIN[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedPins.push({
          id: docSnap.id,
          code: data.code,
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          firestoreId: docSnap.id,
        });
      });

      setPins(loadedPins);
    } catch (error) {
      console.error("Error loading PINs:", error);
      setPins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPin = async () => {
    // Validation
    if (!pinCode.trim()) {
      Alert.alert("Error", "Please enter a PIN code");
      return;
    }
    if (!pinName.trim()) {
      Alert.alert("Error", "Please enter a PIN name");
      return;
    }
    if (pinCode.length < 4 || pinCode.length > 8) {
      Alert.alert("Error", "PIN must be between 4-8 digits");
      return;
    }
    if (!/^\d+$/.test(pinCode)) {
      Alert.alert("Error", "PIN must contain only numbers");
      return;
    }
    if (pins.length >= 10) {
      Alert.alert("Error", "Maximum 10 PINs allowed");
      return;
    }
    if (pins.some((p) => p.code === pinCode)) {
      Alert.alert("Error", "This PIN already exists");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setSavingPin(true);
    try {
      const pinsRef = collection(db, "users", user.uid, "pins");
      const docRef = await addDoc(pinsRef, {
        code: pinCode,
        name: pinName,
        deviceId: "front-door-lock",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newPin: PIN = {
        id: docRef.id,
        code: pinCode,
        name: pinName,
        createdAt: new Date(),
        firestoreId: docRef.id,
      };

      setPins([...pins, newPin]);
      setPinCode("");
      setPinName("");
      setShowPinModal(false);

      Alert.alert("Success", `PIN "${pinName}" added successfully!`);
    } catch (error) {
      console.error("Error adding PIN:", error);
      Alert.alert("Error", "Failed to add PIN. Please try again.");
    } finally {
      setSavingPin(false);
    }
  };

  const handleDeletePin = (id: string) => {
    Alert.alert("Delete PIN", "Are you sure you want to delete this PIN?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePin(id),
      },
    ]);
  };

  const deletePin = async (id: string) => {
    if (!user?.uid) return;

    try {
      const pinRef = doc(db, "users", user.uid, "pins", id);
      await deleteDoc(pinRef);

      setPins(pins.filter((p) => p.id !== id));
      Alert.alert("Success", "PIN deleted successfully");
    } catch (error) {
      console.error("Error deleting PIN:", error);
      Alert.alert("Error", "Failed to delete PIN");
    }
  };

  const closeModal = () => {
    setShowPinModal(false);
    setPinCode("");
    setPinName("");
  };

  // ============================================
  // RENDER METHODS
  // ============================================

  const renderPinItem = ({ item }: { item: PIN }) => (
    <View
      style={[
        styles.pinItem,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.pinContent}>
        <View
          style={[styles.pinIcon, { backgroundColor: `${colors.primary}15` }]}
        >
          <Ionicons name="key" size={20} color={colors.primary} />
        </View>
        <View style={styles.pinInfo}>
          <Text style={[styles.pinItemName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.pinCode, { color: colors.textSecondary }]}>
            ••••••
          </Text>
          <Text style={[styles.pinDate, { color: colors.tertiary }]}>
            {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.errorLight }]}
        onPress={() => handleDeletePin(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={[styles.loadingContainer, { minHeight: height }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your devices
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not authenticated - No tabs shown
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.emptyState, { minHeight: height * 0.8 }]}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="lock-closed" size={56} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sign In Required
            </Text>
            <Text
              style={[styles.emptyDescription, { color: colors.textSecondary }]}
            >
              Please sign in to access your smart devices and control pins.
            </Text>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(auth)/index")}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in" size={18} color="#FFF" />
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Authenticated - Main content
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Your Devices
          </Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading PINs...
            </Text>
          </View>
        ) : (
          // Devices List
          <View style={styles.devicesList}>
            {DEVICES.map((device) => (
              <View key={device.id}>
                {/* Device Card */}
                <TouchableOpacity
                  style={[
                    styles.deviceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() =>
                    setSelectedDevice(
                      selectedDevice === device.id ? null : device.id
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.deviceIcon,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                  >
                    <Ionicons
                      name={device.icon as any}
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.deviceContent}>
                    <Text style={[styles.deviceName, { color: colors.text }]}>
                      {device.name}
                    </Text>
                    <Text
                      style={[styles.deviceType, { color: colors.tertiary }]}
                    >
                      {device.type}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          device.status === "on" || device.status === "locked"
                            ? colors.successLight
                            : colors.overlay,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            device.status === "on" || device.status === "locked"
                              ? colors.success
                              : colors.tertiary,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            device.status === "on" || device.status === "locked"
                              ? colors.success
                              : colors.tertiary,
                        },
                      ]}
                    >
                      {device.status}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      selectedDevice === device.id
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color={colors.tertiary}
                  />
                </TouchableOpacity>

                {/* Expanded PIN Management Section */}
                {selectedDevice === device.id && (
                  <View style={styles.expandedSection}>
                    <View
                      style={[
                        styles.pinManagementCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {/* PIN Management Header */}
                      <View style={styles.pinHeader}>
                        <View>
                          <Text
                            style={[
                              styles.pinManagementTitle,
                              { color: colors.text },
                            ]}
                          >
                            PIN Management
                          </Text>
                          <Text
                            style={[
                              styles.pinManagementSubtitle,
                              { color: colors.tertiary },
                            ]}
                          >
                            {pins.length}/10 PINs configured
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.pinCountBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={styles.pinCount}>{pins.length}</Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View
                        style={[
                          styles.progressBarContainer,
                          { backgroundColor: colors.overlay },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${(pins.length / 10) * 100}%`,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>

                      {/* View/Hide Pins Button */}
                      {pins.length > 0 ? (
                        <TouchableOpacity
                          style={[
                            styles.listPinsButton,
                            { backgroundColor: `${colors.primary}12` },
                          ]}
                          onPress={() => setShowPinList(!showPinList)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={showPinList ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.listPinsButtonText,
                              { color: colors.primary },
                            ]}
                          >
                            {showPinList ? "Hide" : "View"} Pins ({pins.length})
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={[
                            styles.noPinsText,
                            { color: colors.tertiary },
                          ]}
                        >
                          No PINs added yet
                        </Text>
                      )}

                      {/* Pins List */}
                      {showPinList && pins.length > 0 && (
                        <View style={styles.pinsList}>
                          <FlatList
                            data={pins}
                            renderItem={renderPinItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                          />
                        </View>
                      )}

                      {/* Add PIN Button */}
                      <TouchableOpacity
                        style={[
                          styles.addPinButton,
                          {
                            backgroundColor:
                              pins.length >= 10
                                ? colors.overlay
                                : colors.primary,
                          },
                        ]}
                        onPress={() => setShowPinModal(true)}
                        disabled={pins.length >= 10}
                        activeOpacity={pins.length >= 10 ? 1 : 0.85}
                      >
                        <Ionicons
                          name="add"
                          size={20}
                          color={pins.length >= 10 ? colors.tertiary : "#FFF"}
                        />
                        <Text
                          style={[
                            styles.addPinButtonText,
                            pins.length >= 10 && {
                              color: colors.tertiary,
                            },
                          ]}
                        >
                          {pins.length >= 10
                            ? "Maximum PINs Reached"
                            : "Add New PIN"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            {/* Modal Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add New PIN
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                disabled={savingPin}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              {/* PIN Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  PIN Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: isDark ? colors.background : "#F9FAFB",
                    },
                  ]}
                  placeholder="e.g., Guest, Cleaner, Family"
                  placeholderTextColor={colors.tertiary}
                  value={pinName}
                  onChangeText={setPinName}
                  maxLength={20}
                  editable={!savingPin}
                />
                <Text style={[styles.inputHelp, { color: colors.tertiary }]}>
                  {pinName.length}/20 characters
                </Text>
              </View>

              {/* PIN Code Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  PIN Code
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: isDark ? colors.background : "#F9FAFB",
                    },
                  ]}
                  placeholder="4-8 digits"
                  placeholderTextColor={colors.tertiary}
                  value={pinCode}
                  onChangeText={setPinCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  secureTextEntry
                  editable={!savingPin}
                />
                <Text style={[styles.inputHelp, { color: colors.tertiary }]}>
                  {pinCode.length}/8 digits
                  {pinCode.length > 0 &&
                    (pinCode.length >= 4 ? (
                      <Text style={{ color: colors.success }}> ✓ Valid</Text>
                    ) : (
                      <Text style={{ color: colors.error }}>
                        {" "}
                        • Minimum 4 digits
                      </Text>
                    ))}
                </Text>
              </View>

              {/* Info Box */}
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: `${colors.primary}12` },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  PIN codes must be 4-8 digits. Numbers only, no special
                  characters.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View
              style={[styles.modalFooter, { borderTopColor: colors.border }]}
            >
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={closeModal}
                disabled={savingPin}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: colors.primary },
                  savingPin && { opacity: 0.7 },
                ]}
                onPress={handleAddPin}
                disabled={savingPin}
                activeOpacity={0.85}
              >
                {savingPin ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFF" />
                    <Text style={styles.createButtonText}>Create PIN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  devicesList: {
    gap: 12,
  },
  deviceCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  deviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deviceContent: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  deviceType: {
    fontSize: 13,
    textTransform: "capitalize",
    letterSpacing: 0.1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  expandedSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  pinManagementCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  pinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  pinManagementTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  pinManagementSubtitle: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  pinCountBadge: {
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pinCount: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 7,
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  noPinsText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
    fontStyle: "italic",
    letterSpacing: 0.1,
  },
  listPinsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  listPinsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  pinsList: {
    marginBottom: 14,
    gap: 8,
  },
  pinItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  pinContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pinInfo: {
    flex: 1,
  },
  pinItemName: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  pinCode: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  pinDate: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  addPinButton: {
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addPinButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 6,
  },
  inputHelp: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    shadowColor: "#208A95",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
