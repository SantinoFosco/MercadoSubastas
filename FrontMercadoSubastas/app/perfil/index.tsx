import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { SessionStore } from '@/store/session';
import { API_ENDPOINTS } from '@/constants/api';

type ProfileData = {
  nombre: string;
  correo: string;
  categoria: string;
  pais: string;
};

const CATEGORIA_LABEL: Record<string, string> = {
  comun: 'Común',
  especial: 'Especial',
  plata: 'Plata',
  oro: 'Oro',
  platino: 'Platino',
};

export default function PerfilScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      const session = SessionStore.get();
      if (!session) {
        router.replace('/sign-in');
        return;
      }

      try {
        const clienteRes = await fetch(API_ENDPOINTS.clienteDetalle(session.identificador));
        if (!clienteRes.ok) throw new Error('Error al obtener perfil');
        const clienteData = await clienteRes.json();

        let paisNombre = '-';
        if (clienteData.numeroPais) {
          const paisRes = await fetch(API_ENDPOINTS.paisDetalle(clienteData.numeroPais));
          if (paisRes.ok) {
            const paisData = await paisRes.json();
            paisNombre = paisData.nombre;
          }
        }

        setProfile({
          nombre: session.nombre,
          correo: session.mail,
          categoria: CATEGORIA_LABEL[session.categoria] ?? session.categoria,
          pais: paisNombre,
        });
      } catch {
        setError('No se pudo cargar el perfil.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'explorar': router.push('/exploracion'); break;
      case 'vender': router.push('/vender'); break;
      case 'perfil': break;
      case 'mis-pujas': break;
    }
  };

  const handleLogout = () => {
    SessionStore.clear();
    router.replace('/sign-in');
  };

  const fields = profile
    ? [
        { label: 'NOMBRE COMPLETO', value: profile.nombre },
        { label: 'CORREO ELECTRÓNICO', value: profile.correo },
        { label: 'CATEGORÍA', value: profile.categoria },
        { label: 'PAÍS', value: profile.pais },
      ]
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Perfil</Text>

        {/* ─── Profile Photo Section ─────────────────────────────── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={60} color="#CCCCCC" />
            </View>
          </View>
          <Text style={styles.profileName}>{profile?.nombre ?? '...'}</Text>
        </View>

        {/* ─── Personal Information Card ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Información Personal</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFD700" style={styles.loader} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            fields.map((field, index) => (
              <View key={index}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.fieldValueContainer}>
                  <Text style={styles.fieldValue}>{field.value}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ─── Estadísticas Button ────────────────────────────────── */}
        <Pressable
          style={styles.statsButton}
          onPress={() => router.push('/perfil/estadisticas')}
        >
          <View style={styles.statsButtonLeft}>
            <View style={styles.statsIconCircle}>
              <MaterialCommunityIcons name="chart-bar" size={22} color="#8A6D3B" />
            </View>
            <View>
              <Text style={styles.statsButtonTitle}>Mis Estadísticas</Text>
              <Text style={styles.statsButtonSubtitle}>Ver actividad y resumen</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#8A6D3B" />
        </Pressable>

        {/* ─── Cerrar Sesión Link ────────────────────────────────── */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#E53935" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </Pressable>
      </ScrollView>

      <BottomTabBar activeTab="perfil" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginTop: 8,
  },

  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 14,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
    marginTop: 28,
    marginHorizontal: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  loader: {
    marginTop: 24,
    marginBottom: 8,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
  },
  fieldValueContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },

  statsButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 18,
    marginTop: 20,
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statsButtonSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E53935',
  },
});
