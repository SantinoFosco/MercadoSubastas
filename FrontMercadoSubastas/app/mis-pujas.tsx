import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

type Puja = {
  subastaId: number;
  itemId: number;
  titulo: string;
  importe: number;
  ganador: 'si' | 'no';
  fechaHora: string;
  estadoPago: 'no' | 'pendiente' | 'si' | 'vencido' | null;
};

type Filtro = 'todas' | 'ganadas' | 'perdidas';

const PAGO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  no:        { label: 'Pendiente de pago', bg: '#FFF3E0', color: '#E65100' },
  pendiente: { label: 'Pago en revisión',  bg: '#E3F2FD', color: '#1565C0' },
  si:        { label: 'Pagado',            bg: '#E8F5E9', color: '#2E7D32' },
  vencido:   { label: 'Vencido',           bg: '#FCE4EC', color: '#C62828' },
};

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MisPujasScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const fetchPujas = useCallback(async () => {
    if (!session) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.misPujasCliente(session.identificador));
      if (!res.ok) {
        setError('No se pudieron cargar tus pujas.');
        return;
      }
      setPujas(await res.json());
    } catch {
      setError('Error de conexión. Verificá tu internet.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { fetchPujas(); }, [fetchPujas]));

  if (!session) return null;

  const pujasVisible = pujas.filter(p => {
    if (filtro === 'ganadas') return p.ganador === 'si';
    if (filtro === 'perdidas') return p.ganador === 'no';
    return true;
  });

  const totalGanadas = pujas.filter(p => p.ganador === 'si').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.pageTitle}>Mis Pujas</Text>

      {/* ── Filtro tabs ─────────────────────────────────────────── */}
      <View style={styles.filtroRow}>
        {(['todas', 'ganadas', 'perdidas'] as Filtro[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActive]}
            onPress={() => setFiltro(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filtroBtnText, filtro === f && styles.filtroBtnTextActive]}>
              {f === 'todas' ? 'Todas' : f === 'ganadas' ? `Ganadas (${totalGanadas})` : 'Perdidas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />}
      {!!error && !loading && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pujasVisible.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="gavel" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>
                {filtro === 'todas' ? 'Sin pujas registradas' :
                 filtro === 'ganadas' ? 'Ninguna puja ganada' : 'Ninguna puja perdida'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filtro === 'todas'
                  ? 'Cuando participes en una subasta, tus pujas aparecerán aquí.'
                  : 'Aún no tenés pujas en esta categoría.'}
              </Text>
              {filtro === 'todas' && (
                <TouchableOpacity
                  style={styles.exploreButton}
                  onPress={() => router.replace('/exploracion')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.exploreButtonText}>Explorar subastas</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            pujasVisible.map((puja, idx) => {
              const esGanada = puja.ganador === 'si';
              const pagoConfig = puja.estadoPago ? PAGO_CONFIG[puja.estadoPago] : null;
              return (
                <View key={`${puja.subastaId}-${puja.itemId}-${puja.fechaHora}`} style={[styles.card, esGanada && styles.cardGanada]}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{puja.titulo}</Text>
                      <Text style={styles.cardSubtitle}>Subasta #{puja.subastaId}</Text>
                    </View>
                    <View style={[
                      styles.resultBadge,
                      { backgroundColor: esGanada ? '#E8F5E9' : '#F5F5F5' }
                    ]}>
                      <MaterialCommunityIcons
                        name={esGanada ? 'trophy-outline' : 'close-circle-outline'}
                        size={13}
                        color={esGanada ? '#2E7D32' : '#999'}
                      />
                      <Text style={[
                        styles.resultBadgeText,
                        { color: esGanada ? '#2E7D32' : '#999' }
                      ]}>
                        {esGanada ? 'Ganada' : 'Perdida'}
                      </Text>
                    </View>
                  </View>

                  {/* Importe y fecha */}
                  <View style={styles.infoRow}>
                    <View>
                      <Text style={styles.priceLabel}>Monto pujado</Text>
                      <Text style={[styles.priceValue, esGanada && { color: '#8A6D3B' }]}>
                        {formatCurrency(puja.importe)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceLabel}>Fecha</Text>
                      <Text style={styles.dateValue}>{formatDate(puja.fechaHora)}</Text>
                    </View>
                  </View>

                  {/* Estado de pago (solo ganadas) */}
                  {esGanada && pagoConfig && (
                    <View style={[styles.estadoPagoBadge, { backgroundColor: pagoConfig.bg }]}>
                      <Text style={[styles.estadoPagoText, { color: pagoConfig.color }]}>
                        {pagoConfig.label}
                      </Text>
                    </View>
                  )}

                  {/* Botón pagar (solo ganadas sin pagar) */}
                  {esGanada && puja.estadoPago === 'no' && (
                    <TouchableOpacity
                      style={styles.pagarButton}
                      onPress={() => router.push({
                        pathname: '/cierre-subasta/winner',
                        params: {
                          subastaId: String(puja.subastaId),
                          clienteId: String(session?.identificador ?? ''),
                        },
                      })}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.pagarButtonText}>Completar pago</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomTabBar activeTab="mis-pujas" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Filtro tabs
  filtroRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filtroBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  filtroBtnActive: {
    backgroundColor: '#FFD700',
  },
  filtroBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  filtroBtnTextActive: {
    color: '#1A1A1A',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  errorText: { color: '#D32F2F', textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
  exploreButton: {
    marginTop: 8,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  exploreButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
  },
  cardGanada: {
    borderColor: '#C8E6C9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', lineHeight: 22 },
  cardSubtitle: { fontSize: 11, color: '#999', marginTop: 2 },

  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  resultBadgeText: { fontSize: 11, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceLabel: { fontSize: 10, color: '#999', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  priceValue: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  dateValue: { fontSize: 13, fontWeight: '500', color: '#666' },

  estadoPagoBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  estadoPagoText: { fontSize: 11, fontWeight: '700' },

  pagarButton: {
    marginTop: 4,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagarButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
