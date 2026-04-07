import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform,
  Alert,
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

interface Expense {
  id: string;
  amount: number;
  category_id: string;
  description: string;
  merchant?: string;
  transaction_type: string;
  source: string;
  created_at: string;
}

interface Summary {
  total_debit: number;
  total_credit: number;
  balance: number;
  total_transactions: number;
  category_totals: Record<string, { debit: number; credit: number; count: number }>;
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

export default function HomeScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, summaryRes, categoriesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/expenses?limit=10`),
        fetch(`${BACKEND_URL}/api/expenses/summary/totals`),
        fetch(`${BACKEND_URL}/api/categories`),
      ]);

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.length > 0 ? categoriesData : DEFAULT_CATEGORIES);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getCategoryById = (id: string): Category => {
    return categories.find((c) => c.id === id) || DEFAULT_CATEGORIES[7];
  };

  const formatCurrency = (amount: number) => {
    return `\u20b9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleExportExcel = async () => {
    try {
      const url = `${BACKEND_URL}/api/export/excel`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download report');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ECDC4" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Expense Tracker</Text>
            <Text style={styles.subtitle}>Track your spending with SMS</Text>
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportExcel}>
            <Ionicons name="download-outline" size={22} color="#4ECDC4" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="arrow-up" size={20} color="#FF6B6B" />
            </View>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryAmount, { color: '#FF6B6B' }]}>
              {formatCurrency(summary?.total_debit || 0)}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="arrow-down" size={20} color="#2ECC71" />
            </View>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryAmount, { color: '#2ECC71' }]}>
              {formatCurrency(summary?.total_credit || 0)}
            </Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: (summary?.balance || 0) >= 0 ? '#2ECC71' : '#FF6B6B' },
            ]}
          >
            {formatCurrency(summary?.balance || 0)}
          </Text>
          <Text style={styles.transactionCount}>
            {summary?.total_transactions || 0} transactions
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4ECDC4' }]}
            onPress={() => router.push('/auto-detect')}
          >
            <Ionicons name="flash" size={22} color="#fff" />
            <Text style={styles.actionText}>Auto Detect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#45B7D1' }]}
            onPress={() => router.push('/scan-sms')}
          >
            <Ionicons name="chatbox-ellipses" size={22} color="#fff" />
            <Text style={styles.actionText}>Scan SMS</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/upload-pdf')}
          >
            <Ionicons name="document-text" size={18} color="#DDA0DD" />
            <Text style={styles.secondaryText}>Upload PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/add-expense')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#888" />
            <Text style={styles.secondaryText}>Manual Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/expenses')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Start by scanning SMS or adding manually</Text>
            </View>
          ) : (
            expenses.slice(0, 5).map((expense) => {
              const category = getCategoryById(expense.category_id);
              return (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.transactionItem}
                  onPress={() => router.push(`/expense/${expense.id}`)}
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: category.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color={category.color}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription} numberOfLines={1}>
                      {expense.description}
                    </Text>
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionCategory}>{category.name}</Text>
                      <Text style={styles.transactionDot}>\u2022</Text>
                      <Text style={styles.transactionDate}>{formatDate(expense.created_at)}</Text>
                      {expense.source === 'sms' && (
                        <>
                          <Text style={styles.transactionDot}>\u2022</Text>
                          <Ionicons name="chatbox" size={10} color="#4ECDC4" />
                        </>
                      )}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          expense.transaction_type === 'credit' ? '#2ECC71' : '#FF6B6B',
                      },
                    ]}
                  >
                    {expense.transaction_type === 'credit' ? '+' : '-'}
                    {formatCurrency(expense.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 14,
  },
  expenseCard: {},
  incomeCard: {},
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  transactionCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3e3e5e',
    gap: 6,
  },
  secondaryText: {
    color: '#888',
    fontSize: 13,
  },
  recentSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 13,
    color: '#4ECDC4',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
    marginLeft: 12,
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionCategory: {
    color: '#888',
    fontSize: 11,
  },
  transactionDot: {
    color: '#666',
    marginHorizontal: 4,
  },
  transactionDate: {
    color: '#666',
    fontSize: 11,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
});
