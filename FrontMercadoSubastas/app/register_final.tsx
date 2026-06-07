import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Image, Alert, ActivityIndicator } from 'react-native';
import { Appbar, Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../constants/api';
import { useSession } from '@/contexts/SessionContext';

export default function PasswordSetupScreen() {
  const router = useRouter();
  const { mail, clienteId } = useLocalSearchParams<{ mail: string; clienteId: string }>();
  const { login } = useSession();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFinalizar = async () => {
    setError('');

    if (!password.trim()) {
      setError('Ingresá una contraseña.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!mail) {
      setError('No se encontró el correo electrónico. Volvé al inicio del registro.');
      return;
    }

    setIsLoading(true);
    try {
      const cambioRes = await fetch(API_ENDPOINTS.cambiarClave, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail, contrasenia: password }),
      });

      const cambioData = await cambioRes.json();

      if (cambioRes.status === 404) {
        setError('No se encontró el usuario. Volvé al inicio del registro.');
        return;
      }

      if (!cambioRes.ok) {
        setError(cambioData.detail ?? 'Ocurrió un error. Intenta nuevamente.');
        return;
      }

      // Auto-login: la cuenta ya fue aprobada por el admin y la clave está establecida.
      try {
        const loginRes = await fetch(API_ENDPOINTS.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mail, contrasenia: password }),
        });
        if (loginRes.ok) {
          const userData = await loginRes.json();
          await login(userData);
        }
      } catch {
        // Si el auto-login falla, el usuario puede iniciar sesión manualmente.
      }

      router.push({ pathname: '/payments', params: { clienteId } });
    } catch {
      setError('No se pudo conectar con el servidor. Verificá tu conexión a internet.');
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
            <Text style={styles.progressStep}>PASO 3 DE 4</Text>
            <Text style={styles.progressLabel}>Finalizando{'\n'}registro</Text>
          </View>
          <View style={styles.progressBarsContainer}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barInactive]} />
          </View>
        </View>

        {/* 3. ALERTA APROBADA */}
        <View style={styles.alertCard}>
          <View style={styles.alertIconContainer}>
            <MaterialCommunityIcons name="check-decagram" size={28} color="#1A1A1A" />
          </View>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>¡Verificación aprobada!</Text>
            <Text style={styles.alertSubtitle}>
              Crea tu clave personal con la que accederás a tu cuenta.
            </Text>
          </View>
        </View>

        {/* 4. FORMULARIO */}
        <View style={styles.formSection}>
          
          <Text style={styles.inputLabel}>NUEVA CLAVE DE SEGURIDAD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            mode="flat"
            style={styles.input}
            underlineColor="transparent"
            activeUnderlineColor="#8A6D3B"
            textColor="#1A1A1A"
            secureTextEntry={hidePassword}
            right={<TextInput.Icon icon={hidePassword ? "eye-off" : "eye"} color="#8A6D3B" onPress={() => setHidePassword(!hidePassword)} />}
          />
          <Text style={styles.helperText}>Mínimo 8 caracteres, incluye un número y un símbolo.</Text>

          <Text style={styles.inputLabel}>CONFIRMAR CLAVE</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="flat"
            style={styles.input}
            underlineColor="transparent"
            activeUnderlineColor="#8A6D3B"
            textColor="#1A1A1A"
            secureTextEntry={hideConfirmPassword}
            right={<TextInput.Icon icon={hideConfirmPassword ? "eye-off" : "eye"} color="#8A6D3B" onPress={() => setHideConfirmPassword(!hideConfirmPassword)} />}
          />
        </View>

        {/* 5. AVISO DE SEGURIDAD */}
        <View style={styles.securityBox}>
          <MaterialCommunityIcons name="shield-outline" size={24} color="#8A6D3B" style={styles.securityIcon} />
          <Text style={styles.securityText}>
            Tus datos están protegidos bajo protocolos de cifrado AES-256. 
            La clave es personal e intransferible.
          </Text>
        </View>

        {/* 6. ERROR */}
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D32F2F" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 7. BOTON FINALIZAR */}
        <Button
          mode="contained"
          onPress={handleFinalizar}
          disabled={isLoading}
          style={styles.submitButton}
          contentStyle={{ height: 56 }}
          labelStyle={styles.submitButtonLabel}
        >
          {isLoading ? <ActivityIndicator color="white" /> : 'Finalizar'}
        </Button>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  // --- Appbar ---
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  appbarText: { fontWeight: '600', color: '#1A1A1A', fontSize: 13, letterSpacing: 1 },
  // --- Scroll ---
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 },
  // --- Progress Section ---
  progressSection: { marginBottom: 30 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  progressStep: { color: '#8A6D3B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  progressLabel: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  progressBarsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  barActive: { backgroundColor: '#8A6D3B' },
  barInactive: { backgroundColor: '#E4E2DD' },
  // --- Alert Card ---
  alertCard: {
    backgroundColor: '#FDF7E3', // Amarillo super claro
    borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center',
    marginBottom: 30
  },
  alertIconContainer: {
    backgroundColor: '#FFD700',
    borderRadius: 8, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  alertTextContainer: { flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  alertSubtitle: { fontSize: 13, color: '#555', lineHeight: 18 },
  // --- Form ---
  formSection: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: { backgroundColor: '#EAEAEA', height: 48, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 4 },
  textArea: { backgroundColor: '#EAEAEA', minHeight: 100, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 4, paddingTop: 12 },
  helperText: { fontSize: 11, color: '#888', marginTop: 6, marginBottom: 4 },
  // --- Security Box ---
  securityBox: {
    backgroundColor: '#F5F6F8', borderRadius: 8, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 30
  },
  securityIcon: { marginRight: 12 },
  securityText: { flex: 1, fontSize: 11, color: '#555', lineHeight: 16, fontWeight: '500' },
  // --- Error ---
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE8E8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500', color: '#D32F2F', flex: 1 },
  // --- Button ---
  submitButton: { width: '100%', backgroundColor: '#FFD700', borderRadius: 8, marginBottom: 16 },
  submitButtonLabel: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
