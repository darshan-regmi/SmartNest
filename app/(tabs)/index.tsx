import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc
} from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../lib/authContext";
import { auth, db } from "../../lib/firebase";
import { registerForPushNotificationsAsync, sendLocalNotificationAsync } from "../../lib/notificationService";


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
    warning: "#F59E0B",
    border: "#3A3C3C",
    overlay: "rgba(255, 255, 255, 0.04)",
  },
};

// ============================================
// TYPES
// ============================================

interface QuickAccessItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: any;
  onPress?: () => void;
}

interface StatItem {
  id: string;
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

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

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { height } = useWindowDimensions();

  // Select color scheme
  const colors = isDark ? Colors.dark : Colors.light;

  // State
  const [refreshing, setRefreshing] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [stats, setStats] = React.useState({
    alerts: 0,
    waterLevel: "0",
  });

  // Door control state
  const [doorOpen, setDoorOpen] = useState(false);
  const [doorLoading, setDoorLoading] = useState(false);

  // Notification refs
  const isDoorFirstLoad = useRef(true);
  const prevDoorOpen = useRef(false);

  // PIN Management State
  const [pins, setPins] = useState<PIN[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinName, setPinName] = useState("");
  const [showPinList, setShowPinList] = useState(false);
  const [loadingPins, setLoadingPins] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  // Door Access Choice State
  const [showAccessChoiceModal, setShowAccessChoiceModal] = useState(false);
  const [showDoorPinModal, setShowDoorPinModal] = useState(false);
  const [doorPinInput, setDoorPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // ============================================
  // EFFECTS
  // ============================================

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
        loadPinsFromFirestore();
      }
    }, [user])
  );

  // Request notification permissions
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync();
    }
  }, [user]);

  // Listen to door state changes from Firestore
  useEffect(() => {
    if (!user) return;

    const doorDocRef = doc(db, "doors", "mainDoor");

    const unsubscribe = onSnapshot(doorDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const isOpen = docSnap.data().isOpen || false;

        // Notify if state changed and it's not the first load
        if (!isDoorFirstLoad.current && isOpen !== prevDoorOpen.current) {
          sendLocalNotificationAsync(
            "Security Alert",
            `Front Door is now ${isOpen ? "OPEN" : "CLOSED"}`
          );
        }

        setDoorOpen(isOpen);
        prevDoorOpen.current = isOpen;
        isDoorFirstLoad.current = false;
      }
    }, (error) => {
      console.error("Error listening to door state:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to water level changes from Firestore
  useEffect(() => {
    if (!user) return;

    const waterDocRef = doc(db, "waterTank", "water");

    const unsubscribe = onSnapshot(waterDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats(prev => ({
          ...prev,
          waterLevel: data.waterlevel || "NaN"
        }));
      }
    }, (error) => {
      console.error("Error listening to water level:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // ============================================
  // HANDLERS
  // ============================================

  const loadPinsFromFirestore = async () => {
    if (!user?.uid) return;

    setLoadingPins(true);
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
      setLoadingPins(false);
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

  const loadDashboardData = useCallback(async () => {
    try {
      setStats(prev => ({
        ...prev,
        alerts: 0,
      }));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const toggleDoorState = async () => {
    if (!user) return;
    setDoorLoading(true);
    try {
      const doorDocRef = doc(db, "doors", "mainDoor");
      const newState = !doorOpen;

      await setDoc(doorDocRef, {
        from: "mobile-app",
        isOpen: newState,
        lastUpdated: new Date().toISOString(),
        source: "mobile-app",
        updatedBy: user.uid,
        type: "door",
      }, { merge: true });
    } catch (error) {
      console.error("Failed to update door state:", error);
      Alert.alert("Error", "Failed to control door. Please try again.");
    } finally {
      setDoorLoading(false);
      setShowAccessChoiceModal(false);
      setShowDoorPinModal(false);
      setDoorPinInput("");
      setPinError("");
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Authenticate to ${doorOpen ? "close" : "open"} the door`,
          fallbackLabel: "Use Passcode",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await toggleDoorState();
        }
      } else {
        Alert.alert(
          "Biometrics Unavailable",
          "Biometrics not available or setup on this device. Please use PIN."
        );
      }
    } catch (error) {
      console.error("Biometric auth error:", error);
    }
  };

  const handlePinAuth = async () => {
    if (doorPinInput.length < 4) {
      setPinError("PIN must be 4-8 digits.");
      return;
    }

    const matchedPin = pins.find(p => p.code === doorPinInput);
    if (matchedPin) {
      setPinError("");
      await toggleDoorState();
    } else {
      setPinError("Invalid PIN code. Please try again.");
      setDoorPinInput("");
    }
  };

  const handleDoorToggle = useCallback(async () => {
    if (!user) return;

    // If door is currently open, we can close it without re-auth for convenience
    // or we can require auth for both. Given the prompt "while opening the door",
    // we'll definitely do it for opening.
    if (!doorOpen) {
      setShowAccessChoiceModal(true);
    } else {
      // Closing the door
      await toggleDoorState();
    }
  }, [doorOpen, user, pins]);

  const handleLogout = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        onPress: () => { },
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut(auth);
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
            setLoggingOut(false);
          }
        },
        style: "destructive",
      },
    ]);
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  // ============================================
  // MEMOIZED DATA
  // ============================================

  const quickAccessItems = useMemo<QuickAccessItem[]>(
    () => [
      {
        id: "security",
        title: "Security",
        description: "All locked",
        icon: "lock-closed",
        route: "/security",
      },
    ],
    [stats]
  );

  const statItems = useMemo<StatItem[]>(
    () => [
      {
        id: "alerts",
        label: "Alerts",
        value: stats.alerts,
        icon: "alert-circle",
        color: colors.primary,
      },
      {
        id: "water",
        label: "Water Level",
        value: stats.waterLevel.charAt(0).toUpperCase() + stats.waterLevel.slice(1),
        icon: "water",
        color: stats.waterLevel.toLowerCase() === 'low'
          ? colors.error
          : stats.waterLevel.toLowerCase() === 'normal'
            ? colors.success
            : colors.primary,
      },
    ],
    [stats, colors]
  );

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

  const renderPinManagement = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        PIN Management
      </Text>
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
              Access Codes
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
              {showPinList ? "Hide" : "View"} PINs ({pins.length})
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
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome Back
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.displayName || "User"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.errorLight }]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Ionicons name="log-out" size={20} color={colors.error} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDoorControl = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Door Control
      </Text>
      <TouchableOpacity
        style={[
          styles.doorCard,
          {
            backgroundColor: doorOpen ? colors.success : colors.surface,
            borderColor: doorOpen ? colors.success : colors.border,
          },
        ]}
        onPress={handleDoorToggle}
        disabled={doorLoading}
        activeOpacity={0.7}
      >
        <View style={styles.doorCardContent}>
          <View
            style={[
              styles.doorIcon,
              {
                backgroundColor: doorOpen
                  ? "rgba(255, 255, 255, 0.2)"
                  : `${colors.primary}12`,
              },
            ]}
          >
            {doorLoading ? (
              <ActivityIndicator
                size="small"
                color={doorOpen ? "#FFF" : colors.primary}
              />
            ) : (
              <Ionicons
                name={doorOpen ? "lock-open" : "lock-closed"}
                size={32}
                color={doorOpen ? "#FFF" : colors.primary}
              />
            )}
          </View>
          <View style={styles.doorInfo}>
            <Text
              style={[
                styles.doorTitle,
                { color: doorOpen ? "#FFF" : colors.text },
              ]}
            >
              Main Door
            </Text>
            <Text
              style={[
                styles.doorStatus,
                {
                  color: doorOpen
                    ? "rgba(255, 255, 255, 0.9)"
                    : colors.textSecondary,
                },
              ]}
            >
              {doorOpen ? "Currently Open" : "Currently Closed"}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.doorAction,
            {
              backgroundColor: doorOpen
                ? "rgba(255, 255, 255, 0.2)"
                : colors.primaryLight,
            },
          ]}
        >
          <Text
            style={[
              styles.doorActionText,
              { color: doorOpen ? "#FFF" : colors.primary },
            ]}
          >
            {doorOpen ? "CLOSE" : "OPEN"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      {statItems.map((stat) => (
        <View
          key={stat.id}
          style={[
            styles.stat,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: `${stat.color}15` },
            ]}
          >
            <Ionicons name={stat.icon as any} size={32} color={stat.color} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stat.value}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderQuickAccess = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Quick Access
      </Text>
      <View style={styles.quickAccessGrid}>
        {quickAccessItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.quickAccessItem,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => item.route && router.push(item.route)}
            activeOpacity={0.6}
          >
            <View
              style={[
                styles.quickAccessIcon,
                {
                  backgroundColor: `${colors.primary}12`,
                },
              ]}
            >
              <Ionicons name={item.icon as any} size={26} color={colors.primary} />
            </View>
            <View style={styles.quickAccessContent}>
              <Text
                style={[styles.quickAccessTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.quickAccessDesc, { color: colors.tertiary }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.tertiary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        More Options
      </Text>
      <TouchableOpacity
        style={[
          styles.settingsButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={handleNavigateToSettings}
        activeOpacity={0.6}
      >
        <View
          style={[
            styles.settingsIcon,
            { backgroundColor: `${colors.primary}12` },
          ]}
        >
          <Ionicons name="settings" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.settingsButtonText, { color: colors.text }]}>
          Settings & Preferences
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.tertiary} />
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
            Loading your dashboard
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
              Please sign in to access your smart home dashboard
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {renderHeader()}
        {renderDoorControl()}
        {renderPinManagement()}
        {renderStats()}
        {renderQuickAccess()}
        {renderSettings()}
      </ScrollView>

      {/* Access Choice Modal */}
      <Modal
        visible={showAccessChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccessChoiceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccessChoiceModal(false)}
        >
          <View
            style={[
              styles.choiceModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.choiceHeader}>
              <Text style={[styles.choiceModalTitle, { color: colors.text }]}>
                Secure Door Access
              </Text>
              <Text
                style={[styles.choiceModalSubtitle, { color: colors.tertiary }]}
              >
                Choose your preferred method to unlock
              </Text>
            </View>

            <View style={styles.choiceOptions}>
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  { backgroundColor: `${colors.primary}12` },
                ]}
                onPress={handleBiometricAuth}
              >
                <View
                  style={[
                    styles.choiceIconContainer,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Ionicons
                    name="finger-print" as any
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.choiceButtonText, { color: colors.primary }]}
                >
                  Biometrics
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  { backgroundColor: `${colors.primary}12` },
                ]}
                onPress={() => {
                  setShowAccessChoiceModal(false);
                  setShowDoorPinModal(true);
                }}
              >
                <View
                  style={[
                    styles.choiceIconContainer,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Ionicons name="keypad" as any size={32} color={colors.primary} />
                </View>
                <Text
                  style={[styles.choiceButtonText, { color: colors.primary }]}
                >
                  Access Code
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.choiceCancelButton,
                { borderColor: colors.border },
              ]}
              onPress={() => setShowAccessChoiceModal(false)}
            >
              <Text
                style={[
                  styles.choiceCancelText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Door PIN Verification Modal */}
      <Modal
        visible={showDoorPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDoorPinModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <View
                style={[styles.modalHeader, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Enter Access Code
                </Text>
                <TouchableOpacity onPress={() => setShowDoorPinModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Security PIN
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: colors.text,
                        borderColor: pinError ? colors.error : colors.border,
                        backgroundColor: isDark ? colors.background : "#F9FAFB",
                        textAlign: "center",
                        fontSize: 24,
                        letterSpacing: 10,
                        fontWeight: "700",
                      },
                    ]}
                    placeholder="••••"
                    placeholderTextColor={colors.tertiary}
                    value={doorPinInput}
                    onChangeText={setDoorPinInput}
                    keyboardType="number-pad"
                    maxLength={8}
                    secureTextEntry
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handlePinAuth}
                  />
                  {pinError ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {pinError}
                    </Text>
                  ) : (
                    <Text style={[styles.inputHelp, { color: colors.tertiary }]}>
                      Enter one of your registered app PINs
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    { backgroundColor: colors.primary, marginTop: 10 },
                  ]}
                  onPress={handlePinAuth}
                  disabled={doorLoading}
                >
                  {doorLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-open" as any size={20} color="#FFF" />
                      <Text style={styles.createButtonText}>Unlock Door</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
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
                    returnKeyType="done"
                    onSubmitEditing={handleAddPin}
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
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
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
  header: {
    marginBottom: 28,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    textTransform: "capitalize",
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // Door Control Styles
  doorCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  doorCardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  doorIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  doorInfo: {
    flex: 1,
  },
  doorTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  doorStatus: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  doorAction: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doorActionText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  stat: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  quickAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickAccessItem: {
    width: "48%",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickAccessContent: {
    flex: 1,
  },
  quickAccessTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  quickAccessDesc: {
    fontSize: 11,
  },
  pinManagementCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  pinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pinManagementTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  pinManagementSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  pinCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinCount: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  listPinsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  listPinsButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noPinsText: {
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 20,
  },
  pinsList: {
    marginBottom: 16,
  },
  pinItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pinContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pinInfo: {
    flex: 1,
  },
  pinItemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  pinCode: {
    fontSize: 12,
    letterSpacing: 2,
  },
  pinDate: {
    fontSize: 10,
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({ web: { cursor: "pointer" } }),
  },
  addPinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addPinButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  textInput: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputHelp: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    flex: 2,
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({ web: { cursor: "pointer" } }),
  },
  createButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Choice Modal Styles
  choiceModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: "100%",
  },
  choiceHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  choiceModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  choiceModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  choiceOptions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  choiceButton: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  choiceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  choiceCancelButton: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  choiceCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
});
