import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

const Colors = {
  background: '#FCFCF9',
  surface: '#FFFFFF',
  text: '#1F2121',
  textSecondary: '#626C7C',
  primary: '#208A95',
  success: '#10B981',
  error: '#EF4444',
};

export default function DevicesScreen() {
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
          <Text style={styles.title}>Devices & Control</Text>
        </View>

        {/* Door Control Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Door Lock</Text>
          <View style={styles.doorCard}>
            <View style={styles.doorIconContainer}>
              <Ionicons name="lock-closed" size={48} color="#15803D" />
            </View>
            <Text style={styles.doorStatusText}>CLOSED</Text>
            <Text style={styles.doorTime}>Last updated: 10:30 AM</Text>
            <View style={styles.doorActions}>
              <TouchableOpacity style={[styles.doorButton, styles.openBtn]}>
                <Ionicons name="lock-open" size={20} color="#FFF" />
                <Text style={styles.doorBtnText}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.doorButton, styles.closeBtn]}>
                <Ionicons name="lock-closed" size={20} color="#FFF" />
                <Text style={styles.doorBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* PINs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Access PINs (3)</Text>
            <View style={styles.pinBadge}>
              <Text style={styles.pinBadgeText}>3/10</Text>
            </View>
          </View>

          <View style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <Ionicons name="key" size={20} color={Colors.primary} />
              <Text style={styles.pinLabel}>Guest Access</Text>
            </View>
            <Text style={styles.pinCode}>••••34</Text>
            <View style={styles.pinFooter}>
              <Text style={styles.pinDate}>Added 2 days ago</Text>
              <TouchableOpacity>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <Ionicons name="key" size={20} color={Colors.primary} />
              <Text style={styles.pinLabel}>Family</Text>
            </View>
            <Text style={styles.pinCode}>••••56</Text>
            <View style={styles.pinFooter}>
              <Text style={styles.pinDate}>Added 5 days ago</Text>
              <TouchableOpacity>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <Ionicons name="key" size={20} color={Colors.primary} />
              <Text style={styles.pinLabel}>Cleaner</Text>
            </View>
            <Text style={styles.pinCode}>••••78</Text>
            <View style={styles.pinFooter}>
              <Text style={styles.pinDate}>Added 1 week ago</Text>
              <TouchableOpacity>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.addPinButton}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addPinText}>Add New PIN</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoTitle}>Security Tip</Text>
          </View>
          <Text style={styles.infoText}>
            You can add up to 10 different PINs for family members and guests. Each PIN is secure and can be managed independently.
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  pinBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  doorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  doorIconContainer: {
    marginBottom: 12,
  },
  doorStatusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 6,
  },
  doorTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  doorActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  doorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  openBtn: {
    backgroundColor: Colors.success,
  },
  closeBtn: {
    backgroundColor: Colors.error,
  },
  doorBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pinCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  pinCode: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 10,
    letterSpacing: 2,
  },
  pinFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  addPinButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addPinText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
