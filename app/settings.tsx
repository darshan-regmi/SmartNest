import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

const Colors = {
  background: "#FCFCF9",
  surface: "#FFF",
  text: "#1F2121",
  textSecondary: "#626C7C",
  primary: "#208A95",
  error: "#EF4444",
};

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="person" size={20} color={Colors.primary} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Display Name</Text>
                <Text style={styles.cardValue}>John Doe</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="mail" size={20} color={Colors.primary} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Email Address</Text>
                <Text style={styles.cardValue}>john@example.com</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="key" size={20} color={Colors.primary} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>User ID</Text>
                <Text style={styles.cardValueMono}>abc123xyz789...</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed" size={20} color={Colors.primary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Change Password</Text>
                <Text style={styles.menuDesc}>Update your password</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={Colors.primary}
              />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Two-Factor Auth</Text>
                <Text style={styles.menuDesc}>Add extra security</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="finger-print" size={20} color={Colors.primary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Biometric Login</Text>
                <Text style={styles.menuDesc}>Face ID / Fingerprint</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About App</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.primary}
              />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>About SmartNest</Text>
                <Text style={styles.menuDesc}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle" size={20} color={Colors.primary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuDesc}>Contact us for help</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Privacy Policy</Text>
                <Text style={styles.menuDesc}>Read our policies</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            console.log("Sign out pressed");
            router.back();
          }}
        >
          <Ionicons name="log-out" size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
          <Text style={styles.footerTitle}>SmartNest</Text>
          <Text style={styles.footerText}>
            Smart Home Access Control{"\n"}© 2025 All Rights Reserved
          </Text>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  cardValueMono: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    fontFamily: "Courier New",
  },
  menuItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  signOutButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 20,
  },
  signOutText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginVertical: 8,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
});
