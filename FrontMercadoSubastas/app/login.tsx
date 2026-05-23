import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* LOGO */}
        <View style={styles.logoSection}>
          {/* Aquí cargamos la imagen en lugar de dibujarla con código */}
          {/* Importante: para que esto funcione, debes guardar la imagen en la carpeta assets/images/ con el nombre logo.png */}
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>

        {/* ACCIONES */}
        <View style={styles.actionSection}>
          <Button
            mode="contained"
            onPress={() => router.push('/register')}
            style={styles.registerButton}
            labelStyle={styles.registerButtonLabel}
            contentStyle={{ height: 56, flexDirection: 'row-reverse' }}
            icon="arrow-right"
          >
            Comenzar Registro
          </Button>

          <Pressable onPress={() => router.push('/sign-in')} style={styles.loginLink}>
            <Text variant="titleMedium" style={styles.loginText}>Iniciar Sesión</Text>
          </Pressable>
        </View>

        {/* AVATARES */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarGroup}>
            <Avatar.Image size={48} source={{ uri: 'https://i.pravatar.cc/150?u=1' }} style={styles.avatar} />
            <Avatar.Image size={48} source={{ uri: 'https://i.pravatar.cc/150?u=2' }} style={[styles.avatar, styles.overlapAvatar]} />
            <Avatar.Image size={48} source={{ uri: 'https://i.pravatar.cc/150?u=3' }} style={[styles.avatar, styles.overlapAvatar]} />
            <Avatar.Text size={48} label="+2k" style={[styles.avatar, styles.avatarMore, styles.overlapAvatar]} labelStyle={styles.avatarMoreLabel} />
          </View>
        </View>

        {/* COPYRIGHT & CARD */}
        <View style={styles.bottomSection}>
          <Text variant="bodySmall" style={styles.copyrightText}>
            © 2026 Mercado Subastas{'\n'}Licensed Global Provider
          </Text>

          <Card style={styles.benefitsCard} mode="contained">
            <Card.Content style={styles.benefitsContent}>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="check-decagram-outline" size={24} color="#614F3A" />
                <Text style={styles.benefitText}>Subastas Verificadas</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="shield-outline" size={24} color="#614F3A" />
                <Text style={styles.benefitText}>Pagos Asegurados</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="earth" size={24} color="#614F3A" />
                <Text style={styles.benefitText}>Logística Internacional</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 10, justifyContent: 'space-between' },
  // --- Logo ---
  logoSection: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  logoImage: { width: 280, height: 280 },
  // --- Actions ---
  actionSection: { alignItems: 'center', marginVertical: 20 },
  registerButton: { width: '100%', backgroundColor: '#FFD700', borderRadius: 8 },
  registerButtonLabel: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loginLink: { marginTop: 24 },
  loginText: { color: '#8A6D3B', fontWeight: '600', fontSize: 16 },
  // --- Avatars ---
  avatarSection: { alignItems: 'center', marginVertical: 10 },
  avatarGroup: { flexDirection: 'row', alignItems: 'center' },
  avatar: { borderWidth: 2, borderColor: '#FAFBFD', backgroundColor: '#E4E2DD' },
  overlapAvatar: { marginLeft: -16 },
  avatarMore: { backgroundColor: '#FFD700' },
  avatarMoreLabel: { color: '#614F3A', fontSize: 14, fontWeight: 'bold' },
  // --- Bottom Section ---
  bottomSection: { flex: 1, justifyContent: 'flex-end', paddingBottom: 20 },
  copyrightText: { textAlign: 'right', color: '#614F3A', marginBottom: 16, fontSize: 11, fontWeight: '500' },
  benefitsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 8, elevation: 0, borderWidth: 1, borderColor: '#F0F0F0' },
  benefitsContent: { gap: 16 },
  benefitItem: { flexDirection: 'row', alignItems: 'center' },
  benefitText: { marginLeft: 12, fontWeight: '600', color: '#1A1A1A', fontSize: 14 }
});