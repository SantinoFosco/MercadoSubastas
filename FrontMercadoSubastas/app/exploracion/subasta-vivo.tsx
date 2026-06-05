import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuctionWebSocket } from '@/hooks/useAuctionWebSocket';
import { usePlaceBid } from '@/hooks/usePlaceBid';
import { SessionStore } from '@/store/session';
import { API_ENDPOINTS } from '@/constants/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type BidEntry = {
  id: number;
  initial: string;
  name: string;
  time: string;
  amount: string;
  color: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  '$' + value.toLocaleString('en-US');

// ── Component ──────────────────────────────────────────────────────────────────

export default function SubastaVivoScreen() {
  const router = useRouter();
  const { subastaId } = useLocalSearchParams<{ subastaId: string }>();

  // ── Redirigir si no hay sesión ──────────────────────────────────────────────
  useEffect(() => {
    if (!SessionStore.get()?.identificador) {
      router.replace('/sign-in');
    }
  }, []);

  // ── Registro como asistente ─────────────────────────────────────────────────
  const [asistenteId, setAsistenteId] = useState<number | null>(null);
  const [registroError, setRegistroError] = useState<string | null>(null);

  useEffect(() => {
    const cid = SessionStore.get()?.identificador;
    if (!cid || !subastaId) return;

    fetch(API_ENDPOINTS.registrarAsistente, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente: cid, subasta: Number(subastaId) }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (res.status === 403) {
          setRegistroError(body.detail ?? 'No tenés categoría para acceder a esta subasta.');
        } else if (body.identificador) {
          setAsistenteId(body.identificador);
        } else {
          setRegistroError('No se pudo registrar en la subasta.');
        }
      })
      .catch(() => setRegistroError('Error de conexión al registrarse.'));
  }, [subastaId]);

  const clienteId = SessionStore.get()?.identificador ?? null;

  // ── Verificar si tiene medio de pago aprobado ───────────────────────────────
  const [puedePublicar, setPuedePublicar] = useState<boolean | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    fetch(API_ENDPOINTS.mediosPagoCliente(clienteId))
      .then(res => res.ok ? res.json() : null)
      .then(data => setPuedePublicar(data?.tieneMedioPagoVerificado ?? false))
      .catch(() => setPuedePublicar(false));
  }, [clienteId]);

  // ── WebSocket — estado en tiempo real ───────────────────────────────────────
  const { auctionState, isConnected, auctionEnded, soldInfo, connectionError } =
    useAuctionWebSocket(subastaId ?? null, clienteId);

  // Rastrear si el usuario ganó al menos un ítem (para redirigir al cierre)
  const [hasWon, setHasWon] = useState(false);

  // Cuando el usuario gana un ítem: marcar como ganador y quedarse en la sala.
  // El usuario puede seguir pujando por los próximos ítems; el pago se hace
  // UNA SOLA VEZ al final con el total acumulado de todo lo ganado.
  useEffect(() => {
    if (soldInfo?.ganadorClienteId === clienteId) setHasWon(true);
  }, [soldInfo, clienteId]);

  // Al terminar la subasta: si ganó algo → ir al resumen de compras y pago.
  useEffect(() => {
    if (!auctionEnded || !hasWon || !subastaId || !clienteId) return;
    router.push({
      pathname: '/cierre-subasta/winner',
      params: { subastaId: subastaId, clienteId: String(clienteId) },
    });
  }, [auctionEnded, hasWon]);

  // F3: mostrar error de conexión si el usuario ya está en otra subasta
  useEffect(() => {
    if (connectionError) Alert.alert('Conexión rechazada', connectionError);
  }, [connectionError]);

  // ── Puja ────────────────────────────────────────────────────────────────────
  const { isBidding, bidError, placeBid } = usePlaceBid();
  const [selectedQuickBid, setSelectedQuickBid] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // ── Valores derivados del servidor ─────────────────────────────────────────
  const currentBid    = auctionState?.precioActual ?? 0;
  const nextBid       = auctionState?.proximaPuja  ?? 0;
  const maxBid        = auctionState?.pujaMaxima   ?? 0;
  const totalBids     = auctionState?.pujasTotales ?? 0;
  const titulo        = auctionState?.titulo       ?? '...';
  const quickBidOptions = auctionState?.incrementosSugeridos ?? [];
  const noLimits      = ['oro', 'platino'].includes(auctionState?.categoriaSubasta ?? '');

  // Mapa actividadReciente → BidEntry
  const bids: BidEntry[] = (auctionState?.actividadReciente ?? []).map((a) => ({
    id: a.pujaId,
    initial: a.nombreComprador.charAt(0).toUpperCase(),
    name: a.nombreComprador,
    time: new Date(a.fecha).toLocaleTimeString('es-AR'),
    amount: a.valor,
    color: '#FFD700',
  }));

  // ── Ref para auto-scroll de la lista de pujas ───────────────────────────────
  const bidsScrollRef = useRef<ScrollView>(null);

  // Cada vez que llega una nueva puja, hacer scroll al inicio (más reciente)
  useEffect(() => {
    if (bids.length > 0) {
      bidsScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [bids.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleQuickBidSelect = (amount: number) => {
    setSelectedQuickBid(amount);
    setCustomAmount('');
  };

  const handlePlaceBid = async () => {
    if (!asistenteId || !auctionState) {
      Alert.alert('Error', registroError ?? 'No estás registrado en esta subasta.');
      return;
    }

    const increment =
      customAmount.length > 0
        ? parseFloat(customAmount.replace(/[^0-9.]/g, ''))
        : selectedQuickBid ?? 0;

    if (!increment || increment <= 0) {
      Alert.alert('Seleccioná un monto', 'Elegí una opción rápida o ingresá un monto personalizado.');
      return;
    }

    const importe = currentBid + increment;

    // Validación local antes de enviar (refleja las reglas del back)
    if (!noLimits) {
      if (importe < nextBid) {
        Alert.alert('Monto muy bajo', `La puja mínima es ${formatCurrency(nextBid)}`);
        return;
      }
      if (importe > maxBid) {
        Alert.alert('Monto muy alto', `La puja máxima es ${formatCurrency(maxBid)}`);
        return;
      }
    }

    // isBidding=true bloquea el botón hasta recibir respuesta (enunciado: no permitir otro puje hasta confirmación)
    const ok = await placeBid({
      asistenteId,
      itemCatalogoId: auctionState.itemCatalogoId,
      importe,
    });

    if (ok) {
      setSelectedQuickBid(null);
      setCustomAmount('');
      // La UI se actualiza sola cuando llega el bid_update por WebSocket
    } else {
      Alert.alert('Error al pujar', bidError ?? 'Intentá nuevamente.');
    }
  };

  // ── Estado: subasta finalizada (solo para quienes no ganaron nada) ──────────
  if (auctionEnded && !hasWon) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.endedContainer}>
          <MaterialCommunityIcons name="gavel" size={64} color="#8A6D3B" />
          <Text style={styles.endedTitle}>¡Subasta finalizada!</Text>
          <Text style={styles.endedSubtitle}>Todos los lotes fueron adjudicados.</Text>
        </View>
        <BottomTabBar
          activeTab="explorar"
          onTabPress={(tab) => {
            if (tab !== 'explorar') router.push(`/${tab}` as any);
          }}
        />
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ══ ZONA 1: Hero + Stats (altura fija, no scrollea) ══════════════════ */}
      <View>
        {/* ── 1. Hero Image with Overlay ─────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, !isConnected && styles.liveDotOff]} />
            <Text style={styles.liveBadgeText}>{isConnected ? 'EN VIVO' : 'CONECTANDO...'}</Text>
          </View>

          <View style={styles.heroIconContainer}>
            <MaterialCommunityIcons name="watch" size={80} color="#555555" />
          </View>

          <View style={styles.heroOverlay}>
            <Text style={styles.heroLotLabel}>LOTE #{auctionState?.itemCatalogoId ?? '...'}</Text>
            <Text style={styles.heroTitle}>{titulo}</Text>
          </View>

          {soldInfo && (
            <View style={[
              styles.soldOverlay,
              soldInfo.ganadorClienteId === clienteId && styles.soldOverlayWinner,
            ]}>
              <MaterialCommunityIcons
                name={soldInfo.ganadorClienteId === clienteId ? 'trophy' : 'gavel'}
                size={48}
                color="#FFD700"
              />
              <Text style={styles.soldTitle}>¡VENDIDO!</Text>
              {soldInfo.ganadorClienteId === clienteId ? (
                <>
                  <Text style={styles.soldWinnerSelf}>¡ES TUYO!</Text>
                  <Text style={styles.soldWinnerHint}>Seguís en la subasta — pagás todo al final</Text>
                </>
              ) : (
                <Text style={styles.soldWinner}>{soldInfo.ganadorNombre}</Text>
              )}
              <Text style={styles.soldAmount}>{formatCurrency(soldInfo.importe)}</Text>
            </View>
          )}
        </View>

        {/* ── 2. Stats Grid ──────────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>OFERTA ACTUAL</Text>
              <Text style={styles.statValueGold}>{formatCurrency(currentBid)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PUJAS TOTALES</Text>
              <Text style={styles.statValueDark}>{totalBids}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PRÓXIMA PUJA MÍN.</Text>
              <Text style={styles.statValueNext}>{formatCurrency(nextBid)}</Text>
            </View>
            {!noLimits && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>PUJA MÁXIMA</Text>
                <Text style={styles.statValueNext}>{formatCurrency(maxBid)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ══ ZONA 2: Actividad reciente — se expande y scrollea internamente ══ */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        <ScrollView
          ref={bidsScrollRef}
          style={styles.bidsScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {bids.length === 0 ? (
            <Text style={styles.emptyBids}>Aún no hay pujas. ¡Sé el primero!</Text>
          ) : (
            bids.map((bid) => (
              <View key={bid.id} style={styles.bidRow}>
                <View style={[styles.avatar, { backgroundColor: bid.color }]}>
                  <Text style={styles.avatarText}>{bid.initial}</Text>
                </View>
                <View style={styles.bidInfo}>
                  <Text style={styles.bidName}>{bid.name}</Text>
                  <Text style={styles.bidTime}>{bid.time}</Text>
                </View>
                <Text style={styles.bidAmount}>{bid.amount}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* ══ ZONA 3: Controles de puja — siempre visibles al fondo ════════════ */}
      <View style={styles.bidControlsContainer}>

        {/* Banner observador */}
        {puedePublicar === false && (
          <View style={[styles.section, { marginTop: 0, marginBottom: 10 }]}>
            <View style={styles.observerBanner}>
              <MaterialCommunityIcons name="eye-outline" size={20} color="#1976D2" />
              <View style={{ flex: 1 }}>
                <Text style={styles.observerBannerTitle}>Modo observador</Text>
                <Text style={styles.observerBannerText}>
                  Para pujar necesitás al menos un medio de pago verificado por la casa de subastas.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Error / loading de registro */}
        {registroError ? (
          <View style={[styles.section, { marginTop: 0, marginBottom: 10 }]}>
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D32F2F" />
              <Text style={styles.errorBannerText}>{registroError}</Text>
            </View>
          </View>
        ) : asistenteId === null ? (
          <View style={[styles.section, { marginTop: 0, marginBottom: 10 }]}>
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="loading" size={18} color="#8A6D3B" />
              <Text style={styles.infoBannerText}>Registrando tu participación…</Text>
            </View>
          </View>
        ) : null}

        {/* Quick Bid Buttons */}
        {quickBidOptions.length > 0 && puedePublicar && (
          <View style={styles.quickBidRow}>
            {quickBidOptions.map((amount) => {
              const isActive = selectedQuickBid === amount;
              return (
                <TouchableOpacity
                  key={amount}
                  style={[styles.quickBidButton, isActive && styles.quickBidButtonActive]}
                  onPress={() => handleQuickBidSelect(amount)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickBidText, isActive && styles.quickBidTextActive]}>
                    +{formatCurrency(amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Custom Amount Input */}
        {puedePublicar && (
          <TextInput
            style={styles.customInput}
            placeholder="Ingresá un incremento personalizado"
            placeholderTextColor="#999999"
            keyboardType="numeric"
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text);
              if (text.length > 0) setSelectedQuickBid(null);
            }}
          />
        )}

        {/* PUJAR AHORA Button */}
        <TouchableOpacity
          style={[
            styles.bidButton,
            (auctionEnded || isBidding || !asistenteId || !puedePublicar) && styles.bidButtonDisabled,
          ]}
          onPress={handlePlaceBid}
          activeOpacity={0.8}
          disabled={auctionEnded || isBidding || !asistenteId || !puedePublicar}
        >
          <MaterialCommunityIcons name="gavel" size={20} color="#FFFFFF" style={styles.bidButtonIcon} />
          <Text style={styles.bidButtonText}>
            {isBidding
              ? 'PROCESANDO...'
              : !puedePublicar
                ? 'SOLO OBSERVADOR'
                : asistenteId === null
                  ? (registroError ? 'NO PODÉS PUJAR' : 'REGISTRANDO...')
                  : 'PUJAR AHORA'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          AL PUJAR, ACEPTAS LOS TÉRMINOS Y CONDICIONES Y ASUMES EL COMPROMISO FINANCIERO.
        </Text>
      </View>

      <BottomTabBar
        activeTab="explorar"
        onTabPress={(tab) => {
          if (tab !== 'explorar') router.push(`/${tab}` as any);
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },

  // ── Zona 2: Actividad reciente con scroll interno ────────────────────────────
  activityContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bidsScroll: {
    flex: 1,
  },

  // ── Zona 3: Controles de puja anclados al fondo ──────────────────────────────
  bidControlsContainer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#FAFBFD',
    gap: 12,
  },

  // ── Sold Overlay ────────────────────────────────────────────────────────────
  soldOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 20,
  },
  soldOverlayWinner: {
    backgroundColor: 'rgba(26,60,26,0.88)',
  },
  soldTitle: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  soldWinner: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  soldWinnerSelf: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  soldWinnerHint: {
    color: '#CCFFCC',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  soldAmount: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
  },

  // ── Ended ───────────────────────────────────────────────────────────────────
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  endedSubtitle: {
    fontSize: 14,
    color: '#999999',
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroContainer: {
    height: 250,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  liveBadge: {
    position: 'absolute',
    top: 52,
    left: 68,
    backgroundColor: '#E53935',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveDotOff: {
    backgroundColor: '#888888',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroLotLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },

  // ── Stats Grid ──────────────────────────────────────────────────────────────
  statsGrid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValueGold: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8A6D3B',
  },
  statValueDark: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statValueNext: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 0,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  emptyBids: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // ── Bid Activity ────────────────────────────────────────────────────────────
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bidInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bidName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bidTime: {
    fontSize: 10,
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A6D3B',
  },

  // ── Quick Bid Buttons ───────────────────────────────────────────────────────
  quickBidRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBidButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBidButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  quickBidText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  quickBidTextActive: {
    color: '#8A6D3B',
  },

  // ── Custom Input ────────────────────────────────────────────────────────────
  customInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
  },

  // ── Bid Button ──────────────────────────────────────────────────────────────
  bidButton: {
    height: 56,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bidButtonDisabled: {
    opacity: 0.5,
  },
  bidButtonIcon: {
    marginRight: 2,
  },
  bidButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ── Observer Banner ─────────────────────────────────────────────────────────
  observerBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#E3F2FD', borderRadius: 12,
    borderWidth: 1, borderColor: '#BBDEFB',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  observerBannerTitle: {
    fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 2,
  },
  observerBannerText: {
    fontSize: 12, color: '#1976D2', lineHeight: 17,
  },

  // ── Error / Info Banners ────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFE8E8', borderRadius: 10,
    borderWidth: 1, borderColor: '#FFCCCC',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#D32F2F', fontWeight: '600', lineHeight: 18 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', borderRadius: 10,
    borderWidth: 1, borderColor: '#FFE082',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#8A6D3B', fontWeight: '500' },

  // ── Disclaimer ──────────────────────────────────────────────────────────────
  disclaimer: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 15,
  },
});
