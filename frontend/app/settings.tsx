import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
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

interface KeywordRule {
  id: string;
  keyword: string;
  category_id: string;
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

export default function SettingsScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/keyword-rules`);
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const getCategoryById = (id: string): Category => {
    return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[7];
  };

  const handleAddRule = async () => {
    if (!newKeyword.trim()) {
      Alert.alert('Error', 'Please enter a keyword');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/keyword-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: newKeyword.trim().toLowerCase(),
          category_id: selectedCategory,
        }),
      });

      if (response.ok) {
        const newRule = await response.json();
        setRules((prev) => [newRule, ...prev]);
        setNewKeyword('');
        Alert.alert('Success', 'Keyword rule added successfully!');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to add rule');
      }
    } catch (error) {
      console.error('Add rule error:', error);
      Alert.alert('Error', 'Failed to add rule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this keyword rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${BACKEND_URL}/api/keyword-rules/${ruleId}`,
                { method: 'DELETE' }
              );
              if (response.ok) {
                setRules((prev) => prev.filter((r) => r.id !== ruleId));
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Info Section */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle" size={24} color="#4ECDC4" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Auto-Categorization Rules</Text>
              <Text style={styles.infoText}>
                Add keywords to automatically categorize expenses when scanning SMS.
                For example, adding "swiggy" → Food will auto-assign Food category
                when "swiggy" is found in SMS.
              </Text>
            </View>
          </View>

          {/* Add New Rule Section */}
          <View style={styles.addSection}>
            <Text style={styles.sectionTitle}>Add New Rule</Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.keywordInput}
                placeholder="Enter keyword (e.g., swiggy)"
                placeholderTextColor="#666"
                value={newKeyword}
                onChangeText={setNewKeyword}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Assign to Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View style={styles.selectedCategory}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: getCategoryById(selectedCategory).color + '20' },
                  ]}
                >
                  <Ionicons
                    name={getCategoryById(selectedCategory).icon as any}
                    size={18}
                    color={getCategoryById(selectedCategory).color}
                  />
                </View>
                <Text style={styles.selectedCategoryText}>
                  {getCategoryById(selectedCategory).name}
                </Text>
              </View>
              <Ionicons
                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#888"
              />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === cat.id && styles.categoryOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: cat.color + '20' },
                      ]}
                    >
                      <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                    <Text style={styles.categoryOptionText}>{cat.name}</Text>
                    {selectedCategory === cat.id && (
                      <Ionicons name="checkmark" size={18} color="#4ECDC4" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.addButton, saving && styles.addButtonDisabled]}
              onPress={handleAddRule}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add Rule</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Existing Rules Section */}
          <View style={styles.rulesSection}>
            <Text style={styles.sectionTitle}>Your Rules ({rules.length})</Text>

            {loading ? (
              <ActivityIndicator color="#4ECDC4" style={styles.loader} />
            ) : rules.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="key-outline" size={40} color="#666" />
                <Text style={styles.emptyText}>No rules yet</Text>
                <Text style={styles.emptySubtext}>
                  Add keywords above to auto-categorize expenses
                </Text>
              </View>
            ) : (
              rules.map((rule) => {
                const category = getCategoryById(rule.category_id);
                return (
                  <View key={rule.id} style={styles.ruleItem}>
                    <View style={styles.ruleContent}>
                      <Text style={styles.ruleKeyword}>"{rule.keyword}"</Text>
                      <Ionicons name="arrow-forward" size={16} color="#666" />
                      <View style={styles.ruleCategoryBadge}>
                        <View
                          style={[
                            styles.miniIcon,
                            { backgroundColor: category.color + '20' },
                          ]}
                        >
                          <Ionicons
                            name={category.icon as any}
                            size={12}
                            color={category.color}
                          />
                        </View>
                        <Text
                          style={[styles.ruleCategoryText, { color: category.color }]}
                        >
                          {category.name}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteRule(rule.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* Default Keywords Info */}
          <View style={styles.defaultSection}>
            <Text style={styles.sectionTitle}>Built-in Keywords</Text>
            <Text style={styles.defaultInfo}>
              The app automatically recognizes common keywords like:
            </Text>
            <View style={styles.defaultList}>
              <Text style={styles.defaultItem}>• Food: swiggy, zomato, restaurant, cafe</Text>
              <Text style={styles.defaultItem}>• Transport: uber, ola, metro, petrol</Text>
              <Text style={styles.defaultItem}>• Shopping: amazon, flipkart, myntra</Text>
              <Text style={styles.defaultItem}>• Bills: electricity, internet, recharge</Text>
              <Text style={styles.defaultItem}>• Entertainment: netflix, spotify, movie</Text>
              <Text style={styles.defaultItem}>• Healthcare: pharmacy, hospital, medical</Text>
            </View>
          </View>

          <View style={styles.bottomPadding} />
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
  infoSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  addSection: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 16,
  },
  keywordInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
  },
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategoryText: {
    color: '#fff',
    fontSize: 14,
  },
  categoryPicker: {
    marginTop: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  categoryOptionSelected: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  categoryOptionText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rulesSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  loader: {
    marginTop: 20,
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
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  ruleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  ruleKeyword: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  ruleCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  miniIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleCategoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultSection: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 16,
  },
  defaultInfo: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  defaultList: {
    gap: 6,
  },
  defaultItem: {
    color: '#666',
    fontSize: 12,
  },
  bottomPadding: {
    height: 32,
  },
});
