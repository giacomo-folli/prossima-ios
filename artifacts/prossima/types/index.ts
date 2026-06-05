export type ExerciseUnit = 'reps' | 'duration' | 'distance';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  unit: ExerciseUnit;
  notes: string;
  createdAt: string;
}

export interface SessionEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  completedAt: string;
  personalBest: boolean;
}

export interface Session {
  id: string;
  date: string;
  planName: string;
  dayLabel: string;
  durationSeconds: number;
  notes: string;
  entries: SessionEntry[];
}

export interface PlannedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface TrainingDay {
  id: string;
  label: string;
  exercises: PlannedExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  days: TrainingDay[];
}

export interface ActiveSession {
  planName: string;
  dayLabel: string;
  dayExercises: PlannedExercise[];
  startedAt: string;
  entries: SessionEntry[];
}
