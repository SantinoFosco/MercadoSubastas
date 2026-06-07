import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type TabKey = 'explorar' | 'mis-pujas' | 'vender' | 'perfil';

interface BottomTabBarProps {
  activeTab?: TabKey;
  onTabPress?: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'explorar',  label: 'Explorar',  icon: 'compass-outline' },
  { key: 'mis-pujas', label: 'Mis pujas', icon: 'gavel' },
  { key: 'vender',    label: 'Vender',    icon: 'plus-circle-outline' },
  { key: 'perfil',    label: 'Perfil',    icon: 'account-outline' },
];

const TAB_ROUTES: Record<TabKey, string> = {
  'explorar':  '/exploracion',
  'mis-pujas': '/mis-pujas',
  'vender':    '/vender/mis-articulos',
  'perfil':    '/perfil',
};

export default function BottomTabBar({ activeTab = 'mis-pujas', onTabPress }: BottomTabBarProps) {
  const router = useRouter();

  function handleTabPress(tab: TabKey) {
    onTabPress?.(tab);
    router.replace(TAB_ROUTES[tab] as any);
  }

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {isActive ? (
              <View style={styles.activeIconContainer}>
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
            ) : (
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color="#999999"
              />
            )}
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeIconContainer: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
});