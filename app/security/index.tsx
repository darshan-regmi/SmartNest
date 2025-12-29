import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  Switch,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/authContext";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

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
    warningLight: "#FEF3C7",
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
    warningLight: "#3B2F1A",
    border: "#3A3C3C",
    overlay: "rgba(255, 255, 255, 0.04)",
  },
};

// ============================================
// TYPES
// ============================================

interface SecuritySetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  type: "toggle" | "action";
}

// ============================================
// COMPONENT
// ============================================

export default function SecurityScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { height } = useWindowDimensions();

  // State
  const [loading, setLoading] = useState(false);
  const [pinCount, setPinCount] = useState(0);
  const [settings, setSettings] = useState<SecuritySetting[]>([
    {
      id: "auto-lock",
      title: "Auto-Lock",
      description: "Lock doors automatically after 30 seconds",
      icon: "lock-closed",
      enabled: true,
      type: "toggle",
    },
    {
      id: "notifications",
      title: "Security Alerts",
      description: "Get notified of unauthorized access attempts",
      icon: "notifications",
      enabled: true,
      type: "toggle",
    },
    {
      id: "two-factor",
      title: "Two-Factor Authentication",
      description: "Require verification code for PIN changes",
      icon: "shield-checkmark",
      enabled: false,
      type: "toggle",
    },
    {
      id: "activity-log",
      title: "Activity Log",
      description: "View recent access history",
      icon: "time",
      enabled: false,
      type: "action",
    },
  ]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (user?.uid) {
      loadSecurityData();
    }
  }, [user?.uid]);

  // ============================================
  // HANDLERS
  // ============================================

  const loadSecurityData = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const pinsRef = collection(db, "users", user.uid, "pins");
      const querySnapshot = await getDocs(pinsRef);
      setPinCount(querySnapshot.size);
    } catch (error) {
      console.error("Error loading security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    const updatedSettings = settings.map((setting) =>
      setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
    );
    setSettings(updatedSettings);

    // Here you would save to Firestore
    // For now, just show success
    const setting = updatedSettings.find((s) => s.id === id);
    if (setting) {
      Alert.alert(
        "Setting Updated",
        `${setting.title} is now ${setting.enabled ? "enabled" : "disabled"}`
      );
    }
  };

  const handleViewActivityLog = () => {
    Alert.alert(
      "Activity Log",
      "Activity log feature coming soon. This will show all access attempts and PIN usage."
    );
  };

  // ============================================
  // RENDER METHODS
  // ============================================

  const renderSecurityStat = (
    icon: string,
    label: string,
    value: string | number,
    color: string,
    bgColor: string
  ) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.tertiary }]}>
        {label}
      </Text>
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
            Loading security settings
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
              Please sign in to access security settings
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
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Security</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Manage your access control settings
            </Text>
          </View>
        </View>

        {/* Security Stats */}
        <View style={styles.statsContainer}>
          {renderSecurityStat(
            "key",
            "Active PINs",
            pinCount,
            colors.primary,
            colors.primaryLight
          )}
          {renderSecurityStat(
            "shield-checkmark",
            "Status",
            "Secure",
            colors.success,
            colors.successLight
          )}
          {renderSecurityStat(
            "lock-closed",
            "Locks",
            "All Locked",
            colors.warning,
            colors.warningLight
          )}
        </View>


        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Security Settings
          </Text>

          {settings.map((setting) => (
            <View
              key={setting.id}
              style={[
                styles.settingCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={setting.icon as any}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {setting.title}
                  </Text>
                  <Text
                    style={[styles.settingDesc, { color: colors.tertiary }]}
                  >
                    {setting.description}
                  </Text>
                </View>
              </View>

              {setting.type === "toggle" ? (
                <Switch
                  value={setting.enabled}
                  onValueChange={() => handleToggle(setting.id)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              ) : (
                <TouchableOpacity
                  onPress={handleViewActivityLog}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => router.push("/(tabs)/devices")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="key" size={22} color={colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>
                Manage PINs
              </Text>
              <Text style={[styles.actionDesc, { color: colors.tertiary }]}>
                Add or remove access codes
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.tertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.errorLight },
              ]}
            >
              <Ionicons name="alert-circle" size={22} color={colors.error} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>
                Emergency Lock
              </Text>
              <Text style={[styles.actionDesc, { color: colors.tertiary }]}>
                Disable all access immediately
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.tertiary}
            />
          </TouchableOpacity>
        </View>
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  alertCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    marginBottom: 28,
    gap: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  alertText: {
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  settingCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  actionButton: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    letterSpacing: 0.1,
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
