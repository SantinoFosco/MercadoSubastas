import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductoCatalogo = {
  productoId: number;
  titulo: string;
  descripcionCorta: string;
  precioBase: number;
  subastado: 'si' | 'no';
  imagen: string | null;
};

type SubastaInfo = {
  fecha: Date | null;
  categoria: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`;
}

const CATEGORIA_ORDER: Record<string, number> = {
  comun: 0, especial: 1, plata: 2, oro: 3, platino: 4,
};

function puedeAcceder(categoriaSubasta: string | null, categoriaUsuario: string | undefined): boolean {
  if (!categoriaSubasta || !categoriaUsuario) return false;
  return (CATEGORIA_ORDER[categoriaUsuario] ?? 0) >= (CATEGORIA_ORDER[categoriaSubasta] ?? 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CatalogoScreen() {
  const router = useRouter();
  const { subastaId, enVivo: enVivoParam } = useLocalSearchParams<{ subastaId: string; enVivo: string }>();
  const { session } = useSession();
  const isLoggedIn = !!session;

  const [lots, setLots] = useState<ProductoCatalogo[]>([]);
  const [isEnVivo, setIsEnVivo] = useState(enVivoParam === 'true');
  const [subastaInfo, setSubastaInfo] = useState<SubastaInfo>({ fecha: null, categoria: null });
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
      const [catalogoRes, infoRes] = await Promise.all([
        fetch(API_ENDPOINTS.catalogoSubasta(subastaId)),
        fetch(API_ENDPOINTS.subastaInfo(subastaId)),
      ]);

      if (!catalogoRes.ok) {
        setError('No se encontró el catálogo de esta subasta.');
        return;
      }

      const json: ProductoCatalogo[] = await catalogoRes.json();
      setLots(json);

      if (infoRes.ok) {
        const info = await infoRes.json();
        setIsEnVivo(info.enVivo === true);
        setSubastaInfo({ fecha: new Date(info.fecha), categoria: info.categoria });
      }
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

      {/* Price — solo visible para usuarios registrados (enunciado línea 35) */}
      <View style={styles.priceRow}>
        <View style={styles.priceColumn}>
          <Text style={styles.priceLabel}>PRECIO BASE</Text>
          {isLoggedIn ? (
            <Text style={styles.priceValue}>{formatCurrency(lot.precioBase)}</Text>
          ) : (
            <Text style={styles.priceHidden}>Iniciá sesión para ver el precio</Text>
          )}
        </View>
      </View>

      {/* Details button */}
      <TouchableOpacity
        style={[styles.detailsButton, lot.subastado === 'si' && styles.detailsButtonDisabled]}
        disabled={lot.subastado === 'si'}
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
          {/* ── Información de la subasta ───────────────────────────── */}
          {subastaInfo.fecha && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-outline" size={16} color="#8A6D3B" />
                <Text style={styles.infoText}>
                  {subastaInfo.fecha.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#8A6D3B" />
                <Text style={styles.infoText}>
                  {subastaInfo.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="package-variant-closed" size={16} color="#8A6D3B" />
                <Text style={styles.infoText}>{lots.length} {lots.length === 1 ? 'ítem' : 'ítems'} en catálogo</Text>
              </View>
              {subastaInfo.categoria && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="star-outline" size={16} color="#8A6D3B" />
                  <Text style={styles.infoText}>Categoría: {subastaInfo.categoria.charAt(0).toUpperCase() + subastaInfo.categoria.slice(1)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Botón En Vivo ───────────────────────────────────────── */}
          {isEnVivo && (() => {
            if (!isLoggedIn) {
              return (
                <TouchableOpacity style={styles.liveButtonGuest} activeOpacity={0.85} onPress={() => router.push('/sign-in')}>
                  <MaterialCommunityIcons name="lock-outline" size={18} color="#8A6D3B" style={{ marginRight: 8 }} />
                  <Text style={styles.liveButtonGuestText}>INICIÁ SESIÓN PARA PARTICIPAR EN VIVO</Text>
                </TouchableOpacity>
              );
            }
            if (!puedeAcceder(subastaInfo.categoria, session?.categoria)) {
              const cat = subastaInfo.categoria ?? '';
              return (
                <View style={styles.liveButtonLocked}>
                  <MaterialCommunityIcons name="lock-outline" size={18} color="#8A6D3B" style={{ marginRight: 8 }} />
                  <Text style={styles.liveButtonLockedText}>
                    NECESITÁS CATEGORÍA {cat.toUpperCase()} PARA PARTICIPAR
                  </Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                style={styles.liveButton}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/exploracion/subasta-vivo', params: { subastaId: subastaId ?? '' } })}
              >
                <View style={styles.liveButtonDot} />
                <MaterialCommunityIcons name="broadcast" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.liveButtonText}>ENTRAR EN VIVO · PUJAR AHORA</Text>
              </TouchableOpacity>
            );
          })()}

          {lots.length === 0 ? (
            <Text style={styles.emptyText}>Este catálogo no tiene productos aún.</Text>
          ) : (
            lots.map((lot, index) => renderLotCard(lot, index, index === lots.length - 1))
          )}
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

  // ── Info Card ──
  infoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#614F3A',
    flex: 1,
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
  liveButtonGuest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  liveButtonGuestText: {
    color: '#8A6D3B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveButtonLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  liveButtonLockedText: {
    color: '#8A6D3B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  priceHidden: {
    fontSize: 13,
    color: '#8A6D3B',
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
