import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';

// ── Component ─────────────────────────────────────────────────────────────────

export default function UbicacionSeguroScreen() {
  const router = useRouter();

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══ 2. UBICACIÓN DEL LOTE ═══════════════════════════════════════════ */}
        <Text style={styles.sectionTitle}>UBICACIÓN DEL LOTE</Text>

        <View style={styles.card}>
          <View style={styles.locationRow}>
            {/* Left: Icon + Text */}
            <View style={styles.locationLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="map-marker" size={22} color="#FFD700" />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationTitle}>Depósito Central</Text>
                <Text style={styles.locationSubtitle}>{'Buenos Aires,\nArgentina'}</Text>
              </View>
            </View>

            {/* Right: Badge */}
            <View style={styles.storageBadge}>
              <Text style={styles.storageBadgeText}>EN ALMACÉN</Text>
            </View>
          </View>
        </View>

        {/* ═══ 3. PÓLIZA DE SEGURO ════════════════════════════════════════════ */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>PÓLIZA DE SEGURO</Text>

        <View style={styles.insuranceCard}>

          {/* Row 1: Compañía */}
          <View style={styles.insuranceRow}>
            <View style={styles.insuranceRowLeft}>
              <View style={styles.iconCircleSmall}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#FFD700" />
              </View>
              <Text style={styles.insuranceLabel}>COMPAÑÍA</Text>
            </View>
            <Text style={styles.insuranceValue}>Seguros Globales</Text>
          </View>

          {/* Row 2: Nro de Póliza */}
          <View style={styles.insuranceRow}>
            <View style={styles.insuranceRowLeft}>
              <View style={styles.iconCircleSmall}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color="#FFD700" />
              </View>
              <Text style={styles.insuranceLabel}>NRO DE PÓLIZA</Text>
            </View>
            <Text style={[styles.insuranceValue, styles.monoText]}>AU-99283-SL</Text>
          </View>

          {/* Row 3: Valor Asegurado */}
          <View style={[styles.insuranceRow, styles.insuranceRowLast]}>
            <View style={styles.insuranceRowLeft}>
              <View style={styles.iconCircleSmall}>
                <MaterialCommunityIcons name="cash-multiple" size={18} color="#FFD700" />
              </View>
              <Text style={styles.insuranceLabel}>VALOR ASEGURADO</Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>$12,500</Text>
              <View style={styles.currencyTag}>
                <Text style={styles.currencyTagText}>USD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ 4. SHIPPING INFO ═══════════════════════════════════════════════ */}
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#999" />
          <Text style={styles.infoText}>
            El envío a cargo del comprador se activará tras la venta del lote.
          </Text>
        </View>

      </ScrollView>

      {/* 5. BOTTOM TAB BAR */}
      <BottomTabBar activeTab="vender" onTabPress={() => {}} />
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
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // --- Section Title ---
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 16,
  },

  // --- Location Card ---
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 18,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    backgroundColor: '#FFF8E1',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  storageBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  storageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },

  // --- Insurance Card ---
  insuranceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  insuranceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  insuranceRowLast: {
    borderBottomWidth: 0,
    backgroundColor: '#FFFDF5',
  },
  insuranceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleSmall: {
    backgroundColor: '#FFF8E1',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  insuranceLabel: {
    fontSize: 10,
    color: '#999',
    letterSpacing: 1,
    fontWeight: '600',
  },
  insuranceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  monoText: {
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },

  // --- Insured Amount ---
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  currencyTag: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  currencyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6D3B',
  },

  // --- Info Row ---
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
});
