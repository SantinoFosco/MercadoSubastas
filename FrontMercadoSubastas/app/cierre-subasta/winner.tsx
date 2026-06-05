import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';

type ProductoComprado = {
  productoId: number;
  titulo: string;
  precioFinal: number;
  subastado: string;
  imagen: string | null;
};

type PrecioFinal = {
  precioFinal: number;
  comision: number;
  envio: number;
  total: number;
};

const formatCurrency = (n: number) =>
  '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WinnerScreen() {
  const router = useRouter();
  const { subastaId, clienteId } = useLocalSearchParams<{ subastaId: string; clienteId: string }>();

  const [compras, setCompras]   = useState<ProductoComprado[]>([]);
  const [precio, setPrecio]     = useState<PrecioFinal | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchData = useCallback(async () => {
    if (!subastaId || !clienteId) return;
    setLoading(true);
    try {
      const [resCompras, resPrecio] = await Promise.all([
        fetch(API_ENDPOINTS.misCompras(subastaId, clienteId)),
        fetch(API_ENDPOINTS.precioTotal(subastaId, clienteId)),
      ]);
      if (!resCompras.ok || !resPrecio.ok) {
        setError('No se pudo cargar la información de tu compra.');
        return;
      }
      setCompras(await resCompras.json());
      setPrecio(await resPrecio.json());
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [subastaId, clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Trofeo */}
        <View style={styles.trophyContainer}>
          <View style={styles.trophyCircle}>
            <MaterialCommunityIcons name="trophy-outline" size={32} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>¡Felicidades, sos el{'\n'}ganador!</Text>
        <Text style={styles.subtitle}>
          Superaste todas las pujas. A continuación encontrás el detalle de tu compra.
        </Text>

        {loading && <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 32 }} />}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && compras.map((item) => (
          <View key={item.productoId} style={styles.productCard}>
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>VENDIDO</Text>
            </View>

            {/* Imagen del producto o ícono fallback */}
            <View style={styles.imageContainer}>
              {item.imagen ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.imagen}` }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <MaterialCommunityIcons name="image-off-outline" size={64} color="#CCCCCC" />
              )}
            </View>

            <View style={styles.lotInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lotLabel}>ARTÍCULO</Text>
                <Text style={styles.productName}>{item.titulo}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>PRECIO FINAL</Text>
                <Text style={styles.priceValue}>{formatCurrency(item.precioFinal)}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Desglose de precios */}
        {!loading && !error && precio && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Resumen de pago</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Lo pujado</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(precio.precioFinal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Comisión</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(precio.comision)}</Text>
            </View>
            {precio.envio > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Costo de envío</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(precio.envio)}</Text>
              </View>
            )}
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatCurrency(precio.total)}</Text>
            </View>
          </View>
        )}

        <View style={styles.thankYouCard}>
          <Text style={styles.thankYouText}>
            Gracias por participar en{' '}
            <Text style={styles.thankYouBold}>Mercado Subastas</Text>
            . Nos pondremos en contacto para coordinar la entrega.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push({
            pathname: '/cierre-subasta/delivery-details',
            params: { subastaId: subastaId ?? '', clienteId: clienteId ?? '' },
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Confirmar entrega</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/exploracion')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Volver a explorar</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomTabBar activeTab="explorar" onTabPress={(tab) => router.push(`/${tab}` as any)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 30 },
  trophyContainer: { alignItems: 'center', marginBottom: 20 },
  trophyCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#614F3A', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 28, fontWeight: '800', color: '#1A1A1A',
    lineHeight: 34, marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: '#666666', lineHeight: 20,
    marginBottom: 24, textAlign: 'center',
  },
  errorText: { color: '#E53935', textAlign: 'center', marginTop: 16 },
  productCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F0F0F0', padding: 16, marginBottom: 16,
  },
  soldBadge: {
    backgroundColor: '#8A6D3B', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 4, alignSelf: 'flex-start', marginBottom: 12,
  },
  soldBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  imageContainer: {
    alignItems: 'center', marginBottom: 16,
    backgroundColor: '#FAFAFA', borderRadius: 12, paddingVertical: 20,
    minHeight: 100,
  },
  productImage: { width: 180, height: 160 },
  lotInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 4,
  },
  lotLabel: {
    fontSize: 10, fontWeight: '700', color: '#999999',
    letterSpacing: 1, marginBottom: 4,
  },
  productName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', lineHeight: 22 },
  priceContainer: { alignItems: 'flex-end' },
  priceLabel: {
    fontSize: 10, fontWeight: '700', color: '#999999',
    letterSpacing: 1, marginBottom: 4,
  },
  priceValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  breakdownCard: {
    backgroundColor: '#F5F6F8', borderRadius: 12, padding: 20, marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  breakdownLabel: { fontSize: 14, color: '#555555' },
  breakdownValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  totalRow: {
    borderTopWidth: 1, borderTopColor: '#E0E0E0',
    marginTop: 8, paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#8A6D3B' },
  thankYouCard: { backgroundColor: '#F5F6F8', borderRadius: 12, padding: 20, marginBottom: 24 },
  thankYouText: { fontSize: 13, color: '#555555', lineHeight: 20, textAlign: 'center' },
  thankYouBold: { fontWeight: '800', color: '#1A1A1A' },
  primaryButton: {
    backgroundColor: '#FFD700', borderRadius: 8, height: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#FFFFFF', borderRadius: 8, height: 56,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  secondaryButtonText: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
});
