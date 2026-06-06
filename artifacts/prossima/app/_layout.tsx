
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/context/ThemeContext';
import { TrainingProvider, useTraining } from '@/context/TrainingContext';
import { HealthProvider } from '@/context/HealthContext';
import { ProfileProvider } from '@/context/ProfileContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Inner wrapper that reads sessions from TrainingContext and passes them
 * to HealthProvider so the readiness engine can compute training load.
 */
function HealthWithSessions({ children }: { children: React.ReactNode }) {
  const { sessions } = useTraining();
  return <HealthProvider sessions={sessions}>{children}</HealthProvider>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="exercise/[id]"
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
                <ProfileProvider>
                  <TrainingProvider>
                    <HealthWithSessions>
                      <RootLayoutNav />
                    </HealthWithSessions>
                  </TrainingProvider>
                </ProfileProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
