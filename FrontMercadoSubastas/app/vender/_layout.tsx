import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';

export default function VenderLayout() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [isLoading, session]);

  if (isLoading || !session) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mis-articulos" />
      <Stack.Screen name="articulo-aprobado" />
      <Stack.Screen name="inspeccion-rechazada" />
      <Stack.Screen name="ubicacion-seguro" />
    </Stack>
  );
}
