import React, { createContext, useCallback, useContext, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ActiveSession, PlannedExercise, Session, SessionEntry } from '@/types';
import { useTraining } from './TrainingContext';

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

interface SessionContextType {
  activeSession: ActiveSession | null;
  restingAfterSet: { exerciseName: string; seconds: number } | null;
  startSession: (planName: string, dayLabel: string, exercises: PlannedExercise[]) => void;
  logSet: (exerciseName: string, weightKg: number, reps: number, restSeconds: number) => void;
  completeSession: () => Promise<{ celebrated: boolean }>;
  cancelSession: () => void;
  dismissRest: () => void;
  getEntries: (exerciseName: string) => SessionEntry[];
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { saveSession, advanceDayIndex, getPersonalBest } = useTraining();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [restingAfterSet, setRestingAfterSet] = useState<{
    exerciseName: string;
    seconds: number;
  } | null>(null);

  const startSession = useCallback(
    (planName: string, dayLabel: string, exercises: PlannedExercise[]) => {
      setActiveSession({
        planName,
        dayLabel,
        dayExercises: exercises,
        startedAt: new Date().toISOString(),
        entries: [],
      });
    },
    []
  );

  const logSet = useCallback(
    (exerciseName: string, weightKg: number, reps: number, restSeconds: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setActiveSession((prev) => {
        if (!prev) return prev;

        const existingForExercise = prev.entries.filter(
          (e) => e.exerciseName === exerciseName
        );
        const setNumber = existingForExercise.length + 1;

        const pb = getPersonalBest(exerciseName);
        const volume = weightKg * reps;
        const isPB = !pb || volume > pb.volume;

        const entry: SessionEntry = {
          id: generateId(),
          exerciseId: exerciseName,
          exerciseName,
          setNumber,
          reps,
          weightKg,
          completedAt: new Date().toISOString(),
          personalBest: isPB,
        };

        return { ...prev, entries: [...prev.entries, entry] };
      });

      if (restSeconds > 0) {
        setRestingAfterSet({ exerciseName, seconds: restSeconds });
      }
    },
    [getPersonalBest]
  );

  const completeSession = useCallback(async (): Promise<{ celebrated: boolean }> => {
    if (!activeSession) return { celebrated: false };

    const now = new Date();
    const started = new Date(activeSession.startedAt);
    const durationSeconds = Math.round((now.getTime() - started.getTime()) / 1000);

    const session: Session = {
      id: generateId(),
      date: now.toISOString(),
      planName: activeSession.planName,
      dayLabel: activeSession.dayLabel,
      durationSeconds,
      notes: '',
      entries: activeSession.entries,
    };

    await saveSession(session);
    await advanceDayIndex();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setActiveSession(null);
    setRestingAfterSet(null);

    const celebrated = Math.random() < 0.3;
    return { celebrated };
  }, [activeSession, saveSession, advanceDayIndex]);

  const cancelSession = useCallback(() => {
    setActiveSession(null);
    setRestingAfterSet(null);
  }, []);

  const dismissRest = useCallback(() => {
    setRestingAfterSet(null);
  }, []);

  const getEntries = useCallback(
    (exerciseName: string): SessionEntry[] => {
      if (!activeSession) return [];
      return activeSession.entries.filter((e) => e.exerciseName === exerciseName);
    },
    [activeSession]
  );

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        restingAfterSet,
        startSession,
        logSet,
        completeSession,
        cancelSession,
        dismissRest,
        getEntries,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be inside SessionProvider');
  return ctx;
}
