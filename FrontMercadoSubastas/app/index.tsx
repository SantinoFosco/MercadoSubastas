import { Redirect } from 'expo-router';

export default function Index() {
  // Redirigimos automáticamente a la pantalla de login
  return <Redirect href="/login" />;
}
