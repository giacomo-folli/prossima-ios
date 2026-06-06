/**
 * ReadinessEngine — pure, side-effect-free score computation.
 *
 * Implements the 4-pillar Readiness Score:
 *   HRV (35%) + Sleep (25%) + Resting HR (20%) + Training Load (20%)
 *
 * All functions are deterministic given the same inputs. No React, no I/O.
 */

import { DailyHealthSample } from './HealthStore';
import { Session } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SleepNight {
  totalHours: number;
  deepRatio: number; // 0.0 – 1.0
  remRatio: number;  // 0.0 – 1.0
}

export interface ReadinessInputs {
  /** All HRV samples in the store (up to 90 days) */
  hrvSamples: DailyHealthSample[];
  /** Today's HRV reading in ms (null = no data yet) */
  todayHrv: number | null;
  /** Last night's sleep breakdown */
  lastNightSleep: SleepNight | null;
  /** All resting HR samples (up to 90 days) */
  restingHrSamples: DailyHealthSample[];
  /** Today's resting HR in bpm (null = no data yet) */
  todayRestingHr: number | null;
  /** All logged training sessions (used to compute ACWR) */
  sessions: Session[];
}

export interface ReadinessBreakdown {
  /** Composite 0–100 readiness score */
  score: number;
  /** Individual pillar scores (0–100) */
  hrv: number;
  sleep: number;
  rhr: number;
  load: number;
  /** Human-readable status label */
  label: string;
  /** 0=grey/no-data, 1=red/poor, 2=amber/fair, 3=green/good */
  level: 0 | 1 | 2 | 3;
  /** Whether we have enough data for a meaningful score */
  hasData: boolean;
}

// ─── Pillar 1: HRV Score (35%) ────────────────────────────────────────────────

/**
 * Z-score normalised vs. the user's 30-day personal HRV baseline.
 *
 * At baseline average → 50 pts
 * +1 SD above → 75–100 pts (well recovered)
 * −1 SD below → 0–25 pts (under-recovered)
 */
export function computeHrvScore(
  samples: DailyHealthSample[],
  todayHrv: number | null
): number {
  if (todayHrv === null || todayHrv <= 0) return 50; // neutral default

  // Use last 30 days for personal baseline
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const baseline = samples.filter((s) => s.date >= cutoffStr && s.value > 0);

  if (baseline.length < 3) return 50; // not enough data → neutral

  const mean = baseline.reduce((a, b) => a + b.value, 0) / baseline.length;
  const variance =
    baseline.reduce((a, b) => a + Math.pow(b.value - mean, 2), 0) /
    baseline.length;
  const sd = Math.sqrt(variance);

  if (sd === 0) return 50;

  // Z-score clamped to [-2, +2], then mapped to [0, 100]
  const z = Math.max(-2, Math.min(2, (todayHrv - mean) / sd));
  return Math.round(50 + z * 25); // z=+2 → 100, z=0 → 50, z=-2 → 0
}

// ─── Pillar 2: Sleep Score (25%) ──────────────────────────────────────────────

/**
 * Weighted 3-component sleep score:
 *   Duration  40 pts: 7–9h optimal
 *   Deep ratio 30 pts: ≥20% of total
 *   REM ratio  30 pts: ≥20% of total
 */
export function computeSleepScore(sleep: SleepNight | null): number {
  if (!sleep || sleep.totalHours <= 0) return 0;

  // Duration component (0–40)
  let durationPts: number;
  const h = sleep.totalHours;
  if (h >= 7 && h <= 9) {
    durationPts = 40;
  } else if (h < 7) {
    // Linear from 0 at 3h to 40 at 7h
    durationPts = Math.max(0, ((h - 3) / 4) * 40);
  } else {
    // Slightly penalise oversleeping (9–12h range)
    durationPts = Math.max(30, 40 - ((h - 9) / 3) * 10);
  }

  // Deep sleep component (0–30)
  const deepPts = Math.min(30, (sleep.deepRatio / 0.2) * 30);

  // REM component (0–30)
  const remPts = Math.min(30, (sleep.remRatio / 0.2) * 30);

  return Math.round(durationPts + deepPts + remPts);
}

// ─── Pillar 3: Resting HR Score (20%) ─────────────────────────────────────────

