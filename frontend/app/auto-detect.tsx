import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface AutoDetectedExpense {
  id: string;
  amount: number;
  category_id: string;
  description: string;
  merchant?: string;
  transaction_type: string;
  sms_body: string;
  created_at: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'fast-food', color: '#FF6B6B' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#4ECDC4' },
  { id: 'shopping', name: 'Shopping', icon: 'cart', color: '#45B7D1' },
  { id: 'bills', name: 'Bills', icon: 'receipt', color: '#96CEB4' },
  { id: 'entertainment', name: 'Entertainment', icon: 'game-controller', color: '#DDA0DD' },
  { id: 'healthcare', name: 'Healthcare', icon: 'medical', color: '#98D8C8' },
  { id: 'income', name: 'Income', icon: 'cash', color: '#2ECC71' },
  { id: 'others', name: 'Others', icon: 'ellipsis-horizontal', color: '#95A5A6' },
];

// Sample SMS messages for simulation
const SAMPLE_SMS_MESSAGES = [
  'Rs.450.00 debited from A/c XX1234 to Zomato on 07/04/26. Avl Bal: Rs.15000.00',
  'INR 2,500 credited to your A/c XX5678 from Salary Bonus. Avl Bal: INR 52,500',
  'You have sent Rs.150 to Uber via UPI. Ref: TXN789456',
  'Rs.899 debited from A/c XX9999 at Netflix for subscription. Ref: SUB123',
  'Rs.1200 debited from A/c XX4567 to BigBasket for groceries. Avl Bal: Rs.8000',
  'INR 350 debited for Airtel Recharge. Ref: RCH456789',
  'Rs.75 debited from A/c XX2345 at Starbucks Coffee. Ref: POS567',
];

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function AutoDetectScreen() {
  const router = useRouter();
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [simulationMode, setSimulationMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [recentDetections, setRecentDetections] = useState<AutoDetectedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadRecentDetections();
    requestNotificationPermissions();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    appState.current = nextAppState;
  };

  const requestNotificationPermissions = async () => {
    // Skip on web
    if (Platform.OS === 'web') {
      return;
    }
    
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    } catch (error) {
      console.log('Notification permission error:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('autoDetectEnabled');
      const simulation = await AsyncStorage.getItem('simulationMode');
      
      if (enabled !== null) setAutoDetectEnabled(enabled === 'true');
      if (simulation !== null) setSimulationMode(simulation === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadRecentDetections = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentDetections');
      if (stored) {
        setRecentDetections(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveRecentDetections = async (detections: AutoDetectedExpense[]) => {
    try {
      // Keep only last 20 detections
      const toSave = detections.slice(0, 20);
      await AsyncStorage.setItem('recentDetections', JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving detections:', error);
    }
  };

  const showNotification = async (expense: AutoDetectedExpense) => {
    // Notifications only work on native platforms
    if (Platform.OS === 'web') {
      console.log('Notification (web simulation):', expense.description);
      return;
    }
    
    try {
      const category = getCategoryById(expense.category_id);
      const typeText = expense.transaction_type === 'credit' ? 'Income' : 'Expense';
      const sign = expense.transaction_type === 'credit' ? '+' : '-';
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${typeText} Auto-Detected`,
          body: `${sign}\u20b9${expense.amount.toLocaleString('en-IN')} - ${expense.description} (${category.name})`,
          data: { expenseId: expense.id },
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Notification error:', error);
    }
  };

  const parseSMSAndSave = async (smsBody: string): Promise<AutoDetectedExpense | null> => {
    try {
      // Parse SMS
      const parseResponse = await fetch(`${BACKEND_URL}/api/parse-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms_body: smsBody }),
      });

      const parsed = await parseResponse.json();

      if (!parsed.success) {
        console.log('SMS not a transaction:', parsed.error);
        return null;
      }

      // Save expense
      const saveResponse = await fetch(`${BACKEND_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsed.amount,
          category_id: parsed.suggested_category_id,
          description: parsed.description || 'Auto-detected transaction',
          merchant: parsed.merchant,
          transaction_type: parsed.transaction_type,
          source: 'sms',
          sms_body: smsBody,
        }),
      });

      if (saveResponse.ok) {
        const savedExpense = await saveResponse.json();
        return {
          ...savedExpense,
          sms_body: smsBody,
        };
      }

      return null;
    } catch (error) {
      console.error('Error processing SMS:', error);
      return null;
    }
  };

  const handleToggleAutoDetect = async (value: boolean) => {
    setAutoDetectEnabled(value);
    await saveSettings('autoDetectEnabled', value);

    if (value && simulationMode) {
      startSimulation();
    } else {
      stopSimulation();
    }

    if (value && !simulationMode) {
      Alert.alert(
        'Native SMS Reading',
        'Real-time SMS detection requires building the app as an APK. For testing, enable Simulation Mode.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleSimulation = async (value: boolean) => {
    setSimulationMode(value);
    await saveSettings('simulationMode', value);

    if (autoDetectEnabled) {
      if (value) {
        startSimulation();
      } else {
        stopSimulation();
      }
    }
  };

  const startSimulation = () => {
    if (simulationInterval.current) return;
    
    setIsListening(true);
    
    // Simulate receiving SMS every 15-30 seconds
    const scheduleNextSMS = () => {
      const delay = Math.random() * 15000 + 15000; // 15-30 seconds
      simulationInterval.current = setTimeout(async () => {
        if (autoDetectEnabled && simulationMode) {
          await simulateIncomingSMS();
          scheduleNextSMS();
        }
      }, delay);
    };

    scheduleNextSMS();
  };

  const stopSimulation = () => {
    setIsListening(false);
    if (simulationInterval.current) {
      clearTimeout(simulationInterval.current);
      simulationInterval.current = null;
    }
  };

  const simulateIncomingSMS = async () => {
    const randomSMS = SAMPLE_SMS_MESSAGES[Math.floor(Math.random() * SAMPLE_SMS_MESSAGES.length)];
    
    setProcessing(true);
    const expense = await parseSMSAndSave(randomSMS);
    setProcessing(false);

    if (expense) {
      const newDetections = [expense, ...recentDetections];
      setRecentDetections(newDetections);
      await saveRecentDetections(newDetections);
      await showNotification(expense);
    }
  };

  const triggerManualSimulation = async () => {
    if (processing) return;
    await simulateIncomingSMS();
  };

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'This will only clear the detection history from this screen. Expenses will remain saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setRecentDetections([]);
            await AsyncStorage.removeItem('recentDetections');
          },
        },
      ]
    );
  };

  const getCategoryById = (id: string): Category => {
    return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[7];
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Auto-Detect SMS</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, isListening && styles.statusCardActive]}>
          <View style={styles.statusIcon}>
            {processing ? (
              <ActivityIndicator size="small" color="#4ECDC4" />
            ) : (
              <Ionicons
                name={isListening ? 'radio' : 'radio-outline'}
                size={32}
                color={isListening ? '#4ECDC4' : '#666'}
              />
            )}
          </View>
          <Text style={styles.statusTitle}>
            {processing
              ? 'Processing SMS...'
              : isListening
              ? 'Listening for SMS'
              : 'Auto-detect is off'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isListening
              ? simulationMode
                ? 'Simulation mode active - random SMS will be generated'
                : 'Waiting for incoming bank SMS'
              : 'Enable auto-detect to start listening'}
          </Text>
          {isListening && (
            <View style={styles.pulseIndicator}>
              <View style={styles.pulseDot} />
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="flash" size={22} color="#4ECDC4" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Auto-Detect Enabled</Text>
                <Text style={styles.settingDescription}>
                  Automatically detect and save expenses from SMS
                </Text>
              </View>
            </View>
            <Switch
              value={autoDetectEnabled}
              onValueChange={handleToggleAutoDetect}
              trackColor={{ false: '#3e3e5e', true: 'rgba(78, 205, 196, 0.4)' }}
              thumbColor={autoDetectEnabled ? '#4ECDC4' : '#888'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="flask" size={22} color="#DDA0DD" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Simulation Mode</Text>
                <Text style={styles.settingDescription}>
                  Test with sample SMS (for preview/development)
                </Text>
              </View>
            </View>
            <Switch
              value={simulationMode}
              onValueChange={handleToggleSimulation}
              trackColor={{ false: '#3e3e5e', true: 'rgba(221, 160, 221, 0.4)' }}
              thumbColor={simulationMode ? '#DDA0DD' : '#888'}
            />
          </View>
        </View>

        {/* Manual Trigger */}
        {simulationMode && (
          <TouchableOpacity
            style={[styles.triggerButton, processing && styles.triggerButtonDisabled]}
            onPress={triggerManualSimulation}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.triggerButtonText}>Simulate Incoming SMS</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#45B7D1" />
          <Text style={styles.infoText}>
            {Platform.OS === 'android'
              ? 'Real SMS reading requires building as APK with READ_SMS permission. Use simulation mode for testing in preview.'
              : 'iOS does not allow apps to read SMS. Use simulation mode for testing.'}
          </Text>
        </View>

        {/* Recent Detections */}
        <View style={styles.detectionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Auto-Detections</Text>
            {recentDetections.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentDetections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={40} color="#666" />
              <Text style={styles.emptyText}>No auto-detected transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Enable auto-detect and wait for SMS or trigger simulation
              </Text>
            </View>
          ) : (
            recentDetections.map((detection) => {
              const category = getCategoryById(detection.category_id);
              return (
                <TouchableOpacity
                  key={detection.id}
                  style={styles.detectionItem}
                  onPress={() => router.push(`/expense/${detection.id}`)}
                >
                  <View
                    style={[
                      styles.detectionIcon,
                      { backgroundColor: category.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={18}
                      color={category.color}
                    />
                  </View>
                  <View style={styles.detectionDetails}>
                    <Text style={styles.detectionDescription} numberOfLines={1}>
                      {detection.description}
                    </Text>
                    <Text style={styles.detectionSMS} numberOfLines={1}>
                      {detection.sms_body}
                    </Text>
                    <Text style={styles.detectionMeta}>
                      {category.name} • {formatTime(detection.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.detectionAmount,
                      {
                        color:
                          detection.transaction_type === 'credit'
                            ? '#2ECC71'
                            : '#FF6B6B',
                      },
                    ]}
                  >
                    {detection.transaction_type === 'credit' ? '+' : '-'}
                    {formatCurrency(detection.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusCardActive: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  statusIcon: {
    marginBottom: 12,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusSubtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  pulseIndicator: {
    marginTop: 16,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
  },
  settingsSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  triggerButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  triggerButtonDisabled: {
    opacity: 0.6,
  },
  triggerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(69, 183, 209, 0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
  },
  detectionsSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionDetails: {
    flex: 1,
    marginLeft: 12,
  },
  detectionDescription: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  detectionSMS: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  detectionMeta: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  detectionAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
});
