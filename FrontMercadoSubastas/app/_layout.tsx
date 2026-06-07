import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, adaptNavigationTheme } from 'react-native-paper';

SplashScreen.preventAutoHideAsync();

const { LightTheme, DarkTheme: NavDarkTheme } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
});

// Inner component — lives INSIDE SessionProvider so it can call useSession().
function AppShell() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const navTheme = colorScheme === 'dark' ? NavDarkTheme : LightTheme;
  const { isLoading } = useSession();
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().then(() => setSplashHidden(true));
    }
  }, [isLoading]);

  // Keep the splash screen visible while the session is being loaded/validated.
  if (!splashHidden) return null;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}
