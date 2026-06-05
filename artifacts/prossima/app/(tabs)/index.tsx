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

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatDate(date: Date) {
  const day = DAYS[date.getDay()];
  const num = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return { day, num, month };
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { plan, currentDayIndex, getPersonalBest, loading, sessions } = useTraining();
  const { activeSession, startSession } = useSession();

  const today = plan?.days[currentDayIndex % plan.days.length] ?? null;
  const { day, num, month } = formatDate(new Date());

  const thisMonthSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 24, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              {day} {month}
            </Text>
            <Text style={[styles.dateNum, { color: colors.foreground }]}>
              {num}
            </Text>
          </View>
          {thisMonthSessions > 0 && (
            <View style={[styles.monthBadge, { backgroundColor: colors.card }]}>
              <Text
                style={[
                  styles.monthNum,
                  { color: colors.primary, fontVariant: ['tabular-nums'] },
                ]}
              >
                {thisMonthSessions}
              </Text>
              <Text style={[styles.monthSub, { color: colors.mutedForeground }]}>
                sessions
              </Text>
            </View>
          )}
        </View>

        {!plan ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Ionicons name="document-text-outline" size={32} color={colors.mutedForeground} />
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
              <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                Open Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Day label */}
            <View style={styles.dayRow}>
              <View>
                <Text
                  style={[
                    styles.planLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
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
              paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 16,
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
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.ctaBtnText, { color: colors.primaryForeground }]}>
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
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 36,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 56,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 56,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  monthBadge: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  monthNum: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  monthSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 11,
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