/**
 * Compare today's RHR vs. the 7-day rolling average.
 *
 * Equal to avg → 50 pts
 * ≥5 bpm above → 0 pts  (stressed / ill)
 * ≥5 bpm below → 100 pts (well-adapted)
 */
export function computeRestingHrScore(
  samples: DailyHealthSample[],
  todayRhr: number | null
): number {
  if (todayRhr === null || todayRhr <= 0) return 50; // neutral default

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = samples.filter((s) => s.date >= cutoffStr && s.value > 0);

  if (recent.length < 2) return 50; // not enough data

  const avg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
  const delta = todayRhr - avg; // positive = elevated = bad

  // Linear scale: delta from -5 (great) to +5 (poor) → 100 to 0
  const score = 50 - delta * 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Pillar 4: Training Load Score (20%) ──────────────────────────────────────

/**
 * Acute:Chronic Workload Ratio (ACWR)
 *   Acute  = last 7 days average daily volume (sets × reps × weight)
 *   Chronic = last 28 days average daily volume
 *
 * ACWR 0.8–1.3 → optimal zone (100 pts)
 * ACWR >1.5    → overreach   (scaled down to 0)
 * ACWR <0.5    → detraining  (scaled down to 40)
 * No sessions  → 80 pts (rest day, slightly positive)
 */
export function computeTrainingLoadScore(sessions: Session[]): number {
  const now = Date.now();

  const volumeAt = (daysAgo: number): number => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAgo);
    return sessions
      .filter((s) => new Date(s.date).getTime() >= cutoff.getTime())
      .reduce(
        (total, s) =>
          total +
          s.entries.reduce(
            (v, e) => (e.weightKg && e.reps ? v + e.weightKg * e.reps : v),
            0
          ),
        0
      );
  };

  const acute7Total = volumeAt(7);
  const chronic28Total = volumeAt(28);

  const acuteAvg = acute7Total / 7;
  const chronicAvg = chronic28Total / 28;

  if (chronicAvg === 0) return 80; // no history → reasonable rest day score

  const acwr = acuteAvg / chronicAvg;

  if (acwr >= 0.8 && acwr <= 1.3) return 100;
  if (acwr > 1.5) {
    // Overreach: 1.5 → 40 pts, 2.0+ → 0 pts
    return Math.max(0, Math.round(100 - (acwr - 0.8) * 80));
  }
  if (acwr < 0.5) {
    // Detraining: 0.5 → 40 pts, 0 → 20 pts
    return Math.round(20 + acwr * 40);
  }
  // 0.5–0.8: ramp from 40 to 100
  return Math.round(40 + ((acwr - 0.5) / 0.3) * 60);
}

// ─── Composite Score ─────────────────────────────────────────────────────────

function scoreLabel(score: number): string {
  if (score >= 85) return 'Ready to perform';
  if (score >= 70) return 'Ready to train';
  if (score >= 55) return 'Moderate readiness';
  if (score >= 40) return 'Take it easy today';
  return 'Rest & recover';
}

function scoreLevel(score: number): 0 | 1 | 2 | 3 {
  if (score >= 70) return 3; // green
  if (score >= 50) return 2; // amber
  if (score >= 30) return 1; // red
  return 0; // grey / no data
}

export function computeReadinessScore(
  inputs: ReadinessInputs
): ReadinessBreakdown {
  const hrv = computeHrvScore(inputs.hrvSamples, inputs.todayHrv);
  const sleep = computeSleepScore(inputs.lastNightSleep);
  const rhr = computeRestingHrScore(
    inputs.restingHrSamples,
    inputs.todayRestingHr
  );
  const load = computeTrainingLoadScore(inputs.sessions);

  // Composite with weights
  const rawScore = hrv * 0.35 + sleep * 0.25 + rhr * 0.2 + load * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Determine if we have meaningful data (at least some real signal)
  const hasData =
    inputs.todayHrv !== null ||
    inputs.lastNightSleep !== null ||
    inputs.todayRestingHr !== null ||
    inputs.sessions.length > 0;

  return {
    score,
    hrv,
    sleep,
    rhr,
    load,
    label: scoreLabel(score),
    level: hasData ? scoreLevel(score) : 0,
    hasData,
  };
}
