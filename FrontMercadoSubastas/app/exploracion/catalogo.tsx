import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

type LotItem = {
  id: number;
  loteNumber: string;
  name: string;
  description: string;
  startPrice: string;
  currentBid: string;
  icon: string;
};

const MOCK_LOTS: LotItem[] = [
  {
    id: 1,
    loteNumber: '#42',
    name: 'RELOJ PATEK PHILIPPE',
    description:
      'Ref. 5270P Calendario Perpetuo Cronógrafo. Una magnífica complicación de platino, con esfera color salmón e indicador de fase lunar. Caja y papeles incluidos.',
    startPrice: '$145,000',
    currentBid: '$162,500',
    icon: 'watch',
  },
  {
    id: 2,
    loteNumber: '#43',
    name: 'ANILLO DE ESMERALDA Y DIAMANTES',
    description:
      'Una espectacular esmeralda colombiana de 12.45 quilates de claridad excepcional, flanqueada por diamantes baguette cónicos en una montura de oro amarillo de 18 quilates.',
    startPrice: '$85,000',
    currentBid: '$98,000',
    icon: 'diamond-stone',
  },
  {
    id: 3,
    loteNumber: '#44',
    name: 'ROLEX DAY-DATE 40',
    description:
      'Reloj de Presidente en oro Everose de 18 quilates. Bisel estriado, esfera chocolate con números romanos deconstruidos. Sin estrenar, año 2023.',
    startPrice: '$32,000',
    currentBid: '$41,500',
    icon: 'watch',
  },
];

export default function CatalogoScreen() {
  const router = useRouter();

  const renderLotCard = (lot: LotItem, isLast: boolean) => (
    <View key={lot.id} style={[styles.lotCard, !isLast && styles.lotCardSpacing]}>
      {/* Lot badge */}
      <Text style={styles.lotBadge}>LOTE {lot.loteNumber}</Text>

      {/* Product image placeholder */}
      <View style={styles.imagePlaceholder}>
        <MaterialCommunityIcons
          name={lot.icon as any}
          size={64}
          color="#C0C0C0"
        />
      </View>

      {/* Product name */}
      <Text style={styles.productName}>{lot.name}</Text>

      {/* Description */}
      <Text style={styles.productDescription}>{lot.description}</Text>

      {/* Price row */}
      <View style={styles.priceRow}>
        <View style={styles.priceColumn}>
          <Text style={styles.priceLabel}>PRECIO DE SALIDA</Text>
          <Text style={styles.priceValue}>{lot.startPrice}</Text>
        </View>
        <View style={styles.priceColumn}>
          <Text style={styles.priceLabel}>PUJA ACTUAL</Text>
          <Text style={[styles.priceValue, styles.currentBidValue]}>
            {lot.currentBid}
          </Text>
        </View>
      </View>

      {/* Bid button */}
      <TouchableOpacity
        style={styles.bidButton}
        activeOpacity={0.8}
        onPress={() => router.push('/exploracion/subasta-vivo')}
      >
        <Text style={styles.bidButtonText}>$ PUJAR</Text>
      </TouchableOpacity>

      {/* Details button */}
      <TouchableOpacity
        style={styles.detailsButton}
        activeOpacity={0.7}
        onPress={() => router.push('/exploracion/detalle-lote')}
      >
        <Text style={styles.detailsButtonText}>VER DETALLES</Text>
      </TouchableOpacity>

      {/* Divider between cards */}
      {!isLast && <View style={styles.divider} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Scrollable lot list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_LOTS.map((lot, index) =>
          renderLotCard(lot, index === MOCK_LOTS.length - 1)
        )}
      </ScrollView>

      {/* Bottom tab bar */}
      <BottomTabBar
        activeTab="explorar"
        onTabPress={(tab) => router.push(`/${tab}` as any)}
      />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
  },
  lotCardSpacing: {
    marginBottom: 40,
  },
  lotBadge: {
    fontSize: 11,
    color: '#999999',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 14,
  },
  imagePlaceholder: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  priceColumn: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  currentBidValue: {
    color: '#8A6D3B',
  },
  bidButton: {
    backgroundColor: '#FFD700',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 24,
    marginHorizontal: -20,
  },
});
