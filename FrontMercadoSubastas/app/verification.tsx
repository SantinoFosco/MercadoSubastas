import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Text, Appbar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { API_ENDPOINTS } from '../constants/api';

const POLL_INTERVAL_MS = 10_000;

export default function VerificationScreen() {
  const router = useRouter();
  const { mail } = useLocalSearchParams<{ mail: string }>();

  const [isRechazado, setIsRechazado] = useState(false);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkStatus = useCallback(async () => {
    if (!mail) return;
    setChecking(true);
    try {
      const response = await fetch(API_ENDPOINTS.estadoRegistro(mail));
      const data = await response.json();

      if (!response.ok) return;

      if (data.estado === 'rechazado') {
        stopPolling();
        setIsRechazado(true);
        return;
      }

      if (data.estado === 'aprobado') {
        stopPolling();
        router.replace({
          pathname: '/register_final',
          params: { mail, clienteId: String(data.identificador) },
        });
        return;
      }
      // data.estado === 'pendiente' → seguir esperando
    } catch {
      // error de red → silencioso, el polling reintenta
    } finally {
      setChecking(false);
    }
  }, [mail]);

  useEffect(() => {
    checkStatus();
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    return stopPolling;
  }, [checkStatus]);

  // ── Vista: cuenta rechazada ──────────────────────────────────────────────────
  if (isRechazado) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.replace('/login')} color="#614F3A" />
          <Image source={require('../assets/images/hammer-icon.png')} style={styles.logoBadge} resizeMode="contain" />
          <View style={{ flex: 1 }} />
          <Text style={styles.appbarText}>REGISTRO</Text>
          <View style={{ width: 16 }} />
        </Appbar.Header>

        <View style={styles.centeredContent}>
          <View style={styles.rejectionIcon}>
            <MaterialCommunityIcons name="close-circle-outline" size={64} color="#D32F2F" />
          </View>
          <Text style={styles.rejectionTitle}>Cuenta no habilitada</Text>
          <Text style={styles.rejectionSubtitle}>
            Tu solicitud de registro no fue aprobada por la casa de subastas.{'\n\n'}
            Si creés que es un error, comunicate directamente con ellos.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/login')}
            style={styles.backButton}
            contentStyle={{ height: 52 }}
            labelStyle={styles.backButtonLabel}
          >
            Volver al inicio
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ── Vista: esperando verificación ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.replace('/login')} color="#614F3A" />
        <Image source={require('../assets/images/hammer-icon.png')} style={styles.logoBadge} resizeMode="contain" />
        <View style={{ flex: 1 }} />
        <Text style={styles.appbarText}>REGISTRO</Text>
        <View style={{ width: 16 }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressStep}>PASO 2 DE 4</Text>
            <Text style={styles.progressLabel}>Verificación</Text>
          </View>
          <View style={styles.progressBarsContainer}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, styles.barInactive]} />
            <View style={[styles.bar, styles.barInactive]} />
          </View>
        </View>

        <View style={styles.headerSection}>
          <Text style={styles.title}>Estamos verificando{'\n'}tus datos</Text>
          <Text style={styles.subtitle}>
            Este proceso es externo y puede tardar unas horas.{'\n'}
            Te avisaremos por mail cuando seas aceptado.
          </Text>
        </View>

        <View style={styles.pulseContainer}>
          {checking
            ? <ActivityIndicator size="large" color="#8A6D3B" />
            : <MaterialCommunityIcons name="clock-outline" size={48} color="#8A6D3B" />
          }
          <Text style={styles.pulseLabel}>
            {checking ? 'Verificando estado…' : 'Revisando cada 10 segundos'}
          </Text>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color="#8A6D3B" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>SEGURIDAD</Text>
            <Text style={styles.cardText}>
              Validamos tu identidad para garantizar subastas 100% seguras.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="email-outline" size={24} color="#8A6D3B" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>NOTIFICACIÓN</Text>
            <Text style={styles.cardText}>
              Recibirás un mail cuando tu cuenta sea habilitada. También podés tocar el botón para revisar ahora.
            </Text>
          </View>
        </View>

        <Button
          mode="outlined"
          onPress={checkStatus}
          disabled={checking}
          style={styles.checkButton}
          contentStyle={{ height: 52 }}
          labelStyle={styles.checkButtonLabel}
          icon={checking ? undefined : 'refresh'}
        >
          {checking ? 'Verificando…' : 'Verificar ahora'}
        </Button>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  appbarText: { fontWeight: '600', color: '#1A1A1A', fontSize: 13, letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 },
  progressSection: { marginBottom: 40 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressStep: { color: '#8A6D3B', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  progressLabel: { color: '#614F3A', fontSize: 13, fontWeight: '600' },
  progressBarsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  barActive: { backgroundColor: '#8A6D3B' },
  barInactive: { backgroundColor: '#E4E2DD' },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 16, lineHeight: 32 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  pulseContainer: { alignItems: 'center', marginBottom: 32, gap: 12 },
  pulseLabel: { fontSize: 13, color: '#8A6D3B', fontWeight: '500' },
  cardContainer: { gap: 16, marginBottom: 32 },
  infoCard: { backgroundColor: '#F5F6F8', borderRadius: 12, padding: 24 },
  cardIcon: { marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#614F3A', letterSpacing: 1, marginBottom: 12 },
  cardText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  checkButton: { borderColor: '#8A6D3B', borderRadius: 8 },
  checkButtonLabel: { color: '#8A6D3B', fontWeight: '600' },
  // Rejection view
  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  rejectionIcon: { marginBottom: 24 },
  rejectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  rejectionSubtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  backButton: { width: '100%', backgroundColor: '#1A1A1A', borderRadius: 8 },
  backButtonLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
