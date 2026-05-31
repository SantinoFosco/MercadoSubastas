import { Redirect } from 'expo-router';

export default function Index() {
  // Redirigimos al login como punto de entrada
  return <Redirect href="/login" />;
}
