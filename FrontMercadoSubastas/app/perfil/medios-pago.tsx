import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_ENDPOINTS } from '@/constants/api';
import { SessionStore } from '@/store/session';

type MedioPago = {
  id: number;
  tipo: 'tarjeta' | 'cuenta_bancaria' | 'cheque_certificado';
  estado: 'pendiente' | 'verificado' | 'rechazado';
  descripcion: string | null;
  moneda: string;
  esInternacional: boolean;
  montoCheque: number | null;
  montoDisponibleCheque: number | null;
};

const TIPO_LABEL: Record<string, string> = {
  tarjeta: 'Tarjeta',
  cuenta_bancaria: 'Cuenta Bancaria',
  cheque_certificado: 'Cheque Certificado',
};

const TIPO_ICON: Record<string, string> = {
  tarjeta: 'credit-card-outline',
  cuenta_bancaria: 'bank-outline',
  cheque_certificado: 'checkbook',
};

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  bg: '#FFF3E0', color: '#E65100' },
  verificado: { label: 'Verificado', bg: '#E8F5E9', color: '#2E7D32' },
  rechazado:  { label: 'Rechazado',  bg: '#FCE4EC', color: '#C62828' },
};

type FormTab = 'tarjeta' | 'cuenta_bancaria' | 'cheque_certificado' | null;

