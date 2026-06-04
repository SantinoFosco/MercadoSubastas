import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionStore } from '@/store/session';
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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const navTheme = colorScheme === 'dark' ? NavDarkTheme : LightTheme;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await SessionStore.load();
      await SplashScreen.hideAsync();
      setReady(true);
    }
    init();
  }, []);

  if (!ready) return null;

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
