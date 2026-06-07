import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { Menu, Text } from 'react-native-paper';
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

// Mismas opciones que en el registro (PASO 4 DE 4 — app/payments.tsx) para que
// los formularios de alta de medios de pago sean consistentes en toda la app.
const COUNTRIES = [
  { label: 'Argentina', value: 1 },
  { label: 'Uruguay',   value: 2 },
  { label: 'Paraguay',  value: 3 },
  { label: 'Chile',     value: 4 },
];

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Cabal', 'Naranja'];

const MONTHS = [
  { label: 'Enero',      value: '01' },
  { label: 'Febrero',    value: '02' },
  { label: 'Marzo',      value: '03' },
  { label: 'Abril',      value: '04' },
  { label: 'Mayo',       value: '05' },
  { label: 'Junio',      value: '06' },
  { label: 'Julio',      value: '07' },
  { label: 'Agosto',     value: '08' },
  { label: 'Septiembre', value: '09' },
  { label: 'Octubre',    value: '10' },
  { label: 'Noviembre',  value: '11' },
  { label: 'Diciembre',  value: '12' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => ({
  label: String(currentYear + i),
  value: String(currentYear + i),
}));

type FormTab = 'tarjeta' | 'cuenta_bancaria' | 'cheque_certificado' | null;

export default function MediosPagoScreen() {
  const router = useRouter();
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState<FormTab>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tarjeta fields (mismos inputs que en el registro)
  const [cardDescripcion, setCardDescripcion] = useState('');
  const [cardTitular, setCardTitular] = useState('');
  const [cardFullNumber, setCardFullNumber] = useState('');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');
  const [cardMonthMenuVisible, setCardMonthMenuVisible] = useState(false);
  const [cardYearMenuVisible, setCardYearMenuVisible] = useState(false);
  const [cardMarca, setCardMarca] = useState('');
  const [cardTipo, setCardTipo] = useState<'credito' | 'debito'>('credito');
  const [cardEsInternacional, setCardEsInternacional] = useState(false);

  // Cuenta bancaria fields (mismos inputs que en el registro)
  const [bankDescripcion, setBankDescripcion] = useState('');
  const [bankTitular, setBankTitular] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCbu, setBankCbu] = useState('');
  const [bankAlias, setBankAlias] = useState('');
  const [bankPais, setBankPais] = useState(1);
  const [bankMenuVisible, setBankMenuVisible] = useState(false);

  // Cheque fields (mismos inputs que en el registro)
  const [checkDescripcion, setCheckDescripcion] = useState('');
  const [checkBank, setCheckBank] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkMonto, setCheckMonto] = useState('');
  const [checkObservaciones, setCheckObservaciones] = useState('');

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
    setCardDescripcion(''); setCardTitular(''); setCardFullNumber('');
    setCardMonth(''); setCardYear(''); setCardMarca('');
    setCardTipo('credito'); setCardEsInternacional(false);
    setBankDescripcion(''); setBankTitular(''); setBankName('');
    setBankCbu(''); setBankAlias(''); setBankPais(1);
    setCheckDescripcion(''); setCheckBank(''); setCheckNumber('');
    setCheckMonto(''); setCheckObservaciones('');
  };

  const handleCardNumberChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})(?=.)/g, '$1 ');
    setCardFullNumber(formatted);
  };

  const handleAddTarjeta = async () => {
    const rawDigits = cardFullNumber.replace(/\s/g, '');
    if (!cardTitular.trim())     { Alert.alert('Campos incompletos', 'Ingresá el titular de la tarjeta.'); return; }
    if (rawDigits.length !== 16) { Alert.alert('Campos incompletos', 'Ingresá los 16 dígitos de la tarjeta.'); return; }
    if (!cardMarca)              { Alert.alert('Campos incompletos', 'Seleccioná la marca de la tarjeta.'); return; }
    if (!cardMonth || !cardYear) { Alert.alert('Campos incompletos', 'Seleccioná el mes y año de vencimiento.'); return; }
    const vencimientoISO = `${cardYear}-${cardMonth}-01`;

    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.medioPagoTarjeta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente:         session!.identificador,
          moneda:          cardEsInternacional ? 'USD' : 'ARS',
          descripcion:     cardDescripcion.trim() || null,
          titular:         cardTitular.trim().toUpperCase(),
          ultimos4Digitos: rawDigits.slice(-4),
          vencimiento:     vencimientoISO,
          marca:           cardMarca,
          tipoTarjeta:     cardTipo,
          esInternacional: cardEsInternacional,
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
    if (!bankTitular.trim())       { Alert.alert('Campos incompletos', 'Ingresá el titular de la cuenta.'); return; }
    if (!bankName.trim())          { Alert.alert('Campos incompletos', 'Ingresá el nombre del banco.'); return; }
    if (!/^\d{22}$/.test(bankCbu)) { Alert.alert('CBU inválido', 'El CBU debe tener exactamente 22 dígitos numéricos.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.medioPagoCuenta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente:     session!.identificador,
          moneda:      'ARS',
          descripcion: bankDescripcion.trim() || null,
          titular:     bankTitular.trim(),
          banco:       bankName.trim(),
          cbu:         bankCbu.trim(),
          alias:       bankAlias.trim() || null,
          paisBanco:   bankPais,
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
    if (!checkBank.trim())   { Alert.alert('Campos incompletos', 'Ingresá el banco emisor.'); return; }
    if (!checkNumber.trim()) { Alert.alert('Campos incompletos', 'Ingresá el número de cheque.'); return; }
    const montoNum = parseFloat(checkMonto.replace(',', '.'));
    if (isNaN(montoNum) || montoNum <= 0) { Alert.alert('Monto inválido', 'Ingresá un monto válido mayor a 0.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.medioPagoCheque, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente:       session!.identificador,
          moneda:        'ARS',
          descripcion:   checkDescripcion.trim() || null,
          banco:         checkBank.trim(),
          numeroCheque:  checkNumber.trim(),
          monto:         montoNum,
          observaciones: checkObservaciones.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        Alert.alert('Error', d.detail ?? 'No se pudo registrar el cheque.');
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

        {/* Tarjeta form — mismos inputs que en el registro (PASO 4 DE 4) */}
        {showForm === 'tarjeta' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nueva Tarjeta</Text>

            <Text style={styles.formLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. Visa personal"
              value={cardDescripcion} onChangeText={setCardDescripcion}
            />

            <Text style={styles.formLabel}>TITULAR (como figura en la tarjeta)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="NOMBRE APELLIDO"
              value={cardTitular} onChangeText={setCardTitular}
              autoCapitalize="characters"
            />

            <Text style={styles.formLabel}>NÚMERO DE TARJETA</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="0000 0000 0000 0000"
              value={cardFullNumber} onChangeText={handleCardNumberChange}
              keyboardType="numeric" maxLength={19}
            />

            <Text style={styles.formLabel}>VENCIMIENTO</Text>
            <View style={styles.formRowFields}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Menu
                  visible={cardMonthMenuVisible}
                  onDismiss={() => setCardMonthMenuVisible(false)}
                  contentStyle={{ backgroundColor: 'white' }}
                  anchor={
                    <Pressable onPress={() => setCardMonthMenuVisible(true)}>
                      <View style={styles.pickerContainer}>
                        <Text style={[styles.pickerText, !cardMonth && styles.pickerPlaceholder]}>
                          {cardMonth ? MONTHS.find(m => m.value === cardMonth)?.label : 'Mes'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#8A6D3B" />
                      </View>
                    </Pressable>
                  }
                >
                  {MONTHS.map(m => (
                    <Menu.Item
                      key={m.value}
                      title={m.label}
                      titleStyle={{ color: '#333' }}
                      onPress={() => { setCardMonth(m.value); setCardMonthMenuVisible(false); }}
                    />
                  ))}
                </Menu>
              </View>

              <View style={{ flex: 1 }}>
                <Menu
                  visible={cardYearMenuVisible}
                  onDismiss={() => setCardYearMenuVisible(false)}
                  contentStyle={{ backgroundColor: 'white' }}
                  anchor={
                    <Pressable onPress={() => setCardYearMenuVisible(true)}>
                      <View style={styles.pickerContainer}>
                        <Text style={[styles.pickerText, !cardYear && styles.pickerPlaceholder]}>
                          {cardYear || 'Año'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#8A6D3B" />
                      </View>
                    </Pressable>
                  }
                >
                  {YEARS.map(y => (
                    <Menu.Item
                      key={y.value}
                      title={y.label}
                      titleStyle={{ color: '#333' }}
                      onPress={() => { setCardYear(y.value); setCardYearMenuVisible(false); }}
                    />
                  ))}
                </Menu>
              </View>
            </View>

            <Text style={styles.formLabel}>MARCA</Text>
            <View style={styles.chipRow}>
              {CARD_BRANDS.map(brand => (
                <Pressable
                  key={brand}
                  style={[styles.chip, cardMarca === brand && styles.chipSelected]}
                  onPress={() => setCardMarca(brand)}
                >
                  <Text style={[styles.chipText, cardMarca === brand && styles.chipTextSelected]}>
                    {brand}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>TIPO DE TARJETA</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, cardTipo === 'credito' && styles.toggleBtnSelected]}
                onPress={() => setCardTipo('credito')}
              >
                <Text style={[styles.toggleText, cardTipo === 'credito' && styles.toggleTextSelected]}>
                  Crédito
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, cardTipo === 'debito' && styles.toggleBtnSelected]}
                onPress={() => setCardTipo('debito')}
              >
                <Text style={[styles.toggleText, cardTipo === 'debito' && styles.toggleTextSelected]}>
                  Débito
                </Text>
              </Pressable>
            </View>

            <Text style={styles.formLabel}>¿ES INTERNACIONAL?</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, !cardEsInternacional && styles.toggleBtnSelected]}
                onPress={() => setCardEsInternacional(false)}
              >
                <Text style={[styles.toggleText, !cardEsInternacional && styles.toggleTextSelected]}>
                  Nacional (ARS)
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, cardEsInternacional && styles.toggleBtnSelected]}
                onPress={() => setCardEsInternacional(true)}
              >
                <Text style={[styles.toggleText, cardEsInternacional && styles.toggleTextSelected]}>
                  Internacional (USD)
                </Text>
              </Pressable>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddTarjeta} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitButtonText}>Agregar Tarjeta</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Cuenta bancaria form — mismos inputs que en el registro (PASO 4 DE 4) */}
        {showForm === 'cuenta_bancaria' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nueva Cuenta Bancaria</Text>

            <Text style={styles.formLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. Cuenta principal Banco Nación"
              value={bankDescripcion} onChangeText={setBankDescripcion}
            />

            <Text style={styles.formLabel}>TITULAR DE LA CUENTA</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Nombre completo del titular"
              value={bankTitular} onChangeText={setBankTitular}
            />

            <Text style={styles.formLabel}>NOMBRE DEL BANCO</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. Banco Nación Argentina"
              value={bankName} onChangeText={setBankName}
            />

            <Text style={styles.formLabel}>CBU (22 dígitos)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="0000000000000000000000"
              value={bankCbu} onChangeText={setBankCbu}
              keyboardType="numeric" maxLength={22}
            />

            <Text style={styles.formLabel}>ALIAS (OPCIONAL)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. nombre.apellido.banco"
              value={bankAlias} onChangeText={setBankAlias}
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>PAÍS DEL BANCO</Text>
            <Menu
              visible={bankMenuVisible}
              onDismiss={() => setBankMenuVisible(false)}
              contentStyle={{ backgroundColor: 'white' }}
              anchor={
                <Pressable onPress={() => setBankMenuVisible(true)}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.pickerText}>
                      {COUNTRIES.find(c => c.value === bankPais)?.label}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8A6D3B" />
                  </View>
                </Pressable>
              }
            >
              {COUNTRIES.map(c => (
                <Menu.Item
                  key={c.value} title={c.label} titleStyle={{ color: '#333' }}
                  onPress={() => { setBankPais(c.value); setBankMenuVisible(false); }}
                />
              ))}
            </Menu>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddCuenta} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitButtonText}>Agregar Cuenta</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Cheque form — mismos inputs que en el registro (PASO 4 DE 4) */}
        {showForm === 'cheque_certificado' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nuevo Cheque Certificado</Text>

            <Text style={styles.formLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. Cheque Banco Galicia por maquinaria"
              value={checkDescripcion} onChangeText={setCheckDescripcion}
            />

            <Text style={styles.formLabel}>BANCO EMISOR</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. Banco Galicia"
              value={checkBank} onChangeText={setCheckBank}
            />

            <Text style={styles.formLabel}>NÚMERO DE CHEQUE</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. 00123456"
              value={checkNumber} onChangeText={setCheckNumber}
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>MONTO (ARS)</Text>
            <TextInput
              style={styles.input} placeholderTextColor="#999"
              placeholder="Ej. 500000"
              value={checkMonto} onChangeText={setCheckMonto}
              keyboardType="decimal-pad"
            />

            <Text style={styles.formLabel}>OBSERVACIONES (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholderTextColor="#999"
              placeholder="Ej. Válido hasta el 30/06/2026"
              value={checkObservaciones} onChangeText={setCheckObservaciones}
              multiline numberOfLines={3}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleAddCheque} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitButtonText}>Registrar Cheque</Text>}
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

  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  formRowFields: {
    flexDirection: 'row',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  pickerText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  pickerPlaceholder: {
    color: '#999999',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  chipSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  chipTextSelected: {
    color: '#1A1A1A',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  toggleTextSelected: {
    color: '#1A1A1A',
  },
});
