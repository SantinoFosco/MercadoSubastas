import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionStore, UserSession, Categoria } from '@/store/session';
import { API_ENDPOINTS } from '@/constants/api';

type SessionContextType = {
  session: UserSession | null;
  isLoading: boolean;
  getCategoria: () => Categoria;
  login: (data: UserSession) => Promise<void>;
  logout: () => void;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
  getCategoria: () => 'comun',
  login: async () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const stored = await SessionStore.load();

      if (stored) {
        try {
          // Validate that the stored session still exists in the backend.
          // This handles the case where the DB was reset (docker compose down -v)
          // and the old identificador no longer maps to any user.
          const res = await fetch(API_ENDPOINTS.perfilCompleto(stored.identificador));
          if (res.status === 404) {
            SessionStore.clear();
            setSession(null);
          } else {
            setSession(stored);
          }
        } catch {
          // Network unavailable on startup — keep the session.
          // Individual screens handle their own auth errors.
          setSession(stored);
        }
      }

      setIsLoading(false);
    }
    init();
  }, []);

  const login = async (data: UserSession): Promise<void> => {
    await SessionStore.save(data);
    setSession(data);
  };

  const logout = (): void => {
    SessionStore.clear();
    setSession(null);
  };

  const getCategoria = (): Categoria => session?.categoria ?? 'comun';

  return (
    <SessionContext.Provider value={{ session, isLoading, getCategoria, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  return useContext(SessionContext);
}
