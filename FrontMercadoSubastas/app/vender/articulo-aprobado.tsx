import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArticuloAprobadoScreen() {
  const router = useRouter();
  const { titulo, categoria } = useLocalSearchParams<{ titulo: string; categoria: string }>();

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

        {/* 2. SUCCESS ICON */}
        <View style={styles.iconContainer}>
          <View style={styles.successCircle}>
            <MaterialCommunityIcons name="check" size={40} color="#FFFFFF" />
          </View>
        </View>

        {/* 3. TITLE & DESCRIPTION */}
        <Text style={styles.title}>¡Artículo Aprobado!</Text>
        <Text style={styles.description}>
          Tu artículo ha superado todos los controles de calidad y está listo para la subasta.
        </Text>

        {/* 4. PRODUCT CARD */}
        <View style={styles.productCard}>
          {/* Image area */}
          <View style={styles.productImageArea}>
            <MaterialCommunityIcons name="headphones" size={80} color="#CCCCCC" />
          </View>

          {/* Product info */}
          <View style={styles.productInfo}>
            <Text style={styles.productCategory}>CATEGORÍA: {(categoria ?? '').toUpperCase()}</Text>
            <Text style={styles.productTitle}>{titulo ?? 'Artículo'}</Text>
          </View>
        </View>

        {/* 5. PRICE INFO */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Precio Base</Text>
          <Text style={styles.priceValue}>$15,000.00</Text>
        </View>

        {/* 6. ESTIMATED EARNINGS CARD */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsLeft}>
            <Text style={styles.earningsLabel}>GANANCIA ESTIMADA</Text>
            <Text style={styles.earningsValue}>~$12,750.00</Text>
          </View>
          <View style={styles.earningsIconCircle}>
            <MaterialCommunityIcons name="calculator" size={24} color="#2E7D32" />
          </View>
        </View>

        {/* 7. CTA BUTTON */}
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/vender/ubicacion-seguro', params: { titulo } })}
        >
          <Text style={styles.ctaButtonText}>Aceptar y Continuar →</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* 8. BOTTOM TAB BAR */}
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
    paddingBottom: 40,
  },

  // --- Success Icon ---
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Title & Description ---
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 20,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 28,
  },

  // --- Product Card ---
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  productImageArea: {
    height: 200,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 16,
  },
  productCategory: {
    fontSize: 10,
    color: '#999999',
    letterSpacing: 1,
    fontWeight: '700',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 6,
  },

  // --- Price Info ---
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666666',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  // --- Estimated Earnings Card ---
  earningsCard: {
    backgroundColor: '#F0FBF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  earningsLeft: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
    color: '#2E7D32',
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E7D32',
    marginTop: 4,
  },
  earningsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- CTA Button ---
  ctaButton: {
    backgroundColor: '#FFD700',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});