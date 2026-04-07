import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ParsedTransaction {
  amount: number;
  transaction_type: string;
  description: string;
  transaction_date?: string;
  is_duplicate: boolean;
  suggested_category_id: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
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

export default function UploadPDFScreen() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const getCategoryById = (id: string): Category => {
    return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[7];
  };

  const formatCurrency = (amount: number) => {
    return `\u20b9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setFileName(file.name);
      setUploading(true);
      setTransactions([]);
      setSelectedTransactions(new Set());

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      } as any);

      const response = await fetch(`${BACKEND_URL}/api/upload-pdf`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        
        // Auto-select non-duplicates
        const nonDuplicates = new Set<number>();
        data.transactions?.forEach((t: ParsedTransaction, idx: number) => {
          if (!t.is_duplicate) nonDuplicates.add(idx);
        });
        setSelectedTransactions(nonDuplicates);

        if (data.transactions?.length === 0) {
          Alert.alert('No Transactions', 'Could not extract any transactions from this PDF');
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to parse PDF');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const toggleTransaction = (index: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTransactions(newSelected);
  };

  const handleImportSelected = async () => {
    if (selectedTransactions.size === 0) {
      Alert.alert('Error', 'Please select at least one transaction to import');
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      for (const index of selectedTransactions) {
        const trans = transactions[index];
        
        const response = await fetch(`${BACKEND_URL}/api/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: trans.amount,
            category_id: trans.suggested_category_id,
            description: trans.description,
            transaction_type: trans.transaction_type,
            source: 'pdf',
            transaction_date: trans.transaction_date,
          }),
        });

        if (response.ok) successCount++;
      }

      Alert.alert(
        'Import Complete',
        `Successfully imported ${successCount} of ${selectedTransactions.size} transactions`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import some transactions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload PDF</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <View style={styles.uploadIcon}>
            <Ionicons name="document-text" size={48} color="#DDA0DD" />
          </View>
          <Text style={styles.uploadTitle}>Upload Bank Statement</Text>
          <Text style={styles.uploadSubtitle}>
            Upload your bank statement PDF to automatically extract transactions
          </Text>

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handlePickDocument}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={22} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  {fileName ? 'Upload Another PDF' : 'Select PDF File'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {fileName && (
            <View style={styles.fileInfo}>
              <Ionicons name="document" size={16} color="#4ECDC4" />
              <Text style={styles.fileName}>{fileName}</Text>
            </View>
          )}
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#45B7D1" />
          <Text style={styles.infoText}>
            Supported formats: Bank statement PDFs with transaction tables. 
            Duplicate transactions are automatically detected.
          </Text>
        </View>

        {/* Transactions List */}
        {transactions.length > 0 && (
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Found {transactions.length} Transactions
              </Text>
              <Text style={styles.selectedCount}>
                {selectedTransactions.size} selected
              </Text>
            </View>

            {transactions.map((trans, index) => {
              const category = getCategoryById(trans.suggested_category_id);
              const isSelected = selectedTransactions.has(index);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.transactionItem,
                    trans.is_duplicate && styles.transactionDuplicate,
                    isSelected && styles.transactionSelected,
                  ]}
                  onPress={() => toggleTransaction(index)}
                >
                  <View style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxChecked,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: category.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={18}
                      color={category.color}
                    />
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription} numberOfLines={2}>
                      {trans.description}
                    </Text>
                    <View style={styles.transactionMeta}>
                      {trans.transaction_date && (
                        <Text style={styles.transactionDate}>
                          {trans.transaction_date}
                        </Text>
                      )}
                      {trans.is_duplicate && (
                        <View style={styles.duplicateBadge}>
                          <Text style={styles.duplicateText}>Duplicate</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          trans.transaction_type === 'credit'
                            ? '#2ECC71'
                            : '#FF6B6B',
                      },
                    ]}
                  >
                    {trans.transaction_type === 'credit' ? '+' : '-'}
                    {formatCurrency(trans.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.importButton,
                (saving || selectedTransactions.size === 0) &&
                  styles.importButtonDisabled,
              ]}
              onPress={handleImportSelected}
              disabled={saving || selectedTransactions.size === 0}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#fff" />
                  <Text style={styles.importButtonText}>
                    Import {selectedTransactions.size} Transactions
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 44 },
  scrollView: { flex: 1 },
  uploadSection: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#2d2d44', borderRadius: 16, padding: 24, alignItems: 'center' },
  uploadIcon: { marginBottom: 16 },
  uploadTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  uploadSubtitle: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  uploadButton: { flexDirection: 'row', backgroundColor: '#DDA0DD', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', gap: 8 },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 6 },
  fileName: { color: '#4ECDC4', fontSize: 13 },
  infoBanner: { flexDirection: 'row', backgroundColor: 'rgba(69, 183, 209, 0.1)', marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 12, alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, color: '#888', fontSize: 12, lineHeight: 18 },
  transactionsSection: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  selectedCount: { color: '#4ECDC4', fontSize: 13 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d2d44', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  transactionDuplicate: { opacity: 0.6 },
  transactionSelected: { borderColor: '#4ECDC4' },
  checkboxContainer: { marginRight: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' },
  transactionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  transactionDetails: { flex: 1, marginLeft: 10 },
  transactionDescription: { color: '#fff', fontSize: 12, fontWeight: '500' },
  transactionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  transactionDate: { color: '#888', fontSize: 11 },
  duplicateBadge: { backgroundColor: 'rgba(255, 107, 107, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  duplicateText: { color: '#FF6B6B', fontSize: 10, fontWeight: '600' },
  transactionAmount: { fontSize: 13, fontWeight: '600' },
  importButton: { flexDirection: 'row', backgroundColor: '#2ECC71', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bottomPadding: { height: 32 },
});
