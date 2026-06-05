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
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

function formatDayDate(date: Date) {
  return date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
}

const MONTH_GOAL = 12;

export default function HomeScreen() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { plan, currentDayIndex, getPersonalBest, loading, sessions } = useTraining();
  const { activeSession, startSession } = useSession();

  const today = plan?.days[currentDayIndex % plan.days.length] ?? null;

  const { thisMonth, totalVolume, totalSessions } = useMemo(() => {
    const now = new Date();
    const thisMonth = sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const totalVolume = sessions.reduce(
      (acc, s) =>
        acc + s.entries.reduce((a, e) => (e.weightKg && e.reps ? a + e.weightKg * e.reps : a), 0),
      0,
    );
    return { thisMonth, totalVolume, totalSessions: sessions.length };
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

  const topPadding = Platform.OS === 'web' ? 56 : insets.top;
  const tabBarHeight = Platform.OS === 'web' ? 84 : 49;
  const ctaBottom = tabBarHeight + insets.bottom;

  const isDark = resolvedScheme === 'dark';
  const gradientColors: [string, string, string] = isDark
    ? ['#111811', '#162016', '#111811']
    : ['#B8D4B0', '#C4D9BC', '#CCE0C4'];

  const volDisplay =
    totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}t`
      : `${Math.round(totalVolume)}`;
  const avgMin = Math.floor(avgDur / 60);

  if (loading) {
    return <LinearGradient colors={gradientColors} style={{ flex: 1 }} />;
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 12, paddingBottom: ctaBottom + 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              {formatDayDate(new Date())}
            </Text>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
              {getGreeting()}
            </Text>
          </View>
          {activeSession && (
            <Pressable
              onPress={() => router.navigate('/(tabs)/session')}
              style={({ pressed }) => [
                styles.liveChip,
                { backgroundColor: colors.primary, borderRadius: 50, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.liveDot, { backgroundColor: colors.primaryForeground }]} />
              <Text style={[styles.liveChipText, { color: colors.primaryForeground }]}>Live</Text>
            </Pressable>
          )}
        </View>

        {/* ── Activity rings ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            YOUR ACTIVITY
          </Text>
          {totalSessions > 0 && (
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {totalSessions} sessions
            </Text>
          )}
        </View>

        <View style={[styles.ringsCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={styles.ringsRow}>
            <RingChart
              progress={Math.min(thisMonth / MONTH_GOAL, 1)}
              size={88}
              strokeWidth={7}
              label="This month"
              value={String(thisMonth)}
              sublabel={`/ ${MONTH_GOAL}`}
              color={colors.accent}
            />
            <View style={[styles.ringDivider, { backgroundColor: colors.separator }]} />
            <RingChart
              progress={Math.min(totalVolume / 50000, 1)}
              size={88}
              strokeWidth={7}
              label="Volume"
              value={volDisplay}
              sublabel={totalVolume > 0 && totalVolume < 1000 ? 'kg' : undefined}
              color={colors.accent}
            />
            <View style={[styles.ringDivider, { backgroundColor: colors.separator }]} />
            <RingChart
              progress={Math.min(avgMin / 60, 1)}
              size={88}
              strokeWidth={7}
              label="Avg time"
              value={avgMin > 0 ? `${avgMin}` : '—'}
              sublabel={avgMin > 0 ? 'min' : undefined}
              color={colors.accent}
            />
          </View>
        </View>

        {/* ── Today's plan ── */}
        {!plan ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S PLAN</Text>
            </View>
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Ionicons name="leaf-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No training plan</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                Add a plan in Settings to get started.
              </Text>
              <Pressable
                onPress={() => router.navigate('/(tabs)/settings')}
                style={({ pressed }) => [
                  styles.emptyBtn,
                  { backgroundColor: colors.primary, borderRadius: 50, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                  Open Settings
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S PLAN</Text>
              <View style={styles.dayNav}>
                <Text style={[styles.dayNavText, { color: colors.mutedForeground }]}>
                  {plan.name.toUpperCase()}
                </Text>
                <View style={[styles.dayBadge, { backgroundColor: colors.card, borderRadius: 20 }]}>
                  <Text style={[styles.dayBadgeText, { color: colors.mutedForeground, fontVariant: ['tabular-nums'] }]}>
                    {(currentDayIndex % plan.days.length) + 1} / {plan.days.length}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.dayTitle, { color: colors.foreground }]}>
              {today?.label}
            </Text>

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

      {/* ── CTA ── */}
      {plan && (
        <View style={[styles.ctaWrap, { bottom: ctaBottom }]}>
          {activeSession ? (
            <Pressable
              onPress={() => router.navigate('/(tabs)/session')}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <View style={styles.liveDotRow}>
                <View style={[styles.liveDot, { backgroundColor: colors.primaryForeground }]} />
                <Text style={[styles.ctaBtnText, { color: colors.primaryForeground }]}>
                  Session in Progress
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons
                name="play"
                size={14}
                color={colors.primaryForeground}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.ctaBtnText, { color: colors.primaryForeground }]}>
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
  content: { paddingHorizontal: 20, gap: 10 },

  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 38,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
    lineHeight: 44,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 20,
  },
  liveChipText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 2 },
  sectionMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  ringsCard: { padding: 20 },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ringDivider: { width: StyleSheet.hairlineWidth, height: 64 },

  dayNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayNavText: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 1.5 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  dayBadgeText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  dayTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.6,
    marginTop: 2,
    marginBottom: 4,
  },

  exerciseList: { gap: 0 },

  emptyCard: { padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptyBody: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  emptyBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  ctaWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    paddingBottom: 16,
    paddingTop: 10,
  },
  ctaBtn: {
    height: 56,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.1 },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
});
