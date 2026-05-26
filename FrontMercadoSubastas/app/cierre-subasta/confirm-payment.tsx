import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';

type PaymentMethod = 'visa' | 'banco' | 'garantia';

export default function ConfirmPaymentScreen() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('visa');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="menu" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Text style={styles.title}>Confirmar Pago</Text>
        <Text style={styles.subtitle}>
          Has ganado la subasta #4492. Completa la transacción para asegurar tu lote.
        </Text>

        {/* Lot Summary */}
        <View style={styles.lotSummaryCard}>
          <Text style={styles.sectionLabel}>RESUMEN DEL LOTE</Text>
          <Text style={styles.lotName}>
            Reloj de Colección:{'\n'}Chronos Prestige Edición{'\n'}Oro
          </Text>
          <Text style={styles.lotCertified}>Lote certificado por Expertos Elite</Text>

          <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
          <Text style={styles.totalPrice}>$20,600</Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.paymentTitle}>Método de Pago Verificado</Text>

        {/* Visa */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'visa' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('visa')}
          activeOpacity={0.8}
        >
          <View style={styles.paymentIconContainer}>
            <MaterialCommunityIcons name="credit-card-outline" size={22} color="#2B3966" />
          </View>
          <View style={styles.paymentTextContainer}>
            <Text style={styles.paymentOptionTitle}>Visa **** 1234</Text>
            <Text style={styles.paymentOptionSub}>Vence 08/26</Text>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'visa' && styles.radioOuterSelected]}>
            {paymentMethod === 'visa' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Cuenta Bancaria */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'banco' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('banco')}
          activeOpacity={0.8}
        >
          <View style={styles.paymentIconContainer}>
            <MaterialCommunityIcons name="bank-outline" size={22} color="#614F3A" />
          </View>
          <View style={styles.paymentTextContainer}>
            <Text style={styles.paymentOptionTitle}>Cuenta Bancaria</Text>
            <Text style={styles.paymentOptionSub}>Banco Global Express</Text>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'banco' && styles.radioOuterSelected]}>
            {paymentMethod === 'banco' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Saldo en Garantía */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'garantia' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('garantia')}
          activeOpacity={0.8}
        >
          <View style={styles.paymentIconContainer}>
            <MaterialCommunityIcons name="circle-multiple-outline" size={22} color="#8D7A27" />
          </View>
          <View style={styles.paymentTextContainer}>
            <Text style={styles.paymentOptionTitle}>Saldo en Garantía</Text>
            <Text style={styles.paymentOptionSub}>Disponible: $25,000</Text>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'garantia' && styles.radioOuterSelected]}>
            {paymentMethod === 'garantia' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Security Message */}
        <View style={styles.securityCard}>
          <MaterialCommunityIcons name="shield-check-outline" size={18} color="#8A6D3B" />
          <Text style={styles.securityText}>
            <Text style={styles.securityBold}>Mensaje de seguridad: </Text>
            Esta transacción está protegida por encriptación de grado bancario. Sus datos financieros nunca se comparten con el vendedor. Al hacer clic en finalizar, autoriza el cobro del total indicado.
          </Text>
        </View>

        {/* Finalize Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            // TODO: Handle payment finalization
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Finalizar Compra</Text>
        </TouchableOpacity>

        {/* Trust Icons */}
        <View style={styles.trustIcons}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#999999" />
          <MaterialCommunityIcons name="camera-outline" size={24} color="#999999" />
          <MaterialCommunityIcons name="account-check-outline" size={24} color="#999999" />
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="mis-pujas" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 30,
  },

  /* Title */
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },

  /* Lot Summary */
  lotSummaryCard: {
    backgroundColor: '#F5F6F8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A6D3B',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  lotName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 26,
    marginBottom: 6,
  },
  lotCertified: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A6D3B',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  /* Payment Methods */
  paymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  paymentOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionSelected: {
    borderColor: '#8A6D3B',
  },
  paymentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  paymentOptionSub: {
    fontSize: 12,
    color: '#999999',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: '#FFD700',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
  },

  /* Security Card */
  securityCard: {
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 17,
    flex: 1,
  },
  securityBold: {
    fontWeight: '700',
    color: '#1A1A1A',
  },

  /* Button */
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Trust Icons */
  trustIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 10,
  },
});
