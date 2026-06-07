import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../constants/api';
import { useSession } from '../contexts/SessionContext';

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu correo');
      return;
    }
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un correo válido');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail: email.trim(), contrasenia: password }),
      });

      const data = await response.json();

      if (response.status === 403) {
        const detail: string = data.detail ?? '';
        if (detail.includes('habilitada')) {
          setError('Tu cuenta no fue habilitada. Contactá a la casa de subastas.');
        } else {
          router.push({ pathname: '/verification', params: { mail: email.trim() } });
        }
        return;
      }

      if (response.status === 401) {
        setError('Mail o contraseña incorrectos.');
        return;
      }

      if (!response.ok) {
        setError(data.detail ?? 'Ocurrió un error al iniciar sesión.');
        return;
      }

      // Usuario pendiente de verificación por empleado
      if (data.estado === 'inactivo') {
        setError('Tu cuenta está pendiente de verificación. Te notificaremos por mail cuando sea aprobada.');
        return;
      }

      // Usuario aprobado pero debe cambiar su clave temporal
      if (data.claveTemporal) {
        router.push({ pathname: '/register_final', params: { mail: email.trim(), clienteId: String(data.identificador) } });
        return;
      }

      // Guardar sesión (incluye categoria para filtrar el home) y actualizar el contexto reactivo.
      await login(data);

      // Usuario con registro rechazado: puede ingresar pero no operar
      if (data.admitido === 'no') {
        router.replace('/exploracion');
        return;
      }

      // Usuario habilitado normalmente
      router.replace('/exploracion');
    } catch {
      setError('No se pudo conectar con el servidor. Verificá tu conexión a internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificarEstado = async () => {
    if (!email.trim()) {
      setError('Ingresá tu mail para verificar el estado de tu registro.');
      return;
    }

    setError('');
    setIsCheckingStatus(true);
    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail: email.trim(), contrasenia: '' }),
      });

      // 401 = el usuario existe y tiene contraseña real → ya está verificado y activo
      if (response.status === 401) {
        Alert.alert('Mail ya registrado', 'Este mail ya se encuentra registrado en el sistema. Iniciá sesión con tu contraseña.');
        return;
      }

      // Cualquier otro caso (403 pendiente, etc.) → llevar a la pantalla de verificación
      router.push({ pathname: '/verification', params: { mail: email.trim() } });
    } catch {
      setError('No se pudo conectar con el servidor. Verificá tu conexión a internet.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const isFormValid = email.trim() && password.trim() && !isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        centerContent={true}
      >
        {/* LOGO */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>

        {/* TÍTULO Y SUBTÍTULO */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Bienvenido de nuevo</Text>
          <Text style={styles.mainSubtitle}>
            Ingresa tus credenciales para acceder a Mercado Subastas
          </Text>
        </View>

        {/* FORMULARIO */}
        <View style={styles.formSection}>
          
          {/* CAMPO CORREO */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>CORREO</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons 
                name="email-outline" 
                size={20} 
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#CCC"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={true}
              />
            </View>
          </View>

          {/* CAMPO CONTRASEÑA */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons 
                name="lock-outline" 
                size={20} 
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#CCC"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={true}
              />
              <Pressable 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialCommunityIcons 
                  name={showPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="#999"
                />
              </Pressable>
            </View>
          </View>

        </View>

        {/* MENSAJE DE ERROR */}
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons 
              name="alert-circle-outline" 
              size={16} 
              color="#D32F2F"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* BOTÓN INICIAR SESIÓN */}
        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={!isFormValid}
          style={[styles.loginButton, !isFormValid && styles.loginButtonDisabled]}
          contentStyle={{ height: 56 }}
          labelStyle={styles.loginButtonLabel}
        >
          {isLoading ? <ActivityIndicator color="white" /> : 'INICIAR SESIÓN'}
        </Button>

        {/* LINK REGISTRO */}
        <View style={styles.registerLinkSection}>
          <Text style={styles.registerLinkText}>¿No tienes una cuenta? </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.registerLink}>Registrate</Text>
          </Pressable>
        </View>

        {/* LINK VERIFICACIÓN */}
        <View style={styles.verificationHint}>
          {isCheckingStatus
            ? <ActivityIndicator size={14} color="#8A6D3B" />
            : <MaterialCommunityIcons name="clock-outline" size={14} color="#8A6D3B" />
          }
          <Text style={styles.verificationHintText}>
            ¿Ya te registraste y esperás aprobación?{' '}
          </Text>
          <Pressable onPress={handleVerificarEstado} disabled={isCheckingStatus}>
            <Text style={styles.verificationHintLink}>
              {isCheckingStatus ? 'Verificando…' : 'Verificar estado'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 40, paddingBottom: 40, minHeight: '100%' },
  
  // --- Logo ---
  logoSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  logoImage: { width: 120, height: 120 },

  // --- Header ---
  headerSection: { alignItems: 'center', marginBottom: 40 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  mainSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  // --- Form ---
  formSection: { marginBottom: 24 },
  fieldContainer: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, letterSpacing: 0.5 },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    paddingHorizontal: 12,
    height: 52,
  },

  inputIcon: { marginRight: 10 },
  
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },

  eyeIcon: { padding: 8 },

  // --- Error ---
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE8E8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20 },
  errorText: { fontSize: 13, fontWeight: '500', color: '#D32F2F', flex: 1 },

  // --- Button ---
  loginButton: { backgroundColor: '#FFD700', borderRadius: 8, marginBottom: 24 },
  loginButtonLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  loginButtonDisabled: { backgroundColor: '#CCCCCC' },

  // --- Register Link ---
  registerLinkSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerLinkText: { fontSize: 14, color: '#666' },
  registerLink: { fontSize: 14, fontWeight: '600', color: '#8A6D3B' },
  // --- Verification Hint ---
  verificationHint: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    alignItems: 'center', gap: 4, marginTop: 16,
    backgroundColor: '#FFF8E1', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  verificationHintText: { fontSize: 12, color: '#614F3A' },
  verificationHintLink: { fontSize: 12, fontWeight: '700', color: '#8A6D3B', textDecorationLine: 'underline' },
});
