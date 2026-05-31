export type Categoria = 'comun' | 'especial' | 'plata' | 'oro' | 'platino';

export type UserSession = {
  identificador: number;
  categoria: Categoria;
  [key: string]: any;
};

let _session: UserSession | null = null;

export const SessionStore = {
  set(data: UserSession) {
    _session = data;
  },
  get(): UserSession | null {
    return _session;
  },
  clear() {
    _session = null;
  },
  getCategoria(): Categoria {
    return _session?.categoria ?? 'comun';
  },
};
