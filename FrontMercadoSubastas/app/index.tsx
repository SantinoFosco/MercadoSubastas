import { Redirect } from 'expo-router';

export default function Index() {
  // Redirigimos automáticamente a la pantalla de vender
  return <Redirect href="/vender" />;
}
