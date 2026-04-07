import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ParsedSMS {
  success: boolean;
  amount?: number;
  transaction_type?: string;
  merchant?: string;
  suggested_category_id?: string;
  description?: string;
  error?: string;
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

export default function ScanSMSScreen() {
  const router = useRouter();
  const [smsText, setSmsText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedSMS | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const getCategoryById = (id: string): Category => {
    return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[7];
  };

  const handleParseSMS = async () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please enter or paste an SMS message');
      return;
    }

    setParsing(true);
    setParsed(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/parse-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sms_body: smsText }),
      });

      const data = await response.json();
      setParsed(data);

      if (data.success) {
        setSelectedCategory(data.suggested_category_id || 'others');
      } else {
        Alert.alert('Parse Error', data.error || 'Could not parse SMS');
      }
    } catch (error) {
      console.error('Parse error:', error);
      Alert.alert('Error', 'Failed to parse SMS. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!parsed || !parsed.success) return;

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parsed.amount,
          category_id: selectedCategory,
          description: parsed.description || 'SMS Transaction',
          merchant: parsed.merchant,
          transaction_type: parsed.transaction_type,
          source: 'sms',
          sms_body: smsText,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Expense saved successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save expense');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const sampleSMS = [
    'Rs.500.00 debited from A/c XX1234 to Swiggy on 15/07/25. Avl Bal: Rs.25000.00',
    'INR 1,200 credited to your A/c XX5678 from Salary. Avl Bal: INR 50,000',
    'Rs.350 debited from A/c XX9999 at Amazon for online shopping. Ref: UPI123456',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Scan SMS</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#4ECDC4" />
            <Text style={styles.infoText}>
              Paste your bank SMS below. The app will detect keywords like "Debited" or "Credited"
              to extract transaction details.
            </Text>
          </View>

          {/* SMS Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>SMS Message</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Paste your bank SMS here..."
              placeholderTextColor="#666"
              value={smsText}
              onChangeText={setSmsText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Sample SMS Buttons */}
          <View style={styles.sampleSection}>
            <Text style={styles.sampleLabel}>Try sample SMS:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sampleSMS.map((sms, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.sampleButton}
                  onPress={() => setSmsText(sms)}
                >
                  <Text style={styles.sampleText} numberOfLines={2}>
                    {sms.substring(0, 40)}...
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Parse Button */}
          <TouchableOpacity
            style={[styles.parseButton, parsing && styles.parseButtonDisabled]}
            onPress={handleParseSMS}
            disabled={parsing}
          >
            {parsing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="scan" size={20} color="#fff" />
                <Text style={styles.parseButtonText}>Parse SMS</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Parsed Result */}
          {parsed && parsed.success && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>Extracted Details</Text>

              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.resultValue,
                      {
                        color:
                          parsed.transaction_type === 'credit' ? '#2ECC71' : '#FF6B6B',
                      },
                    ]}
                  >
                    {parsed.transaction_type === 'credit' ? '+' : '-'}
                    {formatCurrency(parsed.amount || 0)}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Type</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          parsed.transaction_type === 'credit'
                            ? 'rgba(46, 204, 113, 0.2)'
                            : 'rgba(255, 107, 107, 0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        {
                          color:
                            parsed.transaction_type === 'credit' ? '#2ECC71' : '#FF6B6B',
                        },
                      ]}
                    >
                      {parsed.transaction_type === 'credit' ? 'Income' : 'Expense'}
                    </Text>
                  </View>
                </View>

                {parsed.merchant && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Merchant</Text>
                    <Text style={styles.resultValue}>{parsed.merchant}</Text>
                  </View>
                )}

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Description</Text>
                  <Text style={styles.resultValue}>{parsed.description}</Text>
                </View>
              </View>

              {/* Category Selection */}
              <Text style={styles.categoryLabel}>Select Category</Text>
              <View style={styles.categoryGrid}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      selectedCategory === cat.id && {
                        borderColor: cat.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: cat.color + '20' },
                      ]}
                    >
                      <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                    </View>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveExpense}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Transaction</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {parsed && !parsed.success && (
            <View style={styles.errorSection}>
              <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>{parsed.error}</Text>
              <Text style={styles.errorHint}>
                Make sure the SMS contains keywords like "Debited" or "Credited" and an amount.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  inputSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sampleSection: {
    marginTop: 16,
    paddingLeft: 16,
  },
  sampleLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  sampleButton: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    maxWidth: 160,
  },
  sampleText: {
    color: '#888',
    fontSize: 11,
  },
  parseButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  parseButtonDisabled: {
    opacity: 0.6,
  },
  parseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSection: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingBottom: 24,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resultLabel: {
    color: '#888',
    fontSize: 14,
  },
  resultValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    width: '23%',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#2ECC71',
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorSection: {
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 24,
    borderRadius: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  errorHint: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
