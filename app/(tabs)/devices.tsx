import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View
} from "react-native";
import { useAuth } from "../../lib/authContext";
import { db } from "../../lib/firebase";
import { sendLocalNotificationAsync } from "../../lib/notificationService";

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
// TYPES
// ============================================

interface DeviceState {
  id: string;
  name: string;
  type: "window" | "light" | "door";
  status: boolean; // true for open/on, false for closed/off
  icon: string;
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
  const [windows, setWindows] = useState<DeviceState[]>([
    { id: "living-room-window", name: "Living Room Window", type: "window", status: false, icon: "browsers" },
    { id: "bedroom-window", name: "Bedroom Window", type: "window", status: false, icon: "browsers" },
  ]);
  const [lights, setLights] = useState<DeviceState[]>([
    { id: "living-room-light", name: "Living Room Light", type: "light", status: false, icon: "sunny" },
    { id: "kitchen-light", name: "Kitchen Light", type: "light", status: false, icon: "sunny" },
  ]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Add Device Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<"window" | "light">("window");
  const [addingDevice, setAddingDevice] = useState(false);

  // Notification refs
  const isDeviceFirstLoad = useRef(true);
  const prevDeviceStates = useRef<Record<string, boolean>>({});

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to all devices
    const devicesRef = collection(db, "devices");
    const unsubscribe = onSnapshot(devicesRef, (snapshot) => {
      const allDevices = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || "Device",
        type: doc.data().type as "window" | "light" | "door",
        status: doc.data().isOpen || doc.data().isOn || false,
        icon: doc.data().type === "window" ? "browsers" : (doc.data().type === "light" ? "sunny" : "lock-closed"),
      }));

