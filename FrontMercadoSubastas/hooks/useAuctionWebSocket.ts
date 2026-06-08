import { useEffect, useRef, useCallback, useState } from 'react';
import { API_ENDPOINTS } from '@/constants/api';

export type AuctionActivity = {
  pujaId: number;
  nombreComprador: string;
  nombreProducto: string;
  fecha: string;
  valor: string;
};

export type AuctionState = {
  subastaId: number;
  categoriaSubasta: string;
  productoId: number;
  itemCatalogoId: number;
  precioBase: number;
  titulo: string;
  precioActual: number;
  proximaPuja: number;
  pujaMaxima: number;
  imagen: string | null;
  pujasTotales: number;
  incrementosSugeridos: number[];
  actividadReciente: AuctionActivity[];
};

export type SoldInfo = {
  itemCatalogoId: number;
  ganadorNombre: string | null;
  ganadorClienteId: number | null;  // null cuando compra la empresa
  importe: number;
};

type WsMessage =
  | { type: 'auction_state';       data: AuctionState }
  | { type: 'bid_update';          data: AuctionState }
  | { type: 'item_closed';         data: SoldInfo }
  | { type: 'auction_ended';       data: { subastaId: number } }
  | { type: 'auction_not_started'; data: { subastaId: number; inicio: string } }
  | { type: 'error';               detail: string };

const MAX_RETRIES = 5;
const RETRY_BASE_MS = 1500;

export function useAuctionWebSocket(subastaId: string | null, clienteId: number | null) {
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [auctionNotStarted, setAuctionNotStarted] = useState(false);
  const [auctionStartTime, setAuctionStartTime] = useState<string | null>(null);
  const [soldInfo, setSoldInfo] = useState<SoldInfo | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const soldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const auctionEndedRef = useRef(false);

  const connect = useCallback(() => {
    if (!subastaId || !clienteId) return;
    if (auctionEndedRef.current) return;

    const ws = new WebSocket(API_ENDPOINTS.wsSubasta(subastaId, clienteId));
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setIsConnected(true);
      setConnectionError(null);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (auctionEndedRef.current) return;
      if (retriesRef.current < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * (retriesRef.current + 1);
        retriesRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === 'auction_state' || msg.type === 'bid_update') {
          setAuctionState(msg.data);
        } else if (msg.type === 'item_closed') {
          setSoldInfo(msg.data);
          if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
          soldTimerRef.current = setTimeout(() => setSoldInfo(null), 4000);
        } else if (msg.type === 'auction_ended') {
          auctionEndedRef.current = true;
          setAuctionEnded(true);
        } else if (msg.type === 'auction_not_started') {
          setAuctionNotStarted(true);
          setAuctionStartTime(msg.data.inicio);
        } else if (msg.type === 'error') {
          setConnectionError(msg.detail);
        }
      } catch (err) {
        console.warn('[WS] Failed to parse message:', err);
      }
    };
  }, [subastaId, clienteId]);

  useEffect(() => {
    connect();
    return () => {
      auctionEndedRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
      if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [connect]);

  return { auctionState, isConnected, auctionEnded, auctionNotStarted, auctionStartTime, soldInfo, connectionError };
}
