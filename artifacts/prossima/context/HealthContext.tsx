import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import AppleHealthKit, { HealthValue, HealthInputOptions } from 'react-native-health';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    if (Platform.OS !== 'ios' || !AppleHealthKit.initHealthKit) {
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
        AppleHealthKit.getStepCount(options, (err: any, results: any) => {
          if (err || !results) resolve(0);
          else resolve(results.value);
        });
      });

      const calP = new Promise<number>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(
          options,
          (err: any, results: any) => {
            if (err || !results) resolve(0);
            else resolve(results.reduce((acc: number, curr: any) => acc + curr.value, 0));
          }
        );
      });

      const timeP = new Promise<number>((resolve) => {
        AppleHealthKit.getAppleExerciseTime(
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

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'ios' || !AppleHealthKit.initHealthKit) {
      // On non-iOS or Expo Go, mock the successful connection
      Alert.alert(
        'Apple Health Not Available',
        'Apple Health requires a custom iOS build. We will simulate a connected state for testing.'
      );
      await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
      setIsConnected(true);
      return;
    }

    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.AppleExerciseTime,
        ],
        write: [],
      },
    };

    return new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, async (err: any, results: any) => {
        if (err) {
          console.error('Error initializing HealthKit: ', err);
          Alert.alert('Permission Denied', 'Could not connect to Apple Health.');
          reject(err);
          return;
        }

        // According to Apple's UX, if init doesn't throw, we assume we can proceed
        await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
        setIsConnected(true);
        resolve();
      });
    });
  }, []);

  return (
    <HealthContext.Provider
      value={{
        isConnected,
        stats,
        loading,
        requestPermissions,
        syncData,
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
