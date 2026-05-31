import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

// ─── Component ───────────────────────────────────────────────────────

export default function PerfilScreen() {
  const router = useRouter();

  // ─── Editable state ──────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState('Bautista Damian');
  const [correo, setCorreo] = useState('bautista@uade.edu.ar');
  const [dni, setDni] = useState('45.984.323');
  const [pais, setPais] = useState('Argentina');
  const [direccion, setDireccion] = useState('Lamadrid 733');

  const fields = [
    { label: 'NOMBRE COMPLETO', value: nombre, setter: setNombre },
    { label: 'CORREO ELECTRÓNICO', value: correo, setter: setCorreo, keyboard: 'email-address' as const },
    { label: 'DNI', value: dni, setter: setDni },
    { label: 'PAÍS', value: pais, setter: setPais },
    { label: 'DIRECCIÓN DE ENVÍO', value: direccion, setter: setDireccion },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'explorar':
        router.push('/exploracion');
        break;
      case 'vender':
        router.push('/vender');
        break;
      case 'perfil':
        break;
      case 'mis-pujas':
        break;
    }
  };

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── Scrollable Content ──────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Section Title ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Perfil</Text>

        {/* ─── Profile Photo Section ─────────────────────────────── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={60} color="#CCCCCC" />
            </View>
            {/* Edit button overlay */}
            <Pressable style={styles.editPhotoButton}>
              <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={styles.profileName}>Alejandro Sanz</Text>
        </View>

        {/* ─── Personal Information Card ─────────────────────────── */}
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Información Personal</Text>
            <Pressable onPress={handleEditToggle}>
              <Text style={styles.editLink}>
                {isEditing ? 'Cancelar' : 'Editar Perfil'}
              </Text>
            </Pressable>
          </View>

          {/* Info Fields */}
          {fields.map((field, index) => (
            <View key={index}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholderTextColor="#999"
                  keyboardType={field.keyboard || 'default'}
                />
              ) : (
                <View style={styles.fieldValueContainer}>
                  <Text style={styles.fieldValue}>{field.value}</Text>
                </View>
              )}
            </View>
          ))}

          {/* Guardar button — only visible when editing */}
          {isEditing && (
            <Pressable
              style={styles.saveButton}
              onPress={() => setIsEditing(false)}
            >
              <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
            </Pressable>
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

      {/* ─── Bottom Tab Bar (fixed at bottom) ────────────────────── */}
      <BottomTabBar activeTab="perfil" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
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

  // ─── Section Title ─────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginTop: 8,
  },

  // ─── Avatar Section ────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatarContainer: {
    position: 'relative',
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
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
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

  // ─── Personal Information Card ─────────────────────────────────────
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
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A6D3B',
  },

  // ─── Info Fields (read-only) ──────────────────────────────────────
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

  // ─── Info Fields (editable) ───────────────────────────────────────
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },

  // ─── Save Button ──────────────────────────────────────────────────
  saveButton: {
    backgroundColor: '#FFD700',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // ─── Stats Button ─────────────────────────────────────────────────
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

  // ─── Logout Button ────────────────────────────────────────────────
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
