/**
 * Determina si una subasta ya arrancó basándose en el reloj local del dispositivo.
 *
 * @param isoDatetime  ISO string del datetime de inicio (ej. "2024-01-15T20:00:00")
 *                     tal como lo retorna el backend (hora Argentina, sin timezone marker).
 * @returns true si Date.now() >= fechaInicio (la subasta ya debería estar en curso).
 *
 * Nota: el backend también valida esto; este check es solo para la barrera de UI
 * que evita que el usuario quede esperando en una sala vacía antes de la hora.
 */
export function isAuctionLive(isoDatetime: string): boolean {
  const start = new Date(isoDatetime);
  if (isNaN(start.getTime())) return false;
  return Date.now() >= start.getTime();
}

/**
 * Formatea el tiempo restante hasta el inicio de la subasta.
 * @returns string tipo "2h 15m" o "45s"
 */
export function timeUntilStart(isoDatetime: string): string {
  const diff = new Date(isoDatetime).getTime() - Date.now();
  if (diff <= 0) return '0s';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