      // Detect changes for notifications
      if (!isDeviceFirstLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const data = change.doc.data();
            const id = change.doc.id;
            const type = data.type;
            const name = data.name || (type === "window" ? "Window" : "Light");
            const status = type === "window" ? data.isOpen : data.isOn;
            const prevStatus = prevDeviceStates.current[id];

            // Only notify for windows and lights, and if status actually changed
            if (status !== prevStatus && (type === "window" || type === "light")) {
              const statusText = type === "window"
                ? (status ? "OPEN" : "CLOSED")
                : (status ? "ON" : "OFF");

              sendLocalNotificationAsync(
                "Device Update",
                `${name} is now ${statusText}`
              );
            }
          }
        });
      }

      // Update refs
      const newStates: Record<string, boolean> = {};
      allDevices.forEach(d => {
        newStates[d.id] = d.status;
      });
      prevDeviceStates.current = newStates;
      isDeviceFirstLoad.current = false;

      // Split into windows and lights, excluding door which is handled on Home tab
      setWindows(allDevices.filter(d => d.type === "window"));
      setLights(allDevices.filter(d => d.type === "light"));
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleToggle = async (device: DeviceState) => {
    if (!user?.uid) return;

    setTogglingId(device.id);
    try {
      const docRef = doc(db, "devices", device.id);
      const field = device.type === "window" ? "isOpen" : "isOn";

      await updateDoc(docRef, {
        [field]: !device.status,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.uid,
      });
    } catch (error) {
      console.error("Error toggling device:", error);
      Alert.alert("Error", `Failed to ${device.status ? "turn off" : "turn on"} the ${device.type}.`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddDevice = async () => {
    if (!user?.uid) return;
    if (!newDeviceName.trim() || !newDeviceId.trim()) {
      Alert.alert("Error", "Please provide both a name and a custom ID.");
      return;
    }

    const cleanId = newDeviceId.trim().toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, "devices", cleanId);

    setAddingDevice(true);
    try {
      const initialStatus = false;
      const field = newDeviceType === "window" ? "isOpen" : "isOn";

      await setDoc(docRef, {
        name: newDeviceName.trim(),
        [field]: initialStatus,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        type: newDeviceType,
      });

      Alert.alert("Success", `${newDeviceType === "window" ? "Window" : "Light"} added successfully!`);
      setShowAddModal(false);
      setNewDeviceName("");
      setNewDeviceId("");
    } catch (error) {
      console.error("Error adding device:", error);
      Alert.alert("Error", "Failed to add device. Please try again.");
    } finally {
      setAddingDevice(false);
    }
  };

  // ============================================
  // RENDER METHODS
  // ============================================

  const renderDeviceCard = (device: DeviceState) => (
    <TouchableOpacity
      key={device.id}
      style={[
        styles.deviceCard,
        {
          backgroundColor: colors.surface,
          borderColor: device.status ? colors.primary : colors.border,
        },
      ]}
      onPress={() => handleToggle(device)}
      disabled={togglingId === device.id}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.deviceIcon,
          { backgroundColor: device.status ? `${colors.primary}15` : colors.overlay },
        ]}
      >
        <Ionicons
          name={device.icon as any}
          size={26}
          color={device.status ? colors.primary : colors.tertiary}
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
            backgroundColor: device.status
              ? colors.successLight
              : colors.overlay,
          },
        ]}
      >
        {togglingId === device.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: device.status
                    ? colors.success
                    : colors.tertiary,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: device.status
                    ? colors.success
                    : colors.tertiary,
                },
              ]}
            >
              {device.type === "window" ? (device.status ? "Open" : "Closed") : (device.status ? "On" : "Off")}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
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

  // Not authenticated
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
              Please sign in to access and control your smart devices.
            </Text>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/auth" as any)}
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
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Smart Control
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Manage your windows and lights
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Windows Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Windows</Text>
          <View style={styles.devicesGrid}>
            {windows.map(renderDeviceCard)}
          </View>
        </View>

        {/* Lights Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lights</Text>
          <View style={styles.devicesGrid}>
            {lights.map(renderDeviceCard)}
          </View>
        </View>

      </ScrollView>

      {/* Add Device Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Device</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Device Type Selection */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Device Type</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeOption,
                        newDeviceType === "window" && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }
                      ]}
                      onPress={() => setNewDeviceType("window")}
                    >
                      <Ionicons name="browsers" size={24} color={newDeviceType === "window" ? colors.primary : colors.tertiary} />
                      <Text style={[styles.typeOptionText, { color: newDeviceType === "window" ? colors.primary : colors.tertiary }]}>Window</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeOption,
                        newDeviceType === "light" && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }
                      ]}
                      onPress={() => setNewDeviceType("light")}
                    >
                      <Ionicons name="sunny" size={24} color={newDeviceType === "light" ? colors.primary : colors.tertiary} />
                      <Text style={[styles.typeOptionText, { color: newDeviceType === "light" ? colors.primary : colors.tertiary }]}>Light</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Device Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Device Name</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F9FAFB" }]}
                    placeholder="e.g., Living Room Window"
                    placeholderTextColor={colors.tertiary}
                    value={newDeviceName}
                    onChangeText={setNewDeviceName}
                  />
                </View>

                {/* Device ID Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Device ID</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F9FAFB" }]}
                    placeholder="e.g., room-1"
                    placeholderTextColor={colors.tertiary}
                    value={newDeviceId}
                    onChangeText={setNewDeviceId}
                    autoCapitalize="none"
                  />
                  <Text style={[styles.inputHelp, { color: colors.tertiary }]}>This ID will be used in the Firestore path</Text>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddDevice}
                  disabled={addingDevice}
                >
                  {addingDevice ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="#FFF" />
                      <Text style={styles.createButtonText}>Add Device</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  devicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  deviceCard: {
    width: "47.5%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceContent: {
    marginBottom: 16,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  deviceType: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
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
    ...Platform.select({ web: { cursor: "pointer" } }),
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    ...Platform.select({ web: { cursor: "pointer" } }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        width: 600,
        alignSelf: 'center',
        borderBottomLeftRadius: 30, // Make it a floating card on web
        borderBottomRightRadius: 30,
        marginBottom: 40,
      }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputHelp: {
    fontSize: 12,
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  createButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
