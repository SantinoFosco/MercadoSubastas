import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

type Multa = {
  identificador: number;
  cliente: number;
  subasta: number;
  monto: number;
  pagado: string;
  fecha_limite: string | null;
};

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MultasScreen() {
  const router = useRouter();
  const { session } = useSession();
  const clienteId = session?.identificador;
  const [multas, setMultas] = useState<Multa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagando, setPagando] = useState<number | null>(null);

  const fetchMultas = useCallback(async () => {
    if (!clienteId) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.multasCliente(clienteId));
      if (!res.ok) {
        setError('No se pudieron cargar las multas.');
        return;
      }
      setMultas(await res.json());
    } catch {
      setError('Error de conexión. Verificá tu internet.');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useFocusEffect(useCallback(() => { fetchMultas(); }, [fetchMultas]));

  const handlePagar = async (multa: Multa) => {
    if (!clienteId) return;
    Alert.alert(
      'Pagar multa',
      `¿Confirmás el pago de ${formatCurrency(multa.monto)} de la multa de la subasta #${multa.subasta}?\n\nUna vez confirmado, podrás volver a participar en subastas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar pago',
          style: 'default',
          onPress: async () => {
            setPagando(multa.identificador);
            try {
              const res = await fetch(
                API_ENDPOINTS.pagarMulta(multa.identificador, clienteId),
                { method: 'POST' },
              );
              if (res.ok) {
                Alert.alert('Multa pagada', 'Ya podés participar en subastas nuevamente.');
                fetchMultas();
              } else {
                const data = await res.json();
                Alert.alert('Error', data.detail ?? 'No se pudo procesar el pago.');
              }
            } catch {
              Alert.alert('Error', 'Error de conexión. Intentá nuevamente.');
            } finally {
              setPagando(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multas pendientes</Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />}
      {!!error && !loading && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {multas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color="#4CAF50" />
              <Text style={styles.emptyTitle}>Sin multas pendientes</Text>
              <Text style={styles.emptySubtitle}>No tenés multas activas en este momento.</Text>
            </View>
          ) : (
            <>
              <View style={styles.alertBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#D32F2F" />
                <Text style={styles.alertText}>
                  Debés abonar todas las multas antes de poder volver a pujar en subastas.
                </Text>
              </View>

              {multas.map((multa) => (
                <View key={multa.identificador} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="gavel" size={24} color="#D32F2F" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Multa — Subasta #{multa.subasta}</Text>
                      {multa.fecha_limite && (
                        <Text style={styles.deadlineText}>
                          Vence: {new Date(multa.fecha_limite).toLocaleDateString('es-AR')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.montoText}>{formatCurrency(multa.monto)}</Text>
                  </View>

                  <Text style={styles.infoText}>
                    Esta multa corresponde al 10% del importe de los ítems ganados que no fueron abonados en término.
                  </Text>

                  <TouchableOpacity
                    style={[styles.pagarButton, pagando === multa.identificador && styles.pagarButtonDisabled]}
                    onPress={() => handlePagar(multa)}
                    disabled={pagando === multa.identificador}
                    activeOpacity={0.85}
                  >
                    {pagando === multa.identificador ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.pagarButtonText}>Pagar multa</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <BottomTabBar activeTab="perfil" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
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

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 14,
    marginBottom: 4,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#C62828',
    lineHeight: 18,
    fontWeight: '500',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  deadlineText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 2,
    fontWeight: '500',
  },
  montoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D32F2F',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },

  pagarButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagarButtonDisabled: {
    opacity: 0.6,
  },
  pagarButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
