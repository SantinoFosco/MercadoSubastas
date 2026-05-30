import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Image,
  Pressable,
  TextInput,
} from 'react-native';
import { Appbar, Text, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/BottomTabBar';

// ── Category options ──
const CATEGORY_OPTIONS = [
  'Relojería de Lujo',
  'Vehículos',
  'Joyería',
  'Arte',
  'Electrónica',
  'Moda y Accesorios',
];

// ── Image slot definitions ──
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

  // ── Form state ──
  const [articleName, setArticleName] = useState('');
  const [category, setCategory] = useState('Relojería de Lujo');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState('');
  const [isChecked, setIsChecked] = useState(false);

  // ── Section Header Component ──
  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderBar} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* ── 1. APPBAR ── */}
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

        {/* ── 2. TITLE ── */}
        <Text style={styles.pageTitle}>Subastar Artículo</Text>

        {/* ══════════════════════════════════════════════ */}
        {/* ── 3. SECTION: Detalles del Lote ── */}
        {/* ══════════════════════════════════════════════ */}
        <SectionHeader title="Detalles del Lote" />

        {/* Field: Nombre del Artículo */}
        <Text style={styles.inputLabel}>NOMBRE DEL ARTÍCULO</Text>
        <TextInput
          style={styles.textInput}
          value={articleName}
          onChangeText={setArticleName}
          placeholder="Ej. Rolex Submariner Date 2023"
          placeholderTextColor="#999"
        />

        {/* Field: Categoría */}
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
              onPress={() => {
                setCategory(opt);
                setCategoryMenuVisible(false);
              }}
              title={opt}
              titleStyle={{ color: '#333' }}
            />
          ))}
        </Menu>

        {/* ══════════════════════════════════════════════ */}
        {/* ── 4. SECTION: Narrativa del Lote ── */}
        {/* ══════════════════════════════════════════════ */}
        <SectionHeader title="Narrativa del Lote" />

        {/* Field: Descripción Detallada */}
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

        {/* Field: Historial (Proveniencia) */}
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

        {/* ══════════════════════════════════════════════ */}
        {/* ── 5. SECTION: Galería de Imágenes ── */}
        {/* ══════════════════════════════════════════════ */}
        <SectionHeader title="Galería de Imágenes" />

        <View style={styles.imageGrid}>
          {IMAGE_SLOTS.map((slot, index) => (
            <Pressable key={slot.label} style={styles.imageSlot}>
              <View style={styles.imageSlotContent}>
                <MaterialCommunityIcons
                  name={slot.icon as any}
                  size={40}
                  color="#D0D0D0"
                />
                <Text style={styles.imageSlotLabel}>{slot.label}</Text>
              </View>

              {/* "EN ARCHIVO" badge — only on the first (PRINCIPAL) slot */}
              {index === 0 && (
                <View style={styles.enArchivoBadge}>
                  <Text style={styles.enArchivoBadgeText}>EN ARCHIVO</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* ══════════════════════════════════════════════ */}
        {/* ── 6. LEGAL CHECKBOX ── */}
        {/* ══════════════════════════════════════════════ */}
        <View style={styles.legalRow}>
          <Pressable
            onPress={() => setIsChecked(!isChecked)}
            style={[
              styles.checkbox,
              isChecked && styles.checkboxChecked,
            ]}
          >
            {isChecked && (
              <MaterialCommunityIcons name="check" size={16} color="white" />
            )}
          </Pressable>
          <Text style={styles.legalText}>
            Declaro que el bien me pertenece y no posee impedimentos legales,
            gravámenes o disputas de propiedad que afecten su transferencia.
          </Text>
        </View>

        {/* ══════════════════════════════════════════════ */}
        {/* ── 7. SUBMIT BUTTON ── */}
        {/* ══════════════════════════════════════════════ */}
        <Pressable
          style={styles.submitButton}
          onPress={() => router.push('/vender/mis-articulos')}
        >
          <Text style={styles.submitButtonText}>CONTINUAR A PRECIOS</Text>
        </Pressable>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 8 }} />

      </ScrollView>

      {/* ── 8. BOTTOM TAB BAR ── */}
      <BottomTabBar
        activeTab="vender"
        onTabPress={(tab) => {
          if (tab === 'explorar') router.push('/exploracion');
          if (tab === 'mis-pujas') router.push('/exploracion');
          if (tab === 'perfil') router.push('/exploracion');
        }}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════
// ── STYLES ──
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ── Container ──
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },

  // ── Appbar ──
  appbar: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 0,
  },
  logoBadge: {
    width: 50,
    height: 35,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // ── Page Title ──
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 24,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  sectionHeaderBar: {
    width: 4,
    height: 20,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    marginRight: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // ── Form Labels ──
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },

  // ── Text Inputs (flat style, no outline) ──
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  textInputMultiline: {
    paddingTop: 14,
    paddingBottom: 14,
  },

  // ── Picker / Dropdown ──
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerText: {
    color: '#1A1A1A',
    fontSize: 14,
  },

  // ── Image Gallery Grid ──
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  imageSlot: {
    width: '48%',
    aspectRatio: 1,
    borderStyle: 'solid',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    paddingHorizontal: 8,
  },
  imageSlotContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  imageSlotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 8,
    letterSpacing: 0.8,
  },
  enArchivoBadge: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  enArchivoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#333',
  },

  // ── Legal Checkbox ──
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
    backgroundColor: 'rgba(26, 26, 26, 0.04)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  legalText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 19,
    fontWeight: '500',
  },

  // ── Submit Button ──
  submitButton: {
    backgroundColor: '#FFD700',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
