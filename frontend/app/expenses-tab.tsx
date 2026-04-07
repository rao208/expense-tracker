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

export default function ExpensesTabScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const fetchExpenses = useCallback(async () => {
    try {
      let url = `${BACKEND_URL}/api/expenses?transaction_type=debit&limit=100`;
      if (selectedFilter) {
        url += `&category_id=${selectedFilter}`;
      }

      const [expensesRes, categoriesRes] = await Promise.all([
        fetch(url),
        fetch(`${BACKEND_URL}/api/categories`),
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data);
        setTotalExpenses(data.reduce((sum: number, e: Expense) => sum + e.amount, 0));
      }

      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        setCategories(catData.length > 0 ? catData : DEFAULT_CATEGORIES);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpenses();
  }, [fetchExpenses]);

  const getCategoryById = (id: string): Category => {
    return categories.find((c) => c.id === id) || DEFAULT_CATEGORIES[7];
  };

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

  const handleDelete = async (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${BACKEND_URL}/api/expenses/${expenseId}`,
                { method: 'DELETE' }
              );
              if (response.ok) {
                setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete expense');
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
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-expense')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Ionicons name="arrow-up-circle" size={28} color="#FF6B6B" />
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalExpenses)}</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === null && styles.filterChipActive,
          ]}
          onPress={() => setSelectedFilter(null)}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === null && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.filter(c => c.id !== 'income').map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              selectedFilter === cat.id && {
                backgroundColor: cat.color + '30',
                borderColor: cat.color,
              },
            ]}
            onPress={() => setSelectedFilter(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={selectedFilter === cat.id ? cat.color : '#888'}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === cat.id && { color: cat.color },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Expenses List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
        showsVerticalScrollIndicator={false}
      >
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No expenses found</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => router.push('/add-expense')}
            >
              <Text style={styles.addFirstText}>Add your first expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          expenses.map((expense) => {
            const category = getCategoryById(expense.category_id);
            return (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseItem}
                onPress={() => router.push(`/expense/${expense.id}`)}
              >
                <View
                  style={[
                    styles.expenseIcon,
                    { backgroundColor: category.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={category.color}
                  />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDescription} numberOfLines={1}>
                    {expense.description}
                  </Text>
                  <Text style={styles.expenseMeta}>
                    {category.name} \u2022 {formatDate(expense.created_at)}
                  </Text>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>
                    -{formatCurrency(expense.amount)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(expense.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
    backgroundColor: '#FF6B6B',
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
    color: '#FF6B6B',
    fontSize: 22,
    fontWeight: 'bold',
  },
  filterContainer: {
    marginTop: 16,
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2d2d44',
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: '#FF6B6B',
  },
  filterText: {
    color: '#888',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#FF6B6B',
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
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
  },
  addFirstText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseDetails: {
    flex: 1,
    marginLeft: 12,
  },
  expenseDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  expenseMeta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: '#FF6B6B',
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
});
