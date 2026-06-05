import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as jsYaml from 'js-yaml';
import { Session, SessionEntry, TrainingPlan } from '@/types';

const KEYS = {
  YAML: '@prossima:yaml',
  SESSIONS: '@prossima:sessions',
  DAY_INDEX: '@prossima:day_index',
};

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

export const DEFAULT_YAML = `name: "Push Pull Legs"
days:
  - label: "Push Day"
    exercises:
      - name: "Bench Press"
        sets: 4
        reps: "6-8"
        rest_seconds: 180
        notes: "Keep elbows at 45 degrees"
      - name: "Overhead Press"
        sets: 3
        reps: "8-10"
        rest_seconds: 120
      - name: "Incline Dumbbell Press"
        sets: 3
        reps: "10-12"
        rest_seconds: 90
      - name: "Tricep Dips"
        sets: 3
        reps: "AMRAP"
        rest_seconds: 90
  - label: "Pull Day"
    exercises:
      - name: "Pull Ups"
        sets: 4
        reps: "AMRAP"
        rest_seconds: 120
      - name: "Barbell Row"
        sets: 4
        reps: "6-8"
        rest_seconds: 180
      - name: "Cable Row"
        sets: 3
        reps: "10-12"
        rest_seconds: 90
      - name: "Bicep Curls"
        sets: 3
        reps: "12-15"
        rest_seconds: 60
  - label: "Leg Day"
    exercises:
      - name: "Squat"
        sets: 4
        reps: "6-8"
        rest_seconds: 180
      - name: "Romanian Deadlift"
        sets: 3
        reps: "8-10"
        rest_seconds: 120
      - name: "Leg Press"
        sets: 3
        reps: "12-15"
        rest_seconds: 90
      - name: "Calf Raises"
        sets: 4
        reps: "20"
        rest_seconds: 60`;

export interface PersonalBest {
  weightKg: number;
  reps: number;
  volume: number;
  sessionId: string;
  date: string;
}

export function parseYamlToPlan(yaml: string): TrainingPlan {
  const raw = jsYaml.load(yaml) as any;
  if (!raw || typeof raw !== 'object') throw new Error('Invalid YAML');
  return {
    id: generateId(),
    name: String(raw.name || 'My Plan'),
    days: ((raw.days as any[]) || []).map((day: any) => ({
      id: generateId(),
      label: String(day.label || 'Day'),
      exercises: ((day.exercises as any[]) || []).map((ex: any) => ({
        id: generateId(),
        name: String(ex.name || 'Exercise'),
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || '8-12'),
        restSeconds: Number(ex.rest_seconds) || 90,
        notes: ex.notes ? String(ex.notes) : undefined,
      })),
    })),
  };
}

interface TrainingContextType {
  plan: TrainingPlan | null;
  sessions: Session[];
  yamlSource: string;
  currentDayIndex: number;
  loading: boolean;
  parseError: string | null;
  loadPlan: (yaml: string) => Promise<void>;
  saveSession: (session: Session) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  getPersonalBest: (exerciseName: string) => PersonalBest | null;
  getExerciseEntries: (exerciseName: string) => SessionEntry[];
  advanceDayIndex: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

const TrainingContext = createContext<TrainingContextType | null>(null);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [yamlSource, setYamlSource] = useState(DEFAULT_YAML);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [yaml, sessionsRaw, dayIndexRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.YAML),
          AsyncStorage.getItem(KEYS.SESSIONS),
          AsyncStorage.getItem(KEYS.DAY_INDEX),
        ]);

        const src = yaml || DEFAULT_YAML;
        setYamlSource(src);
        try {
          setPlan(parseYamlToPlan(src));
          setParseError(null);
        } catch (e: any) {
          setParseError(e.message);
        }

        if (sessionsRaw) setSessions(JSON.parse(sessionsRaw));
        if (dayIndexRaw) setCurrentDayIndex(Number(dayIndexRaw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadPlan = useCallback(async (yaml: string) => {
    try {
      const parsed = parseYamlToPlan(yaml);
      setPlan(parsed);
      setYamlSource(yaml);
      setParseError(null);
      await AsyncStorage.setItem(KEYS.YAML, yaml);
    } catch (e: any) {
      setParseError(e.message);
      throw e;
    }
  }, []);

  const saveSession = useCallback(async (session: Session) => {
    setSessions((prev) => {
      const next = [session, ...prev];
      AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(next));
      return next;
    });
  }, []);

  const advanceDayIndex = useCallback(async () => {
    if (!plan || plan.days.length === 0) return;
    const next = (currentDayIndex + 1) % plan.days.length;
    setCurrentDayIndex(next);
    await AsyncStorage.setItem(KEYS.DAY_INDEX, String(next));
  }, [plan, currentDayIndex]);

  const getPersonalBest = useCallback(
    (exerciseName: string): PersonalBest | null => {
      let best: PersonalBest | null = null;
      for (const session of sessions) {
        for (const entry of session.entries) {
          if (
            entry.exerciseName.toLowerCase() === exerciseName.toLowerCase() &&
            entry.weightKg != null &&
            entry.reps != null
          ) {
            const volume = entry.weightKg * entry.reps;
            if (!best || volume > best.volume) {
              best = {
                weightKg: entry.weightKg,
                reps: entry.reps,
                volume,
                sessionId: session.id,
                date: session.date,
              };
            }
          }
        }
      }
      return best;
    },
    [sessions]
  );

  const getExerciseEntries = useCallback(
    (exerciseName: string): SessionEntry[] => {
      const entries: SessionEntry[] = [];
      for (const session of sessions) {
        for (const entry of session.entries) {
          if (entry.exerciseName.toLowerCase() === exerciseName.toLowerCase()) {
            entries.push(entry);
          }
        }
      }
      return entries.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    },
    [sessions]
  );

  const resetAllData = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.SESSIONS),
      AsyncStorage.removeItem(KEYS.DAY_INDEX),
    ]);
    setSessions([]);
    setCurrentDayIndex(0);
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        plan,
        sessions,
        yamlSource,
        currentDayIndex,
        loading,
        parseError,
        loadPlan,
        saveSession,
        deleteSession,
        getPersonalBest,
        getExerciseEntries,
        advanceDayIndex,
        resetAllData,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTraining must be inside TrainingProvider');
  return ctx;
}
