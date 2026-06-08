import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Appbar, Button, Text, TextInput, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../constants/api';

type Country = {
  numero: number;
  nombre: string;
};

type DniPhoto = {
  uri: string;
  base64: string;
};

async function pickDniPhoto(aspect: [number, number]): Promise<DniPhoto | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para subir las fotos del DNI.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets[0].base64) return null;
  return { uri: result.assets[0].uri, base64: result.assets[0].base64 };
}

export default function RegisterStep1() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [country, setCountry] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [dniFrente, setDniFrente] = useState<DniPhoto | null>(null);
  const [dniDorso, setDniDorso] = useState<DniPhoto | null>(null);

  useEffect(() => {
    fetch(API_ENDPOINTS.paises)
      .then(res => res.json())
      .then((data: Country[]) => {
        setCountries(data);
        if (data.length > 0) setCountry(data[0].numero);
      })
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, []);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (!firstName.trim() || !lastName.trim() || !documentNumber.trim() || !email.trim() || !address.trim() || !country) {
      Alert.alert('Campos Incompletos', 'Por favor completa todos los campos marcados en rojo.');
      return;
    }
    if (!/^\d+$/.test(documentNumber.trim())) {
      Alert.alert('Documento Inválido', 'El número de documento solo debe contener números, sin puntos ni espacios.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Correo Inválido', 'Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!dniFrente || !dniDorso) {
      Alert.alert('Fotos del DNI requeridas', 'Debés subir la foto del frente y del dorso de tu DNI para continuar.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.registroIniciar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: firstName.trim(),
          apellido: lastName.trim(),
          documento: documentNumber.trim(),
          mail: email.trim(),
          direccion: address.trim(),
          pais: country,
          foto_frente: dniFrente.base64,
          foto_dorso: dniDorso.base64,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        Alert.alert('Error', data.detail ?? 'Ya existe una cuenta con esos datos.');
        return;
      }
      if (!response.ok) {
        Alert.alert('Error', data.detail ?? 'Ocurrió un error al registrar. Intenta nuevamente.');
        return;
      }

      router.push({ pathname: '/verification', params: { mail: email.trim() } });
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Verificá tu conexión a internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* APPBAR */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
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

        {/* PROGRESS BAR */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressStep}>PASO 1 DE 4</Text>
            <Text style={styles.progressLabel}>Iniciando{'\n'}registro</Text>
          </View>
          <View style={styles.progressBarsContainer}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barInactive]} />
            <View style={[styles.bar, styles.barInactive]} />
            <View style={[styles.bar, styles.barInactive]} />
          </View>
        </View>

        {/* DATOS PERSONALES */}
        <View style={styles.cardContainer}>
          <View style={styles.formHeader}>
            <MaterialCommunityIcons name="account-outline" size={24} color="#8A6D3B" style={styles.formHeaderIcon} />
            <Text style={styles.formTitle}>Información Personal</Text>
          </View>

          <Text style={[styles.inputLabel, hasSubmitted && !firstName.trim() && styles.errorLabel]}>NOMBRE</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            placeholder="Ingresar nombre"
            outlineColor="#EAEAEA"
            activeOutlineColor="#8A6D3B"
            textColor="black"
            error={hasSubmitted && !firstName.trim()}
          />

          <Text style={[styles.inputLabel, hasSubmitted && !lastName.trim() && styles.errorLabel]}>APELLIDO</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            placeholder="Ingresar apellido"
            outlineColor="#EAEAEA"
            activeOutlineColor="#8A6D3B"
            textColor="black"
            error={hasSubmitted && !lastName.trim()}
          />

          <Text style={[styles.inputLabel, hasSubmitted && !documentNumber.trim() && styles.errorLabel]}>NÚMERO DE DOCUMENTO</Text>
          <TextInput
            value={documentNumber}
            onChangeText={setDocumentNumber}
            mode="outlined"
            style={styles.input}
            placeholder="Ingresar el DNI"
            outlineColor="#EAEAEA"
            activeOutlineColor="#8A6D3B"
            keyboardType="numeric"
            textColor="black"
            error={hasSubmitted && !documentNumber.trim()}
          />

          <Text style={[styles.inputLabel, hasSubmitted && !email.trim() && styles.errorLabel]}>CORREO ELECTRÓNICO</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            placeholder="Ingresar correo electrónico"
            outlineColor="#EAEAEA"
            activeOutlineColor="#8A6D3B"
            keyboardType="email-address"
            autoCapitalize="none"
            textColor="black"
            error={hasSubmitted && !email.trim()}
          />

          <Text style={[styles.inputLabel, hasSubmitted && !address.trim() && styles.errorLabel]}>DIRECCIÓN</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            style={styles.input}
            placeholder="Calle, Número"
            outlineColor="#EAEAEA"
            activeOutlineColor="#8A6D3B"
            textColor="black"
            error={hasSubmitted && !address.trim()}
          />

          <Text style={[styles.inputLabel, hasSubmitted && !country && styles.errorLabel]}>PAÍS</Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            contentStyle={{ backgroundColor: 'white' }}
            anchor={
              <Pressable onPress={() => !countriesLoading && setMenuVisible(true)}>
                <View style={[styles.pickerContainer, hasSubmitted && !country && styles.errorBorder]}>
                  {countriesLoading ? (
                    <ActivityIndicator size="small" color="#8A6D3B" />
                  ) : (
                    <Text style={styles.pickerText}>
                      {countries.find(c => c.numero === country)?.nombre || 'Seleccionar País...'}
                    </Text>
                  )}
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#8A6D3B" />
                </View>
              </Pressable>
            }
          >
            {countries.map((c) => (
              <Menu.Item
                key={c.numero}
                onPress={() => { setCountry(c.numero); setMenuVisible(false); }}
                title={c.nombre}
                titleStyle={{ color: '#333' }}
              />
            ))}
          </Menu>
        </View>

        {/* FOTOS DEL DNI */}
        <View style={styles.cardContainer}>
          <View style={styles.formHeader}>
            <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#8A6D3B" style={styles.formHeaderIcon} />
            <Text style={styles.formTitle}>Documento de Identidad</Text>
          </View>
          <Text style={styles.dniHelperText}>
            Subí una foto clara del frente y dorso de tu DNI. Las imágenes son necesarias para verificar tu identidad.
          </Text>

          <View style={styles.dniRow}>
            {/* Frente */}
            <View style={styles.dniSlot}>
              <Text style={[styles.dniSlotLabel, hasSubmitted && !dniFrente && styles.errorLabel]}>
                FRENTE
              </Text>
              <Pressable
                onPress={async () => {
                  const photo = await pickDniPhoto([3, 2]);
                  if (photo) setDniFrente(photo);
                }}
                style={[
                  styles.dniBox,
                  dniFrente && styles.dniBoxFilled,
                  hasSubmitted && !dniFrente && styles.dniBoxError,
                ]}
              >
                {dniFrente ? (
                  <Image source={{ uri: dniFrente.uri }} style={styles.dniImage} />
                ) : (
                  <View style={styles.dniPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={32} color="#CCC" />
                    <Text style={styles.dniPlaceholderText}>Tocar para subir</Text>
                  </View>
                )}
                <View style={[styles.dniEditBadge, dniFrente && styles.dniEditBadgeFilled]}>
                  <MaterialCommunityIcons
                    name={dniFrente ? 'check' : 'camera'}
                    size={12}
                    color="white"
                  />
                </View>
              </Pressable>
            </View>

            {/* Dorso */}
            <View style={styles.dniSlot}>
              <Text style={[styles.dniSlotLabel, hasSubmitted && !dniDorso && styles.errorLabel]}>
                DORSO
              </Text>
              <Pressable
                onPress={async () => {
                  const photo = await pickDniPhoto([3, 2]);
                  if (photo) setDniDorso(photo);
                }}
                style={[
                  styles.dniBox,
                  dniDorso && styles.dniBoxFilled,
                  hasSubmitted && !dniDorso && styles.dniBoxError,
                ]}
              >
                {dniDorso ? (
                  <Image source={{ uri: dniDorso.uri }} style={styles.dniImage} />
                ) : (
                  <View style={styles.dniPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={32} color="#CCC" />
                    <Text style={styles.dniPlaceholderText}>Tocar para subir</Text>
                  </View>
                )}
                <View style={[styles.dniEditBadge, dniDorso && styles.dniEditBadgeFilled]}>
                  <MaterialCommunityIcons
                    name={dniDorso ? 'check' : 'camera'}
                    size={12}
                    color="white"
                  />
                </View>
              </Pressable>
            </View>
          </View>

          {hasSubmitted && (!dniFrente || !dniDorso) && (
            <Text style={styles.dniErrorText}>
              Ambas fotos del DNI son requeridas para continuar.
            </Text>
          )}
        </View>

        {/* BOTÓN Y LEGALES */}
        <View style={styles.footerSection}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={{ height: 56, flexDirection: 'row-reverse' }}
            labelStyle={styles.submitButtonLabel}
            icon={isLoading ? undefined : 'arrow-right'}
          >
            {isLoading ? <ActivityIndicator color="white" /> : 'Enviar para Verificación'}
          </Button>

          <Text style={styles.footerLegal}>
            Al continuar, aceptas nuestros{' '}
            <Text style={styles.legalLink}>Términos de Servicio</Text> y{'\n'}
            <Text style={styles.legalLink}>Política de Privacidad</Text>.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },

  // Appbar
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  appbarText: { fontWeight: '600', color: '#333', fontSize: 13, letterSpacing: 1 },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },

  // Progress
  progressSection: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  progressStep: { color: '#8A6D3B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  progressLabel: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  progressBarsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  barActive: { backgroundColor: '#8A6D3B' },
  barInactive: { backgroundColor: '#E4E2DD' },

  // Cards
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  // Form header
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  formHeaderIcon: { marginRight: 10 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },

  // Inputs
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 16 },
  errorLabel: { color: '#B00020' },
  input: { backgroundColor: 'white', height: 48, fontSize: 14 },
  errorBorder: { borderColor: '#B00020' },
  pickerContainer: {
    borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 6, backgroundColor: 'white', height: 48,
    justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 14,
  },
  pickerText: { color: '#333', fontSize: 14 },

  // DNI section
  dniHelperText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 16,
  },
  dniRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dniSlot: {
    flex: 1,
  },
  dniSlotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dniBox: {
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FAFAFA',
  },
  dniBoxFilled: {
    borderStyle: 'solid',
    borderColor: '#8A6D3B',
  },
  dniBoxError: {
    borderColor: '#B00020',
    borderStyle: 'solid',
  },
  dniImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dniPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dniPlaceholderText: {
    fontSize: 11,
    color: '#CCC',
    fontWeight: '500',
  },
  dniEditBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#999',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  dniEditBadgeFilled: {
    backgroundColor: '#8A6D3B',
  },
  dniErrorText: {
    color: '#B00020',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },

  // Footer
  footerSection: { alignItems: 'center', marginTop: 8 },
  submitButton: { width: '100%', backgroundColor: '#FFD700', borderRadius: 8, marginBottom: 16 },
  submitButtonLabel: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  footerLegal: { textAlign: 'center', color: '#999', fontSize: 11, lineHeight: 16 },
  legalLink: { color: '#999', textDecorationLine: 'underline' },
});
