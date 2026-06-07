import { Stack } from 'expo-router';

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="estadisticas" />
      <Stack.Screen name="medios-pago" />
      <Stack.Screen name="multas" />
    </Stack>
  );
}
