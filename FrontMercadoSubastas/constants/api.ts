import Constants from 'expo-constants';

// Obtiene dinámicamente la IP de la máquina que corre Expo.
// Así funciona en cualquier red (casa, facultad, etc.) sin cambiar nada.
const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost ?? 'localhost:8000';
const host = hostUri.split(':')[0];

export const API_BASE_URL = `http://${host}:8000`;

export const API_ENDPOINTS = {
  // Auth
  registroIniciar:    `${API_BASE_URL}/auth/registro/iniciar`,
  registroAprobar:    `${API_BASE_URL}/auth/registro/aprobar`,
  registroDesaprobar: `${API_BASE_URL}/auth/registro/desaprobar`,
  login:              `${API_BASE_URL}/auth/login`,
  cambiarClave:       `${API_BASE_URL}/auth/cambiar-clave`,
  // Países
  paises: `${API_BASE_URL}/paises/`,
  // Medios de pago
  medioPagoTarjeta: `${API_BASE_URL}/mediosPago/tarjeta`,
  medioPagoCuenta:  `${API_BASE_URL}/mediosPago/cuenta-bancaria`,
  medioPagoCheque:  `${API_BASE_URL}/mediosPago/cheque`,
  // Exploración
  home:             (categoria: string) => `${API_BASE_URL}/home?categoria=${categoria}`,
  catalogoSubasta:  (subastaId: number | string) => `${API_BASE_URL}/subastas/${subastaId}/catalogo`,
  detalleProducto:  (subastaId: number | string, productoId: number | string) =>
                      `${API_BASE_URL}/subastas/${subastaId}/catalogo/${productoId}`,
};
