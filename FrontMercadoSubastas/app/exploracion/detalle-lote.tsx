import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

// ── Mock Data ──────────────────────────────────────────────────────────────────

const LOT_DATA = {
  loteNumber: '442',
  collection: 'COLECCIÓN PRIVADA',
  name: 'Patek Philippe\nCalatrava',
  reference: 'Ref. 5196R Rose Gold',
  description:
    'Un ejemplo excepcional del Patek Philippe Calatrava, esta Ref. 5196R captura la esencia más pura del reloj de pulsera circular. Inspirado en los principios minimalistas de la Bauhaus, la caja de oro rosa alberga el legendario movimiento de cuerda manual calibre 215 PS. La esfera de color blanco opalino presenta marcadores de hora de oro aplicados y un subdial de segundos pequeño a las 6 en punto, manteniendo la simetría perfecta que ha definido la colección desde 1932.',
  specs: [
    { label: 'MOVIMIENTO', value: 'Caliber 215 PS' },
    { label: 'MATERIAL DE LA CAJA', value: '18k Rose Gold' },
    { label: 'DIÁMETRO', value: '37 mm' },
    { label: 'AÑO', value: 'Circa 2018' },
  ],
};

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'detalles' | 'procedencia' | 'estado';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'detalles', label: 'DETALLES' },
  { id: 'procedencia', label: 'PROCEDENCIA' },
  { id: 'estado', label: 'ESTADO' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function DetalleLoteScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('detalles');

  const renderTabContent = () => {
    if (activeTab === 'detalles') {
      return (
        <View style={styles.tabContent}>
          {/* Description */}
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descriptionText}>{LOT_DATA.description}</Text>

          {/* Specs Grid */}
          <View style={styles.specsGrid}>
            {LOT_DATA.specs.map((spec, index) => (
              <View key={index} style={styles.specBox}>
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Placeholder for other tabs
    return (
      <View style={styles.tabContent}>
        <Text style={styles.placeholderText}>
          {activeTab === 'procedencia'
            ? 'Información de procedencia próximamente disponible.'
            : 'Informe de estado próximamente disponible.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Product Image ─────────────────────────────────────── */}
        <View style={styles.imageContainer}>
          {/* Back Button (overlaid on image) */}
          <SafeAreaView edges={['top']} style={styles.backButtonSafeArea}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#1A1A1A"
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Placeholder Icon */}
          <MaterialCommunityIcons name="watch" size={120} color="#CCCCCC" />
        </View>

        {/* ── Lot Info Header ───────────────────────────────────── */}
        <View style={styles.infoHeader}>
          <Text style={styles.lotLabel}>
            LOTE {LOT_DATA.loteNumber} • {LOT_DATA.collection}
          </Text>
          <Text style={styles.productName}>{LOT_DATA.name}</Text>
          <Text style={styles.reference}>{LOT_DATA.reference}</Text>
        </View>

        {/* ── Tab Bar ───────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ───────────────────────────────────────── */}
        {renderTabContent()}
      </ScrollView>

      {/* ── Bottom Tab Bar ──────────────────────────────────────── */}
      <BottomTabBar activeTab="explorar" />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  scrollView: {
    flex: 1,
  },

  // ── Image ──
  imageContainer: {
    height: 300,
    width: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backButtonSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Lot Info ──
  infoHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  lotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6D3B',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  productName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 34,
    marginBottom: 8,
  },
  reference: {
    fontSize: 14,
    color: '#666666',
  },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop: 4,
  },
  tabItem: {
    marginRight: 28,
    paddingBottom: 14,
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999999',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 1.5,
  },

  // ── Tab Content ──
  tabContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 28,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // ── Specs Grid ──
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specBox: {
    width: '47%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 6,
  },
});
