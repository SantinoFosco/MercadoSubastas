import { Stack } from 'expo-router';

export default function VenderLayout() {
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
