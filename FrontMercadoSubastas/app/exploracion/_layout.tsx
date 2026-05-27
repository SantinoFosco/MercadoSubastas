import { Stack } from 'expo-router';

export default function ExploracionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="catalogo" />
      <Stack.Screen name="detalle-lote" />
      <Stack.Screen name="subasta-vivo" />
    </Stack>
  );
}
