import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Appbar, Button, Menu, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../constants/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentMethod = {
  id: number;
  tipo: 'cuenta_bancaria' | 'tarjeta' | 'cheque_certificado';
  descripcion: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

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

const TIPO_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  cuenta_bancaria:    'bank-outline',
  tarjeta:            'credit-card-outline',
  cheque_certificado: 'file-document-outline',
};

const TIPO_LABELS: Record<string, string> = {
  cuenta_bancaria:    'Cuenta Bancaria',
  tarjeta:            'Tarjeta',
  cheque_certificado: 'Cheque Certificado',
};

// ── Inline error ──────────────────────────────────────────────────────────────

function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D32F2F" style={{ marginRight: 8 }} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const router = useRouter();
  const { clienteId } = useLocalSearchParams<{ clienteId: string }>();
  const clienteIdNum = clienteId ? parseInt(clienteId, 10) : 0;

  const [expandedCard, setExpandedCard]       = useState<string | null>(null);
  const [registeredMethods, setRegisteredMethods] = useState<PaymentMethod[]>([]);

  // ── Tarjeta state ──────────────────────────────────────────────────────────
  const [cardDescripcion,      setCardDescripcion]      = useState('');
  const [cardTitular,          setCardTitular]          = useState('');
  const [cardFullNumber,       setCardFullNumber]       = useState('');
  const [cardMonth,            setCardMonth]            = useState('');
  const [cardYear,             setCardYear]             = useState('');
  const [cardMonthMenuVisible, setCardMonthMenuVisible] = useState(false);
  const [cardYearMenuVisible,  setCardYearMenuVisible]  = useState(false);
  const [cardMarca,            setCardMarca]            = useState('');
  const [cardTipo,             setCardTipo]             = useState<'credito' | 'debito'>('credito');
  const [cardEsInternacional,  setCardEsInternacional]  = useState(false);
  const [cardLoading,          setCardLoading]          = useState(false);
  const [cardError,            setCardError]            = useState('');

  // ── Cuenta Bancaria state ──────────────────────────────────────────────────
  const [bankDescripcion,  setBankDescripcion]  = useState('');
  const [bankTitular,      setBankTitular]      = useState('');
  const [bankName,         setBankName]         = useState('');
  const [bankCbu,          setBankCbu]          = useState('');
  const [bankAlias,        setBankAlias]        = useState('');
  const [bankPais,         setBankPais]         = useState(1);
  const [bankMenuVisible,  setBankMenuVisible]  = useState(false);
  const [bankLoading,      setBankLoading]      = useState(false);
  const [bankError,        setBankError]        = useState('');

  // ── Cheque state ───────────────────────────────────────────────────────────
  const [checkDescripcion,   setCheckDescripcion]   = useState('');
  const [checkBank,          setCheckBank]          = useState('');
  const [checkNumber,        setCheckNumber]        = useState('');
  const [checkMonto,         setCheckMonto]         = useState('');
  const [checkObservaciones, setCheckObservaciones] = useState('');
  const [checkLoading,       setCheckLoading]       = useState(false);
  const [checkError,         setCheckError]         = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleSection = (id: string) =>
    setExpandedCard(prev => (prev === id ? null : id));

  const handleCardNumberChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})(?=.)/g, '$1 ');
    setCardFullNumber(formatted);
  };

  const addMethod = (method: PaymentMethod) => {
    setRegisteredMethods(prev => [...prev, method]);
    setExpandedCard(null);
  };

  // ── Save Card ──────────────────────────────────────────────────────────────

  const handleSaveCard = async () => {
    setCardError('');
    const rawDigits = cardFullNumber.replace(/\s/g, '');
    if (!cardTitular.trim())      { setCardError('Ingresá el titular de la tarjeta.'); return; }
    if (rawDigits.length !== 16)  { setCardError('Ingresá los 16 dígitos de la tarjeta.'); return; }
    if (!cardMarca)               { setCardError('Seleccioná la marca de la tarjeta.'); return; }
    if (!cardMonth || !cardYear)  { setCardError('Seleccioná el mes y año de vencimiento.'); return; }
    const vencimientoISO = `${cardYear}-${cardMonth}-01`;

    setCardLoading(true);
    try {
      const res  = await fetch(API_ENDPOINTS.medioPagoTarjeta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente:         clienteIdNum,
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
      const data = await res.json();
      if (!res.ok) { setCardError(data.detail ?? 'Error al guardar la tarjeta.'); return; }

      addMethod({ id: data.id, tipo: 'tarjeta', descripcion: data.descripcion });
      setCardDescripcion(''); setCardTitular(''); setCardFullNumber('');
      setCardMonth(''); setCardYear(''); setCardMarca('');
      setCardTipo('credito'); setCardEsInternacional(false);
    } catch {
      setCardError('No se pudo conectar con el servidor.');
    } finally {
      setCardLoading(false);
    }
  };

  // ── Save Bank Account ──────────────────────────────────────────────────────

  const handleSaveAccount = async () => {
    setBankError('');
    if (!bankTitular.trim())           { setBankError('Ingresá el titular de la cuenta.'); return; }
    if (!bankName.trim())              { setBankError('Ingresá el nombre del banco.'); return; }
    if (!/^\d{22}$/.test(bankCbu))     { setBankError('El CBU debe tener exactamente 22 dígitos numéricos.'); return; }

    setBankLoading(true);
    try {
      const res  = await fetch(API_ENDPOINTS.medioPagoCuenta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente:     clienteIdNum,
          moneda:      'ARS',
          descripcion: bankDescripcion.trim() || null,
          titular:     bankTitular.trim(),
          banco:       bankName.trim(),
          cbu:         bankCbu.trim(),
          alias:       bankAlias.trim() || null,
          paisBanco:   bankPais,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBankError(data.detail ?? 'Error al guardar la cuenta.'); return; }

      addMethod({ id: data.id, tipo: 'cuenta_bancaria', descripcion: data.descripcion });
      setBankDescripcion(''); setBankTitular(''); setBankName('');
      setBankCbu(''); setBankAlias(''); setBankPais(1);
    } catch {
      setBankError('No se pudo conectar con el servidor.');
    } finally {
      setBankLoading(false);
    }
  };

  // ── Save Check ─────────────────────────────────────────────────────────────

  const handleSaveCheck = async () => {
    setCheckError('');
    if (!checkBank.trim())   { setCheckError('Ingresá el banco emisor.'); return; }
    if (!checkNumber.trim()) { setCheckError('Ingresá el número de cheque.'); return; }
    const montoNum = parseFloat(checkMonto.replace(',', '.'));
    if (isNaN(montoNum) || montoNum <= 0) { setCheckError('Ingresá un monto válido mayor a 0.'); return; }

    setCheckLoading(true);
    try {
      const res  = await fetch(API_ENDPOINTS.medioPagoCheque, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente:       clienteIdNum,
          moneda:        'ARS',
          descripcion:   checkDescripcion.trim() || null,
          banco:         checkBank.trim(),
          numeroCheque:  checkNumber.trim(),
          monto:         montoNum,
          observaciones: checkObservaciones.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCheckError(data.detail ?? 'Error al registrar el cheque.'); return; }

      addMethod({ id: data.id, tipo: 'cheque_certificado', descripcion: data.descripcion });
      setCheckDescripcion(''); setCheckBank(''); setCheckNumber('');
      setCheckMonto(''); setCheckObservaciones('');
    } catch {
      setCheckError('No se pudo conectar con el servidor.');
    } finally {
      setCheckLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 1. APPBAR */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.navigate('/login')} color="#614F3A" />
        <Image
          source={require('../assets/images/hammer-icon.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
        <Text style={styles.appbarText}>REGISTRO</Text>
        <View style={{ width: 16 }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 2. PROGRESS BAR */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressStep}>PASO 4 DE 4</Text>
            <Text style={styles.progressLabel}>Gestión{'\n'}de pagos</Text>
          </View>
          <View style={styles.progressBarsContainer}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barActive]} />
          </View>
        </View>

        {/* 3. HEADINGS */}
        <Text style={styles.mainTitle}>Métodos de Pago</Text>
        <Text style={styles.mainSubtitle}>
          Debes registrar al menos un medio de pago para participar en las pujas.{' '}
          Esto garantiza la seriedad de las ofertas en nuestra plataforma.
        </Text>

        {/* 4. MÉTODOS REGISTRADOS / EMPTY STATE */}
        {registeredMethods.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyIconBg}>
              <MaterialCommunityIcons name="wallet-outline" size={28} color="#8D7A27" />
            </View>
            <Text style={styles.emptyTitle}>Sin métodos registrados</Text>
            <Text style={styles.emptySubtitle}>
              Asocia una cuenta o tarjeta para comenzar a pujar en tiempo real.
            </Text>
          </View>
        ) : (
          <View style={styles.registeredList}>
            {registeredMethods.map(method => (
              <View key={method.id} style={styles.registeredItem}>
                <View style={styles.registeredIconBg}>
                  <MaterialCommunityIcons name={TIPO_ICONS[method.tipo]} size={20} color="#2E7D52" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.registeredTipo}>{TIPO_LABELS[method.tipo]}</Text>
                  {method.descripcion ? (
                    <Text style={styles.registeredDesc}>{method.descripcion}</Text>
                  ) : null}
                </View>
                <View style={styles.pendienteBadge}>
                  <Text style={styles.pendienteText}>Pendiente</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 5. OPCIONES DE PAGO */}
        <View style={styles.paymentOptionsContainer}>

          {/* ═══ TARJETA ══════════════════════════════════════════════════════ */}
          <Pressable
            style={[styles.paymentOption, expandedCard === 'card' && styles.paymentOptionExpanded]}
            onPress={() => toggleSection('card')}
          >
            <View style={[styles.iconSquare, { backgroundColor: '#FFD700' }]}>
              <MaterialCommunityIcons name="credit-card-outline" size={24} color="#1A1A1A" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Agregar Tarjeta</Text>
              <Text style={styles.optionSubtitle}>Crédito o Débito (Visa, Mastercard, AMEX)</Text>
            </View>
            <MaterialCommunityIcons
              name={expandedCard === 'card' ? 'chevron-up' : 'plus-circle-outline'}
              size={24} color="#8D7A27"
            />
          </Pressable>

          {expandedCard === 'card' && (
            <View style={styles.expandedFormContainer}>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. Visa personal"
                  value={cardDescripcion} onChangeText={setCardDescripcion}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>TITULAR (como figura en la tarjeta)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="NOMBRE APELLIDO"
                  value={cardTitular} onChangeText={setCardTitular}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>NÚMERO DE TARJETA</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="0000 0000 0000 0000"
                  value={cardFullNumber} onChangeText={handleCardNumberChange}
                  keyboardType="numeric" maxLength={19}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>VENCIMIENTO</Text>
                <View style={styles.formRowFields}>
                  {/* ── Mes ── */}
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Menu
                      visible={cardMonthMenuVisible}
                      onDismiss={() => setCardMonthMenuVisible(false)}
                      contentStyle={{ backgroundColor: 'white' }}
                      anchor={
                        <Pressable onPress={() => setCardMonthMenuVisible(true)}>
                          <View style={styles.pickerContainer}>
                            <Text style={[styles.pickerText, !cardMonth && styles.pickerPlaceholder]}>
                              {cardMonth
                                ? MONTHS.find(m => m.value === cardMonth)?.label
                                : 'Mes'}
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

                  {/* ── Año ── */}
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
              </View>

              {/* Marca */}
              <View style={styles.formField}>
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
              </View>

              {/* Tipo */}
              <View style={styles.formField}>
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
              </View>

              {/* Internacional */}
              <View style={styles.formField}>
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
              </View>

              {cardError ? <InlineError message={cardError} /> : null}

              <View style={styles.securityBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color="#8D7A27" />
                <Text style={styles.securityText}>
                  Por seguridad solo se guardan los últimos 4 dígitos. Nunca almacenamos el número completo ni el CVV.
                </Text>
              </View>

              <Button
                mode="contained" onPress={handleSaveCard} disabled={cardLoading}
                style={styles.saveButton} contentStyle={{ height: 56 }} labelStyle={styles.saveButtonLabel}
              >
                {cardLoading ? <ActivityIndicator color="white" /> : 'Guardar Tarjeta →'}
              </Button>
            </View>
          )}

          {/* ═══ CUENTA BANCARIA ══════════════════════════════════════════════ */}
          <Pressable
            style={[styles.paymentOption, expandedCard === 'bank' && styles.paymentOptionExpanded]}
            onPress={() => toggleSection('bank')}
          >
            <View style={[styles.iconSquare, { backgroundColor: '#FFD700' }]}>
              <MaterialCommunityIcons name="bank-outline" size={24} color="#1A1A1A" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Agregar Cuenta Bancaria</Text>
              <Text style={styles.optionSubtitle}>Transferencias nacionales e internacionales</Text>
            </View>
            <MaterialCommunityIcons
              name={expandedCard === 'bank' ? 'chevron-up' : 'plus-circle-outline'}
              size={24} color="#8D7A27"
            />
          </Pressable>

          {expandedCard === 'bank' && (
            <View style={styles.expandedFormContainer}>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. Cuenta principal Banco Nación"
                  value={bankDescripcion} onChangeText={setBankDescripcion}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>TITULAR DE LA CUENTA</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Nombre completo del titular"
                  value={bankTitular} onChangeText={setBankTitular}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>NOMBRE DEL BANCO</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. Banco Nación Argentina"
                  value={bankName} onChangeText={setBankName}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>CBU (22 dígitos)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="0000000000000000000000"
                  value={bankCbu} onChangeText={setBankCbu}
                  keyboardType="numeric" maxLength={22}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>ALIAS (OPCIONAL)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. nombre.apellido.banco"
                  value={bankAlias} onChangeText={setBankAlias}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formField}>
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
              </View>

              {bankError ? <InlineError message={bankError} /> : null}

              <View style={styles.securityBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color="#8D7A27" />
                <Text style={styles.securityText}>
                  Sus datos están encriptados. Mercado Subastas no almacena ni comparte sus credenciales bancarias.
                </Text>
              </View>

              <Button
                mode="contained" onPress={handleSaveAccount} disabled={bankLoading}
                style={styles.saveButton} contentStyle={{ height: 56 }} labelStyle={styles.saveButtonLabel}
              >
                {bankLoading ? <ActivityIndicator color="white" /> : 'Guardar Cuenta →'}
              </Button>
            </View>
          )}

          {/* ═══ CHEQUE CERTIFICADO ═══════════════════════════════════════════ */}
          <Pressable
            style={[styles.paymentOption, expandedCard === 'check' && styles.paymentOptionExpanded]}
            onPress={() => toggleSection('check')}
          >
            <View style={[styles.iconSquare, { backgroundColor: '#FFD700' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#1A1A1A" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Registrar Cheque Certificado</Text>
              <Text style={styles.optionSubtitle}>Para transacciones de alto valor</Text>
            </View>
            <MaterialCommunityIcons
              name={expandedCard === 'check' ? 'chevron-up' : 'plus-circle-outline'}
              size={24} color="#8D7A27"
            />
          </Pressable>

          {expandedCard === 'check' && (
            <View style={styles.expandedFormContainer}>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. Cheque Banco Galicia por maquinaria"
                  value={checkDescripcion} onChangeText={setCheckDescripcion}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>BANCO EMISOR</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. Banco Galicia"
                  value={checkBank} onChangeText={setCheckBank}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>NÚMERO DE CHEQUE</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. 00123456"
                  value={checkNumber} onChangeText={setCheckNumber}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>MONTO (ARS)</Text>
                <TextInput
                  style={styles.formInput} placeholderTextColor="#CCC"
                  placeholder="Ej. 500000"
                  value={checkMonto} onChangeText={setCheckMonto}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>OBSERVACIONES (OPCIONAL)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholderTextColor="#CCC"
                  placeholder="Ej. Válido hasta el 30/06/2026"
                  value={checkObservaciones} onChangeText={setCheckObservaciones}
                  multiline numberOfLines={3}
                />
              </View>

              {checkError ? <InlineError message={checkError} /> : null}

              <View style={styles.securityBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color="#8D7A27" />
                <Text style={styles.securityText}>
                  Los cheques certificados serán verificados antes de ser aceptados. El proceso puede tardar 24-48 horas hábiles.
                </Text>
              </View>

              <Button
                mode="contained" onPress={handleSaveCheck} disabled={checkLoading}
                style={styles.saveButton} contentStyle={{ height: 56 }} labelStyle={styles.saveButtonLabel}
              >
                {checkLoading ? <ActivityIndicator color="white" /> : 'Registrar Cheque →'}
              </Button>
            </View>
          )}

        </View>

        {/* 6. BOTÓN CONFIRMAR */}
        <Button
          mode="contained"
          onPress={() => router.push('/exploracion/catalogo')}
          style={styles.submitButton}
          contentStyle={{ height: 56 }}
          labelStyle={styles.submitButtonLabel}
        >
          Confirmar
        </Button>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  // --- Appbar ---
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  appbarText: { fontWeight: '600', color: '#1A1A1A', fontSize: 13, letterSpacing: 1 },
  // --- Scroll ---
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 },
  // --- Progress ---
  progressSection: { marginBottom: 30 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  progressStep: { color: '#8A6D3B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  progressLabel: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  progressBarsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  barActive: { backgroundColor: '#8A6D3B' },
  barInactive: { backgroundColor: '#E4E2DD' },
  // --- Headings ---
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  mainSubtitle: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 24 },
  // --- Empty State ---
  emptyStateBox: {
    backgroundColor: '#F5F5F7', borderRadius: 12, borderWidth: 1,
    borderColor: '#EAEAEA', borderStyle: 'dashed',
    padding: 24, alignItems: 'center', marginBottom: 24,
  },
  emptyIconBg: {
    backgroundColor: '#E6E6E6', width: 60, height: 60, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  // --- Registered methods ---
  registeredList: { marginBottom: 24 },
  registeredItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FBF4', borderRadius: 12,
    borderWidth: 1, borderColor: '#C3E6CB',
    padding: 14, marginBottom: 10,
  },
  registeredIconBg: {
    backgroundColor: '#D4EDDA', width: 36, height: 36, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  registeredTipo: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  registeredDesc: { fontSize: 12, color: '#555', marginTop: 2 },
  pendienteBadge: {
    backgroundColor: '#FFF3CD', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FFEEBA',
  },
  pendienteText: { fontSize: 11, fontWeight: '700', color: '#856404' },
  // --- Payment Options ---
  paymentOptionsContainer: { marginBottom: 30 },
  paymentOption: {
    backgroundColor: 'white', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  iconSquare: {
    backgroundColor: '#F0F0F0', width: 44, height: 44, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  optionSubtitle: { fontSize: 12, color: '#666', lineHeight: 16 },
  paymentOptionExpanded: {
    borderColor: '#FFD700', borderWidth: 2, backgroundColor: '#FFFAF0',
    marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  // --- Expanded Form ---
  expandedFormContainer: {
    backgroundColor: '#FFFDF5',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    padding: 20, marginBottom: 12,
    borderWidth: 2, borderTopWidth: 0, borderColor: '#FFD700',
  },
  formField: { marginBottom: 16 },
  formRowFields: { flexDirection: 'row', marginBottom: 0 },
  formLabel: { fontSize: 11, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, letterSpacing: 0.5 },
  formInput: {
    backgroundColor: '#F5F5F5', borderRadius: 8,
    borderWidth: 1, borderColor: '#EEEEEE',
    paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 14, color: '#1A1A1A',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  // --- Chips (marca) ---
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20, borderWidth: 1, borderColor: '#DCDCDC',
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F5F5F5',
  },
  chipSelected: { backgroundColor: '#FFD700', borderColor: '#E6C200' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '600' },
  chipTextSelected: { color: '#1A1A1A' },
  // --- Toggles (tipo / internacional) ---
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#DCDCDC',
    paddingVertical: 10, alignItems: 'center', backgroundColor: '#F5F5F5',
  },
  toggleBtnSelected: { backgroundColor: '#FFD700', borderColor: '#E6C200' },
  toggleText: { fontSize: 13, color: '#555', fontWeight: '600' },
  toggleTextSelected: { color: '#1A1A1A' },
  // --- Country picker ---
  pickerContainer: {
    backgroundColor: '#F5F5F5', borderRadius: 8, borderWidth: 1, borderColor: '#EEEEEE',
    height: 48, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 12,
  },
  pickerText: { fontSize: 14, color: '#1A1A1A' },
  pickerPlaceholder: { color: '#CCC' },
  // --- Security box ---
  securityBox: {
    backgroundColor: '#F5F5F7', borderRadius: 8, borderWidth: 1, borderColor: '#EAEAEA',
    padding: 12, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20,
  },
  securityText: { fontSize: 12, color: '#666', lineHeight: 18, marginLeft: 10, flex: 1 },
  saveButton: { width: '100%', backgroundColor: '#8D7A27', borderRadius: 8 },
  saveButtonLabel: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  // --- Inline error ---
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE8E8',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontWeight: '500', color: '#D32F2F', flex: 1 },
  // --- Confirm button ---
  submitButton: { width: '100%', backgroundColor: '#FFD700', borderRadius: 8 },
  submitButtonLabel: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
