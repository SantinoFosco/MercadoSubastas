import * as SecureStore from 'expo-secure-store';

export type Categoria = 'comun' | 'especial' | 'plata' | 'oro' | 'platino';

export type UserSession = {
  identificador: number;
  nombre: string;
  mail: string;
  direccion: string;
  categoria: Categoria;
  estado: string;
  claveTemporal: boolean;
  admitido: string;
};

const SESSION_KEY = 'user_session';
let _session: UserSession | null = null;

export const SessionStore = {
  get(): UserSession | null {
    return _session;
  },

  async save(data: UserSession): Promise<void> {
    _session = data;
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data));
  },

  async load(): Promise<UserSession | null> {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (!raw) return null;
      _session = JSON.parse(raw) as UserSession;
      return _session;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    _session = null;
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
