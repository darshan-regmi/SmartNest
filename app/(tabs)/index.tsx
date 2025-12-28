import React, { useMemo, useCallback } from "react";
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../lib/authContext";
import { useColorScheme } from "react-native";

// ============================================
// COLORS & DESIGN TOKENS
// ============================================

const Colors = {
  light: {
    background: "#FCFCF9",
    surface: "#FFFFFF",
    text: "#1F2121",
    textSecondary: "#626C7C",
    primary: "#208A95",
    error: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    border: "#E5E7EB",
  },
  dark: {
    background: "#1F2121",
    surface: "#2A2C2C",
    text: "#F5F5F5",
    textSecondary: "#A7A9A9",
    primary: "#32B8C6",
    error: "#FF5459",
    success: "#10B981",
    warning: "#F59E0B",
    border: "#3A3C3C",
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
  const { user, logout, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { height } = useWindowDimensions();

  // Select color scheme
  const colors = isDark ? Colors.dark : Colors.light;

  // State
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState({
    alerts: 0,
  });

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Refetch data when screen is focused
   * Useful for keeping data fresh when user returns from other screens
   */
  useFocusEffect(
    useCallback(() => {
      // Load fresh data when screen comes into focus
      loadDashboardData();
    }, [user])
  );

  // ============================================
  // HANDLERS
  // ============================================

  const loadDashboardData = useCallback(async () => {
    // TODO: Fetch from Firebase/API
    try {
      // Simulated data loading
      // In production, fetch from:
      // - Firestore collection: users/{userId}/devices
      // - Firestore collection: users/{userId}/alerts
      // - Firestore collection: users/{userId}/automations

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

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    router.push("/settings");
  }, []);

  // ============================================
  // MEMOIZED DATA
  // ============================================

  /**
   * Quick access items - navigation shortcuts
   * Memoized to prevent unnecessary recalculations
   */
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

  /**
   * Dashboard statistics
   * Memoized for performance
   */
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
            Welcome Back!
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.displayName || user?.email?.split("@") || "User"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      {statItems.map((stat) => (
        <View
          key={stat.id}
          style={[
            styles.stat,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name={stat.icon} size={28} color={stat.color} />
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
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.quickIcon,
                {
                  backgroundColor: `${colors.primary}15`,
                },
              ]}
            >
              <Ionicons name={item.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.quickContent}>
              <Text
                style={[styles.quickTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.quickDesc, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
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
        activeOpacity={0.7}
      >
        <Ionicons name="settings" size={20} color={colors.primary} />
        <Text style={[styles.settingsButtonText, { color: colors.text }]}>
          Settings & Preferences
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
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
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
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
            <Ionicons name="lock-closed" size={64} color={colors.primary} />
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
              activeOpacity={0.8}
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
    paddingVertical: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    shadowColor: "#208A95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    marginBottom: 24,
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
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  quickAccessGrid: {
    gap: 12,
  },
  quickCard: {
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickContent: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  quickDesc: {
    fontSize: 12,
  },
  settingsButton: {
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingsButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
