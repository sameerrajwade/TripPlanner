import { Tabs } from 'expo-router';
import { Colors, Typography } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: 'rgba(232,101,26,0.10)',
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Typography.semiBold,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Plan',     tabBarIcon: () => <TabIcon emoji="✈️" /> }} />
      <Tabs.Screen name="trips"   options={{ title: 'My Trips', tabBarIcon: () => <TabIcon emoji="🗺️" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',  tabBarIcon: () => <TabIcon emoji="👤" /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji }: { emoji: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}
