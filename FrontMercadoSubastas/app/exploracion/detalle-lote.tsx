import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type DetalleProducto = {
  productoId: number;
  titulo: string;
  descripcion: string;
  precioBase: number;
  subastado: 'si' | 'no';
  imagen: string | null;
};

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DetalleLoteScreen() {
  const router = useRouter();
  const { subastaId, productoId } = useLocalSearchParams<{ subastaId: string; productoId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('detalles');
  const [producto, setProducto] = useState<DetalleProducto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetalle = useCallback(async () => {
    if (!subastaId || !productoId) {
      setError('Información insuficiente para cargar el detalle.');
      setLoading(false);
      return;
    }
    setLoading(false);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.detalleProducto(subastaId, productoId));
      if (!res.ok) {
        setError('No se encontró el producto en este catálogo.');
        return;
      }
      const json: DetalleProducto = await res.json();
      setProducto(json);
    } catch {
      setError('No se pudo cargar el detalle. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [subastaId, productoId]);

  useEffect(() => { fetchDetalle(); }, [fetchDetalle]);

  const renderTabContent = () => {
    if (!producto) return null;

    if (activeTab === 'detalles') {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descriptionText}>{producto.descripcion}</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>PRECIO BASE</Text>
              <Text style={styles.specValue}>{formatCurrency(producto.precioBase)}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>ESTADO</Text>
              <Text style={styles.specValue}>
                {producto.subastado === 'si' ? 'Adjudicado' : 'Disponible'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

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

      {loading && (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 80 }} />
      )}

      {!!error && !loading && (
        <View style={styles.errorContainer}>
          <SafeAreaView edges={['top']} style={styles.backButtonSafeArea}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </SafeAreaView>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && producto && (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Product Image ─────────────────────────────────────── */}
          <View style={styles.imageContainer}>
            <SafeAreaView edges={['top']} style={styles.backButtonSafeArea}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </SafeAreaView>

            {producto.imagen ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${producto.imagen}` }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialCommunityIcons name="image-outline" size={120} color="#CCCCCC" />
            )}
          </View>

          {/* ── Lot Info Header ───────────────────────────────────── */}
          <View style={styles.infoHeader}>
            <Text style={styles.lotLabel}>
              LOTE #{producto.productoId}
            </Text>
            <Text style={styles.productName}>{producto.titulo}</Text>
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
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
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
      )}

      <BottomTabBar activeTab="explorar" />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    color: '#D32F2F',
    marginTop: 40,
    fontSize: 14,
    paddingHorizontal: 24,
  },

  // ── Image ──
  imageContainer: {
    height: 300,
    width: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