export default function MediosPagoScreen() {
  const router = useRouter();
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState<FormTab>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tarjeta fields
  const [titular, setTitular] = useState('');
  const [ultimos4, setUltimos4] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [marca, setMarca] = useState('');
  const [tipoTarjeta, setTipoTarjeta] = useState('');

  // Cuenta bancaria fields
  const [titularCuenta, setTitularCuenta] = useState('');
  const [banco, setBanco] = useState('');
  const [cbu, setCbu] = useState('');

  // Cheque fields
  const [bancoCheque, setBancoCheque] = useState('');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [montoCheque, setMontoCheque] = useState('');

  const session = SessionStore.get();

  const fetchMedios = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.mediosPagoCliente(session.identificador));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMedios(data.medios ?? []);
    } catch {
      setError('No se pudieron cargar los medios de pago.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedios(); }, [fetchMedios]);

  const resetForms = () => {
    setTitular(''); setUltimos4(''); setVencimiento(''); setMarca(''); setTipoTarjeta('');
    setTitularCuenta(''); setBanco(''); setCbu('');
    setBancoCheque(''); setNumeroCheque(''); setMontoCheque('');
  };

  const handleAddTarjeta = async () => {
    if (!titular || !ultimos4 || !vencimiento || !marca || !tipoTarjeta) {
      Alert.alert('Campos incompletos', 'Completá todos los campos obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.medioPagoTarjeta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: session!.identificador,
          titular,
          ultimos4Digitos: ultimos4,
          vencimiento,
          marca,
          tipoTarjeta,
          moneda: 'ARS',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        Alert.alert('Error', d.detail ?? 'No se pudo agregar la tarjeta.');
        return;
      }
      Alert.alert('Listo', 'Tarjeta enviada para verificación.');
      setShowForm(null);
      resetForms();
      fetchMedios();
    } catch {
      Alert.alert('Error', 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCuenta = async () => {
    if (!titularCuenta || !banco || !cbu) {
      Alert.alert('Campos incompletos', 'Completá todos los campos obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.medioPagoCuenta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: session!.identificador,
          titular: titularCuenta,
          banco,
          cbu,
          moneda: 'ARS',
          paisBanco: 1,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        Alert.alert('Error', d.detail ?? 'No se pudo agregar la cuenta.');
        return;
      }
      Alert.alert('Listo', 'Cuenta enviada para verificación.');
      setShowForm(null);
      resetForms();
      fetchMedios();
    } catch {
      Alert.alert('Error', 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCheque = async () => {
    if (!bancoCheque || !numeroCheque || !montoCheque) {
      Alert.alert('Campos incompletos', 'Completá todos los campos obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.medioPagoCheque, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: session!.identificador,
          banco: bancoCheque,
          numeroCheque,
          monto: parseFloat(montoCheque),
          moneda: 'ARS',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        Alert.alert('Error', d.detail ?? 'No se pudo agregar el cheque.');
        return;
      }
      Alert.alert('Listo', 'Cheque enviado para verificación.');
      setShowForm(null);
      resetForms();
      fetchMedios();
    } catch {
      Alert.alert('Error', 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medios de Pago</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 32 }} />}
        {!!error && !loading && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && medios.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="credit-card-off-outline" size={56} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>Sin medios de pago</Text>
            <Text style={styles.emptySubtitle}>
              Agregá un método de pago para poder pujar en subastas.
            </Text>
          </View>
        )}

        {!loading && medios.map((medio) => {
          const est = ESTADO_CONFIG[medio.estado] ?? ESTADO_CONFIG.pendiente;
          return (
            <View key={medio.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardIconCircle}>
                  <MaterialCommunityIcons
                    name={TIPO_ICON[medio.tipo] as any}
                    size={22}
                    color="#8A6D3B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTipo}>{TIPO_LABEL[medio.tipo] ?? medio.tipo}</Text>
                  {medio.descripcion ? (
                    <Text style={styles.cardDesc}>{medio.descripcion}</Text>
                  ) : null}
                  <Text style={styles.cardMoneda}>{medio.moneda}{medio.esInternacional ? ' · Internacional' : ''}</Text>
                  {medio.tipo === 'cheque_certificado' && medio.montoDisponibleCheque != null && (
                    <Text style={styles.cardMoneda}>
                      Disponible: ${Number(medio.montoDisponibleCheque).toLocaleString('es-AR')}
                    </Text>
                  )}
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: est.bg }]}>
                  <Text style={[styles.estadoText, { color: est.color }]}>{est.label}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Add buttons */}
        <Text style={styles.sectionLabel}>AGREGAR MEDIO DE PAGO</Text>

        <View style={styles.addButtons}>
          {(['tarjeta', 'cuenta_bancaria', 'cheque_certificado'] as FormTab[]).map((tipo) => (
            <TouchableOpacity
              key={tipo!}
              style={[styles.addButton, showForm === tipo && styles.addButtonActive]}
              onPress={() => setShowForm(showForm === tipo ? null : tipo)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={TIPO_ICON[tipo!] as any}
                size={18}
                color={showForm === tipo ? '#8A6D3B' : '#666'}
              />
              <Text style={[styles.addButtonText, showForm === tipo && styles.addButtonTextActive]}>
                {TIPO_LABEL[tipo!]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarjeta form */}
        {showForm === 'tarjeta' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nueva Tarjeta</Text>
            <TextInput style={styles.input} placeholder="Titular" value={titular} onChangeText={setTitular} />
            <TextInput style={styles.input} placeholder="Últimos 4 dígitos" value={ultimos4} onChangeText={setUltimos4} keyboardType="numeric" maxLength={4} />
            <TextInput style={styles.input} placeholder="Vencimiento (AAAA-MM-DD)" value={vencimiento} onChangeText={setVencimiento} />
            <TextInput style={styles.input} placeholder="Marca (Visa, Mastercard...)" value={marca} onChangeText={setMarca} />
            <TextInput style={styles.input} placeholder="Tipo (debito, credito)" value={tipoTarjeta} onChangeText={setTipoTarjeta} />
            <TouchableOpacity style={styles.submitButton} onPress={handleAddTarjeta} disabled={submitting} activeOpacity={0.85}>
              <Text style={styles.submitButtonText}>{submitting ? 'Enviando...' : 'Agregar Tarjeta'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cuenta bancaria form */}
        {showForm === 'cuenta_bancaria' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nueva Cuenta Bancaria</Text>
            <TextInput style={styles.input} placeholder="Titular" value={titularCuenta} onChangeText={setTitularCuenta} />
            <TextInput style={styles.input} placeholder="Banco" value={banco} onChangeText={setBanco} />
            <TextInput style={styles.input} placeholder="CBU / IBAN" value={cbu} onChangeText={setCbu} keyboardType="numeric" />
            <TouchableOpacity style={styles.submitButton} onPress={handleAddCuenta} disabled={submitting} activeOpacity={0.85}>
              <Text style={styles.submitButtonText}>{submitting ? 'Enviando...' : 'Agregar Cuenta'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cheque form */}
        {showForm === 'cheque_certificado' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nuevo Cheque Certificado</Text>
            <TextInput style={styles.input} placeholder="Banco" value={bancoCheque} onChangeText={setBancoCheque} />
            <TextInput style={styles.input} placeholder="Número de cheque" value={numeroCheque} onChangeText={setNumeroCheque} />
            <TextInput style={styles.input} placeholder="Monto" value={montoCheque} onChangeText={setMontoCheque} keyboardType="numeric" />
            <TouchableOpacity style={styles.submitButton} onPress={handleAddCheque} disabled={submitting} activeOpacity={0.85}>
              <Text style={styles.submitButtonText}>{submitting ? 'Enviando...' : 'Agregar Cheque'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  errorText: { color: '#D32F2F', textAlign: 'center', marginTop: 32 },
  emptyContainer: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center',
  },
  cardTipo: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  cardMoneda: { fontSize: 11, color: '#999', marginTop: 2 },
  estadoBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  estadoText: { fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#999',
    letterSpacing: 0.8, marginTop: 8, marginBottom: 4,
  },
  addButtons: { flexDirection: 'row', gap: 8 },
  addButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingVertical: 12, backgroundColor: '#FAFBFD',
  },
  addButtonActive: { borderColor: '#FFD700', backgroundColor: '#FFF9E6' },
  addButtonText: { fontSize: 11, fontWeight: '600', color: '#666' },
  addButtonTextActive: { color: '#8A6D3B' },

  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    gap: 10,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  submitButton: {
    backgroundColor: '#FFD700', borderRadius: 10,
    height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
