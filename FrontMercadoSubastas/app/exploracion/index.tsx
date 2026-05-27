import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

// ── Mock Data ────────────────────────────────────────────────────────────────

type RecentBid = {
  id: number;
  initials: string;
  name: string;
  time: string;
  amount: string;
  color: string;
};

type UpcomingAuction = {
  id: number;
  dateBadge: string;
  dateBadgeBg: string;
  dateBadgeColor: string;
  category: string;
  title: string;
  subtitle?: string;
  price: string;
};

const MOCK_RECENT_BIDS: RecentBid[] = [
  { id: 1, initials: 'J', name: 'Juan', time: 'Hace 2 minutos', amount: '$43,900', color: '#FFD700' },
  { id: 2, initials: 'F', name: 'Franco', time: 'Hace 5 minutos', amount: '$41,800', color: '#E0E0E0' },
  { id: 3, initials: 'C', name: 'Carlos', time: 'Hace 8 minutos', amount: '$40,000', color: '#8A6D3B' },
];

const MOCK_UPCOMING: UpcomingAuction[] = [
  { id: 1, dateBadge: 'EN 2 DÍAS', dateBadgeBg: '#FFD700', dateBadgeColor: '#1A1A1A', category: 'RELOJERÍA', title: 'Relojes de Colección', price: '$12,000' },
  { id: 2, dateBadge: '15 DE MAYO', dateBadgeBg: '#1A1A1A', dateBadgeColor: '#FFFFFF', category: 'VEHÍCULOS', title: 'Clásicos Europeos', subtitle: 'ESTIMADO', price: '$250,000+' },
  { id: 3, dateBadge: '10 DE MAYO', dateBadgeBg: '#1A1A1A', dateBadgeColor: '#FFFFFF', category: 'JOYERÍA', title: 'Colección de Joyas', subtitle: 'DESDE', price: '$85,000' },
];

const CATEGORY_ICONS: Record<string, string> = {
  'RELOJERÍA': 'watch',
  'VEHÍCULOS': 'car-side',
  'JOYERÍA': 'diamond-stone',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ExploracionScreen() {
  const router = useRouter();

  const handleTabPress = (tab: string) => {
    if (tab !== 'explorar') {
      // Other tabs are no-ops for now
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

        {/* ── Live Now Section ────────────────────────────────────────── */}
        <View style={styles.liveHeaderRow}>
          <View style={styles.liveHeaderLeft}>
            <Text style={styles.liveNowTitle}>Live Now</Text>
            <View style={styles.liveDot} />
            <Text style={styles.liveBroadcastText}>LIVE BROADCAST</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/exploracion/subasta-vivo')}
        >
          <View style={styles.liveCard}>
            {/* Gradient-like decorative overlays */}
            <View style={styles.liveCardGradientTop} />
            <View style={styles.liveCardGradientCenter} />
            <View style={styles.liveCardGlowAccent} />

            {/* EN VIVO badge */}
            <View style={styles.liveBadge}>
              <View style={styles.liveBadgeDot} />
              <Text style={styles.liveBadgeText}>EN VIVO</Text>
            </View>

            {/* Lot info */}
            <Text style={styles.liveCardLotInfo}>LOTE #442 · 18:00 PM EN VIVO</Text>

            {/* Title */}
            <Text style={styles.liveCardTitle}>
              Cronógrafo de Lujo{'\n'}
              <Text style={styles.liveCardTitleQuoted}>"Solaris 1982"</Text>
            </Text>

            {/* Decorative watch icon */}
            <View style={styles.liveCardIconContainer}>
              <MaterialCommunityIcons name="watch" size={80} color="rgba(255,215,0,0.12)" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Actividad Reciente ──────────────────────────────────────── */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color="#8A6D3B" />
            <Text style={styles.activityHeaderText}>Actividad Reciente</Text>
          </View>

          {MOCK_RECENT_BIDS.map((bid) => (
            <View key={bid.id} style={styles.bidRow}>
              <View style={[styles.avatar, { backgroundColor: bid.color }]}>
                <Text style={[
                  styles.avatarText,
                  bid.color === '#E0E0E0' && { color: '#1A1A1A' },
                ]}>
                  {bid.initials}
                </Text>
              </View>
              <View style={styles.bidInfo}>
                <Text style={styles.bidName}>{bid.name}</Text>
                <Text style={styles.bidTime}>{bid.time}</Text>
              </View>
              <Text style={styles.bidAmount}>{bid.amount}</Text>
            </View>
          ))}

          <View style={styles.registeredRow}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color="#999999" />
            <Text style={styles.registeredText}>Postores registrados: </Text>
            <Text style={styles.registeredCount}>124</Text>
          </View>
        </View>

        {/* ── Upcoming Auctions ──────────────────────────────────────── */}
        <View style={styles.upcomingHeaderRow}>
          <Text style={styles.upcomingTitle}>Upcoming Auctions</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/exploracion/catalogo')}
          >
            <Text style={styles.upcomingLink}>Ver catálogo</Text>
          </TouchableOpacity>
        </View>

        {MOCK_UPCOMING.map((auction) => (
          <TouchableOpacity
            key={auction.id}
            activeOpacity={0.85}
            onPress={() => router.push('/exploracion/detalle-lote')}
          >
            <View style={styles.upcomingCard}>
              {/* Date badge */}
              <View style={[styles.dateBadge, { backgroundColor: auction.dateBadgeBg }]}>
                <Text style={[styles.dateBadgeText, { color: auction.dateBadgeColor }]}>
                  {auction.dateBadge}
                </Text>
              </View>

              {/* Image placeholder */}
              <View style={styles.upcomingImagePlaceholder}>
                <MaterialCommunityIcons
                  name={(CATEGORY_ICONS[auction.category] || 'tag-outline') as any}
                  size={48}
                  color="#C0C0C0"
                />
              </View>

              {/* Category */}
              <Text style={styles.upcomingCategory}>{auction.category}</Text>

              {/* Title */}
              <Text style={styles.upcomingCardTitle}>{auction.title}</Text>

              {/* Price row */}
              <View style={styles.upcomingPriceRow}>
                <View style={styles.upcomingPriceLeft}>
                  {auction.subtitle && (
                    <Text style={styles.upcomingPriceSubtitle}>{auction.subtitle}</Text>
                  )}
                  <Text style={styles.upcomingPrice}>{auction.price}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.6} style={styles.bellButton}>
                  <MaterialCommunityIcons name="bell-outline" size={22} color="#8A6D3B" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Bottom Tab Bar ──────────────────────────────────────────── */}
      <BottomTabBar activeTab="explorar" onTabPress={handleTabPress} />
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

  // ── Live Card (hero) ────────────────────────────────────────────
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
  liveCardTitleQuoted: {
    color: '#FFD700',
    fontStyle: 'italic',
  },
  liveCardIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    opacity: 0.8,
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

  // ── Upcoming Auctions Header ────────────────────────────────────
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

  // ── Upcoming Card ───────────────────────────────────────────────
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
  upcomingImagePlaceholder: {
    backgroundColor: '#F0F0F0',
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  upcomingCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6D3B',
    letterSpacing: 1.2,
    marginBottom: 6,
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
    justifyContent: 'space-between',
  },
  upcomingPriceLeft: {
    flexDirection: 'column',
  },
  upcomingPriceSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  upcomingPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
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
