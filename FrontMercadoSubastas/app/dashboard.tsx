import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="DASHBOARD" titleStyle={styles.appbarText} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          ¡Bienvenido!
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Aquí irá el inicio de la app una vez que el usuario inicie sesión o sea verificado.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  appbar: { backgroundColor: '#FFD700' },
  appbarText: { fontWeight: 'bold', color: '#2B3966' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  subtitle: { textAlign: 'center', color: '#666' }
});
