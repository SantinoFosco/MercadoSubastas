import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
} from 'react-native';
import { Appbar, Text, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';
import * as ImagePicker from 'expo-image-picker';

const CATEGORY_OPTIONS = [
  'Relojería de Lujo',
  'Vehículos',
  'Joyería',
  'Arte',
  'Electrónica',
  'Moda y Accesorios',
];

const IMAGE_SLOTS = [
  { label: 'PRINCIPAL', icon: 'camera-outline' as const },
  { label: 'ÁNGULO 2', icon: 'image-outline' as const },
  { label: 'ÁNGULO 3', icon: 'image-outline' as const },
  { label: 'DETALLE 1', icon: 'image-outline' as const },
  { label: 'DETALLE 2', icon: 'image-outline' as const },
  { label: 'CERTIFICADO', icon: 'file-document-outline' as const },
];

export default function SubastarArticuloScreen() {
  const router = useRouter();
  const { session } = useSession();

  useEffect(() => {
    if (!session) router.replace('/login');
  }, [session]);

  const [articleName, setArticleName] = useState('');
  const [category, setCategory] = useState('Relojería de Lujo');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFotos, setUploadedFotos] = useState<Record<number, string>>({});
  const [productoId, setProductoId] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = articleName.trim() && description.trim() && isChecked && !isLoading;
  const fotosCount = Object.keys(uploadedFotos).length;

  const handleSlotPress = async (slotIndex: number, currentProductoId: number | null) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0].base64) return;
    const base64 = result.assets[0].base64;
    if (!currentProductoId) return;
    try {
      const res = await fetch(API_ENDPOINTS.subirFoto, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto: currentProductoId, imagen: base64 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Error', data.detail ?? 'No se pudo subir la foto. Intentá nuevamente.');
        return;
      }
      setUploadedFotos((prev) => ({ ...prev, [slotIndex]: result.assets[0].uri }));
    } catch {
      Alert.alert('Error', 'Error de conexión al subir la foto.');
    }
  };

  const handleSubmit = async () => {
    if (!session) {
      router.replace('/sign-in');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.submitArticulo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: articleName.trim(),
          categoria: category,
          descripcionCompleta: description.trim(),
          procedencia: history.trim() || null,
          declaracionLegal: isChecked,
          clienteId: session.identificador,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? 'Error al enviar el artículo.');
        return;
      }
      const data = await res.json();
      setProductoId(data.productoId);
      setSubmitted(true);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderBar} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  if (!session) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Subastar Artículo</Text>

        <SectionHeader title="Detalles del Lote" />

        <Text style={styles.inputLabel}>NOMBRE DEL ARTÍCULO</Text>
        <TextInput
          style={styles.textInput}
          value={articleName}
          onChangeText={setArticleName}
          placeholder="Ej. Rolex Submariner Date 2023"
          placeholderTextColor="#999"
        />

        <Text style={styles.inputLabel}>CATEGORÍA</Text>
        <Menu
          visible={categoryMenuVisible}
          onDismiss={() => setCategoryMenuVisible(false)}
          contentStyle={{ backgroundColor: 'white' }}
          anchor={
            <Pressable onPress={() => setCategoryMenuVisible(true)}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerText}>{category}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#8A6D3B" />
              </View>
            </Pressable>
          }
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <Menu.Item
              key={opt}
              onPress={() => { setCategory(opt); setCategoryMenuVisible(false); }}
              title={opt}
              titleStyle={{ color: '#333' }}
            />
          ))}
        </Menu>

        <SectionHeader title="Narrativa del Lote" />

        <Text style={styles.inputLabel}>DESCRIPCIÓN DETALLADA</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline, { height: 100 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe las características únicas, estado de conservación y especificaciones técnicas..."
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.inputLabel}>HISTORIAL (PROVENIENCIA)</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline, { height: 80 }]}
          value={history}
          onChangeText={setHistory}
          placeholder="Origen del artículo, dueños anteriores, restauraciones o certificados de autenticidad..."
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
        />

        <SectionHeader title="Galería de Imágenes" />

        {submitted && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#2E7D32" />
            <Text style={styles.successBannerText}>
              Artículo creado. Ahora subí las fotos ({fotosCount}/6).
            </Text>
          </View>
        )}

        <View style={styles.imageGrid}>
          {IMAGE_SLOTS.map((slot, index) => {
            const uploaded = !!uploadedFotos[index];
            const disabled = !submitted;
            return (
              <Pressable
                key={slot.label}
                style={[styles.imageSlot, disabled && styles.imageSlotDisabled]}
                onPress={() => !disabled && handleSlotPress(index, productoId)}
              >
                <View style={styles.imageSlotContent}>
                  {uploaded ? (
                    <Image source={{ uri: uploadedFotos[index] }} style={styles.imagePreview} />
                  ) : (
                    <MaterialCommunityIcons
                      name={slot.icon as any}
                      size={40}
                      color={disabled ? '#E0E0E0' : '#D0D0D0'}
                    />
                  )}
                  <Text style={[styles.imageSlotLabel, disabled && { color: '#C0C0C0' }]}>
                    {slot.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {!submitted && (
          <Text style={styles.photoHint}>
            Las fotos se podrán subir una vez que envíes el artículo.
          </Text>
        )}

        <View style={styles.legalRow}>
          <Pressable
            onPress={() => setIsChecked(!isChecked)}
            style={[styles.checkbox, isChecked && styles.checkboxChecked]}
          >
            {isChecked && <MaterialCommunityIcons name="check" size={16} color="white" />}
          </Pressable>
          <Text style={styles.legalText}>
            Declaro que el bien me pertenece y no posee impedimentos legales,
            gravámenes o disputas de propiedad que afecten su transferencia.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!submitted ? (
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isLoading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitButtonText}>ENVIAR ARTÍCULO</Text>
            }
          </Pressable>
        ) : (
          <Pressable
            style={[styles.submitButton, fotosCount === 0 && styles.submitButtonDisabled]}
            onPress={() => router.push('/vender/mis-articulos')}
            disabled={fotosCount === 0}
          >
            <Text style={styles.submitButtonText}>
              {fotosCount === 0 ? 'SUBÍ AL MENOS 1 FOTO' : `CONTINUAR (${fotosCount} foto${fotosCount > 1 ? 's' : ''})`}
            </Text>
          </Pressable>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      <BottomTabBar
        activeTab="vender"
        onTabPress={(tab) => {
          if (tab === 'explorar') router.push('/exploracion');
          if (tab === 'perfil') router.push('/perfil');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  appbar: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 0 },
  logoBadge: { width: 50, height: 35 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  sectionHeaderBar: { width: 4, height: 20, backgroundColor: '#FFD700', borderRadius: 2, marginRight: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  textInput: { backgroundColor: '#F5F5F5', borderRadius: 10, height: 52, paddingHorizontal: 16, fontSize: 14, color: '#1A1A1A', marginBottom: 16 },
  textInputMultiline: { paddingTop: 14, paddingBottom: 14 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 10, height: 52, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerText: { color: '#1A1A1A', fontSize: 14 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24, justifyContent: 'space-between' },
  imageSlot: { width: '48%', aspectRatio: 1, borderStyle: 'solid', borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, paddingHorizontal: 8 },
  imageSlotContent: { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' },
  imageSlotLabel: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginTop: 8, letterSpacing: 0.8 },
  enArchivoBadge: { position: 'absolute', bottom: 10, backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  enArchivoBadgeText: { fontSize: 10, fontWeight: '800', color: '#333' },
  legalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 12, backgroundColor: 'rgba(26,26,26,0.04)', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginTop: 2, backgroundColor: '#FFFFFF' },
  checkboxChecked: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  legalText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 19, fontWeight: '500' },
  errorText: { fontSize: 13, color: '#D32F2F', textAlign: 'center', marginBottom: 16 },
  submitButton: { backgroundColor: '#FFD700', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#CCCCCC' },
  submitButtonText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  imageSlotDisabled: { opacity: 0.5 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 14, position: 'absolute' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  successBannerText: { fontSize: 13, color: '#2E7D32', fontWeight: '600', flex: 1 },
  photoHint: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
});