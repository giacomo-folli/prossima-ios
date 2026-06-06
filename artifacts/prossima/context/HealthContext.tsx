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

export interface HealthWorkout {
  activityName: string;
  durationMinutes: number;
  calories: number;
  startDate: string;
}

export interface HealthStats {
  steps: number;
  calories: number;
  activityTime: number;
  /** Total sleep hours for the most recent night (6 pm yesterday → now) */
  sleepHours: number;
  /** Most recent workout recorded in Apple Health (last 7 days) */
  recentWorkout: HealthWorkout | null;
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
    sleepHours: 0,
    recentWorkout: null,
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
        sleepHours: 0,
        recentWorkout: null,
      });
      return;
    }

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const dayOptions: HealthInputOptions = {
        date: startOfDay.toISOString(),
      };

      // ── Steps ──────────────────────────────────────────────────────────────
      const stepsP = new Promise<number>((resolve) => {
        nativeHealthKit.getStepCount(dayOptions, (err: any, results: any) => {
          if (err || !results) resolve(0);
          else resolve(results.value ?? 0);
        });
      });

      // ── Active Energy ──────────────────────────────────────────────────────
      const calP = new Promise<number>((resolve) => {
        nativeHealthKit.getActiveEnergyBurned(
          dayOptions,
          (err: any, results: any) => {
            if (err || !results) resolve(0);
            else resolve(results.reduce((acc: number, curr: any) => acc + (curr.value ?? 0), 0));
          }
        );
      });

      // ── Exercise Time ──────────────────────────────────────────────────────
      const timeP = new Promise<number>((resolve) => {
        nativeHealthKit.getAppleExerciseTime(
          dayOptions,
          (err: any, results: any) => {
            if (err || !results) resolve(0);
            else resolve(results.value ?? 0);
          }
        );
      });

      // ── Sleep (6 pm yesterday → now, sum ASLEEP/CORE/DEEP/REM stages) ─────
      const sleepP = new Promise<number>((resolve) => {
        try {
          const sleepWindowStart = new Date();
          sleepWindowStart.setDate(sleepWindowStart.getDate() - 1);
          sleepWindowStart.setHours(18, 0, 0, 0);

          nativeHealthKit.getSleepSamples(
            {
              startDate: sleepWindowStart.toISOString(),
              endDate: new Date().toISOString(),
              limit: 100,
              ascending: true,
            },
            (err: any, results: any) => {
              if (err || !Array.isArray(results)) { resolve(0); return; }

              // Sum only "asleep" stages; ignore INBED and AWAKE
              const asleepValues = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM', 'SLEEPING']);
              const totalMs = results
                .filter((s: any) => asleepValues.has(String(s.value).toUpperCase()))
                .reduce((acc: number, s: any) => {
                  const start = new Date(s.startDate).getTime();
                  const end = new Date(s.endDate).getTime();
                  return acc + Math.max(0, end - start);
                }, 0);

              resolve(totalMs / (1000 * 60 * 60)); // → hours
            }
          );
        } catch {
          resolve(0);
        }
      });

      // ── Recent Workout (last 7 days, most recent first) ───────────────────
      const workoutP = new Promise<HealthWorkout | null>((resolve) => {
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          nativeHealthKit.getWorkoutSessions(
            {
              startDate: sevenDaysAgo.toISOString(),
              endDate: new Date().toISOString(),
              limit: 10,
              ascending: false,
            },
            (err: any, results: any) => {
              if (err || !Array.isArray(results) || results.length === 0) {
                resolve(null);
                return;
              }

              // Already sorted descending; pick first entry
              const latest = results[0];
              resolve({
                activityName: latest.activityName ?? 'Workout',
                durationMinutes: Math.round((latest.duration ?? 0) / 60),
                calories: Math.round(latest.totalEnergyBurned ?? 0),
                startDate: latest.startDate ?? new Date().toISOString(),
              });
            }
          );
        } catch {
          resolve(null);
        }
      });

      const [steps, calories, activityTime, sleepHours, recentWorkout] =
        await Promise.all([stepsP, calP, timeP, sleepP, workoutP]);

      setStats({
        steps: Math.round(steps),
        calories: Math.round(calories),
        activityTime: Math.round(activityTime),
        sleepHours: Math.round(sleepHours * 10) / 10, // one decimal place
        recentWorkout,
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
          AppleHealthKitLibrary.Constants.Permissions.SleepAnalysis,
          AppleHealthKitLibrary.Constants.Permissions.Workout,
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
        sleepHours: 0,
        recentWorkout: null,
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
