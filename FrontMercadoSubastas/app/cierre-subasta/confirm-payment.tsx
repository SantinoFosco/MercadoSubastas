import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';

type MedioPago = {
  id: number;
  tipo: 'tarjeta' | 'cuenta_bancaria' | 'cheque_certificado';
  estado: string;
  descripcion: string | null;
  moneda: string;
  esInternacional: boolean;
  montoCheque: number | null;
  montoDisponibleCheque: number | null;
};

type PrecioFinal = {
  precioFinal: number;
  comision: number;
  envio: number;
  total: number;
};

type PagoRegistrado = {
  mensaje: string;
  fechaLimitePago: string;
  total: number;
  moneda: string;
};

const formatCurrency = (n: number, moneda = 'ARS') => {
  const sym = moneda === 'USD' ? 'USD ' : '$';
  return sym + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function iconForTipo(tipo: MedioPago['tipo']): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  if (tipo === 'tarjeta') return 'credit-card-outline';
  if (tipo === 'cuenta_bancaria') return 'bank-outline';
  return 'checkbook';
}

function labelForMedio(medio: MedioPago): string {
  if (medio.tipo === 'tarjeta') return medio.descripcion ?? 'Tarjeta';
  if (medio.tipo === 'cuenta_bancaria') return medio.descripcion ?? 'Cuenta Bancaria';
  return medio.descripcion ?? 'Cheque Certificado';
}

function subLabelForMedio(medio: MedioPago): string {
  if (medio.tipo === 'cheque_certificado' && medio.montoDisponibleCheque != null) {
    return `Disponible: ${formatCurrency(Number(medio.montoDisponibleCheque))}`;
  }
  return medio.moneda === 'USD' ? 'Internacional · USD' : medio.moneda;
}

