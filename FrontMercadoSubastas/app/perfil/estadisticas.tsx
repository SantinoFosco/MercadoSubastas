import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomTabBar from '@/components/BottomTabBar';

// ── Types ─────────────────────────────────────────────────────────────────────

type HistoryItem = {
  id: number;
  name: string;
  itemId: string;
  date: string;
  price: string;
  status: string;
  statusColor: string;
  statusBg: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: 1,
    name: 'Reloj Patek Philippe',
    itemId: '#49283',
    date: '12 Oct, 2023',
    price: '$45,000',
    status: 'GANADA',
    statusColor: '#2E7D32',
    statusBg: '#E8F5E9',
    icon: 'watch',
  },
  {
    id: 2,
    name: 'Jaguar E-Type',
    itemId: '#49102',
    date: '08 Oct, 2023',
    price: '$8,200',
    status: 'SUPERADO',
    statusColor: '#F57F17',
    statusBg: '#FFF8E1',
    icon: 'car-side',
  },
  {
    id: 3,
    name: 'Óleo Abstracto',
    itemId: '#48991',
    date: '05 Oct, 2023',
    price: '$12,400',
    status: 'GANADA',
    statusColor: '#2E7D32',
    statusBg: '#E8F5E9',
    icon: 'palette',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EstadisticasScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Appbar ──────────────────────────────────────────────────────────── */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
        <Image
          source={require('../../assets/images/hammer-icon.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
      </Appbar.Header>

      {/* ── Scrollable Content ──────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <Text style={styles.headerLabel}>Estadísticas</Text>
          <Text style={styles.headerTitle}>Mis Estadísticas</Text>
          <Text style={styles.headerSubtitle}>Resumen general de tu actividad</Text>
        </View>

        {/* 2. Participation Card ──────────────────────────────────────────── */}
        <View style={styles.participationCard}>
          <View style={styles.participationTopRow}>
            <View style={styles.goldIconContainer}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={22}
                color="#8A6D3B"
              />
            </View>
            <View style={styles.growthBadge}>
              <Text style={styles.growthBadgeText}>+12% este mes</Text>
            </View>
          </View>

          <Text style={styles.participationLabel}>PARTICIPACIÓN</Text>
          <Text style={styles.participationValue}>42</Text>
          <Text style={styles.participationSubtext}>Subastas totales</Text>
        </View>

        {/* 3. Total Invertido — Gold Hero Card ────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Decorative overlay circles */}
          <View style={styles.heroGlowTopLeft} />
          <View style={styles.heroGlowBottomRight} />

          {/* Top row: icons */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconContainer}>
              <MaterialCommunityIcons name="wallet-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={[styles.heroIconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={26}
                color="#FFFFFF"
                style={{ opacity: 0.3 }}
              />
            </View>
          </View>

          {/* Content */}
          <Text style={styles.heroLabel}>TOTAL INVERTIDO</Text>
          <Text style={styles.heroValue}>$124,500</Text>
          <Text style={styles.heroSubLabel}>MONTO TOTAL LIQUIDADO</Text>
        </View>

        {/* 4. Historial Section ───────────────────────────────────────────── */}
        <View style={styles.historialHeader}>
          <Text style={styles.historialTitle}>Historial</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.historialLink}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {MOCK_HISTORY.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            {/* Image placeholder */}
            <View style={styles.historyImage}>
              <MaterialCommunityIcons name={item.icon} size={28} color="#CCCCCC" />
            </View>

            {/* Middle info */}
            <View style={styles.historyInfo}>
              <Text style={styles.historyName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.historyMeta}>
                ID: {item.itemId} • {item.date}
              </Text>
            </View>

            {/* Right: price + status */}
            <View style={styles.historyRight}>
              <Text style={styles.historyPrice}>{item.price}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.statusBg },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: item.statusColor },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 5. Bottom Tab Bar ────────────────────────────────────────────────── */}
      <BottomTabBar
        activeTab="perfil"
        onTabPress={(tab) => {
          if (tab === 'explorar') router.push('/explorar');
          else if (tab === 'mis-pujas') router.push('/mis-pujas');
          else if (tab === 'vender') router.push('/vender');
          else if (tab === 'perfil') router.push('/perfil');
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

  // ── Appbar ──────────────────────────────────────────────────────────────────
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

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // ── Header Section ──────────────────────────────────────────────────────────
  headerSection: {
    marginBottom: 24,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
  },

  // ── Participation Card ──────────────────────────────────────────────────────
  participationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
  },
  participationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goldIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  growthBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  participationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
    marginTop: 16,
  },
  participationValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 4,
  },
  participationSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },

  // ── Hero Gold Card ──────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#D4A912',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    padding: 24,
    marginTop: 20,
  },
  heroGlowTopLeft: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,215,0,0.4)',
  },
  heroGlowBottomRight: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,215,0,0.25)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
    marginTop: 16,
  },
  heroValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
  },
  heroSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginTop: 6,
  },

  // ── Historial Section ───────────────────────────────────────────────────────
  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  historialTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  historialLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A6D3B',
  },

  // ── History Item Cards ──────────────────────────────────────────────────────
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 14,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  historyMeta: {
    fontSize: 12,
    color: '#999999',
    marginTop: 3,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
