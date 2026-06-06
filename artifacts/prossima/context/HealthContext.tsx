import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Platform, Alert, NativeModules, AppState } from 'react-native';
import AppleHealthKitLibrary from 'react-native-health';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DailyHealthSample,
  HealthMetricKey,
  clearAllHealthData,
  hasCompletedInitialSync,
  markInitialSyncComplete,
  readMetric,
  writeMetric,
  writeSample,
  loadAllMetrics,
} from './HealthStore';

import {
  computeReadinessScore,
  ReadinessBreakdown,
  SleepNight,
} from './ReadinessEngine';

// ─── Native bridge ────────────────────────────────────────────────────────────

const getNativeHealthKit = () => {
  if (Platform.OS !== 'ios') return null;
  return NativeModules.AppleHealthKit || NativeModules.RNAppleHealthKit || null;
};

// ─── Types ────────────────────────────────────────────────────────────────────

const HEALTH_CONNECTED_KEY = '@prossima_health_connected';

export interface HealthWorkout {
  activityName: string;
  durationMinutes: number;
  calories: number;
  startDate: string;
}

/** Today's live stats (unchanged from before) */
export interface HealthStats {
  steps: number;
  calories: number;
  activityTime: number;
  /** Total sleep hours for the most recent night */
  sleepHours: number;
  sleepDeepRatio: number;
  sleepRemRatio: number;
  /** Most recent workout recorded in Apple Health (last 7 days) */
  recentWorkout: HealthWorkout | null;
  /** Today's HRV in ms, null if not yet recorded */
  todayHrv: number | null;
  /** Today's resting HR in bpm, null if not yet recorded */
  todayRestingHr: number | null;
  /** Body weight in kg (most recent measurement) */
  bodyWeightKg: number | null;
  /** Body fat % (most recent measurement, may be null) */
  bodyFatPercent: number | null;
  /** VO2 Max in mL/kg/min (Apple estimate) */
  vo2Max: number | null;
  /** Total distance walked/run today in meters */
  distanceMeters: number;
  /** Basal energy burned today in kcal */
  basalCalories: number;
}

/** Historical time-series data (loaded from HealthStore) */
export type HealthTimeSeries = Record<HealthMetricKey, DailyHealthSample[]>;

