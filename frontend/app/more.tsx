import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function MoreScreen() {
  const router = useRouter();

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

  const menuItems = [
    {
      title: 'SMS Features',
      items: [
        {
          icon: 'flash',
          iconColor: '#4ECDC4',
          label: 'Auto-Detect SMS',
          description: 'Automatically detect expenses from SMS',
          onPress: () => router.push('/auto-detect'),
        },
        {
          icon: 'chatbox-ellipses',
          iconColor: '#45B7D1',
          label: 'Scan SMS',
          description: 'Manually scan and parse SMS',
          onPress: () => router.push('/scan-sms'),
        },
      ],
    },
    {
      title: 'Import & Export',
      items: [
        {
          icon: 'document-text',
          iconColor: '#DDA0DD',
          label: 'Upload PDF Statement',
          description: 'Import transactions from bank PDF',
          onPress: () => router.push('/upload-pdf'),
        },
        {
          icon: 'download',
          iconColor: '#2ECC71',
          label: 'Export to Excel',
          description: 'Download complete report',
          onPress: handleExportExcel,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          icon: 'pricetags',
          iconColor: '#FF6B6B',
          label: 'Manage Categories',
          description: 'Add or remove expense categories',
          onPress: () => router.push('/categories'),
        },
        {
          icon: 'key',
          iconColor: '#F39C12',
          label: 'Keyword Rules',
          description: 'Auto-categorization settings',
          onPress: () => router.push('/settings'),
        },
      ],
    },
    {
      title: 'History',
      items: [
        {
          icon: 'list',
          iconColor: '#95A5A6',
          label: 'All Transactions',
          description: 'View complete transaction history',
          onPress: () => router.push('/expenses'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex === section.items.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={item.onPress}
                >
                  <View
                    style={[
                      styles.menuIcon,
                      { backgroundColor: item.iconColor + '20' },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.iconColor}
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: '#2d2d44',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  menuDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  bottomPadding: {
    height: 32,
  },
});
