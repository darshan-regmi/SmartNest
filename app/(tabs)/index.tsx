import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  useColorScheme,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../lib/authContext";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// Initialize Firestore
const db = getFirestore();

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
  route?: string;
  onPress?: () => void;
}

interface StatItem {
  id: string;
  label: string;
  value: number | string;
  icon: string;
  color: string;
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
  });
  
  // Door control state
  const [doorOpen, setDoorOpen] = useState(false);
  const [doorLoading, setDoorLoading] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user])
  );

  // Listen to door state changes from Firestore
  useEffect(() => {
    if (!user) return;

    const doorDocRef = doc(db, "doors", "mainDoor");
    
    const unsubscribe = onSnapshot(doorDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDoorOpen(docSnap.data().isOpen || false);
      }
    }, (error) => {
      console.error("Error listening to door state:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // ============================================
  // HANDLERS
  // ============================================

  const loadDashboardData = useCallback(async () => {
    try {
      setStats({
        alerts: 0,
      });
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

  const handleDoorToggle = useCallback(async () => {
    if (!user) return;
    
    setDoorLoading(true);
    try {
      const doorDocRef = doc(db, "doors", "mainDoor");
      const newState = !doorOpen;
      
      await setDoc(doorDocRef, {
        isOpen: newState,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.uid,
      }, { merge: true });
      
      // State will be updated by the listener
    } catch (error) {
      console.error("Failed to update door state:", error);
      Alert.alert("Error", "Failed to control door. Please try again.");
    } finally {
      setDoorLoading(false);
    }
  }, [doorOpen, user]);

  const handleLogout = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        onPress: () => {},
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
    ],
    [stats, colors]
  );

  // ============================================
  // RENDER METHODS
  // ============================================

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
            <Ionicons name={stat.icon} size={32} color={stat.color} />
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
              styles.quickCard,
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
                styles.quickIcon,
                {
                  backgroundColor: `${colors.primary}12`,
                },
              ]}
            >
              <Ionicons name={item.icon} size={26} color={colors.primary} />
            </View>
            <View style={styles.quickContent}>
              <Text
                style={[styles.quickTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.quickDesc, { color: colors.tertiary }]}
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
              onPress={() => router.push("/auth")}
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
        {renderStats()}
        {renderQuickAccess()}
        {renderSettings()}
      </ScrollView>
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
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  quickAccessGrid: {
    gap: 12,
  },
  quickCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickContent: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  quickDesc: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  settingsButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  settingsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  settingsButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
