import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/constants/api';

type PlaceBidParams = {
  asistenteId: number;
  itemCatalogoId: number;
  importe: number;
};

export function usePlaceBid() {
  const [isBidding, setIsBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  const placeBid = useCallback(async (params: PlaceBidParams): Promise<boolean> => {
    setIsBidding(true);
    setBidError(null);
    try {
      const res = await fetch(API_ENDPOINTS.pujar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asistenteId: params.asistenteId,
          itemId: params.itemCatalogoId,
          importe: params.importe,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setBidError(data.detail ?? 'Error al realizar la puja.');
        return false;
      }
      return true;
    } catch {
      setBidError('No se pudo conectar con el servidor.');
      return false;
    } finally {
      setIsBidding(false);
    }
  }, []);

  return { isBidding, bidError, placeBid };
}
