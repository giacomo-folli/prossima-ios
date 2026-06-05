import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
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
    if (!startedAt) { setElapsed(0); if (ref.current) clearInterval(ref.current); return; }
    ref.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [startedAt]);
  return elapsed;
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function ExerciseBlock({
  exercise, entries, getPersonalBest, onLogSet,
}: {
  exercise: PlannedExercise;
  entries: SessionEntry[];
  getPersonalBest: (n: string) => any;
  onLogSet: (ex: PlannedExercise) => void;
}) {
  const colors = useColors();
  const completed = entries.length;
  const isDone = completed >= exercise.sets;
  const pb = getPersonalBest(exercise.name);

  return (
    <View style={[styles.block, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
      <View style={styles.blockHeader}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.blockName, { color: isDone ? colors.mutedForeground : colors.foreground }]}>
            {exercise.name}
          </Text>
          <Text style={[styles.blockSpec, { color: colors.mutedForeground }]}>
            {exercise.sets} sets · {exercise.reps} reps
            {pb ? `  ·  PB ${pb.weightKg}kg×${pb.reps}` : ''}
          </Text>
        </View>
        {isDone ? (
          <View style={[styles.doneIcon, { backgroundColor: colors.primary, borderRadius: 13 }]}>
            <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
          </View>
        ) : (
          <Pressable
            onPress={() => onLogSet(exercise)}
            style={({ pressed }) => [
              styles.logBtn,
              { backgroundColor: colors.primary, borderRadius: 50, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.logBtnText, { color: colors.primaryForeground }]}>
              Set {completed + 1}
            </Text>
          </Pressable>
        )}
      </View>

      {entries.length > 0 && (
        <View style={styles.chipsRow}>
          {entries.map((e) => (
            <View
              key={e.id}
              style={[styles.chip, { backgroundColor: colors.secondary, borderRadius: 20 }]}
            >
              {e.personalBest && <Ionicons name="star" size={9} color={colors.accent} />}
              <Text style={[styles.chipText, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
                {e.weightKg ? `${e.weightKg}` : '—'}{e.reps ? ` × ${e.reps}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface LogState { exercise: PlannedExercise; setNumber: number; }

export default function SessionScreen() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { plan, currentDayIndex, getPersonalBest } = useTraining();
  const {
    activeSession, restingAfterSet,
    startSession, logSet, completeSession,
    cancelSession, dismissRest, getEntries,
  } = useSession();

  const today = plan?.days[currentDayIndex % plan.days.length] ?? null;
  const elapsed = useElapsed(activeSession?.startedAt ?? null);
  const [logState, setLogState] = useState<LogState | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const [celebData, setCelebData] = useState<{ dur: number; label: string } | null>(null);

  const handleLogSet = useCallback((ex: PlannedExercise) => {
    const count = getEntries(ex.name).length;
    setLogState({ exercise: ex, setNumber: count + 1 });
  }, [getEntries]);

  const handleConfirm = useCallback((w: number, r: number) => {
    if (!logState) return;
    logSet(logState.exercise.name, w, r, logState.exercise.restSeconds);
    setLogState(null);
  }, [logState, logSet]);

  const handleComplete = useCallback(async () => {
    if (!activeSession) return;
    const dur = Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000);
    const label = activeSession.dayLabel;
    const result = await completeSession();
    if (result.celebrated) { setCelebData({ dur, label }); setCelebrated(true); }
  }, [activeSession, completeSession]);

  const handleCancel = () => Alert.alert('Cancel Session', 'Progress will be lost.', [
    { text: 'Keep Going', style: 'cancel' },
    { text: 'Cancel', style: 'destructive', onPress: cancelSession },
  ]);

  const topPad = Platform.OS === 'web' ? 20 : insets.top;
  const tabBarHeight = Platform.OS === 'web' ? 84 : 49;
  const botPad = tabBarHeight + insets.bottom;

  const isDark = resolvedScheme === 'dark';
  const gradientColors: [string, string, string] = isDark
    ? ['#111811', '#162016', '#111811']
    : ['#B8D4B0', '#C4D9BC', '#CCE0C4'];

  if (!plan) {
    return (
      <LinearGradient colors={gradientColors} style={[styles.center, { paddingTop: topPad }]}>
        <Ionicons name="leaf-outline" size={36} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No plan configured</Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Go to Settings to add one.</Text>
      </LinearGradient>
    );
  }

  if (!activeSession) {
    return (
      <LinearGradient colors={gradientColors} style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 12, paddingBottom: botPad + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetBlock}>
            <Text style={[styles.readyLabel, { color: colors.mutedForeground }]}>NEXT UP</Text>
            <Text style={[styles.readyDay, { color: colors.foreground }]}>{today?.label}</Text>
            <Text style={[styles.readyPlan, { color: colors.mutedForeground }]}>{plan.name}</Text>
          </View>

          <View style={{ marginTop: 8, gap: 8 }}>
            {today?.exercises.map((ex) => (
              <View
                key={ex.id}
                style={[styles.previewRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}
              >
                <View style={[styles.previewDot, { backgroundColor: colors.border }]} />
                <Text style={[styles.previewName, { color: colors.foreground }]}>{ex.name}</Text>
                <Text style={[styles.previewSpec, { color: colors.mutedForeground, fontVariant: ['tabular-nums'] }]}>
                  {ex.sets} × {ex.reps}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { bottom: botPad, paddingBottom: 16 }]}>
          <Pressable
            onPress={() => { if (today && plan) startSession(plan.name, today.label, today.exercises); }}
            style={({ pressed }) => [
              styles.pillBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text style={[styles.pillBtnText, { color: colors.primaryForeground }]}>
              Begin {today?.label}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const totalSets = activeSession.dayExercises.reduce((a, ex) => a + ex.sets, 0);
  const doneSets = activeSession.entries.length;
  const overallProg = totalSets > 0 ? doneSets / totalSets : 0;

  return (
    <LinearGradient colors={gradientColors} style={styles.root}>
      <View style={[styles.sessionHead, { paddingTop: topPad + 8, borderBottomColor: colors.separator }]}>
        <View style={styles.sessionMeta}>
          <Text style={[styles.sessionDayLabel, { color: colors.mutedForeground }]}>
            {activeSession.planName.toUpperCase()}
          </Text>
          <Text style={[styles.sessionDayName, { color: colors.foreground }]}>
            {activeSession.dayLabel}
          </Text>
        </View>
        <View style={styles.timerBlock}>
          <Text style={[styles.timerText, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
            {formatElapsed(elapsed)}
          </Text>
          <Pressable onPress={handleCancel} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.overallTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.overallFill, { backgroundColor: colors.accent, width: `${overallProg * 100}%` }]} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeSession.dayExercises.map((ex) => (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            entries={getEntries(ex.name)}
            getPersonalBest={getPersonalBest}
            onLogSet={handleLogSet}
          />
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { bottom: botPad, paddingBottom: 16 }]}>
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => [
            styles.pillBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <View style={styles.finishRow}>
            <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
            <Text style={[styles.pillBtnText, { color: colors.primaryForeground }]}>
              Finish Session
            </Text>
          </View>
        </Pressable>
      </View>

      {logState && (
        <SetLogModal
          visible={!!logState}
          exerciseName={logState.exercise.name}
          plannedReps={logState.exercise.reps}
          restSeconds={logState.exercise.restSeconds}
          setNumber={logState.setNumber}
          previousWeight={getEntries(logState.exercise.name).slice(-1)[0]?.weightKg}
          previousReps={getEntries(logState.exercise.name).slice(-1)[0]?.reps}
          personalBest={getPersonalBest(logState.exercise.name)}
          onLog={handleConfirm}
          onClose={() => setLogState(null)}
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
      {celebData && (
        <CelebrationOverlay
          visible={celebrated}
          durationSeconds={celebData.dur}
          sessionLabel={celebData.label}
          onDismiss={() => { setCelebrated(false); setCelebData(null); }}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptyBody: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  greetBlock: { gap: 6, marginBottom: 8 },
  readyLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 2, marginBottom: 4 },
  readyDay: { fontSize: 34, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: -1, lineHeight: 38 },
  readyPlan: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  previewDot: { width: 7, height: 7, borderRadius: 4 },
  previewName: { flex: 1, fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  previewSpec: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  sessionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionMeta: { gap: 2 },
  sessionDayLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 2 },
  sessionDayName: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  timerBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerText: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  overallTrack: { height: 2 },
  overallFill: { height: 2 },
  block: { marginBottom: 8, overflow: 'hidden' },
  blockHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  blockName: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2 },
  blockSpec: { fontSize: 12, fontFamily: 'Inter_400Regular', fontVariant: ['tabular-nums'] },
  doneIcon: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  logBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  logBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  bottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    paddingTop: 12,
  },
  pillBtn: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pillBtnText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.1 },
  finishRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
