import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

export default function WinnerScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
          <MaterialCommunityIcons name="menu" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy Icon */}
        <View style={styles.trophyContainer}>
          <View style={styles.trophyCircle}>
            <MaterialCommunityIcons name="trophy-outline" size={32} color="#FFFFFF" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>¡Felicidades, eres el{'\n'}ganador!</Text>
        <Text style={styles.subtitle}>
          Has superado todas las pujas en esta exclusiva subasta.
        </Text>

        {/* Product Card */}
        <View style={styles.productCard}>
          {/* Sold Badge */}
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>VENDIDO</Text>
          </View>

          {/* Watch Image */}
          <View style={styles.imageContainer}>
            <Image
              source={require('../../assets/images/watch-patek.png')}
              style={styles.watchImage}
              resizeMode="contain"
            />
          </View>

          {/* Lot Info Row */}
          <View style={styles.lotInfoRow}>
            <View>
              <Text style={styles.lotLabel}>LOTE #442</Text>
              <Text style={styles.productName}>Patek Philippe{'\n'}Calatrava</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>PRECIO FINAL</Text>
              <Text style={styles.priceValue}>$24,500</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>Subasta cerrada el 24 de Mayo</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>Certificado de Autenticidad Incluido</Text>
            </View>
          </View>
        </View>

        {/* Thank You Card */}
        <View style={styles.thankYouCard}>
          <Text style={styles.thankYouText}>
            Gracias por participar en{' '}
            <Text style={styles.thankYouBold}>Mercado{'\n'}Subastas</Text>
            . Tu pasión por lo extraordinario nos inspira a seguir ofreciendo solo lo mejor.
          </Text>
        </View>

        {/* Primary Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/cierre-subasta/delivery-details')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Ver Detalles de Pago</Text>
        </TouchableOpacity>

        {/* Secondary Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {}}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Descargar Recibo de Ganador</Text>
        </TouchableOpacity>

        {/* Help Link */}
        <TouchableOpacity
          style={styles.helpLink}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Text style={styles.helpLinkText}>
            🎁 ¿Necesitas ayuda con tu entrega?
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="mis-pujas" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  trophyContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  trophyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#614F3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 34,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    marginBottom: 20,
  },
  soldBadge: {
    backgroundColor: '#8A6D3B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  soldBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 20,
  },
  watchImage: {
    width: 180,
    height: 200,
  },
  lotInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingTop: 4,
  },
  lotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666666',
  },
  thankYouCard: {
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  thankYouText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
    textAlign: 'center',
  },
  thankYouBold: {
    fontWeight: '800',
    color: '#1A1A1A',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  helpLink: {
    alignItems: 'center',
    marginBottom: 10,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#8A6D3B',
    fontWeight: '600',
  },
});
