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

function dayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { plan, currentDayIndex, getPersonalBest, loading, sessions } = useTraining();
  const { activeSession, startSession } = useSession();

  const today = plan?.days[currentDayIndex % plan.days.length] ?? null;

  const handleStartSession = () => {
    if (!today || !plan) return;
    if (!activeSession) {
      startSession(plan.name, today.label, today.exercises);
    }
    router.navigate('/(tabs)/session');
  };

  const thisMonthSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [sessions]);

  const topPadding =
    Platform.OS === 'web' ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 16,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {dayGreeting()}
            </Text>
            <Text style={[styles.dateText, { color: colors.foreground }]}>
              {formatDate(new Date())}
            </Text>
          </View>
          {thisMonthSessions > 0 && (
            <View style={[styles.monthBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.monthCount, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
                {thisMonthSessions}
              </Text>
              <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>
                this month
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
            <Ionicons name="document-text-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No training plan
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Add a plan in Settings to get started.
            </Text>
            <Pressable
              onPress={() => router.navigate('/(tabs)/settings')}
              style={({ pressed }) => [
                styles.emptyButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.emptyButtonText, { color: colors.primaryForeground }]}>
                Go to Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.dayHeader}>
              <View>
                <Text style={[styles.planName, { color: colors.mutedForeground }]}>
                  {plan.name}
                </Text>
                <Text style={[styles.dayName, { color: colors.foreground }]}>
                  {today?.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.dayCount,
                  { color: colors.mutedForeground, fontVariant: ['tabular-nums'] },
                ]}
              >
                Day {(currentDayIndex % plan.days.length) + 1}/{plan.days.length}
              </Text>
            </View>

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
                    params: { id: ex.name },
                  })
                }
              />
            ))}
          </>
        )}
      </ScrollView>

      {plan && (
        <View
          style={[
            styles.ctaContainer,
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
                styles.ctaButton,
                {
                  backgroundColor: colors.success,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={[styles.ctaText, { color: '#fff' }]}>
                Session in Progress
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStartSession}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  monthBadge: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    minWidth: 60,
  },
  monthCount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 22,
  },
  monthLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
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
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  planName: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dayName: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  dayCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
