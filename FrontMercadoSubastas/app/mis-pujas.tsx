import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { SessionStore } from '@/store/session';

type Compra = {
  registroId: number;
  subastaId: number;
  productoId: number;
  titulo: string;
  importe: number;
  comision: number;
  costoEnvio: number;
  total: number;
  pagado: 'no' | 'pendiente' | 'si' | 'vencido';
  metodoEnvio: string | null;
  fechaLimitePago: string | null;
  imagen: string | null;
};

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  no:        { label: 'Pendiente de pago',  bg: '#FFF3E0', color: '#E65100' },
  pendiente: { label: 'Pago en revisión',   bg: '#E3F2FD', color: '#1565C0' },
  si:        { label: 'Pagado',             bg: '#E8F5E9', color: '#2E7D32' },
  vencido:   { label: 'Vencido',            bg: '#FCE4EC', color: '#C62828' },
};

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MisPujasScreen() {
  const router = useRouter();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCompras = useCallback(async () => {
    const session = SessionStore.get();
    if (!session) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.misComprasCliente(session.identificador));
      if (!res.ok) {
        setError('No se pudieron cargar tus compras.');
        return;
      }
      setCompras(await res.json());
    } catch {
      setError('Error de conexión. Verificá tu internet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchCompras(); }, [fetchCompras]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.pageTitle}>Mis Pujas</Text>

      {loading && <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />}
      {!!error && !loading && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {compras.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="gavel" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Sin items ganados</Text>
              <Text style={styles.emptySubtitle}>
                Los ítems que ganes en subastas aparecerán aquí.
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.replace('/exploracion')}
                activeOpacity={0.85}
              >
                <Text style={styles.exploreButtonText}>Explorar subastas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            compras.map((compra) => {
              const estado = ESTADO_CONFIG[compra.pagado] ?? ESTADO_CONFIG.no;
              return (
                <View key={compra.registroId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{compra.titulo}</Text>
                      <Text style={styles.cardSubtitle}>Subasta #{compra.subastaId}</Text>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
                      <Text style={[styles.estadoText, { color: estado.color }]}>{estado.label}</Text>
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Importe</Text>
                      <Text style={styles.priceValue}>{formatCurrency(compra.importe)}</Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Comisión</Text>
                      <Text style={styles.priceValue}>{formatCurrency(compra.comision)}</Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Total</Text>
                      <Text style={[styles.priceValue, styles.priceTotal]}>{formatCurrency(compra.total)}</Text>
                    </View>
                  </View>

                  {compra.metodoEnvio && (
                    <View style={styles.envioRow}>
                      <MaterialCommunityIcons
                        name={compra.metodoEnvio === 'domicilio' ? 'truck-outline' : 'store-outline'}
                        size={14}
                        color="#666"
                      />
                      <Text style={styles.envioText}>
                        {compra.metodoEnvio === 'domicilio' ? 'Envío a domicilio' : 'Retiro en depósito'}
                      </Text>
                    </View>
                  )}

                  {compra.fechaLimitePago && compra.pagado === 'pendiente' && (
                    <Text style={styles.deadlineText}>
                      Límite de pago: {new Date(compra.fechaLimitePago).toLocaleDateString('es-AR')}
                    </Text>
                  )}

                  {compra.pagado === 'no' && (
                    <TouchableOpacity
                      style={styles.pagarButton}
                      onPress={() => router.push({
                        pathname: '/cierre-subasta/winner',
                        params: {
                          subastaId: String(compra.subastaId),
                          clienteId: String(SessionStore.get()?.identificador ?? ''),
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
    paddingBottom: 8,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', lineHeight: 22 },
  cardSubtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  estadoBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  estadoText: { fontSize: 11, fontWeight: '700' },

  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: '#999', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  priceValue: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  priceTotal: { color: '#8A6D3B', fontWeight: '800' },

  envioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  envioText: { fontSize: 12, color: '#666' },

  deadlineText: { fontSize: 11, color: '#1565C0', marginBottom: 8 },

  pagarButton: {
    marginTop: 8,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagarButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
