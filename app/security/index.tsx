import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../lib/authContext";
import { db } from "../../lib/firebase";

// ============================================
// COLORS & DESIGN TOKENS
// ============================================

const Colors = {
  light: {
    background: '#FCFCF9',
    surface: '#FFFFFF',
    text: '#1F2121',
    textSecondary: '#626C7C',
    tertiary: '#8B93A1',
    primary: '#208A95',
    primaryLight: '#E0F7FA',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    success: '#10B981',
    border: '#E5E7EB',
    overlay: 'rgba(31, 33, 33, 0.04)',
  },
  dark: {
    background: '#1F2121',
    surface: '#2A2C2C',
    text: '#F5F5F5',
    textSecondary: '#A7A9A9',
    tertiary: '#7A7E7E',
    primary: '#32B8C6',
    primaryLight: '#1B4D54',
    error: '#FF5459',
    errorLight: '#3B1A1C',
    success: '#10B981',
    border: '#3A3C3C',
    overlay: 'rgba(255, 255, 255, 0.04)',
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Security</Text>
            <Text style={[styles.headerSubtitle, { color: colors.tertiary }]}>
              Manage your access control settings
            </Text>
          </View>
        </View>

        {/* Global Protection Summary */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: colors.tertiary }]}>System Status</Text>
              <Text style={[styles.cardValue, { color: colors.success }]}>Partially Protected</Text>
            </View>
            <View style={styles.cardAddon}>
              <View style={[styles.pinBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.pinBadgeText}>{pinCount} PINs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Access Control Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>Access Control</Text>

          {/* Manage PINs */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/security/pins" as any)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="key" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Manage PINs</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Create, edit, or delete access PINs</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>

          {/* Settings Items */}
          {settings.map((setting) => (
            <View
              key={setting.id}
              style={[
                styles.menuItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={setting.icon as any}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>
                    {setting.title}
                  </Text>
                  <Text
                    style={[styles.menuDesc, { color: colors.tertiary }]}
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
                  style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
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

        {/* Emergency Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>Emergency</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Emergency Lock", "All access points will be disabled immediately. Proceed?", [
              { text: "Cancel", style: "cancel" },
              { text: "Confirm", style: "destructive", onPress: () => Alert.alert("Confirmed", "All locks engaged.") }
            ])}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="alert-circle" size={22} color={colors.error} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Emergency Lock</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Disable all access points</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={[styles.footerIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.footerTitle, { color: colors.text }]}>SmartNest Security</Text>
          <Text style={[styles.footerText, { color: colors.tertiary }]}>
            Your home is protected with 256-bit encryption{'\n'}and biometric authentication.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView >
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
    paddingTop: 8,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardAddon: {},
  pinBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pinBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
    marginBottom: 4,
  },
  menuItem: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  menuDesc: {
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  footerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});
