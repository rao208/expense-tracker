import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Income {
  id: string;
  amount: number;
  category_id: string;
  description: string;
  merchant?: string;
  transaction_type: string;
  source: string;
  created_at: string;
}

export default function IncomeTabScreen() {
  const router = useRouter();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchIncomes = useCallback(async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/expenses?transaction_type=credit&limit=100`
      );

      if (response.ok) {
        const data = await response.json();
        setIncomes(data);
        setTotalIncome(data.reduce((sum: number, e: Income) => sum + e.amount, 0));
      }
    } catch (error) {
      console.error('Error fetching incomes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIncomes();
  }, [fetchIncomes]);

  const formatCurrency = (amount: number) => {
    return `\u20b9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAddIncome = async () => {
    if (!newAmount || parseFloat(newAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!newDescription.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newAmount),
          category_id: 'income',
          description: newDescription.trim(),
          transaction_type: 'credit',
          source: 'manual',
        }),
      });

      if (response.ok) {
        const newIncome = await response.json();
        setIncomes((prev) => [newIncome, ...prev]);
        setTotalIncome((prev) => prev + parseFloat(newAmount));
        setShowAddModal(false);
        setNewAmount('');
        setNewDescription('');
      } else {
        Alert.alert('Error', 'Failed to add income');
      }
    } catch (error) {
      console.error('Add income error:', error);
      Alert.alert('Error', 'Failed to add income');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (incomeId: string, amount: number) => {
    Alert.alert(
      'Delete Income',
      'Are you sure you want to delete this income entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${BACKEND_URL}/api/expenses/${incomeId}`,
                { method: 'DELETE' }
              );
              if (response.ok) {
                setIncomes((prev) => prev.filter((e) => e.id !== incomeId));
                setTotalIncome((prev) => prev - amount);
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete income');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Income</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Ionicons name="arrow-down-circle" size={28} color="#2ECC71" />
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total Income</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalIncome)}</Text>
        </View>
      </View>

      {/* Income List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
        }
        showsVerticalScrollIndicator={false}
      >
        {incomes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No income recorded yet</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addFirstText}>Add your first income</Text>
            </TouchableOpacity>
          </View>
        ) : (
          incomes.map((income) => (
            <TouchableOpacity
              key={income.id}
              style={styles.incomeItem}
              onPress={() => router.push(`/expense/${income.id}`)}
            >
              <View style={styles.incomeIcon}>
                <Ionicons name="cash" size={20} color="#2ECC71" />
              </View>
              <View style={styles.incomeDetails}>
                <Text style={styles.incomeDescription} numberOfLines={1}>
                  {income.description}
                </Text>
                <Text style={styles.incomeMeta}>
                  {formatDate(income.created_at)}
                  {income.source === 'sms' && ' \u2022 SMS'}
                  {income.source === 'pdf' && ' \u2022 PDF'}
                </Text>
              </View>
              <View style={styles.incomeRight}>
                <Text style={styles.incomeAmount}>
                  +{formatCurrency(income.amount)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(income.id, income.amount)}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Income Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Income</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.currencySymbol}>\u20b9</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Salary, Freelance payment"
                placeholderTextColor="#666"
                value={newDescription}
                onChangeText={setNewDescription}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddIncome}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Income</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    color: '#888',
    fontSize: 12,
  },
  totalAmount: {
    color: '#2ECC71',
    fontSize: 22,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  addFirstButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2ECC71',
    borderRadius: 20,
  },
  addFirstText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  incomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  incomeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomeDetails: {
    flex: 1,
    marginLeft: 12,
  },
  incomeDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  incomeMeta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  incomeRight: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    color: '#2ECC71',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
    marginTop: 4,
  },
  bottomPadding: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 32,
    color: '#888',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 40,
    color: '#2ECC71',
    fontWeight: 'bold',
    minWidth: 150,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#2ECC71',
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
});
