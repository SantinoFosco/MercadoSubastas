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
  | { type: 'auction_state'; data: AuctionState }
  | { type: 'bid_update';    data: AuctionState }
  | { type: 'item_closed';   data: SoldInfo }
  | { type: 'auction_ended'; data: { subastaId: number } }
  | { type: 'error';         detail: string };

export function useAuctionWebSocket(subastaId: string | null, clienteId: number | null) {
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [soldInfo, setSoldInfo] = useState<SoldInfo | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const soldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!subastaId || !clienteId) return;
    const ws = new WebSocket(API_ENDPOINTS.wsSubasta(subastaId, clienteId));
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

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
          setAuctionEnded(true);
        } else if (msg.type === 'error') {
          setConnectionError(msg.detail);
        }
      } catch {}
    };
  }, [subastaId, clienteId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
    };
  }, [connect]);

  return { auctionState, isConnected, auctionEnded, soldInfo, connectionError };
}
