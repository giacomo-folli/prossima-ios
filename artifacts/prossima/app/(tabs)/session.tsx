import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTraining } from '@/context/TrainingContext';
import { useSession } from '@/context/SessionContext';
import { SetLogModal } from '@/components/SetLogModal';
import { RestTimerModal } from '@/components/RestTimerModal';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { PlannedExercise, SessionEntry } from '@/types';

function useElapsed(startedAt: string | null) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [startedAt]);

  return elapsed;
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

interface SetLogState {
  exercise: PlannedExercise;
  setNumber: number;
}

function ActiveExerciseBlock({
  exercise,
  entries,
  getPersonalBest,
  onLogSet,
}: {
  exercise: PlannedExercise;
  entries: SessionEntry[];
  getPersonalBest: (name: string) => any;
  onLogSet: (ex: PlannedExercise) => void;
}) {
  const colors = useColors();
  const completedSets = entries.length;
  const isDone = completedSets >= exercise.sets;

  return (
    <View
      style={[
        styles.exerciseBlock,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: isDone ? colors.success : 'transparent',
          borderWidth: isDone ? 1 : 0,
        },
      ]}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: colors.foreground }]}>
            {exercise.name}
          </Text>
          <Text style={[styles.exerciseSpec, { color: colors.mutedForeground }]}>
            {exercise.sets} sets × {exercise.reps}
          </Text>
        </View>
        {isDone ? (
          <View style={[styles.doneIcon, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : (
          <Pressable
            onPress={() => onLogSet(exercise)}
            style={({ pressed }) => [
              styles.logButton,
              {
                backgroundColor: colors.primary,
                borderRadius: 10,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[styles.logButtonText, { color: '#fff' }]}>
              Set {completedSets + 1}
            </Text>
          </Pressable>
        )}
      </View>

      {entries.length > 0 && (
        <View style={styles.entriesGrid}>
          {entries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.entryChip, { backgroundColor: colors.muted }]}
            >
              {entry.personalBest && (
                <Ionicons name="star" size={9} color={colors.warning} />
              )}
              <Text
                style={[
                  styles.entryText,
                  { color: colors.foreground, fontVariant: ['tabular-nums'] },
                ]}
              >
                {entry.weightKg ? `${entry.weightKg}kg` : ''}
                {entry.weightKg && entry.reps ? ' × ' : ''}
                {entry.reps ? `${entry.reps}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { plan, currentDayIndex, getPersonalBest } = useTraining();
  const {
    activeSession,
    restingAfterSet,
    startSession,
    logSet,
    completeSession,
    cancelSession,
    dismissRest,
    getEntries,
  } = useSession();

  const today = plan?.days[currentDayIndex % plan.days.length] ?? null;
  const elapsed = useElapsed(activeSession?.startedAt ?? null);

  const [logModalState, setLogModalState] = useState<SetLogState | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    durationSeconds: number;
    label: string;
  } | null>(null);

  const handleLogSet = useCallback(
    (exercise: PlannedExercise) => {
      const entries = getEntries(exercise.name);
      setLogModalState({ exercise, setNumber: entries.length + 1 });
    },
    [getEntries]
  );

  const handleConfirmSet = useCallback(
    (weightKg: number, reps: number) => {
      if (!logModalState) return;
      logSet(
        logModalState.exercise.name,
        weightKg,
        reps,
        logModalState.exercise.restSeconds
      );
      setLogModalState(null);
    },
    [logModalState, logSet]
  );

  const handleComplete = useCallback(async () => {
    if (!activeSession) return;
    const durationSeconds = Math.round(
      (Date.now() - new Date(activeSession.startedAt).getTime()) / 1000
    );
    const label = activeSession.dayLabel;
    const result = await completeSession();
    if (result.celebrated) {
      setCelebrationData({ durationSeconds, label });
      setCelebrated(true);
    }
  }, [activeSession, completeSession]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Session', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Cancel Session', style: 'destructive', onPress: cancelSession },
    ]);
  }, [cancelSession]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  if (!plan) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingTop: topPadding },
        ]}
      >
        <Ionicons name="document-text-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No plan configured
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Add a training plan in Settings.
        </Text>
      </View>
    );
  }

  if (!activeSession) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.idleTitle, { color: colors.foreground }]}>
            Ready?
          </Text>
          <Text style={[styles.idleSub, { color: colors.mutedForeground }]}>
            {plan.name} · {today?.label}
          </Text>

          <View style={{ marginTop: 24, gap: 8 }}>
            {today?.exercises.map((ex) => (
              <View
                key={ex.id}
                style={[
                  styles.previewRow,
                  {
                    backgroundColor: colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.previewName, { color: colors.foreground }]}>
                  {ex.name}
                </Text>
                <Text style={[styles.previewSpec, { color: colors.mutedForeground }]}>
                  {ex.sets} × {ex.reps}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomCta,
            {
              paddingBottom: bottomPadding + 16,
              paddingHorizontal: 16,
              borderTopColor: colors.separator,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              if (today && plan) {
                startSession(plan.name, today.label, today.exercises);
              }
            }}
            style={({ pressed }) => [
              styles.startButton,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.startButtonText, { color: colors.primaryForeground }]}>
              Begin {today?.label}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.sessionHeader,
          {
            paddingTop: topPadding + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <View>
          <Text style={[styles.sessionLabel, { color: colors.mutedForeground }]}>
            {activeSession.planName}
          </Text>
          <Text style={[styles.sessionDay, { color: colors.foreground }]}>
            {activeSession.dayLabel}
          </Text>
        </View>
        <View style={styles.timerBlock}>
          <Text
            style={[
              styles.timerText,
              { color: colors.primary, fontVariant: ['tabular-nums'] },
            ]}
          >
            {formatElapsed(elapsed)}
          </Text>
          <Pressable onPress={handleCancel} style={styles.cancelBtn}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeSession.dayExercises.map((exercise) => {
          const entries = getEntries(exercise.name);
          return (
            <ActiveExerciseBlock
              key={exercise.id}
              exercise={exercise}
              entries={entries}
              getPersonalBest={getPersonalBest}
              onLogSet={handleLogSet}
            />
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.bottomCta,
          {
            paddingBottom: bottomPadding + 16,
            paddingHorizontal: 16,
            borderTopColor: colors.separator,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: colors.success,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={[styles.startButtonText, { color: '#fff' }]}>
            Finish Session
          </Text>
        </Pressable>
      </View>

      {logModalState && (
        <SetLogModal
          visible={!!logModalState}
          exerciseName={logModalState.exercise.name}
          plannedReps={logModalState.exercise.reps}
          restSeconds={logModalState.exercise.restSeconds}
          setNumber={logModalState.setNumber}
          previousWeight={
            getEntries(logModalState.exercise.name).slice(-1)[0]?.weightKg
          }
          previousReps={
            getEntries(logModalState.exercise.name).slice(-1)[0]?.reps
          }
          personalBest={getPersonalBest(logModalState.exercise.name)}
          onLog={handleConfirmSet}
          onClose={() => setLogModalState(null)}
        />
      )}

      {restingAfterSet && (
        <RestTimerModal
          visible={!!restingAfterSet}
          exerciseName={restingAfterSet.exerciseName}
          totalSeconds={restingAfterSet.seconds}
          onDismiss={dismissRest}
        />
      )}

      {celebrationData && (
        <CelebrationOverlay
          visible={celebrated}
          durationSeconds={celebrationData.durationSeconds}
          sessionLabel={celebrationData.label}
          onDismiss={() => {
            setCelebrated(false);
            setCelebrationData(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  content: { paddingHorizontal: 16 },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  sessionDay: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  timerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  cancelBtn: { padding: 4 },
  exerciseBlock: {
    padding: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  exerciseSpec: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  doneIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  entriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  entryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  entryText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  idleTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  idleSub: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  previewSpec: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontVariant: ['tabular-nums'],
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
