import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useTraining } from '@/context/TrainingContext';
import { useSession } from '@/context/SessionContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import { RingChart } from '@/components/RingChart';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatSubDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const MONTH_GOAL = 12;

export default function HomeScreen() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { plan, currentDayIndex, getPersonalBest, loading, sessions } = useTraining();
  const { activeSession, startSession } = useSession();

  const today = plan?.days[currentDayIndex % plan.days.length] ?? null;

  const { thisMonth, totalVolume } = useMemo(() => {
    const now = new Date();
    const thisMonth = sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const totalVolume = sessions.reduce(
      (acc, s) => acc + s.entries.reduce((a, e) => (e.weightKg && e.reps ? a + e.weightKg * e.reps : a), 0),
      0,
    );
    return { thisMonth, totalVolume };
  }, [sessions]);

  const avgDur = useMemo(() => {
    if (!sessions.length) return 0;
    return Math.round(sessions.reduce((a, s) => a + s.durationSeconds, 0) / sessions.length);
  }, [sessions]);

  const handleStart = () => {
    if (!today || !plan) return;
    if (!activeSession) startSession(plan.name, today.label, today.exercises);
    router.navigate('/(tabs)/session');
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const tabBarHeight = Platform.OS === 'web' ? 84 : 49;
  const ctaBottom = tabBarHeight + insets.bottom;

  const isDark = resolvedScheme === 'dark';
  const gradientColors: [string, string, string] = isDark
    ? ['#111811', '#162016', '#111811']
    : ['#B8D4B0', '#C4D9BC', '#CCE0C4'];

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={{ flex: 1 }} />
    );
  }

  const volDisplay = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}t`
    : `${Math.round(totalVolume)}`;
  const avgMin = Math.floor(avgDur / 60);

  return (
    <LinearGradient colors={gradientColors} style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 28, paddingBottom: ctaBottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetBlock}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.subDate, { color: colors.mutedForeground }]}>
            {formatSubDate(new Date())}
          </Text>
        </View>

        {/* Activity rings */}
        {sessions.length > 0 && (
          <View style={[styles.ringsCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR ACTIVITY</Text>
            <View style={styles.ringsRow}>
              <RingChart
                progress={Math.min(thisMonth / MONTH_GOAL, 1)}
                label="Sessions"
                value={String(thisMonth)}
                sublabel={`/ ${MONTH_GOAL}`}
                color={colors.accent}
              />
              <View style={[styles.ringDivider, { backgroundColor: colors.separator }]} />
              <RingChart
                progress={Math.min(totalVolume / 50000, 1)}
                label="Volume"
                value={volDisplay}
                sublabel={totalVolume < 1000 ? 'kg' : undefined}
                color={colors.accent}
              />
              <View style={[styles.ringDivider, { backgroundColor: colors.separator }]} />
              <RingChart
                progress={Math.min(avgMin / 60, 1)}
                label="Avg Time"
                value={avgMin > 0 ? `${avgMin}` : '—'}
                sublabel={avgMin > 0 ? 'min' : undefined}
                color={colors.accent}
              />
            </View>
          </View>
        )}

        {!plan ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <Ionicons name="leaf-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No training plan</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Add a plan in Settings to get started.
            </Text>
            <Pressable
              onPress={() => router.navigate('/(tabs)/settings')}
              style={({ pressed }) => [
                styles.pillBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.pillBtnText, { color: colors.primaryForeground }]}>
                Open Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.dayHeaderRow}>
              <View>
                <Text style={[styles.planChip, { color: colors.mutedForeground }]}>
                  {plan.name.toUpperCase()}
                </Text>
                <Text style={[styles.dayName, { color: colors.foreground }]}>
                  {today?.label}
                </Text>
              </View>
              <View style={[styles.fractionBadge, { backgroundColor: colors.card, borderRadius: 20 }]}>
                <Text style={[styles.fractionText, { color: colors.mutedForeground, fontVariant: ['tabular-nums'] }]}>
                  {(currentDayIndex % plan.days.length) + 1} / {plan.days.length}
                </Text>
              </View>
            </View>

            <View style={styles.exerciseList}>
              {today?.exercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  name={ex.name}
                  sets={ex.sets}
                  reps={ex.reps}
                  muscles={ex.muscles}
                  personalBest={getPersonalBest(ex.name)}
                  onPress={() =>
                    router.push({
                      pathname: '/exercise/[id]',
                      params: { id: encodeURIComponent(ex.name) },
                    })
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {plan && (
        <View
          style={[
            styles.ctaWrap,
            {
              bottom: ctaBottom,
              paddingBottom: 16,
            },
          ]}
        >
          {activeSession ? (
            <Pressable
              onPress={() => router.navigate('/(tabs)/session')}
              style={({ pressed }) => [
                styles.pillBtn,
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <View style={styles.liveDotRow}>
                <View style={[styles.liveDot, { backgroundColor: colors.primaryForeground }]} />
                <Text style={[styles.pillBtnText, { color: colors.primaryForeground }]}>
                  Session in Progress
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.pillBtn,
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={[styles.pillBtnText, { color: colors.primaryForeground }]}>
                Begin {today?.label}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  greetBlock: { gap: 6, marginBottom: 4 },
  greeting: {
    fontSize: 34,
    fontWeight: '300',
    fontFamily: 'Inter_400Regular',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subDate: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  ringsCard: { padding: 20, gap: 18 },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 2 },
  ringsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  ringDivider: { width: StyleSheet.hairlineWidth, height: 60 },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  planChip: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
    marginBottom: 4,
  },
  dayName: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.8,
  },
  fractionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fractionText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  exerciseList: { gap: 0 },
  emptyCard: { padding: 32, alignItems: 'center', gap: 12, marginTop: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptyBody: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  ctaWrap: {
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
    paddingHorizontal: 32,
  },
  ctaBtn: { width: '100%' },
  pillBtnText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.1,
  },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
});
