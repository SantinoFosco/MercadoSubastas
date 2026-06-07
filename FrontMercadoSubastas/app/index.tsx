import { Redirect } from 'expo-router';

// Explorar is the public home screen — accessible with or without a session.
// Login/register is reached via the BottomTabBar "Iniciar sesión" tab.
export default function Index() {
  return <Redirect href="/exploracion" />;
}
