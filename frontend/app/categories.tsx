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
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  is_default?: boolean;
}

const AVAILABLE_ICONS = [
  'fast-food', 'car', 'cart', 'receipt', 'game-controller', 'medical',
  'cash', 'gift', 'home', 'airplane', 'book', 'briefcase', 'cafe',
  'card', 'construct', 'fitness', 'flash', 'heart', 'laptop', 'leaf',
  'musical-notes', 'paw', 'pizza', 'school', 'shirt', 'star', 'trending-up',
  'wallet', 'water', 'wine', 'ellipsis-horizontal'
];

const AVAILABLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8',
  '#2ECC71', '#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C',
  '#E67E22', '#95A5A6', '#34495E', '#16A085'
];

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('ellipsis-horizontal');
  const [selectedColor, setSelectedColor] = useState('#4ECDC4');
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          icon: selectedIcon,
          color: selectedColor,
        }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories((prev) => [...prev, newCategory]);
        setShowAddModal(false);
        setNewName('');
        setSelectedIcon('ellipsis-horizontal');
        setSelectedColor('#4ECDC4');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to add category');
      }
    } catch (error) {
      console.error('Add category error:', error);
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.is_default) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${BACKEND_URL}/api/categories/${category.id}`,
                { method: 'DELETE' }
              );

              if (response.ok) {
                setCategories((prev) => prev.filter((c) => c.id !== category.id));
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to delete category');
              }
            } catch (error) {
              console.error('Delete category error:', error);
              Alert.alert('Error', 'Failed to delete category');
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
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Categories ({categories.length})</Text>
          
          {categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: category.color + '20' },
                ]}
              >
                <Ionicons
                  name={category.icon as any}
                  size={22}
                  color={category.color}
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.is_default && (
                  <Text style={styles.defaultBadge}>Default</Text>
                )}
              </View>
              {!category.is_default && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCategory(category)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={22} color="#4ECDC4" />
          <Text style={styles.addButtonText}>Add New Category</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Category Modal */}
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
              <Text style={styles.modalTitle}>Add Category</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={styles.previewSection}>
              <View
                style={[
                  styles.previewIcon,
                  { backgroundColor: selectedColor + '20' },
                ]}
              >
                <Ionicons name={selectedIcon as any} size={32} color={selectedColor} />
              </View>
              <Text style={styles.previewName}>{newName || 'Category Name'}</Text>
            </View>

            {/* Name Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter category name"
                placeholderTextColor="#666"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.iconGrid}>
                  {AVAILABLE_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        selectedIcon === icon && {
                          backgroundColor: selectedColor + '30',
                          borderColor: selectedColor,
                        },
                      ]}
                      onPress={() => setSelectedIcon(icon)}
                    >
                      <Ionicons
                        name={icon as any}
                        size={20}
                        color={selectedIcon === icon ? selectedColor : '#888'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Color Selection */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddCategory}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Add Category</Text>
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
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addHeaderButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  section: { marginHorizontal: 16, marginTop: 8 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d2d44', borderRadius: 12, padding: 14, marginBottom: 8 },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoryInfo: { flex: 1, marginLeft: 12 },
  categoryName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  defaultBadge: { color: '#888', fontSize: 11, marginTop: 2 },
  deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 107, 107, 0.1)', justifyContent: 'center', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#4ECDC4', borderStyle: 'dashed', gap: 8 },
  addButtonText: { color: '#4ECDC4', fontSize: 14, fontWeight: '600' },
  bottomPadding: { height: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  previewSection: { alignItems: 'center', marginBottom: 24, paddingVertical: 16, backgroundColor: '#2d2d44', borderRadius: 12 },
  previewIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  previewName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  inputSection: { marginBottom: 20 },
  inputLabel: { color: '#888', fontSize: 14, marginBottom: 8 },
  textInput: { backgroundColor: '#2d2d44', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16 },
  iconGrid: { flexDirection: 'row', gap: 8 },
  iconOption: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff' },
  saveButton: { flexDirection: 'row', backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
