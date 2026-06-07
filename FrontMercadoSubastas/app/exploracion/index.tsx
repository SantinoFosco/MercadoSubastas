import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActividadReciente = {
  pujaId: number;
  nombreComprador: string;
  nombreProducto: string;
  fecha: string;
  valor: string;
};

type SubastaDestacada = {
  subastaId: number;
  titulo: string;
  fecha: string;
  imagen: string | null;
  postoresRegistrados: number;
  categoria: string;
  enVivo: boolean;
  actividadReciente: ActividadReciente[];
};

type SubastaGeneral = {
  subastaId: number;
  titulo: string;
  fecha: string;
  categoria: string;
  enVivo: boolean;
  imagen: string | null;
};

type HomeData = {
  subastaDestacada: SubastaDestacada | null;
  subastasGenerales: SubastaGeneral[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#FFD700', '#8A6D3B', '#E53935', '#1976D2', '#388E3C'];

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  const hrs = Math.floor(mins / 60);
  return `Hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function formatDateBadge(isoDate: string): { text: string; bg: string; color: string } {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0)  return { text: 'PASADA',           bg: '#999999', color: '#FFFFFF' };
  if (diffDays === 0) return { text: 'HOY',              bg: '#E53935', color: '#FFFFFF' };
  if (diffDays <= 7)  return { text: `EN ${diffDays} DÍAS`, bg: '#FFD700', color: '#1A1A1A' };
  return { text: `${date.getDate()} DE ${MONTHS[date.getMonth()]}`, bg: '#1A1A1A', color: '#FFFFFF' };
}

const CATEGORY_CONFIG: Record<string, { label: string; textColor: string; badgeBg: string; badgeColor: string }> = {
  comun:    { label: 'COMÚN',    textColor: '#666666', badgeBg: '#F0F0F0', badgeColor: '#666666' },
  especial: { label: 'ESPECIAL', textColor: '#6A0DAD', badgeBg: '#F3E8FF', badgeColor: '#6A0DAD' },
  plata:    { label: 'PLATA',    textColor: '#5C5C5C', badgeBg: '#E8E8E8', badgeColor: '#5C5C5C' },
  oro:      { label: 'ORO',      textColor: '#8A6D3B', badgeBg: '#FFF8E1', badgeColor: '#8A6D3B' },
  platino:  { label: 'PLATINO',  textColor: '#2C6E8A', badgeBg: '#E8F4F8', badgeColor: '#2C6E8A' },
};

function getCategoryConfig(categoria: string) {
  return CATEGORY_CONFIG[categoria] ?? CATEGORY_CONFIG['comun'];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExploracionScreen() {
  const router = useRouter();
  const { session, getCategoria } = useSession();
  const isLoggedIn = !!session;
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHome = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const categoria = getCategoria();
      const res = await fetch(API_ENDPOINTS.home(categoria));
      if (!res.ok) throw new Error('Error al cargar el home');
      const json: HomeData = await res.json();
      setData(json);
    } catch {
      setError('No se pudo cargar la información. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [getCategoria]);

  // Refresca cada vez que la pantalla recibe el foco (al volver desde subasta, perfil, etc.)
  useFocusEffect(useCallback(() => { fetchHome(); }, [fetchHome]));

  const destacada = data?.subastaDestacada ?? null;
  const generales = data?.subastasGenerales ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ── Header con estado de sesión ──────────────────────────────── */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Mercado Subastas</Text>
        {!isLoggedIn ? (
          <TouchableOpacity style={styles.loginHeaderBtn} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <MaterialCommunityIcons name="login" size={15} color="#8A6D3B" />
            <Text style={styles.loginHeaderText}>Ingresar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.profileHeaderBtn} onPress={() => router.replace('/perfil')} activeOpacity={0.8}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color="#8A6D3B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Search Bar ─────────────────────────────────────────────── */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={22} color="#999999" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar colecciones..."
            placeholderTextColor="#999999"
            style={styles.searchInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            mode="flat"
            theme={{ colors: { primary: 'transparent' } }}
          />
        </View>

        {loading && (
          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />
        )}

        {!!error && !loading && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {!loading && !error && (
          <>
            {/* ── Live Now Section ──────────────────────────────────── */}
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveHeaderLeft}>
                <Text style={styles.liveNowTitle}>Subasta Destacada</Text>
              </View>
            </View>

            {destacada ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({
                  pathname: '/exploracion/catalogo',
                  params: {
                    subastaId: String(destacada.subastaId),
                    enVivo: destacada.enVivo ? 'true' : 'false',
                  },
                })}
              >
                <View style={styles.liveCard}>
                  <View style={styles.liveCardGradientTop} />
                  <View style={styles.liveCardGradientCenter} />
                  <View style={styles.liveCardGlowAccent} />

                  {destacada.enVivo && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveBadgeDot} />
                      <Text style={styles.liveBadgeText}>EN VIVO</Text>
                    </View>
                  )}

                  <Text style={styles.liveCardLotInfo}>
                    {destacada.enVivo
                      ? `SUBASTA #${destacada.subastaId} · EN CURSO`
                      : (() => {
                          const d = new Date(destacada.fecha);
                          const now = new Date();
                          const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
                          const label = diffDays === 0 ? 'HOY' : diffDays === -1 ? 'AYER' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                          return `SUBASTA #${destacada.subastaId} · ${label} ${formatTime(destacada.fecha)}`;
                        })()
                    }
                  </Text>

                  <Text style={styles.liveCardTitle}>
                    {destacada.titulo}
                  </Text>

                  <View style={styles.liveCardIconContainer}>
                    <MaterialCommunityIcons name="gavel" size={80} color="rgba(255,215,0,0.12)" />
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyLiveCard}>
                <Text style={styles.emptyLiveText}>No hay subastas en vivo en este momento</Text>
              </View>
            )}

            {/* ── Actividad Reciente ─────────────────────────────────── */}
            {destacada && (
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <MaterialCommunityIcons name="lightning-bolt" size={18} color="#8A6D3B" />
                  <Text style={styles.activityHeaderText}>Actividad Reciente</Text>
                </View>

                {destacada.actividadReciente.length === 0 ? (
                  <Text style={styles.noActivityText}>Sin actividad reciente</Text>
                ) : (
                  destacada.actividadReciente.map((bid, index) => (
                    <View key={bid.pujaId} style={styles.bidRow}>
                      <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
                        <Text style={[
                          styles.avatarText,
                          AVATAR_COLORS[index % AVATAR_COLORS.length] === '#E0E0E0' && { color: '#1A1A1A' },
                        ]}>
                          {getInitials(bid.nombreComprador)}
                        </Text>
                      </View>
                      <View style={styles.bidInfo}>
                        <Text style={styles.bidName}>{bid.nombreComprador}</Text>
                        <Text style={styles.bidTime}>{timeAgo(bid.fecha)}</Text>
                      </View>
                      <Text style={styles.bidAmount}>{bid.valor}</Text>
                    </View>
                  ))
                )}

                <View style={styles.registeredRow}>
                  <MaterialCommunityIcons name="account-group-outline" size={16} color="#999999" />
                  <Text style={styles.registeredText}>Postores registrados: </Text>
                  <Text style={styles.registeredCount}>{destacada.postoresRegistrados}</Text>
                </View>
              </View>
            )}

            {/* ── Upcoming Auctions ──────────────────────────────────── */}
            <View style={styles.upcomingHeaderRow}>
              <Text style={styles.upcomingTitle}>Otras Subastas</Text>
            </View>

            {generales.length === 0 && (
              <Text style={styles.noUpcomingText}>No hay próximas subastas</Text>
            )}

            {generales.map((auction) => {
              const badge = formatDateBadge(auction.fecha);
              const cat = getCategoryConfig(auction.categoria);
              return (
                <TouchableOpacity
                  key={auction.subastaId}
                  activeOpacity={0.85}
                  onPress={() => router.push({
                    pathname: '/exploracion/catalogo',
                    params: {
                      subastaId: String(auction.subastaId),
                      enVivo: auction.enVivo ? 'true' : 'false',
                    },
                  })}
                >
                  <View style={styles.upcomingCard}>
                    <View style={[styles.dateBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.dateBadgeText, { color: badge.color }]}>
                        {badge.text}
                      </Text>
                    </View>

                    {auction.imagen ? (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${auction.imagen}` }}
                        style={styles.upcomingImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.upcomingImagePlaceholder}>
                        <MaterialCommunityIcons name="gavel" size={48} color="#C0C0C0" />
                      </View>
                    )}

                    <View style={[styles.categoryBadge, { backgroundColor: cat.badgeBg }]}>
                      <Text style={[styles.upcomingCategory, { color: cat.textColor }]}>
                        {cat.label}
                      </Text>
                    </View>

                    <Text style={styles.upcomingCardTitle}>{auction.titulo}</Text>

                    <View style={styles.upcomingPriceRow}>
                      <View />
                      <TouchableOpacity activeOpacity={0.6} style={styles.bellButton}>
                        <MaterialCommunityIcons name="bell-outline" size={22} color="#8A6D3B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <BottomTabBar activeTab="explorar" onTabPress={() => {}} />
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
  },

  // ── Top Header ──────────────────────────────────────────────────
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFBFD',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  loginHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  loginHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6D3B',
  },
  profileHeaderBtn: {
    padding: 4,
  },

  // ── Search ──────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    height: 48,
    paddingHorizontal: 0,
  },

  // ── Live Now Header ─────────────────────────────────────────────
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveNowTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  liveBroadcastText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 0.8,
  },

  // ── Live Card ───────────────────────────────────────────────────
  liveCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    minHeight: 220,
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  liveCardGradientTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,215,0,0.06)',
  },
  liveCardGradientCenter: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(138,109,59,0.08)',
  },
  liveCardGlowAccent: {
    position: 'absolute',
    top: 60,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(229,57,53,0.05)',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E53935',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 16,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  liveCardLotInfo: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  liveCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  liveCardIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    opacity: 0.8,
  },
  emptyLiveCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyLiveText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },

  // ── Actividad Reciente ──────────────────────────────────────────
  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
    marginBottom: 28,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  activityHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  noActivityText: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bidInfo: {
    flex: 1,
  },
  bidName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bidTime: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8A6D3B',
  },
  registeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  registeredText: {
    fontSize: 13,
    color: '#999999',
  },
  registeredCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // ── Upcoming Auctions ───────────────────────────────────────────
  upcomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  upcomingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  upcomingLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A6D3B',
  },
  noUpcomingText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  upcomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  upcomingImage: {
    height: 160,
    borderRadius: 12,
    marginBottom: 14,
  },
  upcomingImagePlaceholder: {
    backgroundColor: '#F0F0F0',
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  upcomingCategory: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  upcomingCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  upcomingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
