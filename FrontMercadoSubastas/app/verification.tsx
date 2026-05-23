import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Appbar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

export default function VerificationScreen() {
  const router = useRouter();
  const { mail, clienteId } = useLocalSearchParams<{ mail: string; clienteId: string }>();

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
        {/* Contenedor expansivo para empujar la palabra "REGISTRO" a la derecha */}
        <View style={{ flex: 1 }} />
        <Text style={styles.appbarText}>REGISTRO</Text>
        <View style={{ width: 16 }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. PROGRESS BAR */}
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

        {/* 3. TITLE & SUBTITLE */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Estamos verificando{'\n'}tus datos</Text>
          <Text style={styles.subtitle}>
             Este proceso es externo y puede tardar unas horas. Te enviaremos un mail una vez seas aceptado.
          </Text>
        </View>

        {/* 4. CARDS */}
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
              Revisa tu bandeja de entrada; recibirás un enlace de acceso único.
            </Text>
          </View>

          {/* MOCK BUTTON PARA DESARROLLO */}
          <View style={{ marginTop: 30 }}>
            <Text style={{ textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 10 }}>Opciones de Desarrollo (Solo para probar)</Text>
            <Button
              mode="contained"
              onPress={() => router.push({ pathname: '/register_final', params: { mail, clienteId } })}
              buttonColor="#2B3966"
              textColor="white"
            >
              Simular Aprobación del Backend
            </Button>
          </View>
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
  appbarText: { fontWeight: '600', color: '#1A1A1A', fontSize: 13, letterSpacing: 1 },
  // --- Scroll ---
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 },
  // --- Progress Section ---
  progressSection: { marginBottom: 40 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressStep: { color: '#8A6D3B', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  progressLabel: { color: '#614F3A', fontSize: 13, fontWeight: '600' },
  progressBarsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  barActive: { backgroundColor: '#8A6D3B' },
  barInactive: { backgroundColor: '#E4E2DD' },
  // --- Header Section ---
  headerSection: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 16, lineHeight: 32 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  // --- Cards ---
  cardContainer: { gap: 16 },
  infoCard: { backgroundColor: '#F5F6F8', borderRadius: 12, padding: 24 },
  cardIcon: { marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#614F3A', letterSpacing: 1, marginBottom: 12 },
  cardText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
});
