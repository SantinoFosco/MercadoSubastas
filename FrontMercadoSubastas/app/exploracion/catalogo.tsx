import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductoCatalogo = {
  productoId: number;
  titulo: string;
  descripcionCorta: string;
  precioBase: number;
  subastado: 'si' | 'no';
  imagen: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CatalogoScreen() {
  const router = useRouter();
  const { subastaId, enVivo } = useLocalSearchParams<{ subastaId: string; enVivo: string }>();
  const isEnVivo = enVivo === 'true';

  const [lots, setLots] = useState<ProductoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCatalogo = useCallback(async () => {
    if (!subastaId) {
      setError('No se especificó la subasta.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.catalogoSubasta(subastaId));
      if (!res.ok) {
        setError('No se encontró el catálogo de esta subasta.');
        return;
      }
      const json: ProductoCatalogo[] = await res.json();
      setLots(json);
    } catch {
      setError('No se pudo cargar el catálogo. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [subastaId]);

  useEffect(() => { fetchCatalogo(); }, [fetchCatalogo]);

  const renderLotCard = (lot: ProductoCatalogo, index: number, isLast: boolean) => (
    <View key={lot.productoId} style={[styles.lotCard, !isLast && styles.lotCardSpacing]}>
      {/* Lot badge */}
      <View style={styles.lotBadgeRow}>
        <Text style={styles.lotBadge}>LOTE #{index + 1}</Text>
        {lot.subastado === 'si' && (
          <View style={styles.adjudicadoBadge}>
            <Text style={styles.adjudicadoText}>ADJUDICADO</Text>
          </View>
        )}
      </View>

      {/* Product image */}
      {lot.imagen ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${lot.imagen}` }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialCommunityIcons name="image-outline" size={64} color="#C0C0C0" />
        </View>
      )}

      {/* Product name */}
      <Text style={styles.productName}>{lot.titulo.toUpperCase()}</Text>

      {/* Description */}
      <Text style={styles.productDescription}>{lot.descripcionCorta}</Text>

      {/* Price */}
      <View style={styles.priceRow}>
        <View style={styles.priceColumn}>
          <Text style={styles.priceLabel}>PRECIO BASE</Text>
          <Text style={styles.priceValue}>{formatCurrency(lot.precioBase)}</Text>
        </View>
      </View>

      {/* Details button */}
      <TouchableOpacity
        style={[styles.detailsButton, lot.subastado === 'si' && styles.detailsButtonDisabled]}
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/exploracion/detalle-lote',
          params: { subastaId: subastaId ?? '', productoId: String(lot.productoId) },
        })}
      >
        <Text style={styles.detailsButtonText}>VER DETALLES</Text>
      </TouchableOpacity>

      {!isLast && <View style={styles.divider} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />
      )}

      {!!error && !loading && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Botón En Vivo ───────────────────────────────────────── */}
          {isEnVivo && (
            <TouchableOpacity
              style={styles.liveButton}
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: '/exploracion/subasta-vivo',
                params: { subastaId: subastaId ?? '' },
              })}
            >
              <View style={styles.liveButtonDot} />
              <MaterialCommunityIcons name="broadcast" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.liveButtonText}>ENTRAR EN VIVO · PUJAR AHORA</Text>
            </TouchableOpacity>
          )}

          {lots.length === 0 ? (
            <Text style={styles.emptyText}>Este catálogo no tiene productos aún.</Text>
          ) : (
            lots.map((lot, index) => renderLotCard(lot, index, index === lots.length - 1))
          )}
        </ScrollView>
      )}

      <BottomTabBar
        activeTab="explorar"
        onTabPress={(tab) => router.push(`/${tab}` as any)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  errorText: {
    textAlign: 'center',
    color: '#D32F2F',
    marginTop: 40,
    fontSize: 14,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    marginTop: 40,
    fontSize: 14,
    fontStyle: 'italic',
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
  },
  lotCardSpacing: {
    marginBottom: 40,
  },
  lotBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lotBadge: {
    fontSize: 11,
    color: '#999999',
    letterSpacing: 1,
    fontWeight: '600',
  },
  adjudicadoBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adjudicadoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#388E3C',
    letterSpacing: 0.5,
  },
  productImage: {
    height: 220,
    borderRadius: 12,
    marginBottom: 18,
  },
  imagePlaceholder: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  priceColumn: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailsButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonDisabled: {
    opacity: 0.5,
  },
  detailsButtonText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 24,
    marginHorizontal: -20,
  },

  // ── Botón En Vivo ──
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  liveButtonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    opacity: 0.9,
  },
  liveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
