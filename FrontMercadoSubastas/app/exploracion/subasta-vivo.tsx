import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

// ── Types ──────────────────────────────────────────────────────────────────────

type BidEntry = {
  id: number;
  initial: string;
  name: string;
  time: string;
  amount: string;
  color: string;
};

// ── Mock Data ──────────────────────────────────────────────────────────────────

const INITIAL_BIDS: BidEntry[] = [
  { id: 1, initial: 'R', name: 'Roberto M.', time: 'HACE 12 SEGUNDOS', amount: '$12,450', color: '#FFD700' },
  { id: 2, initial: 'A', name: 'Ana L.', time: 'HACE 30 SEGUNDOS', amount: '$12,300', color: '#E0E0E0' },
  { id: 3, initial: 'C', name: 'Carlos D.', time: 'HACE 45 SEGUNDOS', amount: '$12,150', color: '#8A6D3B' },
];

const QUICK_BID_OPTIONS = [100, 500, 1000];

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  '$' + value.toLocaleString('en-US');

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function SubastaVivoScreen() {
  const router = useRouter();

  // State
  const [timeLeft, setTimeLeft] = useState(45);
  const [currentBid, setCurrentBid] = useState(12450);
  const [nextBid, setNextBid] = useState(12600);
  const [totalBids, setTotalBids] = useState(3);
  const [bids, setBids] = useState<BidEntry[]>(INITIAL_BIDS);
  const [selectedQuickBid, setSelectedQuickBid] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const bidIdRef = useRef(4);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleQuickBidSelect = (amount: number) => {
    setSelectedQuickBid(amount);
    setCustomAmount('');
  };

  const handlePlaceBid = () => {
    const bidAmount =
      customAmount.length > 0
        ? parseInt(customAmount.replace(/\D/g, ''), 10)
        : selectedQuickBid ?? 0;

    if (!bidAmount || bidAmount <= 0) {
      Alert.alert('Selecciona un monto', 'Elige una opción rápida o ingresa un monto personalizado.');
      return;
    }

    const newBidValue = currentBid + bidAmount;
    const newEntry: BidEntry = {
      id: bidIdRef.current++,
      initial: 'T',
      name: 'Tú',
      time: 'AHORA MISMO',
      amount: formatCurrency(newBidValue),
      color: '#FFD700',
    };

    setCurrentBid(newBidValue);
    setNextBid(newBidValue + 150);
    setTotalBids((prev) => prev + 1);
    setBids((prev) => [newEntry, ...prev.slice(0, 2)]);
    setSelectedQuickBid(null);
    setCustomAmount('');
    setTimeLeft(45); // Reset timer on new bid

    Alert.alert(
      '¡Puja realizada! 🔨',
      `Has pujado ${formatCurrency(newBidValue)}. ¡Buena suerte!`,
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Hero Image with Overlay ─────────────────────────────────── */}
        <View style={styles.heroContainer}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* EN VIVO badge */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>EN VIVO</Text>
          </View>

          {/* Center placeholder icon */}
          <View style={styles.heroIconContainer}>
            <MaterialCommunityIcons name="watch" size={80} color="#555555" />
          </View>

          {/* Bottom overlay */}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroLotLabel}>LOTE #442 · EDICIÓN LIMITADA</Text>
            <Text style={styles.heroTitle}>
              {'Cronógrafo de Lujo\n"Solaris 1982"'}
            </Text>
          </View>
        </View>

        {/* ── 2. Stats Row (2×2 grid) ────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>OFERTA ACTUAL</Text>
              <Text style={styles.statValueGold}>{formatCurrency(currentBid)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TIEMPO RESTANTE</Text>
              <Text
                style={[
                  styles.statValueTimer,
                  timeLeft <= 60 && styles.statValueTimerUrgent,
                ]}
              >
                {formatTime(timeLeft)}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PUJAS TOTALES</Text>
              <Text style={styles.statValueDark}>{totalBids}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PRÓXIMA PUJA</Text>
              <Text style={styles.statValueNext}>{formatCurrency(nextBid)}</Text>
            </View>
          </View>
        </View>

        {/* ── 3. Actividad Reciente ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividad Reciente</Text>

          {bids.map((bid) => (
            <View key={bid.id} style={styles.bidRow}>
              <View style={[styles.avatar, { backgroundColor: bid.color }]}>
                <Text style={styles.avatarText}>{bid.initial}</Text>
              </View>
              <View style={styles.bidInfo}>
                <Text style={styles.bidName}>{bid.name}</Text>
                <Text style={styles.bidTime}>{bid.time}</Text>
              </View>
              <Text style={styles.bidAmount}>{bid.amount}</Text>
            </View>
          ))}
        </View>

        {/* ── 4. Quick Bid Buttons ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.quickBidRow}>
            {QUICK_BID_OPTIONS.map((amount) => {
              const isActive = selectedQuickBid === amount;
              return (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickBidButton,
                    isActive && styles.quickBidButtonActive,
                  ]}
                  onPress={() => handleQuickBidSelect(amount)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickBidText,
                      isActive && styles.quickBidTextActive,
                    ]}
                  >
                    +{formatCurrency(amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 5. Custom Amount Input ─────────────────────────────────────── */}
        <View style={styles.section}>
          <TextInput
            style={styles.customInput}
            placeholder="Ingresa monto personalizado"
            placeholderTextColor="#999999"
            keyboardType="numeric"
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text);
              if (text.length > 0) setSelectedQuickBid(null);
            }}
          />
        </View>

        {/* ── 6. PUJAR AHORA Button ──────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.bidButton, timeLeft === 0 && styles.bidButtonDisabled]}
            onPress={handlePlaceBid}
            activeOpacity={0.8}
            disabled={timeLeft === 0}
          >
            <MaterialCommunityIcons name="gavel" size={20} color="#FFFFFF" style={styles.bidButtonIcon} />
            <Text style={styles.bidButtonText}>PUJAR AHORA</Text>
          </TouchableOpacity>
        </View>

        {/* ── 7. Disclaimer ──────────────────────────────────────────────── */}
        <Text style={styles.disclaimer}>
          AL PUJAR, ACEPTAS LOS TÉRMINOS Y CONDICIONES Y ASUMES EL COMPROMISO FINANCIERO.
        </Text>

        {/* Bottom spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── 8. Bottom Tab Bar ────────────────────────────────────────────── */}
      <BottomTabBar
        activeTab="explorar"
        onTabPress={(tab) => {
          if (tab !== 'explorar') {
            router.push(`/${tab}` as any);
          }
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroContainer: {
    height: 250,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  liveBadge: {
    position: 'absolute',
    top: 52,
    left: 68,
    backgroundColor: '#E53935',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroLotLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },

  // ── Stats Grid ──────────────────────────────────────────────────────────────
  statsGrid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValueGold: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8A6D3B',
  },
  statValueTimer: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statValueTimerUrgent: {
    color: '#E53935',
  },
  statValueDark: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statValueNext: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },

  // ── Bid Activity ────────────────────────────────────────────────────────────
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bidInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bidName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bidTime: {
    fontSize: 10,
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A6D3B',
  },

  // ── Quick Bid Buttons ───────────────────────────────────────────────────────
  quickBidRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBidButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBidButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  quickBidText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  quickBidTextActive: {
    color: '#8A6D3B',
  },

  // ── Custom Input ────────────────────────────────────────────────────────────
  customInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
  },

  // ── Bid Button ──────────────────────────────────────────────────────────────
  bidButton: {
    height: 56,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bidButtonDisabled: {
    opacity: 0.5,
  },
  bidButtonIcon: {
    marginRight: 2,
  },
  bidButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ── Disclaimer ──────────────────────────────────────────────────────────────
  disclaimer: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 15,
  },
});
