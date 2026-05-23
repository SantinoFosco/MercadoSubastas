import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Appbar, Button, Text, TextInput, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { API_ENDPOINTS } from '../constants/api';

const countries = [
  { label: 'Argentina', value: 1 },
  { label: 'Uruguay', value: 2 },
  { label: 'Paraguay', value: 3 },
  { label: 'Chile', value: 4 },
];

export default function RegisterStep1() {
  const router = useRouter();

  // Estados para los campos
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState<number>(countries[0].value);
  const [menuVisible, setMenuVisible] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    if (!email.includes('@')) {
      Alert.alert('Correo Inválido', 'Por favor ingresa un correo electrónico válido que contenga un "@".');
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
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        Alert.alert('Documento ya registrado', 'Ya existe una cuenta con ese número de documento.');
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', data.detail ?? 'Ocurrió un error al registrar. Intenta nuevamente.');
        return;
      }

      router.push({ pathname: '/verification', params: { mail: email.trim(), clienteId: String(data.personaId) } });
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Verificá tu conexión a internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 1. APPBAR */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
        
        {/* Aquí va el nuevo icono del martillo ovalado */}
        {/* Recuerda guardar la imagen recortada del ícono como "hammer-icon.png" en assets/images/ */}
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

        {/* 3. CARD PRINCIPAL */}
        <View style={styles.cardContainer}>
          
          {/* FOTO DE PERFIL */}
          <View style={styles.photoSection}>
            <View style={styles.avatarDashedContainer}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="account-circle-outline" size={40} color="#BBB" />
              </View>
              {/* Iconito de edición amarillo/marrón */}
              <View style={styles.editIconBadge}>
                <MaterialCommunityIcons name="pencil" size={12} color="white" />
              </View>
            </View>
            
            <Button mode="outlined" style={styles.uploadButton} labelStyle={styles.uploadButtonLabel}>
              Subir Foto
            </Button>
            <Text style={styles.photoSubtext}>FOTO DE PERFIL</Text>
          </View>

          {/* DIVIDER */}
          <View style={styles.divider} />

          {/* FORMULARIO */}
          <View style={styles.formSection}>
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
            
            <Text style={[styles.inputLabel, hasSubmitted && !documentNumber.trim() && styles.errorLabel]}>NUMERO DE DOCUMENTO</Text>
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
              placeholder="Calle, Numero"
              outlineColor="#EAEAEA"
              activeOutlineColor="#8A6D3B"
              textColor="black"
              error={hasSubmitted && !address.trim()}
            />

            <Text style={[styles.inputLabel, hasSubmitted && !country && styles.errorLabel]}>PAIS</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              contentStyle={{ backgroundColor: 'white' }}
              anchor={
                <Pressable onPress={() => setMenuVisible(true)}>
                  <View style={[styles.pickerContainer, hasSubmitted && !country && styles.errorBorder]}>
                    <Text style={styles.pickerText}>
                      {countries.find(c => c.value === country)?.label || 'Seleccionar País...'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8A6D3B" />
                  </View>
                </Pressable>
              }
            >
              {countries.map((c) => (
                <Menu.Item 
                  key={c.value} 
                  onPress={() => { setCountry(c.value); setMenuVisible(false); }} 
                  title={c.label}
                  titleStyle={{ color: '#333' }}
                />
              ))}
            </Menu>
          </View>
        </View>

        {/* 4. BOTON Y LEGALES */}
        <View style={styles.footerSection}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={{ height: 56, flexDirection: 'row-reverse' }}
            labelStyle={styles.submitButtonLabel}
            icon={isLoading ? undefined : "arrow-right"}
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
  container: { flex: 1, backgroundColor: '#FAFBFD' }, // Fondo super claro
  // --- Appbar ---
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  appbarText: { fontWeight: '600', color: '#333', fontSize: 13, letterSpacing: 1 },
  // --- Scroll ---
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  // --- Progress Section ---
  progressSection: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  progressStep: { color: '#8A6D3B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  progressLabel: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  progressBarsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  barActive: { backgroundColor: '#8A6D3B' },
  barInactive: { backgroundColor: '#E4E2DD' },
  // --- Card Container ---
  cardContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, elevation: 0, borderWidth: 1, borderColor: '#F0F0F0' },
  // --- Photo ---
  photoSection: { alignItems: 'center', marginBottom: 24 },
  avatarDashedContainer: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EAEAEA', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    position: 'relative'
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#F9F9F9',
    justifyContent: 'center', alignItems: 'center'
  },
  editIconBadge: {
    position: 'absolute', bottom: -5, right: -5,
    backgroundColor: '#8A6D3B', width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white'
  },
  uploadButton: { borderRadius: 20, borderColor: '#EAEAEA', height: 36, justifyContent: 'center', backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  uploadButtonLabel: { color: '#333', fontSize: 11, fontWeight: '700' },
  photoSubtext: { color: '#999', fontSize: 10, marginTop: 8, letterSpacing: 0.5, fontWeight: '600' },
  // --- Divider ---
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: -24, marginBottom: 24 },
  // --- Form ---
  formSection: { },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  formHeaderIcon: { marginRight: 10 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 16 },
  errorLabel: { color: '#B00020' }, // Color rojo para resaltar campos faltantes
  input: { backgroundColor: 'white', height: 48, fontSize: 14 },
  errorBorder: { borderColor: '#B00020' }, // Borde rojo
  // --- Picker ---
  pickerContainer: {
    borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 6, backgroundColor: 'white', height: 48, 
    justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 14
  },
  pickerText: { color: '#333', fontSize: 14 },
  // --- Footer ---
  footerSection: { alignItems: 'center' },
  submitButton: { width: '100%', backgroundColor: '#FFD700', borderRadius: 8, marginBottom: 16 },
  submitButtonLabel: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  footerLegal: { textAlign: 'center', color: '#999', fontSize: 11, lineHeight: 16 },
  legalLink: { color: '#999', textDecorationLine: 'underline' }
});