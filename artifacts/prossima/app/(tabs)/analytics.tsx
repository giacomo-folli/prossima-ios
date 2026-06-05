import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTraining } from '@/context/TrainingContext';
import { BarChart } from '@/components/BarChart';
import { Session } from '@/types';

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m` : `${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderRadius: colors.radius },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          { color: colors.foreground, fontVariant: ['tabular-nums'] },
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {sub && (
        <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function SessionRow({ session }: { session: Session }) {
  const colors = useColors();
  const totalSets = session.entries.length;
  const exercises = [...new Set(session.entries.map((e) => e.exerciseName))];

  return (
    <View
      style={[
        styles.sessionRow,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.sessionLeft}>
        <Text style={[styles.sessionDay, { color: colors.foreground }]}>
          {session.dayLabel}
        </Text>
        <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
          {formatDate(session.date)} · {formatDuration(session.durationSeconds)}
        </Text>
        <Text style={[styles.sessionExercises, { color: colors.mutedForeground }]} numberOfLines={1}>
          {exercises.join(', ')}
        </Text>
      </View>
      <View style={styles.sessionRight}>
        <Text
          style={[
            styles.sessionSets,
            { color: colors.primary, fontVariant: ['tabular-nums'] },
          ]}
        >
          {totalSets}
        </Text>
        <Text style={[styles.sessionSetsLabel, { color: colors.mutedForeground }]}>
          sets
        </Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessions, getPersonalBest, plan } = useTraining();

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const weeklyData = useMemo(() => {
    const weeks: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = sessions.filter((s) => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      }).length;

      const label = i === 0 ? 'Now' : `W${i}`;
      weeks.push({ label, value: count });
    }
    return weeks;
  }, [sessions]);

  const totalVolume = useMemo(() => {
    return sessions.reduce((acc, s) => {
      return (
        acc +
        s.entries.reduce((a, e) => {
          if (e.weightKg && e.reps) return a + e.weightKg * e.reps;
          return a;
        }, 0)
      );
    }, 0);
  }, [sessions]);

  const avgDuration = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(
      sessions.reduce((a, s) => a + s.durationSeconds, 0) / sessions.length
    );
  }, [sessions]);

  const topExercises = useMemo(() => {
    if (!plan) return [];
    const allNames = new Set<string>();
    plan.days.forEach((d) => d.exercises.forEach((e) => allNames.add(e.name)));
    return [...allNames]
      .map((name) => ({ name, pb: getPersonalBest(name) }))
      .filter((x) => x.pb !== null)
      .sort((a, b) => (b.pb?.volume ?? 0) - (a.pb?.volume ?? 0))
      .slice(0, 5);
  }, [plan, getPersonalBest]);

  if (sessions.length === 0) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingTop: topPadding },
        ]}
      >
        <Ionicons name="bar-chart-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No data yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Complete a session to see your stats.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding + 16,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>
        Review
      </Text>

      <View style={styles.statsRow}>
        <StatCard label="Sessions" value={String(sessions.length)} />
        <StatCard
          label="Avg Duration"
          value={formatDuration(avgDuration)}
        />
        <StatCard
          label="Total Volume"
          value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg`}
        />
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderRadius: colors.radius },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Sessions per week
        </Text>
        <BarChart data={weeklyData} height={80} />
      </View>

      {topExercises.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Best lifts
          </Text>
          {topExercises.map(({ name, pb }) => (
            <View key={name} style={styles.pbRow}>
              <Text
                style={[styles.pbName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {name}
              </Text>
              {pb && (
                <View style={styles.pbValues}>
                  <Ionicons name="star" size={11} color={colors.warning} />
                  <Text
                    style={[
                      styles.pbValue,
                      { color: colors.primary, fontVariant: ['tabular-nums'] },
                    ]}
                  >
                    {pb.weightKg}kg × {pb.reps}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionHeader, { color: colors.foreground }]}>
        Recent sessions
      </Text>
      {sessions.slice(0, 10).map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </ScrollView>
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
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  statSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  section: {
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    marginTop: 8,
  },
  pbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pbName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  pbValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pbValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  sessionRow: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 8,
  },
  sessionLeft: {
    flex: 1,
    gap: 2,
  },
  sessionDay: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  sessionMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  sessionExercises: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  sessionRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sessionSets: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  sessionSetsLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});
