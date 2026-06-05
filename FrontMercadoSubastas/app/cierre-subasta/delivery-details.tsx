import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { SessionStore } from '@/store/session';

type DeliveryMethod = 'domicilio' | 'retiro';

type PrecioFinal = {
  precioFinal: number;
  comision: number;
  envio: number;
  total: number;
};

const formatCurrency = (n: number) =>
  '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const { subastaId, clienteId } = useLocalSearchParams<{ subastaId: string; clienteId: string }>();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('domicilio');
  const [precio, setPrecio]   = useState<PrecioFinal | null>(null);
  const [direccion, setDireccion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    if (!subastaId || !clienteId) return;
    try {
      const [precioRes, perfilRes] = await Promise.all([
        fetch(API_ENDPOINTS.precioTotal(subastaId, clienteId)),
        fetch(API_ENDPOINTS.perfilCompleto(clienteId)),
      ]);
      if (precioRes.ok) setPrecio(await precioRes.json());
      if (perfilRes.ok) {
        const perfil = await perfilRes.json();
        setDireccion(perfil.direccion ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [subastaId, clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleContinuar = async () => {
    if (!subastaId || !clienteId) return;
    setConfirming(true);
    try {
      await fetch(API_ENDPOINTS.confirmarEnvio(subastaId, clienteId, deliveryMethod), {
        method: 'POST',
      });
      router.push({
        pathname: '/cierre-subasta/confirm-payment',
        params: { subastaId, clienteId },
      });
    } catch {
      Alert.alert('Error', 'No se pudo confirmar el método de entrega. Intentá de nuevo.');
    } finally {
      setConfirming(false);
    }
  };

  // Envío: se cobra solo si elige domicilio (el back lo calcula tras confirmar_envio)
  const envioVisible = deliveryMethod === 'domicilio' ? (precio?.envio ?? 0) : 0;
  const totalVisible = deliveryMethod === 'domicilio'
    ? (precio?.total ?? 0)
    : ((precio?.precioFinal ?? 0) + (precio?.comision ?? 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
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
        {/* Progress Stepper */}
        <View style={styles.stepper}>
          {/* Step 1 - Completed */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCompleted]}>
              <Text style={styles.stepNumberActive}>1</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>GANADOR</Text>
          </View>

          <View style={[styles.stepLine, styles.stepLineActive]} />

          {/* Step 2 - Active */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Text style={styles.stepNumberActive}>2</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>DETALLES</Text>
          </View>

          <View style={[styles.stepLine, styles.stepLineInactive]} />

          {/* Step 3 - Pending */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepPending]}>
              <Text style={styles.stepNumberPending}>3</Text>
            </View>
            <Text style={styles.stepLabel}>PAGO</Text>
          </View>
        </View>

        {/* Método de Entrega */}
        <Text style={styles.sectionTitle}>Método de Entrega</Text>

        {/* Option: Envío a domicilio */}
        <TouchableOpacity
          style={[
            styles.deliveryOption,
            deliveryMethod === 'domicilio' && styles.deliveryOptionSelected,
          ]}
          onPress={() => setDeliveryMethod('domicilio')}
          activeOpacity={0.8}
        >
          <View style={styles.deliveryOptionContent}>
            <View style={styles.deliveryIconContainer}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={22} color="#614F3A" />
            </View>
            <View style={styles.deliveryTextContainer}>
              <Text style={styles.deliveryOptionTitle}>Envío a domicilio</Text>
              <Text style={styles.deliveryOptionAddress}>
<<<<<<< HEAD
                {SessionStore.get()?.direccion ?? 'Dirección no disponible'}
=======
                {direccion || 'Cargando dirección...'}
>>>>>>> 6684904f7b6ab89ab873382485f9091cbbf5da3d
              </Text>
            </View>
            <View style={styles.radioOuter}>
              {deliveryMethod === 'domicilio' && <View style={styles.radioInner} />}
            </View>
          </View>
        </TouchableOpacity>

        {/* Option: Retiro personal */}
        <TouchableOpacity
          style={[
            styles.deliveryOption,
            deliveryMethod === 'retiro' && styles.deliveryOptionSelected,
          ]}
          onPress={() => setDeliveryMethod('retiro')}
          activeOpacity={0.8}
        >
          <View style={styles.deliveryOptionContent}>
            <View style={styles.deliveryIconContainer}>
              <MaterialCommunityIcons name="map-marker-outline" size={22} color="#614F3A" />
            </View>
            <View style={styles.deliveryTextContainer}>
              <Text style={styles.deliveryOptionTitle}>Retiro personal</Text>
            </View>
            <View style={styles.radioOuter}>
              {deliveryMethod === 'retiro' && <View style={styles.radioInner} />}
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons name="alert-outline" size={16} color="#D32F2F" />
            <Text style={styles.warningText}>
              Advertencia: El retiro personal anula la cobertura del Seguro de Envío.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Resumen de Costos */}
        <Text style={styles.sectionTitle}>Resumen de Costos</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.costSummaryCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Precio final</Text>
              <Text style={styles.costValue}>{formatCurrency(precio?.precioFinal ?? 0)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Comisión</Text>
              <Text style={styles.costValue}>{formatCurrency(precio?.comision ?? 0)}</Text>
            </View>
            {envioVisible > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Costo de envío</Text>
                <Text style={styles.costValue}>{formatCurrency(envioVisible)}</Text>
              </View>
            )}

            <View style={styles.costDivider} />

            <View style={styles.costRow}>
              <Text style={styles.totalLabel}>Total a Pagar</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalVisible)}</Text>
            </View>
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.primaryButton, (confirming || loading) && styles.primaryButtonDisabled]}
          onPress={handleContinuar}
          activeOpacity={0.85}
          disabled={confirming || loading}
        >
          <Text style={styles.primaryButtonText}>
            {confirming ? 'PROCESANDO...' : 'CONTINUAR AL PAGO'}
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

  /* Stepper */
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: '#8A6D3B',
  },
  stepActive: {
    backgroundColor: '#8A6D3B',
  },
  stepPending: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  stepNumberActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepNumberPending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999999',
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: '#8A6D3B',
  },
  stepLineInactive: {
    backgroundColor: '#E4E2DD',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
  },
  stepLabelActive: {
    color: '#8A6D3B',
  },

  /* Section */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },

  /* Delivery Options */
  deliveryOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    padding: 16,
    marginBottom: 12,
  },
  deliveryOptionSelected: {
    borderColor: '#8A6D3B',
  },
  deliveryOptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deliveryTextContainer: {
    flex: 1,
  },
  deliveryOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  deliveryOptionAddress: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 4,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8A6D3B',
  },

  /* Warning */
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#D32F2F',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },

  /* Cost Summary */
  costSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
    marginBottom: 24,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 14,
    color: '#555555',
  },
  costValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  /* Button */
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
