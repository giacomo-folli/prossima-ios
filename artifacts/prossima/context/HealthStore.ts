/**
 * HealthStore — on-device time-series storage for Apple Health metrics.
 *
 * Each metric is stored as a JSON array of DailyHealthSample under a dedicated
 * AsyncStorage key. The store enforces a 90-day rolling window: samples older
 * than 90 days are automatically dropped on every write.
 *
 * Max storage size: ~100 KB total (90 samples × 10 metrics × ~100 bytes/sample).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyHealthSample {
  /** ISO date string "YYYY-MM-DD" */
  date: string;
  /** Numeric value in the metric's native unit */
  value: number;
  /** Unit description, e.g. "ms", "bpm", "kg", "%" */
  unit: string;
  /** Data source label, e.g. "Apple Watch", "iPhone" */
  source: string;
}

export type HealthMetricKey =
  | 'hrv'
  | 'resting_hr'
  | 'steps_history'
  | 'active_cal_history'
  | 'sleep_history'
  | 'vo2max'
  | 'spo2'
  | 'respiratory'
  | 'bmr'
  | 'distance'
  | 'body_weight'
  | 'body_fat'
  | 'readiness';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = '@prossima_health_';
const ROLLING_WINDOW_DAYS = 90;
const INITIAL_SYNC_KEY = '@prossima_health_initial_sync_done';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function storageKey(metric: HealthMetricKey): string {
  return `${STORAGE_PREFIX}${metric}`;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function cutoffDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - ROLLING_WINDOW_DAYS);
  return toDateString(d);
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Read all samples for a metric (already sorted ascending by date).
 */
export async function readMetric(
  metric: HealthMetricKey
): Promise<DailyHealthSample[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(metric));
    if (!raw) return [];
    return JSON.parse(raw) as DailyHealthSample[];
  } catch {
    return [];
  }
}

/**
 * Upsert a batch of samples for a metric.
 * - Merges with existing data (date = primary key; newer value wins)
 * - Drops samples older than 90 days
 * - Sorts ascending by date before writing
 */
export async function writeMetric(
  metric: HealthMetricKey,
  newSamples: DailyHealthSample[]
): Promise<void> {
  try {
    const existing = await readMetric(metric);

    // Merge: build a map keyed by date
    const map = new Map<string, DailyHealthSample>();
    for (const s of existing) map.set(s.date, s);
    for (const s of newSamples) map.set(s.date, s); // new samples win

    // Filter out samples beyond rolling window
    const cutoff = cutoffDate();
    const merged = Array.from(map.values())
      .filter((s) => s.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));

    await AsyncStorage.setItem(storageKey(metric), JSON.stringify(merged));
  } catch (e) {
    console.warn(`[HealthStore] Failed to write metric "${metric}":`, e);
  }
}

/**
 * Upsert a single sample. Convenience wrapper around writeMetric.
 */
export async function writeSample(
  metric: HealthMetricKey,
  sample: DailyHealthSample
): Promise<void> {
  return writeMetric(metric, [sample]);
}

/**
 * Clear all stored samples for a metric.
 */
export async function clearMetric(metric: HealthMetricKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(metric));
  } catch {}
}

/**
 * Clear all health time-series data (called on disconnect).
 */
export async function clearAllHealthData(): Promise<void> {
  const metrics: HealthMetricKey[] = [
    'hrv',
    'resting_hr',
    'steps_history',
    'active_cal_history',
    'sleep_history',
    'vo2max',
    'spo2',
    'respiratory',
    'bmr',
    'distance',
    'body_weight',
    'body_fat',
    'readiness',
  ];
  await Promise.all(metrics.map(clearMetric));
  await AsyncStorage.removeItem(INITIAL_SYNC_KEY);
}

// ─── Initial sync tracking ────────────────────────────────────────────────────

export async function hasCompletedInitialSync(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(INITIAL_SYNC_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function markInitialSyncComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(INITIAL_SYNC_KEY, 'true');
  } catch {}
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Get samples within the last N days (inclusive of today).
 */
export async function getRecentSamples(
  metric: HealthMetricKey,
  days: number
): Promise<DailyHealthSample[]> {
  const all = await readMetric(metric);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = toDateString(cutoff);
  return all.filter((s) => s.date >= cutoffStr);
}

/**
 * Get the most recent sample for a metric. Returns null if no data.
 */
export async function getLatestSample(
  metric: HealthMetricKey
): Promise<DailyHealthSample | null> {
  const all = await readMetric(metric);
  if (all.length === 0) return null;
  return all[all.length - 1];
}

/**
 * Load all relevant metrics in one shot for the readiness engine.
 * Returns a map of metric key → samples array.
 */
export async function loadAllMetrics(): Promise<
  Record<HealthMetricKey, DailyHealthSample[]>
> {
  const keys: HealthMetricKey[] = [
    'hrv',
    'resting_hr',
    'steps_history',
    'active_cal_history',
    'sleep_history',
    'vo2max',
    'spo2',
    'respiratory',
    'bmr',
    'distance',
    'body_weight',
    'body_fat',
    'readiness',
  ];

  const results = await Promise.all(keys.map((k) => readMetric(k)));
  const map = {} as Record<HealthMetricKey, DailyHealthSample[]>;
  keys.forEach((k, i) => {
    map[k] = results[i];
  });
  return map;
}
