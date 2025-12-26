import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

const Colors = {
  background: "#FCFCF9",
  surface: "#FFFFFF",
  text: "#1F2121",
  textSecondary: "#626C7C",
  primary: "#208A95",
};

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome Back 👋</Text>
              <Text style={styles.email}>john@example.com</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsIconButton}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Door Status Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Door</Text>
          <View style={styles.doorCard}>
            <View style={styles.doorStatusContainer}>
              <Ionicons name="lock-closed" size={40} color="#15803D" />
              <Text style={styles.doorStatus}>CLOSED</Text>
            </View>
            <Text style={styles.doorTime}>Last updated: 10:30 AM</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionCard, styles.openCard]}>
              <Ionicons name="lock-open" size={28} color="#FFF" />
              <Text style={styles.actionLabel}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, styles.closeCard]}>
              <Ionicons name="lock-closed" size={28} color="#FFF" />
              <Text style={styles.actionLabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featureItem}>
            <Ionicons name="key" size={20} color={Colors.primary} />
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>PIN Management</Text>
              <Text style={styles.featureDesc}>Manage access codes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="finger-print" size={20} color={Colors.primary} />
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>Biometric Auth</Text>
              <Text style={styles.featureDesc}>Face ID & Fingerprint</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>

          <View style={styles.featureItem}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={Colors.primary}
            />
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>Security</Text>
              <Text style={styles.featureDesc}>
                Enterprise-grade encryption
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="lock-closed" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Devices</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="key" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>PINs</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.statValue}>99%</Text>
            <Text style={styles.statLabel}>Uptime</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  settingsIconButton: {
    padding: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  doorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  doorStatusContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  doorStatus: {
    fontSize: 18,
    fontWeight: "700",
    color: "#15803D",
    marginTop: 8,
  },
  doorTime: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  openCard: {
    backgroundColor: "#10B981",
  },
  closeCard: {
    backgroundColor: "#EF4444",
  },
  actionLabel: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
