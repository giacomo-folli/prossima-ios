import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
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
      (acc, s) =>
        acc +
        s.entries.reduce(
          (a, e) => (e.weightKg && e.reps ? a + e.weightKg * e.reps : a),
          0,
        ),
      0,
    );
    return { thisMonth, totalVolume };
  }, [sessions]);

  const avgDur = useMemo(() => {
    if (!sessions.length) return 0;
    return Math.round(
      sessions.reduce((a, s) => a + s.durationSeconds, 0) / sessions.length,
    );
  }, [sessions]);

  const handleStart = () => {
    if (!today || !plan) return;
    if (!activeSession) startSession(plan.name, today.label, today.exercises);
    router.navigate('/(tabs)/session');
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  if (loading) {
    return <View style={[styles.root, { backgroundColor: colors.background }]} />;
  }

  const volDisplay =
    totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}t`
      : `${Math.round(totalVolume)}`;
  const volSub = totalVolume >= 1000 ? undefined : 'kg';
  const avgMin = Math.floor(avgDur / 60);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 24,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.subDate, { color: colors.mutedForeground }]}>
              {formatSubDate(new Date())}
            </Text>
          </View>
        </View>

        {/* Activity rings — only shown when there's data */}
        {sessions.length > 0 && (
          <View
            style={[
              styles.ringsCard,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.ringsTitle, { color: colors.mutedForeground }]}>
              YOUR ACTIVITY
            </Text>
            <View style={styles.ringsRow}>
              <RingChart
                progress={Math.min(thisMonth / MONTH_GOAL, 1)}
                label="Sessions"
                value={String(thisMonth)}
                sublabel={`/${MONTH_GOAL}`}
                color={colors.primary}
              />
              <View style={[styles.ringDivider, { backgroundColor: colors.separator }]} />
              <RingChart
                progress={Math.min(totalVolume / 50000, 1)}
                label="Volume"
                value={volDisplay}
                sublabel={volSub}
                color="#3D7FFF"
              />
              <View style={[styles.ringDivider, { backgroundColor: colors.separator }]} />
              <RingChart
                progress={Math.min(avgMin / 60, 1)}
                label="Avg Time"
                value={avgMin > 0 ? `${avgMin}` : '—'}
                sublabel={avgMin > 0 ? 'min' : undefined}
                color="#BF5AF2"
              />
            </View>
          </View>
        )}

        {!plan ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={32}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No training plan
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Add a plan in Settings to get started.
            </Text>
            <Pressable
              onPress={() => router.navigate('/(tabs)/settings')}
              style={({ pressed }) => [
                styles.emptyBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[styles.emptyBtnText, { color: colors.primaryForeground }]}
              >
                Open Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.dayRow}>
              <View>
                <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>
                  {plan.name.toUpperCase()}
                </Text>
                <Text style={[styles.dayName, { color: colors.foreground }]}>
                  {today?.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.dayFraction,
                  { color: colors.mutedForeground, fontVariant: ['tabular-nums'] },
                ]}
              >
                {(currentDayIndex % plan.days.length) + 1} / {plan.days.length}
              </Text>
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
              paddingBottom:
                insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 16,
              backgroundColor: colors.background,
              borderTopColor: colors.separator,
            },
          ]}
        >
          {activeSession ? (
            <Pressable
              onPress={() => router.navigate('/(tabs)/session')}
              style={({ pressed }) => [
                styles.ctaBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.ctaBtnInner}>
                <View
                  style={[
                    styles.liveDot,
                    { backgroundColor: colors.primaryForeground },
                  ]}
                />
                <Text
                  style={[styles.ctaBtnText, { color: colors.primaryForeground }]}
                >
                  Session in Progress
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.ctaBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[styles.ctaBtnText, { color: colors.primaryForeground }]}
              >
                Begin {today?.label}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subDate: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  ringsCard: {
    padding: 20,
    gap: 18,
  },
  ringsTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
  },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ringDivider: {
    width: StyleSheet.hairlineWidth,
    height: 60,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  planLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
    marginBottom: 4,
  },
  dayName: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.6,
  },
  dayFraction: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  exerciseList: { gap: 0 },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
});
