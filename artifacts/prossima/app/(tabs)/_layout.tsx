import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="session">
        <Icon sf={{ default: 'waveform.path.ecg', selected: 'waveform.path.ecg' }} />
        <Label>Activity</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analytics">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>Trends</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const activeColor = '#00B4D8';
  const inactiveColor = colors.mutedForeground;

  const renderTabIcon = (name: string, focused: boolean, color: string) => {
    const activePillBg = isDark ? 'rgba(0, 180, 216, 0.22)' : 'rgba(0, 180, 216, 0.12)';
    let sfName = 'house';
    let featherName = 'home';
    let size = 20;

    switch (name) {
      case 'index':
        sfName = focused ? 'house.fill' : 'house';
        featherName = 'home';
        break;
      case 'session':
        sfName = 'waveform.path.ecg';
        featherName = 'activity';
        break;

      case 'analytics':
        sfName = focused ? 'chart.bar.fill' : 'chart.bar';
        featherName = 'bar-chart-2';
        break;
      case 'settings':
        sfName = focused ? 'person.crop.circle.fill' : 'person.crop.circle';
        featherName = 'user';
        break;
    }

    return (
      <View style={focused ? [styles.activePill, { backgroundColor: activePillBg }] : styles.inactivePill}>
        {isIOS ? (
          <SymbolView name={sfName as any} tintColor={focused ? activeColor : color} size={22} />
        ) : (
          <Feather name={featherName as any} size={size} color={focused ? activeColor : color} />
        )}
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 64,
          paddingBottom: isWeb ? 12 : 8,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => renderTabIcon('index', focused, color),
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => renderTabIcon('session', focused, color),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, focused }) => renderTabIcon('analytics', focused, color),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => renderTabIcon('settings', focused, color),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  activePill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  inactivePill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