export default function ConfirmPaymentScreen() {
  const router = useRouter();
  const { subastaId, clienteId } = useLocalSearchParams<{ subastaId: string; clienteId: string }>();

  const [medios, setMedios]             = useState<MedioPago[]>([]);
  const [precio, setPrecio]             = useState<PrecioFinal | null>(null);
  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [loading, setLoading]           = useState(true);
  const [paying, setPaying]             = useState(false);
  const [pagoRegistrado, setPagoRegistrado] = useState<PagoRegistrado | null>(null);

  const fetchData = useCallback(async () => {
    if (!subastaId || !clienteId) return;
    try {
      const [resMedios, resPrecio] = await Promise.all([
        fetch(API_ENDPOINTS.mediosPagoCliente(clienteId)),
        fetch(API_ENDPOINTS.precioTotal(subastaId, clienteId)),
      ]);
      if (resMedios.ok) {
        const data = await resMedios.json();
        const verificados: MedioPago[] = (data.medios as MedioPago[]).filter(m => m.estado === 'verificado');
        setMedios(verificados);
        if (verificados.length > 0) setSelectedId(verificados[0].id);
      }
      if (resPrecio.ok) setPrecio(await resPrecio.json());
    } finally {
      setLoading(false);
    }
  }, [subastaId, clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFinalizar = async () => {
    if (!subastaId || !clienteId || selectedId == null) return;
    setPaying(true);
    try {
      const res = await fetch(
        API_ENDPOINTS.confirmarPago(subastaId, clienteId, selectedId),
        { method: 'POST' }
      );
      if (res.ok) {
        const data: PagoRegistrado = await res.json();
        setPagoRegistrado(data);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('No se pudo registrar el pago', err.detail ?? 'Intentá de nuevo.');
      }
    } catch {
      Alert.alert('Error', 'Error de conexión. Verificá tu internet e intentá de nuevo.');
    } finally {
      setPaying(false);
    }
  };

  // ── Pantalla de éxito (pago pendiente) ────────────────────────────────────
  if (pagoRegistrado) {
    const deadline = new Date(pagoRegistrado.fechaLimitePago);
    const deadlineStr = deadline.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingTop: 60 }]}>
          <View style={styles.successIconCircle}>
            <MaterialCommunityIcons name="email-check-outline" size={48} color="#8A6D3B" />
          </View>

          <Text style={styles.successTitle}>¡Email enviado!</Text>
          <Text style={styles.successSubtitle}>
            Te enviamos los detalles de tu compra con un link de pago.
          </Text>

          <View style={styles.pendingCard}>
            <Text style={styles.pendingLabel}>TOTAL A PAGAR</Text>
            <Text style={styles.pendingTotal}>
              {formatCurrency(pagoRegistrado.total, pagoRegistrado.moneda)}
            </Text>
            <View style={styles.pendingDivider} />
            <View style={styles.pendingRow}>
              <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#D32F2F" />
              <Text style={styles.pendingDeadline}>
                Fecha límite: <Text style={{ fontWeight: '700' }}>{deadlineStr}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#8A6D3B" style={{ marginTop: 2 }} />
            <Text style={styles.infoText}>
              Una vez recibido el pago, un representante de Mercado Subastas lo confirmará y recibirás otro email.{'\n\n'}
              Si no completás el pago antes de la fecha límite, se generará una multa del 10% y el caso podrá derivarse a instancias legales.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/exploracion')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Pantalla principal ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="menu" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Confirmar Pago</Text>
        <Text style={styles.subtitle}>
          Seleccioná tu medio de pago. Te enviaremos un email con el link para completar la transferencia.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" style={{ marginVertical: 32 }} />
        ) : (
          <>
            {/* Resumen */}
            <View style={styles.lotSummaryCard}>
              <Text style={styles.sectionLabel}>RESUMEN DE COMPRA</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Lo pujado</Text>
                <Text style={styles.summaryRowValue}>{formatCurrency(precio?.precioFinal ?? 0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Comisión</Text>
                <Text style={styles.summaryRowValue}>{formatCurrency(precio?.comision ?? 0)}</Text>
              </View>
              {(precio?.envio ?? 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Costo de envío</Text>
                  <Text style={styles.summaryRowValue}>{formatCurrency(precio!.envio)}</Text>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
              <Text style={styles.totalPrice}>{formatCurrency(precio?.total ?? 0)}</Text>
            </View>

            {/* Medios de pago */}
            <Text style={styles.paymentTitle}>Medio de Pago Verificado</Text>
            {medios.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#D32F2F" />
                <Text style={styles.emptyText}>
                  No tenés medios de pago verificados.{'\n'}Comunicate con la casa de subastas.
                </Text>
              </View>
            ) : (
              medios.map(medio => (
                <TouchableOpacity
                  key={medio.id}
                  style={[styles.paymentOption, selectedId === medio.id && styles.paymentOptionSelected]}
                  onPress={() => setSelectedId(medio.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentIconContainer}>
                    <MaterialCommunityIcons name={iconForTipo(medio.tipo)} size={22} color="#614F3A" />
                  </View>
                  <View style={styles.paymentTextContainer}>
                    <Text style={styles.paymentOptionTitle}>{labelForMedio(medio)}</Text>
                    <Text style={styles.paymentOptionSub}>{subLabelForMedio(medio)}</Text>
                  </View>
                  <View style={[styles.radioOuter, selectedId === medio.id && styles.radioOuterSelected]}>
                    {selectedId === medio.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))
            )}

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#8A6D3B" style={{ marginTop: 2 }} />
              <Text style={styles.infoText}>
                Al confirmar, recibirás un email con el detalle de tu compra y un link de pago. Tenés 72 horas para completar la transferencia.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, (paying || selectedId == null) && styles.primaryButtonDisabled]}
              onPress={handleFinalizar}
              activeOpacity={0.85}
              disabled={paying || selectedId == null}
            >
              <Text style={styles.primaryButtonText}>
                {paying ? 'ENVIANDO...' : 'Confirmar y recibir link de pago'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <BottomTabBar activeTab="mis-pujas" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 30 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666666', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  lotSummaryCard: { backgroundColor: '#F5F6F8', borderRadius: 16, padding: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#8A6D3B', letterSpacing: 1.5, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryRowLabel: { fontSize: 14, color: '#555555' },
  summaryRowValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  summaryDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 12 },
  totalLabel: { fontSize: 10, fontWeight: '700', color: '#8A6D3B', letterSpacing: 1.5, marginBottom: 4 },
  totalPrice: { fontSize: 36, fontWeight: '800', color: '#1A1A1A' },
  paymentTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  paymentOption: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#F0F0F0',
    padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  paymentOptionSelected: { borderColor: '#8A6D3B' },
  paymentIconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F6F8',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  paymentTextContainer: { flex: 1 },
  paymentOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  paymentOptionSub: { fontSize: 12, color: '#999999' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D0D0D0',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  radioOuterSelected: { borderColor: '#FFD700' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD700' },
  emptyCard: { backgroundColor: '#FFF5F5', borderRadius: 12, padding: 20, alignItems: 'center', gap: 10, marginBottom: 16 },
  emptyText: { fontSize: 13, color: '#D32F2F', textAlign: 'center', lineHeight: 20 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    marginTop: 8, marginBottom: 24,
  },
  infoText: { fontSize: 12, color: '#614F3A', lineHeight: 18, flex: 1 },
  primaryButton: {
    backgroundColor: '#FFD700', borderRadius: 8, height: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  // Success screen
  successIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginBottom: 10, textAlign: 'center' },
  successSubtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  pendingCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F0F0F0', padding: 24, marginBottom: 20,
  },
  pendingLabel: { fontSize: 11, fontWeight: '700', color: '#8A6D3B', letterSpacing: 1.5, marginBottom: 8 },
  pendingTotal: { fontSize: 34, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  pendingDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingDeadline: { fontSize: 13, color: '#D32F2F', flex: 1 },
});
