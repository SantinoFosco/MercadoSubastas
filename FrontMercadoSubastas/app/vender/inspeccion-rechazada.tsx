import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
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

export default function InspeccionRechazadaScreen() {
  const router = useRouter();
  const { titulo, observaciones, costoDevolucion } = useLocalSearchParams<{ titulo: string; observaciones: string; costoDevolucion: string }>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

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

        {/* 2. REJECTION ICON */}
        <View style={styles.iconContainer}>
          <View style={styles.rejectionCircle}>
            <MaterialCommunityIcons name="close" size={40} color="#FFFFFF" />
          </View>
        </View>

        {/* 3. TITLE & DESCRIPTION */}
        <Text style={styles.title}>Inspección No Aceptada</Text>
        <Text style={styles.description}>
          El artículo no cumple con los estándares de autenticidad o calidad requeridos para subasta.
        </Text>

        {/* 4. PRODUCT IMAGE */}
        <View style={styles.productImageContainer}>
          <View style={styles.productImageArea}>
            <MaterialCommunityIcons name="bag-personal-outline" size={80} color="#CCCCCC" />
          </View>
          {/* Item badge */}
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>{titulo ?? 'Artículo'}</Text>
          </View>
        </View>

        {/* 5. REJECTION REASONS CARD */}
        <View style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>MOTIVOS DEL RECHAZO</Text>
          <View style={styles.reasonItem}>
            <View style={styles.reasonBulletRow}>
              <View style={styles.redDot} />
              <Text style={styles.reasonItemTitle}>Observaciones del inspector</Text>
            </View>
            <Text style={styles.reasonItemDetail}>{observaciones || 'Sin observaciones registradas.'}</Text>
          </View>
        </View>

        {/* 6. RETURN COST */}
        <View style={styles.returnCostRow}>
          <Text style={styles.returnCostLabel}>Costo de Devolución</Text>
          <Text style={styles.returnCostValue}>
            {costoDevolucion ? `$${parseFloat(costoDevolucion).toLocaleString('es-AR')}` : 'A confirmar'}
          </Text>
        </View>

        {/* 7. CTA BUTTON */}
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Próximamente', 'El pago de devolución estará disponible pronto.')}
        >
          <View style={styles.ctaButtonInner}>
            <MaterialCommunityIcons
              name="truck-delivery-outline"
              size={22}
              color="#FFFFFF"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.ctaButtonText}>Pagar Devolución y Recuperar</Text>
          </View>
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

  // --- Rejection Icon ---
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  rejectionCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF5350',
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

  // --- Product Image ---
  productImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  productImageArea: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // --- Rejection Reasons Card ---
  reasonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 18,
    marginBottom: 20,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C62828',
    letterSpacing: 1,
    marginBottom: 14,
  },
  reasonItem: {
    marginBottom: 12,
  },
  reasonBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF5350',
    marginRight: 10,
  },
  reasonItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reasonItemDetail: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    marginTop: 2,
    marginLeft: 18,
  },

  // --- Return Cost ---
  returnCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  returnCostLabel: {
    fontSize: 14,
    color: '#666666',
  },
  returnCostValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
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
  ctaButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
