import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform, Alert, NativeModules, AppState } from 'react-native';
import AppleHealthKitLibrary, { HealthValue, HealthInputOptions } from 'react-native-health';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Directly access NativeModules to ensure New Architecture Interop Layer works correctly
const getNativeHealthKit = () => {
  if (Platform.OS !== 'ios') return null;
  return NativeModules.AppleHealthKit || NativeModules.RNAppleHealthKit || null;
};

const HEALTH_CONNECTED_KEY = '@prossima_health_connected';

interface HealthStats {
  steps: number;
  calories: number;
  activityTime: number;
}

interface HealthContextType {
  isConnected: boolean;
  stats: HealthStats;
  loading: boolean;
  requestPermissions: () => Promise<void>;
  syncData: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const HealthContext = createContext<HealthContextType | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HealthStats>({
    steps: 0,
    calories: 0,
    activityTime: 0,
  });

  const checkConnection = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HEALTH_CONNECTED_KEY);
      if (stored === 'true') {
        setIsConnected(true);
      }
    } catch (e) {
      console.error('Failed to check health connection', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const syncData = useCallback(async () => {
    if (!isConnected) return;

    const nativeHealthKit = getNativeHealthKit();
    if (!nativeHealthKit || !nativeHealthKit.initHealthKit) {
      // Graceful fallback for Android / Web / Expo Go
      setStats({
        steps: 0,
        calories: 0,
        activityTime: 0,
      });
      return;
    }

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const options: HealthInputOptions = {
        date: startOfDay.toISOString(),
      };

      const stepsP = new Promise<number>((resolve) => {
        nativeHealthKit.getStepCount(options, (err: any, results: any) => {
          if (err || !results) resolve(0);
          else resolve(results.value);
        });
      });

      const calP = new Promise<number>((resolve) => {
        nativeHealthKit.getActiveEnergyBurned(
          options,
          (err: any, results: any) => {
            if (err || !results) resolve(0);
            else resolve(results.reduce((acc: number, curr: any) => acc + curr.value, 0));
          }
        );
      });

      const timeP = new Promise<number>((resolve) => {
        nativeHealthKit.getAppleExerciseTime(
          options,
          (err: any, results: any) => {
            if (err || !results) resolve(0);
            else resolve(results.value);
          }
        );
      });

      const [steps, calories, activityTime] = await Promise.all([stepsP, calP, timeP]);

      setStats({
        steps: Math.round(steps),
        calories: Math.round(calories),
        activityTime: Math.round(activityTime),
      });
    } catch (e) {
      console.error('Error syncing health data', e);
    }
  }, [isConnected]);

  // Sync data automatically when connection is verified (e.g., app launch)
  useEffect(() => {
    if (isConnected) {
      syncData();
    }
  }, [isConnected, syncData]);

  // Sync data when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isConnected) {
        syncData();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isConnected, syncData]);

  const requestPermissions = useCallback(async () => {
    const nativeHealthKit = getNativeHealthKit();
    if (!nativeHealthKit || !nativeHealthKit.initHealthKit) {
      Alert.alert(
        'Connection Failed',
        'Apple Health is only available on iOS devices.'
      );
      return;
    }

    const permissions = {
      permissions: {
        read: [
          AppleHealthKitLibrary.Constants.Permissions.StepCount,
          AppleHealthKitLibrary.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKitLibrary.Constants.Permissions.AppleExerciseTime,
        ],
        write: [],
      },
    };

    return new Promise<void>((resolve, reject) => {
      try {
        nativeHealthKit.initHealthKit(permissions, async (err: any, results: any) => {
          if (err) {
            const errorMsg = typeof err === 'string' ? err : err?.message || 'Unknown error occurred while connecting to Apple Health.';
            console.error('Error initializing HealthKit: ', err);
            Alert.alert('Connection Failed', `Could not connect to Apple Health: ${errorMsg}`);
            reject(err);
            return;
          }

          // According to Apple's UX, if init doesn't throw, we assume we can proceed
          await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
          setIsConnected(true);
          resolve();
        });
      } catch (e: any) {
        const errorMsg = e?.message || 'An unexpected error occurred.';
        Alert.alert('Connection Failed', `Could not connect to Apple Health: ${errorMsg}`);
        reject(e);
      }
    });
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(HEALTH_CONNECTED_KEY);
      setIsConnected(false);
      setStats({
        steps: 0,
        calories: 0,
        activityTime: 0,
      });
    } catch (e) {
      console.error('Error disconnecting health', e);
    }
  }, []);

  return (
    <HealthContext.Provider
      value={{
        isConnected,
        stats,
        loading,
        requestPermissions,
        syncData,
        disconnect,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return ctx;
}
