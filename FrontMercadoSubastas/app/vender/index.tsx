import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Appbar, Menu, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';
import { API_ENDPOINTS } from '@/constants/api';
import { useSession } from '@/contexts/SessionContext';

const CATEGORY_OPTIONS = [
  'Relojería de Lujo',
  'Vehículos',
  'Joyería',
  'Arte',
  'Electrónica',
  'Moda y Accesorios',
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

  const canSubmit = articleName.trim() && description.trim() && isChecked && !isLoading;

  const handleSubmit = async () => {
    if (!session) { router.replace('/sign-in'); return; }
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
      router.push({ pathname: '/vender/fotos', params: { productoId: String(data.productoId) } });
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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Subastar Artículo</Text>
        <Text style={styles.pageSubtitle}>Paso 1 de 2 — Datos del producto</Text>

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

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isLoading
            ? <ActivityIndicator color="#FFF" />
            : (
              <View style={styles.submitButtonInner}>
                <Text style={styles.submitButtonText}>CONTINUAR</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
              </View>
            )
          }
        </Pressable>

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
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#999', marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  sectionHeaderBar: { width: 4, height: 20, backgroundColor: '#FFD700', borderRadius: 2, marginRight: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  textInput: { backgroundColor: '#F5F5F5', borderRadius: 10, height: 52, paddingHorizontal: 16, fontSize: 14, color: '#1A1A1A', marginBottom: 16 },
  textInputMultiline: { paddingTop: 14, paddingBottom: 14 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 10, height: 52, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerText: { color: '#1A1A1A', fontSize: 14 },
  legalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 12, backgroundColor: 'rgba(26,26,26,0.04)', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginTop: 2, backgroundColor: '#FFFFFF' },
  checkboxChecked: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  legalText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 19, fontWeight: '500' },
  errorText: { fontSize: 13, color: '#D32F2F', textAlign: 'center', marginBottom: 16 },
  submitButton: { backgroundColor: '#FFD700', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#CCCCCC' },
  submitButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitButtonText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
});