import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';

// ── Types ─────────────────────────────────────────────────────────────────────

type ArticleStatus = 'aprobado' | 'en_revision' | 'rechazado' | 'en_venta';
type FilterTab = 'todos' | 'aprobados' | 'en_revision';

interface Article {
  id: number;
  lote: string;
  name: string;
  date: string;
  status: ArticleStatus;
  statusLabel: string;
  detail: string;
  detailIcon: string;
  detailColor: string;
  icon: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    lote: 'LOTE #208-AP',
    name: 'Reloj Patek Philippe Nautilus',
    date: 'Inspeccionado el 12 Oct, 2023',
    status: 'aprobado',
    statusLabel: 'APROBADO',
    detail: 'Autenticidad Garantizada',
    detailIcon: 'check-circle-outline',
    detailColor: '#2E7D32',
    icon: 'watch',
  },
  {
    id: 2,
    lote: 'LOTE #209-EN',
    name: 'Auto de Colección',
    date: 'Inspeccionado el 14 Oct, 2023',
    status: 'en_revision',
    statusLabel: 'EN REVISIÓN',
    detail: 'Esperando dictamen final',
    detailIcon: 'clock-outline',
    detailColor: '#F57F17',
    icon: 'car-side',
  },
  {
    id: 3,
    lote: 'LOTE #198-NR',
    name: 'Bolso Hermès',
    date: 'Inspeccionado el 09 Oct, 2023',
    status: 'rechazado',
    statusLabel: 'RECHAZADO',
    detail: 'Detalles de costura no conformes',
    detailIcon: 'alert-circle-outline',
    detailColor: '#C62828',
    icon: 'bag-personal-outline',
  },
  {
    id: 4,
    lote: 'LOTE #210-WT',
    name: 'Auriculares Monitor',
    date: 'Inspeccionado el 15 Oct, 2023',
    status: 'en_venta',
    statusLabel: 'EN VENTA',
    detail: 'Listado en subasta activa',
    detailIcon: 'link-variant',
    detailColor: '#1565C0',
    icon: 'headphones',
  },
];

// ── Status Badge Styles ───────────────────────────────────────────────────────

const STATUS_BADGE_STYLES: Record<ArticleStatus, { bg: string; text: string; border: string }> = {
  aprobado:    { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
  en_revision: { bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' },
  rechazado:   { bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' },
  en_venta:    { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
};

// ── Filter Tabs Config ────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'aprobados', label: 'Aprobados' },
  { key: 'en_revision', label: 'En Revisión' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MisArticulosScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todos');

  // ── Filtering Logic ─────────────────────────────────────────────────────────

  const filteredArticles = MOCK_ARTICLES.filter((article) => {
    switch (activeFilter) {
      case 'aprobados':
        return article.status === 'aprobado' || article.status === 'en_venta';
      case 'en_revision':
        return article.status === 'en_revision';
      default:
        return true;
    }
  });

  // ── Navigation Handler ──────────────────────────────────────────────────────

  const handleCardPress = (article: Article) => {
    switch (article.status) {
      case 'aprobado':
        router.push('/vender/articulo-aprobado');
        break;
      case 'rechazado':
        router.push('/vender/inspeccion-rechazada');
        break;
      case 'en_venta':
        router.push('/vender/ubicacion-seguro');
        break;
      case 'en_revision':
        // No navigation for articles in review
        break;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* 1. APPBAR */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
        <Image
          source={require('../../assets/images/hammer-icon.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Title ───────────────────────────────────────────────────── */}
        <Text style={styles.pageTitle}>Mis Artículos</Text>
        <Text style={styles.pageSubtitle}>
          Seguí el estado de inspección de tus artículos enviados.
        </Text>

        {/* 2. FILTER TABS */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 3. ARTICLES LIST */}
        <View style={styles.articlesList}>
          {filteredArticles.map((article) => {
            const badgeStyle = STATUS_BADGE_STYLES[article.status];
            const isInteractive = article.status !== 'en_revision';

            return (
              <Pressable
                key={article.id}
                style={({ pressed }) => [
                  styles.articleCard,
                  isInteractive && pressed && styles.articleCardPressed,
                ]}
                onPress={() => handleCardPress(article)}
              >
                {/* ── Left: Image Placeholder ── */}
                <View style={styles.articleImagePlaceholder}>
                  <MaterialCommunityIcons
                    name={article.icon as any}
                    size={28}
                    color="#8A6D3B"
                  />
                </View>

                {/* ── Right: Content ── */}
                <View style={styles.articleContent}>
                  {/* Top row: Lot + Badge */}
                  <View style={styles.articleTopRow}>
                    <Text style={styles.articleLote}>{article.lote}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: badgeStyle.bg,
                          borderColor: badgeStyle.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: badgeStyle.text },
                        ]}
                      >
                        {article.statusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.articleName} numberOfLines={1}>
                    {article.name}
                  </Text>

                  {/* Subtitle: inspection date */}
                  <Text style={styles.articleDate}>{article.date}</Text>

                  {/* Status detail line */}
                  <View style={styles.articleDetailRow}>
                    <MaterialCommunityIcons
                      name={article.detailIcon as any}
                      size={16}
                      color={article.detailColor}
                    />
                    <Text
                      style={[
                        styles.articleDetailText,
                        { color: article.detailColor },
                      ]}
                    >
                      {article.detail}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* Empty state when filter returns no results */}
          {filteredArticles.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="package-variant"
                size={48}
                color="#CCC"
              />
              <Text style={styles.emptyStateText}>
                No hay artículos en esta categoría.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 4. BOTTOM TAB BAR */}
      <BottomTabBar
        activeTab="vender"
        onTabPress={(tab) => {
          if (tab === 'explorar') router.push('/exploracion');
          if (tab === 'perfil') router.push('/dashboard');
        }}
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

  // --- Appbar ---
  appbar: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 0,
  },
  logoBadge: {
    width: 50,
    height: 35,
  },

  // --- Scroll ---
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // --- Page Header ---
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },

  // --- Filter Tabs ---
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#FFD700',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // --- Articles List ---
  articlesList: {
    gap: 14,
  },

  // --- Article Card ---
  articleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    alignItems: 'flex-start',
  },
  articleCardPressed: {
    opacity: 0.85,
    backgroundColor: '#FAFAFA',
  },

  // --- Image Placeholder ---
  articleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  // --- Article Content ---
  articleContent: {
    flex: 1,
  },
  articleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  articleLote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  articleDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  articleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  articleDetailText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Status Badge ---
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // --- Empty State ---
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
  },
});
