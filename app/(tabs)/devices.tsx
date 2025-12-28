import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Alert, FlatList, ActivityIndicator, useColorScheme, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';


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


const DEVICES = [
  {
    id: 1,
    name: 'Front Door Lock',
    type: 'door',
    status: 'locked',
    icon: 'lock-closed',
    deviceId: 'front-door-lock',
  },
];


interface PIN {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  firestoreId?: string;
}


export default function DevicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { height } = useWindowDimensions();

  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinName, setPinName] = useState('');
  const [pins, setPins] = useState<PIN[]>([]);
  const [showPinList, setShowPinList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPin, setSavingPin] = useState(false);


  useEffect(() => {
    if (user?.uid) {
      loadPinsFromFirestore();
    }
  }, [user?.uid]);


  const loadPinsFromFirestore = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const pinsRef = collection(db, 'users', user.uid, 'pins');
      const querySnapshot = await getDocs(pinsRef);

      const loadedPins: PIN[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedPins.push({
          id: doc.id,
          code: data.code,
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          firestoreId: doc.id,
        });
      });

      setPins(loadedPins);
    } catch (error) {
      console.error('Error loading PINs:', error);
      setPins([]);
    } finally {
      setLoading(false);
    }
  };


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
              Please sign in to access your smart devices and control pins.
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


  const handleAddPin = async () => {
    if (!pinCode.trim()) {
      Alert.alert('Error', 'Please enter a PIN code');
      return;
    }
    if (!pinName.trim()) {
      Alert.alert('Error', 'Please enter a PIN name');
      return;
    }
    if (pinCode.length < 4 || pinCode.length > 8) {
      Alert.alert('Error', 'PIN must be between 4-8 digits');
      return;
    }
    if (!/^\d+$/.test(pinCode)) {
      Alert.alert('Error', 'PIN must contain only numbers');
      return;
    }
    if (pins.length >= 10) {
      Alert.alert('Error', 'Maximum 10 PINs allowed');
      return;
    }
    if (pins.some(p => p.code === pinCode)) {
      Alert.alert('Error', 'This PIN already exists');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setSavingPin(true);
    try {
      const pinsRef = collection(db, 'users', user.uid, 'pins');
      const docRef = await addDoc(pinsRef, {
        code: pinCode,
        name: pinName,
        deviceId: 'front-door-lock',
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
      setPinCode('');
      setPinName('');
      setShowPinModal(false);

      Alert.alert('Success', `PIN "${pinName}" added successfully!`);
    } catch (error) {
      console.error('Error adding PIN:', error);
      Alert.alert('Error', 'Failed to add PIN. Please try again.');
    } finally {
      setSavingPin(false);
    }
  };


  const handleDeletePin = (id: string) => {
    Alert.alert(
      'Delete PIN',
      'Are you sure you want to delete this PIN?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePin(id),
        },
      ]
    );
  };


  const deletePin = async (id: string) => {
    if (!user?.uid) return;

    try {
      const pinRef = doc(db, 'users', user.uid, 'pins', id);
      await deleteDoc(pinRef);

      setPins(pins.filter(p => p.id !== id));
      Alert.alert('Success', 'PIN deleted successfully');
    } catch (error) {
      console.error('Error deleting PIN:', error);
      Alert.alert('Error', 'Failed to delete PIN');
    }
  };


  const renderPinItem = ({ item }: { item: PIN }) => (
    <View style={[styles.pinItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.pinContent}>
        <View style={[styles.pinIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="key" size={18} color={colors.primary} />
        </View>
        <View style={styles.pinInfo}>
          <Text style={[styles.pinItemName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.pinCode, { color: colors.textSecondary }]}>••••••</Text>
          <Text style={[styles.pinDate, { color: colors.textSecondary }]}>
            Created {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePin(item.id)}
      >
        <Ionicons name="trash" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Your Devices</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{DEVICES.length} devices connected</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading PINs...</Text>
          </View>
        ) : (
          <View style={styles.devicesList}>
            {DEVICES.map((device) => (
              <View key={device.id}>
                <TouchableOpacity 
                  style={[styles.deviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setSelectedDevice(selectedDevice === device.id ? null : device.id)}
                >
                  <View style={[styles.deviceIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name={device.icon as any} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.deviceContent}>
                    <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
                    <Text style={[styles.deviceType, { color: colors.textSecondary }]}>{device.type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: device.status === 'on' || device.status === 'locked' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)' }]}>
                    <Text style={[styles.statusText, { color: device.status === 'on' || device.status === 'locked' ? '#10B981' : '#9CA3AF' }]}>
                      {device.status}
                    </Text>
                  </View>
                  <Ionicons name={selectedDevice === device.id ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {selectedDevice === device.id && (
                  <View style={styles.expandedSection}>
                    <View style={[styles.pinManagementCard, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: colors.primary }]}>
                      <View style={styles.pinHeader}>
                        <View>
                          <Text style={[styles.pinManagementTitle, { color: colors.text }]}>PIN Management</Text>
                          <Text style={[styles.pinManagementSubtitle, { color: colors.textSecondary }]}>
                            {pins.length}/10 PINs configured
                          </Text>
                        </View>
                        <View style={[styles.pinCountBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.pinCount}>{pins.length}</Text>
                        </View>
                      </View>

                      <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { width: `${(pins.length / 10) * 100}%`, backgroundColor: colors.primary }
                          ]} 
                        />
                      </View>

                      {pins.length > 0 ? (
                        <TouchableOpacity
                          style={[styles.listPinsButton, { backgroundColor: `${colors.primary}15` }]}
                          onPress={() => setShowPinList(!showPinList)}
                        >
                          <Ionicons name={showPinList ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
                          <Text style={[styles.listPinsButtonText, { color: colors.primary }]}>
                            {showPinList ? 'Hide' : 'View'} Pins ({pins.length})
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.noPinsText, { color: colors.textSecondary }]}>No PINs added yet</Text>
                      )}

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

                      <TouchableOpacity
                        style={[styles.addPinButton, { backgroundColor: pins.length >= 10 ? '#ccc' : colors.primary }, pins.length >= 10 && styles.addPinButtonDisabled]}
                        onPress={() => setShowPinModal(true)}
                        disabled={pins.length >= 10}
                      >
                        <Ionicons name="add" size={20} color={pins.length >= 10 ? '#999' : '#FFF'} />
                        <Text style={[styles.addPinButtonText, pins.length >= 10 && { color: '#999' }]}>
                          {pins.length >= 10 ? 'Maximum PINs Reached' : 'Add New PIN'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPinModal(false);
          setPinCode('');
          setPinName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New PIN</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPinModal(false);
                  setPinCode('');
                  setPinName('');
                }}
                disabled={savingPin}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>PIN Name</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : '#F9FAFB' }]}
                  placeholder="e.g., Guest, Cleaner, Family"
                  placeholderTextColor={colors.textSecondary}
                  value={pinName}
                  onChangeText={setPinName}
                  maxLength={20}
                  editable={!savingPin}
                />
                <Text style={[styles.inputHelp, { color: colors.textSecondary }]}>{pinName.length}/20 characters</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>PIN Code</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : '#F9FAFB' }]}
                  placeholder="4-8 digits"
                  placeholderTextColor={colors.textSecondary}
                  value={pinCode}
                  onChangeText={setPinCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  secureTextEntry
                  editable={!savingPin}
                />
                <Text style={[styles.inputHelp, { color: colors.textSecondary }]}>
                  {pinCode.length}/8 digits
                  {pinCode.length > 0 && (
                    pinCode.length >= 4 ? 
                    <Text style={{ color: colors.success }}> ✓ Valid</Text> :
                    <Text style={{ color: colors.error }}> • Minimum 4 digits required</Text>
                  )}
                </Text>
              </View>

              <View style={[styles.infoBox, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  PIN codes must be 4-8 digits long and contain only numbers.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinCode('');
                  setPinName('');
                }}
                disabled={savingPin}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }, savingPin && styles.createButtonDisabled]}
                onPress={handleAddPin}
                disabled={savingPin}
              >
                {savingPin ? (
                  <ActivityIndicator color="#FFF" />
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
      </Modal>
    </SafeAreaView>
  );
}


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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  devicesList: {
    gap: 10,
  },
  deviceCard: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceContent: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  expandedSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  pinManagementCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderTopWidth: 2,
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pinManagementTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  pinManagementSubtitle: {
    fontSize: 12,
  },
  pinCountBadge: {
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCount: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  noPinsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  listPinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  listPinsButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pinsList: {
    marginBottom: 12,
  },
  pinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  pinContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInfo: {
    flex: 1,
  },
  pinItemName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  pinCode: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  pinDate: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
  },
  addPinButton: {
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPinButtonDisabled: {
    opacity: 0.6,
  },
  addPinButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  inputHelp: {
    fontSize: 11,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#208A95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
