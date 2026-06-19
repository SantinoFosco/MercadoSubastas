import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

type ArticleStatus = 'en_revision' | 'aprobado' | 'rechazado_admin' | 'rechazado_usuario' | 'aceptado' | 'en_venta';
type FilterTab = 'todos' | 'aprobados' | 'en_revision' | 'rechazados';

type Article = {
  productoId: number;
  titulo: string;
  categoria: string;
  estadoInspeccion: ArticleStatus;
  observaciones: string | null;
  costoDevolucion: number | null;
  enSubasta: boolean;
  aceptacion: string | null;
};

const STATUS_LABEL: Record<ArticleStatus, string> = {
  en_revision:      'EN REVISIÓN',
  aprobado:         'APROBADO',
  rechazado_admin:  'RECHAZADO',
  rechazado_usuario:'RECHAZADO',
  aceptado:         'ACEPTADO',
  en_venta:         'EN VENTA',
};

const STATUS_BADGE: Record<ArticleStatus, { bg: string; text: string; border: string }> = {
  en_revision:      { bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' },
  aprobado:         { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
  rechazado_admin:  { bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' },
  rechazado_usuario:{ bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' },
  aceptado:         { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
  en_venta:         { bg: '#E8F5E9', text: '#1B5E20', border: '#A5D6A7' },
};

const STATUS_SUBTEXTO: Record<ArticleStatus, string> = {
  en_revision:      'Esperando dictamen',
  aprobado:         'Revisá las condiciones ofrecidas',
  rechazado_admin:  'Gestiona tu devolución del artículo',
  rechazado_usuario:'Gestiona tu devolución del artículo',
  aceptado:         'Artículo en espera de subasta',
  en_venta:         'Listado en subasta activa',
};

const STATUS_ICON: Record<ArticleStatus, string> = {
  en_revision:      'clock-outline',
  aprobado:         'check-circle-outline',
  rechazado_admin:  'alert-circle-outline',
  rechazado_usuario:'alert-circle-outline',
  aceptado:         'check-decagram-outline',
  en_venta:         'gavel',
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'aprobados',  label: 'Aprobados' },
  { key: 'en_revision',label: 'En Revisión' },
  { key: 'rechazados', label: 'Rechazados' },
];

function resolveStatus(item: { estadoInspeccion: string; enSubasta: boolean; aceptacion: string | null }): ArticleStatus {
  if (item.enSubasta) return 'en_venta';
  if (item.aceptacion === 'aceptado') return 'aceptado';
  if (item.estadoInspeccion === 'rechazado') return 'rechazado_admin';
  if (item.estadoInspeccion === 'aprobado' && item.aceptacion === 'rechazado') return 'rechazado_usuario';
  if (item.estadoInspeccion === 'aprobado') return 'aprobado';
  return 'en_revision';
}

export default function MisArticulosScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todos');
  const [direccionInspeccion, setDireccionInspeccion] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    if (!session) { router.replace('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.misArticulos(session.identificador));
      if (!res.ok) throw new Error();
      const data = await res.json();
      const mapped: Article[] = data.map((item: any) => ({
        productoId: item.productoId,
        titulo: item.titulo,
        categoria: item.categoria,
        estadoInspeccion: resolveStatus(item),
        observaciones: item.observaciones ?? null,
        costoDevolucion: item.costoDevolucion ?? null,
        enSubasta: item.enSubasta,
        aceptacion: item.aceptacion ?? null,
      }));
      setArticles(mapped);
      if (mapped.some((a) => a.estadoInspeccion === 'en_revision')) {
        fetch(API_ENDPOINTS.configEmpresa('direccion_inspeccion'))
          .then((r) => r.ok ? r.json() : null)
          .then((d) => d && setDireccionInspeccion(d.valor))
          .catch(() => {});
      }
    } catch {
      setError('No se pudieron cargar los artículos.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { fetchArticles(); }, [fetchArticles]));

  const filtered = articles.filter((a) => {
    if (activeFilter === 'aprobados')  return a.estadoInspeccion === 'aprobado' || a.estadoInspeccion === 'aceptado' || a.estadoInspeccion === 'en_venta';
    if (activeFilter === 'en_revision') return a.estadoInspeccion === 'en_revision';
    if (activeFilter === 'rechazados') return a.estadoInspeccion === 'rechazado_admin' || a.estadoInspeccion === 'rechazado_usuario';
    return true;
  });

  const handleCardPress = (article: Article) => {
    switch (article.estadoInspeccion) {
      case 'aprobado':
        router.push({ pathname: '/vender/articulo-aprobado', params: { titulo: article.titulo, categoria: article.categoria, productoId: String(article.productoId) } });
        break;
      case 'rechazado_admin':
        router.push({ pathname: '/vender/inspeccion-rechazada', params: { titulo: article.titulo, observaciones: article.observaciones ?? '', costoDevolucion: String(article.costoDevolucion ?? ''), source: 'admin' } });
        break;
      case 'rechazado_usuario':
        router.push({ pathname: '/vender/inspeccion-rechazada', params: { titulo: article.titulo, observaciones: '', costoDevolucion: '', source: 'usuario' } });
        break;
      case 'aceptado':
      case 'en_venta':
        router.push({ pathname: '/vender/ubicacion-seguro', params: { titulo: article.titulo } });
        break;
      case 'en_revision':
        break;
    }
  };

  if (!session) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
        <Image source={require('../../assets/images/hammer-icon.png')} style={styles.logoBadge} resizeMode="contain" />
        <View style={{ flex: 1 }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Mis Artículos</Text>
        <Text style={styles.pageSubtitle}>Seguí el estado de inspección de tus artículos enviados.</Text>

        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable key={tab.key} style={[styles.filterTab, isActive && styles.filterTabActive]} onPress={() => setActiveFilter(tab.key)}>
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.articlesList}>
            {filtered.map((article) => {
              const badge = STATUS_BADGE[article.estadoInspeccion];
              const isInteractive = article.estadoInspeccion !== 'en_revision';
              return (
                <Pressable
                  key={article.productoId}
                  style={({ pressed }) => [styles.articleCard, isInteractive && pressed && styles.articleCardPressed]}
                  onPress={() => handleCardPress(article)}
                >
                  <View style={styles.articleImagePlaceholder}>
                    <MaterialCommunityIcons name="gavel" size={28} color="#8A6D3B" />
                  </View>
                  <View style={styles.articleContent}>
                    <View style={styles.articleTopRow}>
                      <Text style={styles.articleLote}>{article.categoria.toUpperCase()}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{STATUS_LABEL[article.estadoInspeccion]}</Text>
                      </View>
                    </View>
                    <Text style={styles.articleName} numberOfLines={1}>{article.titulo}</Text>
                    <View style={styles.articleDetailRow}>
                      <MaterialCommunityIcons
                        name={STATUS_ICON[article.estadoInspeccion] as any}
                        size={16}
                        color={badge.text}
                      />
                      <Text style={[styles.articleDetailText, { color: badge.text }]}>
                        {STATUS_SUBTEXTO[article.estadoInspeccion]}
                      </Text>
                    </View>
                    {article.estadoInspeccion === 'en_revision' && direccionInspeccion && (
                      <View style={styles.articleDetailRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#999" />
                        <Text style={[styles.articleDetailText, { color: '#666', fontWeight: '400' }]} numberOfLines={2}>
                          {direccionInspeccion}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="package-variant" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>No hay artículos en esta categoría.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── FAB: Nuevo artículo ─────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/vender')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <BottomTabBar activeTab="vender" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 30 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 20 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  filterTabActive: { backgroundColor: '#FFD700' },
  filterTabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  filterTabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  errorText: { fontSize: 14, color: '#D32F2F', textAlign: 'center', marginTop: 40 },
  articlesList: { gap: 14 },
  articleCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', padding: 16, alignItems: 'flex-start' },
  articleCardPressed: { opacity: 0.85, backgroundColor: '#FAFAFA' },
  articleImagePlaceholder: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  articleContent: { flex: 1 },
  articleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  articleLote: { fontSize: 11, fontWeight: '600', color: '#999', letterSpacing: 0.5 },
  articleName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  articleDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  articleDetailText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyStateText: { fontSize: 14, color: '#999' },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});