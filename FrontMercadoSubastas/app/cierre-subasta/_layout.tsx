import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';

export default function CierreSubastaLayout() {
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
      <Stack.Screen name="winner" />
      <Stack.Screen name="delivery-details" />
      <Stack.Screen name="confirm-payment" />
    </Stack>
  );
}
