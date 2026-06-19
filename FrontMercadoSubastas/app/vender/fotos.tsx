import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { API_ENDPOINTS } from '@/constants/api';

const MIN_PHOTOS = 6;

const PHOTO_SLOTS = [
  { label: 'PRINCIPAL', icon: 'camera-outline' as const },
  { label: 'ÁNGULO 2', icon: 'image-outline' as const },
  { label: 'ÁNGULO 3', icon: 'image-outline' as const },
  { label: 'DETALLE 1', icon: 'image-outline' as const },
  { label: 'DETALLE 2', icon: 'image-outline' as const },
  { label: 'CERTIFICADO', icon: 'file-document-outline' as const },
];

export default function FotosArticuloScreen() {
  const router = useRouter();
  const { productoId } = useLocalSearchParams<{ productoId: string }>();

  const [uploadedFotos, setUploadedFotos] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fotosCount = Object.keys(uploadedFotos).length;
  const canFinish = fotosCount >= MIN_PHOTOS;

  const handleSlotPress = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0].base64) return;

    setUploading(slotIndex);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.subirFoto, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto: Number(productoId), imagen: result.assets[0].base64 }),
      });
      if (!res.ok) {
        setError('No se pudo subir la foto. Intentá de nuevo.');
        return;
      }
      setUploadedFotos((prev) => ({ ...prev, [slotIndex]: result.assets[0].uri }));
    } catch {
      setError('Error de conexión al subir la foto.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color="#614F3A" />
        <Image
          source={require('../../assets/images/hammer-icon.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Galería de Imágenes</Text>
        <Text style={styles.pageSubtitle}>Paso 2 de 2 — Fotos del producto</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(fotosCount / MIN_PHOTOS) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{fotosCount}/{MIN_PHOTOS}</Text>
        </View>

        {fotosCount < MIN_PHOTOS && (
          <View style={styles.infoBanner}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#8A6D3B" />
            <Text style={styles.infoBannerText}>
              Se requieren al menos {MIN_PHOTOS} fotos para enviar el artículo. Faltan {MIN_PHOTOS - fotosCount}.
            </Text>
          </View>
        )}

        <View style={styles.imageGrid}>
          {PHOTO_SLOTS.map((slot, index) => {
            const uploaded = !!uploadedFotos[index];
            const isUploading = uploading === index;
            return (
              <Pressable
                key={slot.label}
                style={styles.imageSlot}
                onPress={() => !isUploading && handleSlotPress(index)}
              >
                {uploaded ? (
                  <>
                    <Image source={{ uri: uploadedFotos[index] }} style={styles.imagePreview} />
                    <View style={styles.uploadedBadge}>
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    </View>
                  </>
                ) : isUploading ? (
                  <ActivityIndicator color="#FFD700" />
                ) : (
                  <>
                    <MaterialCommunityIcons name={slot.icon as any} size={40} color="#D0D0D0" />
                    <Text style={styles.imageSlotLabel}>{slot.label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.hintRow}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#999" />
          <Text style={styles.hintText}>
            Tocá cada recuadro para seleccionar una foto de tu galería. Podés reemplazar una foto tocándola nuevamente.
          </Text>
        </View>

        <Pressable
          style={[styles.submitButton, !canFinish && styles.submitButtonDisabled]}
          onPress={() => router.replace('/vender/mis-articulos')}
          disabled={!canFinish}
        >
          <Text style={styles.submitButtonText}>
            {canFinish ? 'ENVIAR ARTÍCULO' : `FALTAN ${MIN_PHOTOS - fotosCount} FOTO${MIN_PHOTOS - fotosCount > 1 ? 'S' : ''}`}
          </Text>
        </Pressable>

        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#999', marginBottom: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },
  progressLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', minWidth: 30, textAlign: 'right' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14,
    marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#FFD700',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#614F3A', lineHeight: 19, fontWeight: '500' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24, justifyContent: 'space-between' },
  imageSlot: {
    width: '48%', aspectRatio: 1,
    borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8F9FB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%', position: 'absolute' },
  uploadedBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  imageSlotLabel: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginTop: 8, letterSpacing: 0.8 },
  errorText: { fontSize: 13, color: '#D32F2F', textAlign: 'center', marginBottom: 16 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 24 },
  hintText: { flex: 1, fontSize: 12, color: '#999', lineHeight: 18, fontStyle: 'italic' },
  submitButton: { backgroundColor: '#FFD700', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#CCCCCC' },
  submitButtonText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
});
