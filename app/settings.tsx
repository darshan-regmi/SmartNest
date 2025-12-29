import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, useColorScheme } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../lib/authContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';


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
// COMPONENT
// ============================================

export default function SettingsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;


  // ============================================
  // HANDLERS
  // ============================================

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            // Auth state change will automatically trigger redirect
            // via useAuth context
          } catch (error) {
            console.error('Sign out failed:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };


  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.tertiary }]}>
            Manage your account and preferences
          </Text>
        </View>


        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>Account</Text>

          {/* Email Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: colors.tertiary }]}>Email Address</Text>
                <Text style={[styles.cardValue, { color: colors.text }]}>{user?.email || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* User ID Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="key" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: colors.tertiary }]}>User ID</Text>
                <Text style={[styles.cardValueMono, { color: colors.textSecondary }]}>
                  {user?.uid.substring(0, 12)}...
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>Security</Text>

          {/* Change Password */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="lock-closed" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Update your password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>

          {/* Two-Factor Auth */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shield" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Two-Factor Auth</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Add extra security</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>
        </View>


        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>About</Text>

          {/* About SmartNest */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="information-circle" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>About SmartNest</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="help-circle" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Help & Support</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Contact us for help</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.menuDesc, { color: colors.tertiary }]}>Our terms and conditions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
          </TouchableOpacity>
        </View>


        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.signOutButton,
            {
              backgroundColor: isDark ? colors.errorLight : `${colors.error}12`,
              borderColor: colors.error,
            },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>


        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={[styles.footerIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.footerTitle, { color: colors.text }]}>SmartNest</Text>
          <Text style={[styles.footerText, { color: colors.tertiary }]}>
            Smart Home Access Control{'\n'}© 2025 All Rights Reserved
          </Text>
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
  header: {
    marginBottom: 28,
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  cardValueMono: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menuItem: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
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
  signOutButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
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
