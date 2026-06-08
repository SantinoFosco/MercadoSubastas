import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

type HistorialItem = {
  titulo: string;
  fecha: string;
  importe: number;
  ganada: boolean;
};

type Estadisticas = {
  subastasTotales: number;
  pujasGanadas: number;
  totalInvertido: number;
  historial: HistorialItem[];
};

function formatFecha(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonto(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function EstadisticasScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      if (!session) {
        router.replace('/sign-in');
        return;
      }
      try {
        const res = await fetch(API_ENDPOINTS.estadisticasCliente(session.identificador));
        if (!res.ok) throw new Error();
        const data = await res.json();
        setStats(data);
      } catch {
        setError('No se pudieron cargar las estadísticas.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [session]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
        <Image
          source={require('../../assets/images/hammer-icon.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.headerLabel}>Estadísticas</Text>
          <Text style={styles.headerTitle}>Mis Estadísticas</Text>
          <Text style={styles.headerSubtitle}>Resumen general de tu actividad</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : stats ? (
          <>
            {/* Participación */}
            <View style={styles.participationCard}>
              <View style={styles.participationTopRow}>
                <View style={styles.goldIconContainer}>
                  <MaterialCommunityIcons name="account-group-outline" size={22} color="#8A6D3B" />
                </View>
                <View style={styles.growthBadge}>
                  <Text style={styles.growthBadgeText}>{stats.pujasGanadas} ganadas</Text>
                </View>
              </View>
              <Text style={styles.participationLabel}>PARTICIPACIÓN</Text>
              <Text style={styles.participationValue}>{stats.subastasTotales}</Text>
              <Text style={styles.participationSubtext}>Subastas totales</Text>
            </View>

            {/* Total Invertido */}
            <View style={styles.heroCard}>
              <View style={styles.heroGlowTopLeft} />
              <View style={styles.heroGlowBottomRight} />
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconContainer}>
                  <MaterialCommunityIcons name="wallet-outline" size={22} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.heroLabel}>TOTAL INVERTIDO</Text>
              <Text style={styles.heroValue}>{formatMonto(stats.totalInvertido)}</Text>
              <Text style={styles.heroSubLabel}>MONTO TOTAL LIQUIDADO</Text>
            </View>

            {/* Historial */}
            <View style={styles.historialHeader}>
              <Text style={styles.historialTitle}>Historial</Text>
            </View>

            {stats.historial.length === 0 ? (
              <Text style={styles.emptyText}>Sin actividad registrada.</Text>
            ) : (
              stats.historial.map((item) => (
                <View key={`${item.titulo}-${item.fecha}`} style={styles.historyCard}>
                  <View style={styles.historyImage}>
                    <MaterialCommunityIcons name="gavel" size={28} color="#CCCCCC" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName} numberOfLines={1}>{item.titulo}</Text>
                    <Text style={styles.historyMeta}>{formatFecha(item.fecha)}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyPrice}>{formatMonto(item.importe)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.ganada ? '#E8F5E9' : '#FFF8E1' }]}>
                      <Text style={[styles.statusBadgeText, { color: item.ganada ? '#2E7D32' : '#F57F17' }]}>
                        {item.ganada ? 'GANADA' : 'SUPERADO'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      <BottomTabBar
        activeTab="perfil"
        onTabPress={(tab) => {
          if (tab === 'explorar') router.push('/exploracion');
          else if (tab === 'vender') router.push('/vender');
          else if (tab === 'perfil') router.push('/perfil');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },

  appbar: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 0,
  },
  logoBadge: { width: 50, height: 35 },

  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },

  headerSection: { marginBottom: 24 },
  headerLabel: { fontSize: 14, fontWeight: '600', color: '#999999', letterSpacing: 0.5 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginTop: 6 },
  headerSubtitle: { fontSize: 14, color: '#666666', marginTop: 6 },

  errorText: { fontSize: 14, color: '#D32F2F', textAlign: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 16 },

  participationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
  },
  participationTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goldIconContainer: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center',
  },
  growthBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  growthBadgeText: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  participationLabel: { fontSize: 11, fontWeight: '700', color: '#999999', letterSpacing: 1, marginTop: 16 },
  participationValue: { fontSize: 42, fontWeight: '800', color: '#1A1A1A', marginTop: 4 },
  participationSubtext: { fontSize: 14, color: '#666666', marginTop: 4 },

  heroCard: {
    backgroundColor: '#D4A912', borderRadius: 16, overflow: 'hidden',
    position: 'relative', padding: 24, marginTop: 20,
  },
  heroGlowTopLeft: {
    position: 'absolute', top: -20, left: -20,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,215,0,0.4)',
  },
  heroGlowBottomRight: {
    position: 'absolute', bottom: -30, right: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,215,0,0.25)',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIconContainer: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5, marginTop: 16 },
  heroValue: { fontSize: 38, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  heroSubLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginTop: 6 },

  historialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 16 },
  historialTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },

  historyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#F0F0F0', padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  historyImage: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
  },
  historyInfo: { flex: 1, marginLeft: 14 },
  historyName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  historyMeta: { fontSize: 12, color: '#999999', marginTop: 3 },
  historyRight: { alignItems: 'flex-end' },
  historyPrice: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});