import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet, BackHandler } from 'react-native';
import { Tabs, useNavigation } from 'expo-router';
import { Colors, Typography } from '../../constants/theme';

const TAB_COUNT = 3;
const SCREEN_W = Dimensions.get('window').width;
const TAB_W = SCREEN_W / TAB_COUNT;
const PILL_H = 42;
const PILL_PAD = 6;
const PILL_W = TAB_W - PILL_PAD * 2;

const TAB_CONFIG = [
  { emoji: '🧭', label: 'Plan' },
  { emoji: '📋', label: 'My Trips' },
  { emoji: '⚙️', label: 'Profile' },
];

export default function TabsLayout() {
  const navigation = useNavigation();

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.canGoBack()) return false;
      BackHandler.exitApp();
      return true;
    });
    return () => handler.remove();
  }, [navigation]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index"   options={{ title: 'Plan' }} />
      <Tabs.Screen name="trips"   options={{ title: 'My Trips' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const indicatorX = useRef(new Animated.Value(state.index * TAB_W + PILL_PAD)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: state.index * TAB_W + PILL_PAD,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index]);

  return (
    <View style={tabStyles.bar}>
      <Animated.View
        style={[
          tabStyles.indicator,
          { transform: [{ translateX: indicatorX }] },
        ]}
      />
      {state.routes.map((route: any, index: number) => {
        const isActive = state.index === index;
        const config = TAB_CONFIG[index] || { emoji: '?', label: route.name };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              if (!isActive) {
                navigation.navigate(route.name);
              }
            }}
            activeOpacity={0.7}
            style={tabStyles.tab}
          >
            <Text style={tabStyles.emoji}>{config.emoji}</Text>
            <Text style={[tabStyles.label, isActive && tabStyles.labelActive]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,101,26,0.10)',
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 6,
    width: PILL_W,
    height: PILL_H,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}1F`,
  },
  tab: {
    width: TAB_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontFamily: Typography.semiBold,
    fontSize: 11,
    color: Colors.textLight,
  },
  labelActive: {
    color: Colors.primary,
  },
});