interface HealthContextType {
  isConnected: boolean;
  stats: HealthStats;
  timeSeries: HealthTimeSeries;
  readiness: ReadinessBreakdown | null;
  loading: boolean;
  syncing: boolean;
  requestPermissions: () => Promise<void>;
  syncData: () => Promise<void>;
  fullHistoricalSync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATS: HealthStats = {
  steps: 0,
  calories: 0,
  activityTime: 0,
  sleepHours: 0,
  sleepDeepRatio: 0,
  sleepRemRatio: 0,
  recentWorkout: null,
  todayHrv: null,
  todayRestingHr: null,
  bodyWeightKg: null,
  bodyFatPercent: null,
  vo2Max: null,
  distanceMeters: 0,
  basalCalories: 0,
};

const EMPTY_TIME_SERIES: HealthTimeSeries = {
  hrv: [],
  resting_hr: [],
  steps_history: [],
  active_cal_history: [],
  sleep_history: [],
  vo2max: [],
  spo2: [],
  respiratory: [],
  bmr: [],
  distance: [],
  body_weight: [],
  body_fat: [],
  readiness: [],
};

// ─── Permissions list ─────────────────────────────────────────────────────────

function buildPermissions() {
  const P = AppleHealthKitLibrary.Constants.Permissions;
  return {
    permissions: {
      read: [
        // Existing
        P.StepCount,
        P.ActiveEnergyBurned,
        P.AppleExerciseTime,
        P.SleepAnalysis,
        P.Workout,
        // New
        P.HeartRateVariability,
        P.RestingHeartRate,
        P.HeartRate,
        P.BodyMass,
        P.BodyFatPercentage,
        P.Vo2Max,
        P.OxygenSaturation,
        P.RespiratoryRate,
        P.BasalEnergyBurned,
        P.DistanceWalkingRunning,
      ],
      write: [] as string[],
    },
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Promise wrapper for native callbacks ─────────────────────────────────────

function nativeCall<T>(
  fn: (cb: (err: any, result: any) => void) => void,
  transform: (result: any) => T,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    try {
      fn((err, result) => {
        if (err || result == null) {
          resolve(fallback);
        } else {
          try {
            resolve(transform(result));
          } catch {
            resolve(fallback);
          }
        }
      });
    } catch {
      resolve(fallback);
    }
  });
}

// ─── Context ──────────────────────────────────────────────────────────────────

const HealthContext = createContext<HealthContextType | null>(null);

export function HealthProvider({
  children,
  sessions = [],
}: {
  children: React.ReactNode;
  /** Pass training sessions for training load computation */
  sessions?: import('@/types').Session[];
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<HealthStats>(DEFAULT_STATS);
  const [timeSeries, setTimeSeries] = useState<HealthTimeSeries>(EMPTY_TIME_SERIES);
  const [readiness, setReadiness] = useState<ReadinessBreakdown | null>(null);

  // Keep sessions in a ref so syncData/fullHistoricalSync closures always
  // see the latest value without depending on prop updates.
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // ── Load persisted connection state ────────────────────────────────────────

  const checkConnection = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HEALTH_CONNECTED_KEY);
      if (stored === 'true') {
        setIsConnected(true);
        // Eagerly hydrate time-series from local store
        const ts = await loadAllMetrics();
        setTimeSeries(ts);
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

  // ── Recompute readiness whenever stats or timeSeries change ───────────────

  useEffect(() => {
    if (!isConnected) {
      setReadiness(null);
      return;
    }

    // Build sleep night from today's stats
    const lastNightSleep: SleepNight | null =
      stats.sleepHours > 0
        ? {
            totalHours: stats.sleepHours,
            deepRatio: stats.sleepDeepRatio,
            remRatio: stats.sleepRemRatio,
          }
        : null;

    const breakdown = computeReadinessScore({
      hrvSamples: timeSeries.hrv,
      todayHrv: stats.todayHrv,
      lastNightSleep,
      restingHrSamples: timeSeries.resting_hr,
      todayRestingHr: stats.todayRestingHr,
      sessions: sessionsRef.current,
    });

    setReadiness(breakdown);

    // Persist today's readiness score into the store so it can be trended
    const today = toDateStr(new Date());
    writeSample('readiness', {
      date: today,
      value: breakdown.score,
      unit: 'score',
      source: 'Prossima',
    }).catch(() => {});
  }, [isConnected, stats, timeSeries]);

  // ── Today's data sync (fast, runs on foreground) ──────────────────────────

  const syncData = useCallback(async () => {
    if (!isConnected) return;

    const nk = getNativeHealthKit();
    if (!nk?.initHealthKit) {
      if (__DEV__) {
        setStats({
          steps: 8432,
          calories: 450,
          activityTime: 45,
          sleepHours: 7.2,
          sleepDeepRatio: 0.2,
          sleepRemRatio: 0.25,
          recentWorkout: {
            activityName: 'Running',
            durationMinutes: 45,
            calories: 450,
            startDate: new Date().toISOString(),
          },
          todayHrv: 65,
          todayRestingHr: 55,
          bodyWeightKg: 75.5,
          bodyFatPercent: 15.2,
          vo2Max: 45.1,
          distanceMeters: 6200,
          basalCalories: 1800,
        });
      } else {
        setStats(DEFAULT_STATS);
      }
      return;
    }

    try {
      const today = startOfToday();
      const dayOptions = { date: today.toISOString() };
      const todayStr = toDateStr(today);

      // ── Steps ──────────────────────────────────────────────────────────────
      const stepsP = nativeCall(
        (cb) => nk.getStepCount(dayOptions, cb),
        (r) => r.value ?? 0,
        0
      );

      // ── Active Energy ──────────────────────────────────────────────────────
      const calP = nativeCall(
        (cb) => nk.getActiveEnergyBurned(dayOptions, cb),
        (r: any[]) => r.reduce((a, c) => a + (c.value ?? 0), 0),
        0
      );

      // ── Exercise Time ──────────────────────────────────────────────────────
      const timeP = nativeCall(
        (cb) => nk.getAppleExerciseTime(dayOptions, cb),
        (r) => r.value ?? 0,
        0
      );

      // ── Sleep ──────────────────────────────────────────────────────────────
      const sleepWindowStart = new Date();
      sleepWindowStart.setDate(sleepWindowStart.getDate() - 1);
      sleepWindowStart.setHours(18, 0, 0, 0);

      const sleepP = nativeCall(
        (cb) =>
          nk.getSleepSamples(
            {
              startDate: sleepWindowStart.toISOString(),
              endDate: new Date().toISOString(),
              limit: 200,
              ascending: true,
            },
            cb
          ),
        (results: any[]) => {
          const asleepValues = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM', 'SLEEPING']);
          const deepValues = new Set(['DEEP']);
          const remValues = new Set(['REM']);

          let totalMs = 0;
          let deepMs = 0;
          let remMs = 0;

          for (const s of results) {
            const stage = String(s.value).toUpperCase();
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            const dur = Math.max(0, end - start);

            if (asleepValues.has(stage)) {
              totalMs += dur;
              if (deepValues.has(stage)) deepMs += dur;
              if (remValues.has(stage)) remMs += dur;
            }
          }

          const totalH = totalMs / (1000 * 60 * 60);
          return {
            totalHours: totalH,
            deepRatio: totalMs > 0 ? deepMs / totalMs : 0,
            remRatio: totalMs > 0 ? remMs / totalMs : 0,
          };
        },
        { totalHours: 0, deepRatio: 0, remRatio: 0 }
      );

      // ── Recent Workout ─────────────────────────────────────────────────────
      const workoutP = nativeCall(
        (cb) =>
          nk.getWorkoutSessions(
            {
              startDate: daysAgo(7).toISOString(),
              endDate: new Date().toISOString(),
              limit: 10,
              ascending: false,
            },
            cb
          ),
        (results: any[]): HealthWorkout | null => {
          if (!Array.isArray(results) || results.length === 0) return null;
          const latest = results[0];
          return {
            activityName: latest.activityName ?? 'Workout',
            durationMinutes: Math.round((latest.duration ?? 0) / 60),
            calories: Math.round(latest.totalEnergyBurned ?? 0),
            startDate: latest.startDate ?? new Date().toISOString(),
          };
        },
        null
      );

      // ── HRV (today) ────────────────────────────────────────────────────────
      const hrvP = nativeCall(
        (cb) =>
          nk.getHeartRateVariabilitySamples(
            {
              startDate: today.toISOString(),
              endDate: new Date().toISOString(),
              limit: 5,
              ascending: true,
            },
            cb
          ),
        (results: any[]): number | null => {
          if (!Array.isArray(results) || results.length === 0) return null;
          // Use first morning reading
          return results[0].value ?? null;
        },
        null
      );

      // ── Resting HR (today) ────────────────────────────────────────────────
      const rhrP = nativeCall(
        (cb) =>
          nk.getRestingHeartRateSamples(
            {
              startDate: today.toISOString(),
              endDate: new Date().toISOString(),
              limit: 1,
              ascending: false,
            },
            cb
          ),
        (results: any[]): number | null => {
          if (!Array.isArray(results) || results.length === 0) return null;
          return results[0].value ?? null;
        },
        null
      );

      // ── Body Weight (most recent) ─────────────────────────────────────────
      const weightP = nativeCall(
        (cb) =>
          nk.getWeightSamples(
            {
              startDate: daysAgo(90).toISOString(),
              endDate: new Date().toISOString(),
              limit: 1,
              ascending: false,
            },
            cb
          ),
        (results: any[]): number | null => {
          if (!Array.isArray(results) || results.length === 0) return null;
          // react-native-health returns weight in pounds by default
          const lbs = results[0].value ?? null;
          return lbs !== null ? Math.round(lbs / 2.20462 * 10) / 10 : null;
        },
        null
      );

      // ── Body Fat % (most recent) ──────────────────────────────────────────
      const fatP = nativeCall(
        (cb) =>
          nk.getBodyFatPercentageSamples(
            {
              startDate: daysAgo(90).toISOString(),
              endDate: new Date().toISOString(),
              limit: 1,
              ascending: false,
            },
            cb
          ),
        (results: any[]): number | null => {
          if (!Array.isArray(results) || results.length === 0) return null;
          return results[0].value ?? null;
        },
        null
      );

      // ── VO2 Max ───────────────────────────────────────────────────────────
      const vo2P = nativeCall(
        (cb) =>
          nk.getVo2MaxSamples(
            {
              startDate: daysAgo(90).toISOString(),
              endDate: new Date().toISOString(),
              limit: 1,
              ascending: false,
            },
            cb
          ),
        (results: any[]): number | null => {
          if (!Array.isArray(results) || results.length === 0) return null;
          return results[0].value ?? null;
        },
        null
      );

      // ── Distance ──────────────────────────────────────────────────────────
      const distanceP = nativeCall(
        (cb) =>
          nk.getDistanceWalkingRunning(
            { date: today.toISOString() },
            cb
          ),
        (r) => (r.value ?? 0) * 1000, // km → meters
        0
      );

      // ── Basal Calories ────────────────────────────────────────────────────
      const bmrP = nativeCall(
        (cb) =>
          nk.getBasalEnergyBurned(
            dayOptions,
            cb
          ),
        (results: any) =>
          Array.isArray(results)
            ? results.reduce((a: number, c: any) => a + (c.value ?? 0), 0)
            : (results as any)?.value ?? 0,
        0
      );

      const [
        steps,
        calories,
        activityTime,
        sleep,
        recentWorkout,
        todayHrv,
        todayRestingHr,
        bodyWeightKg,
        bodyFatPercent,
        vo2Max,
        distanceMeters,
        basalCalories,
      ] = await Promise.all([
        stepsP,
        calP,
        timeP,
        sleepP,
        workoutP,
        hrvP,
        rhrP,
        weightP,
        fatP,
        vo2P,
        distanceP,
        bmrP,
      ]);

      const newStats: HealthStats = {
        steps: Math.round(steps),
        calories: Math.round(calories),
        activityTime: Math.round(activityTime),
        sleepHours: Math.round(sleep.totalHours * 10) / 10,
        sleepDeepRatio: sleep.deepRatio,
        sleepRemRatio: sleep.remRatio,
        recentWorkout,
        todayHrv,
        todayRestingHr,
        bodyWeightKg,
        bodyFatPercent,
        vo2Max,
        distanceMeters: Math.round(distanceMeters),
        basalCalories: Math.round(basalCalories),
      };

      setStats(newStats);

      // ── Persist today's snapshot into the time-series store ───────────────
      const samples: { metric: HealthMetricKey; sample: DailyHealthSample }[] = [
        {
          metric: 'steps_history',
          sample: { date: todayStr, value: newStats.steps, unit: 'steps', source: 'Apple Health' },
        },
        {
          metric: 'active_cal_history',
          sample: { date: todayStr, value: newStats.calories, unit: 'kcal', source: 'Apple Health' },
        },
        {
          metric: 'sleep_history',
          sample: { date: todayStr, value: newStats.sleepHours, unit: 'hours', source: 'Apple Health' },
        },
        {
          metric: 'distance',
          sample: { date: todayStr, value: newStats.distanceMeters, unit: 'meters', source: 'Apple Health' },
        },
        {
          metric: 'bmr',
          sample: { date: todayStr, value: newStats.basalCalories, unit: 'kcal', source: 'Apple Health' },
        },
      ];

      if (todayHrv !== null) {
        samples.push({
          metric: 'hrv',
          sample: { date: todayStr, value: todayHrv, unit: 'ms', source: 'Apple Watch' },
        });
      }
      if (todayRestingHr !== null) {
        samples.push({
          metric: 'resting_hr',
          sample: { date: todayStr, value: todayRestingHr, unit: 'bpm', source: 'Apple Health' },
        });
      }
      if (bodyWeightKg !== null) {
        samples.push({
          metric: 'body_weight',
          sample: { date: todayStr, value: bodyWeightKg, unit: 'kg', source: 'Apple Health' },
        });
      }
      if (bodyFatPercent !== null) {
        samples.push({
          metric: 'body_fat',
          sample: { date: todayStr, value: bodyFatPercent, unit: '%', source: 'Apple Health' },
        });
      }
      if (vo2Max !== null) {
        samples.push({
          metric: 'vo2max',
          sample: { date: todayStr, value: vo2Max, unit: 'mL/kg/min', source: 'Apple Health' },
        });
      }

      await Promise.all(samples.map(({ metric, sample }) => writeSample(metric, sample)));

      // Reload full time-series from store so the UI updates
      const ts = await loadAllMetrics();
      setTimeSeries(ts);
    } catch (e) {
      console.error('Error syncing health data', e);
    }
  }, [isConnected]);

  // ── Full historical sync (90 days) ────────────────────────────────────────

  const fullHistoricalSync = useCallback(async () => {
    if (!isConnected) return;

    const nk = getNativeHealthKit();
    if (!nk?.initHealthKit) {
      if (__DEV__) {
        setSyncing(true);
        try {
          const mockTs: HealthTimeSeries = {
            hrv: Array.from({ length: 30 }).map((_, i) => ({ date: daysAgo(i).toISOString().slice(0, 10), value: 60 + Math.random() * 10, unit: 'ms', source: 'Mock' })),
            resting_hr: Array.from({ length: 30 }).map((_, i) => ({ date: daysAgo(i).toISOString().slice(0, 10), value: 55 + Math.random() * 5, unit: 'bpm', source: 'Mock' })),
            steps_history: Array.from({ length: 30 }).map((_, i) => ({ date: daysAgo(i).toISOString().slice(0, 10), value: 5000 + Math.random() * 5000, unit: 'steps', source: 'Mock' })),
            active_cal_history: Array.from({ length: 30 }).map((_, i) => ({ date: daysAgo(i).toISOString().slice(0, 10), value: 300 + Math.random() * 300, unit: 'kcal', source: 'Mock' })),
            sleep_history: Array.from({ length: 30 }).map((_, i) => ({ date: daysAgo(i).toISOString().slice(0, 10), value: 6 + Math.random() * 2, unit: 'hours', source: 'Mock' })),
            vo2max: Array.from({ length: 30 }).map((_, i) => ({ date: daysAgo(i).toISOString().slice(0, 10), value: 45, unit: 'mL/kg/min', source: 'Mock' })),
            spo2: [],
            respiratory: [],
            bmr: [],
            distance: [],
            body_weight: [],
            body_fat: [],
            readiness: [],
          };
          setTimeSeries(mockTs);
          await markInitialSyncComplete();
        } finally {
          setSyncing(false);
        }
      }
      return;
    }

    setSyncing(true);
    try {
      const startDate = daysAgo(90).toISOString();
      const endDate = new Date().toISOString();
      const range = { startDate, endDate, limit: 500, ascending: true };

      // Helper: bucket an array of {startDate/endDate, value} samples into daily sums/averages
      const bucketDaily = (
        results: any[],
        unit: string,
        mode: 'sum' | 'avg' | 'last' = 'avg'
      ): DailyHealthSample[] => {
        const map = new Map<string, number[]>();
        for (const r of results) {
          const date = (r.startDate ?? r.endDate ?? '').slice(0, 10);
          if (!date) continue;
          const val = r.value ?? 0;
          if (!map.has(date)) map.set(date, []);
          map.get(date)!.push(val);
        }
        return Array.from(map.entries()).map(([date, vals]) => ({
          date,
          value:
            mode === 'sum'
              ? vals.reduce((a, b) => a + b, 0)
              : mode === 'last'
              ? vals[vals.length - 1]
              : vals.reduce((a, b) => a + b, 0) / vals.length,
          unit,
          source: 'Apple Health',
        }));
      };

      // ── HRV history ────────────────────────────────────────────────────────
      const hrvPromise = nativeCall(
        (cb) => nk.getHeartRateVariabilitySamples(range, cb),
        (r: any[]) => bucketDaily(r, 'ms', 'avg'),
        []
      );

      // ── Resting HR history ─────────────────────────────────────────────────
      const rhrPromise = nativeCall(
        (cb) => nk.getRestingHeartRateSamples(range, cb),
        (r: any[]) => bucketDaily(r, 'bpm', 'avg'),
        []
      );

      // ── Steps history ──────────────────────────────────────────────────────
      const stepsHistPromise = nativeCall(
        (cb) => nk.getDailyStepCountSamples(range, cb),
        (r: any[]) => bucketDaily(r, 'steps', 'sum'),
        []
      );

      // ── Active calories history ────────────────────────────────────────────
      const calHistPromise = nativeCall(
        (cb) => nk.getDailyActiveEnergyBurned(range, cb),
        (r: any[]) => bucketDaily(r, 'kcal', 'sum'),
        []
      );

      // ── Sleep history ──────────────────────────────────────────────────────
      const sleepHistPromise = nativeCall(
        (cb) =>
          nk.getSleepSamples(
            { ...range, limit: 2000 },
            cb
          ),
        (results: any[]): DailyHealthSample[] => {
          const asleepValues = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM', 'SLEEPING']);
          const map = new Map<string, number>();
          for (const s of results) {
            const stage = String(s.value).toUpperCase();
            if (!asleepValues.has(stage)) continue;
            const date = (s.startDate ?? '').slice(0, 10);
            if (!date) continue;
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            map.set(date, (map.get(date) ?? 0) + Math.max(0, end - start));
          }
          return Array.from(map.entries()).map(([date, ms]) => ({
            date,
            value: Math.round((ms / (1000 * 60 * 60)) * 10) / 10,
            unit: 'hours',
            source: 'Apple Health',
          }));
        },
        []
      );

      // ── Body weight history ────────────────────────────────────────────────
      const weightHistPromise = nativeCall(
        (cb) => nk.getWeightSamples(range, cb),
        (r: any[]): DailyHealthSample[] =>
          r.map((s) => ({
            date: (s.startDate ?? '').slice(0, 10),
            value: Math.round((s.value / 2.20462) * 10) / 10, // lbs → kg
            unit: 'kg',
            source: 'Apple Health',
          })),
        []
      );

      // ── Body fat % history ─────────────────────────────────────────────────
      const fatHistPromise = nativeCall(
        (cb) => nk.getBodyFatPercentageSamples(range, cb),
        (r: any[]): DailyHealthSample[] =>
          r.map((s) => ({
            date: (s.startDate ?? '').slice(0, 10),
            value: s.value ?? 0,
            unit: '%',
            source: 'Apple Health',
          })),
        []
      );

      // ── VO2 Max history ────────────────────────────────────────────────────
      const vo2Promise = nativeCall(
        (cb) => nk.getVo2MaxSamples(range, cb),
        (r: any[]): DailyHealthSample[] =>
          r.map((s) => ({
            date: (s.startDate ?? '').slice(0, 10),
            value: s.value ?? 0,
            unit: 'mL/kg/min',
            source: 'Apple Health',
          })),
        []
      );

      // ── SpO2 history ───────────────────────────────────────────────────────
      const spo2Promise = nativeCall(
        (cb) => nk.getOxygenSaturationSamples(range, cb),
        (r: any[]) => bucketDaily(r, '%', 'avg'),
        []
      );

      // ── Respiratory rate history ───────────────────────────────────────────
      const respPromise = nativeCall(
        (cb) => nk.getRespiratoryRateSamples(range, cb),
        (r: any[]) => bucketDaily(r, 'breaths/min', 'avg'),
        []
      );

      // ── BMR history ───────────────────────────────────────────────────────
      const bmrPromise = nativeCall(
        (cb) => nk.getDailyBasalEnergyBurned(range, cb),
        (r: any[]) => bucketDaily(r, 'kcal', 'sum'),
        []
      );

      // ── Distance history ───────────────────────────────────────────────────
      const distPromise = nativeCall(
        (cb) => nk.getDailyDistanceWalkingRunning(range, cb),
        (r: any[]): DailyHealthSample[] =>
          r.map((s) => ({
            date: (s.startDate ?? '').slice(0, 10),
            value: Math.round((s.value ?? 0) * 1000), // km → m
            unit: 'meters',
            source: 'Apple Health',
          })),
        []
      );

      const [
        hrv,
        rhr,
        stepsHist,
        calHist,
        sleepHist,
        weightHist,
        fatHist,
        vo2,
        spo2,
        resp,
        bmr,
        dist,
      ] = await Promise.all([
        hrvPromise,
        rhrPromise,
        stepsHistPromise,
        calHistPromise,
        sleepHistPromise,
        weightHistPromise,
        fatHistPromise,
        vo2Promise,
        spo2Promise,
        respPromise,
        bmrPromise,
        distPromise,
      ]);

      // Write all to store
      await Promise.all([
        writeMetric('hrv', hrv),
        writeMetric('resting_hr', rhr),
        writeMetric('steps_history', stepsHist),
        writeMetric('active_cal_history', calHist),
        writeMetric('sleep_history', sleepHist),
        writeMetric('body_weight', weightHist),
        writeMetric('body_fat', fatHist),
        writeMetric('vo2max', vo2),
        writeMetric('spo2', spo2),
        writeMetric('respiratory', resp),
        writeMetric('bmr', bmr),
        writeMetric('distance', dist),
      ]);

      await markInitialSyncComplete();

      // Reload into state
      const ts = await loadAllMetrics();
      setTimeSeries(ts);
    } catch (e) {
      console.error('Error during full historical sync', e);
    } finally {
      setSyncing(false);
    }
  }, [isConnected]);

  // ── Auto-sync on connect and foreground ───────────────────────────────────

  useEffect(() => {
    if (!isConnected) return;

    (async () => {
      await syncData();
      const done = await hasCompletedInitialSync();
      if (!done) {
        await fullHistoricalSync();
      }
    })();
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isConnected) {
        syncData();
      }
    });
    return () => subscription.remove();
  }, [isConnected, syncData]);

  // ── Request permissions ───────────────────────────────────────────────────

  const requestPermissions = useCallback(async () => {
    const nk = getNativeHealthKit();
    if (!nk?.initHealthKit) {
      if (__DEV__) {
        await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
        setIsConnected(true);
        return;
      }
      Alert.alert(
        'Connection Failed',
        'Apple Health is only available on iOS devices.'
      );
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        nk.initHealthKit(buildPermissions(), async (err: any) => {
          if (err) {
            const msg =
              typeof err === 'string'
                ? err
                : err?.message ?? 'Unknown error occurred.';
            Alert.alert(
              'Connection Failed',
              `Could not connect to Apple Health: ${msg}`
            );
            reject(err);
            return;
          }
          await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
          setIsConnected(true);
          resolve();
        });
      } catch (e: any) {
        Alert.alert(
          'Connection Failed',
          `Could not connect to Apple Health: ${e?.message ?? 'An unexpected error occurred.'}`
        );
        reject(e);
      }
    });
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(HEALTH_CONNECTED_KEY);
      await clearAllHealthData();
      setIsConnected(false);
      setStats(DEFAULT_STATS);
      setTimeSeries(EMPTY_TIME_SERIES);
      setReadiness(null);
    } catch (e) {
      console.error('Error disconnecting health', e);
    }
  }, []);

  return (
    <HealthContext.Provider
      value={{
        isConnected,
        stats,
        timeSeries,
        readiness,
        loading,
        syncing,
        requestPermissions,
        syncData,
        fullHistoricalSync,
        disconnect,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within a HealthProvider');
  return ctx;
}
