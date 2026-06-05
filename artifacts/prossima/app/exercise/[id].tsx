import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTraining } from '@/context/TrainingContext';
import { BarChart } from '@/components/BarChart';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getExerciseEntries, getPersonalBest } = useTraining();

  const exerciseName = decodeURIComponent(id);
  const allEntries = getExerciseEntries(exerciseName);
  const pb = getPersonalBest(exerciseName);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const volumeByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of allEntries) {
      const dateKey = formatDate(entry.completedAt);
      const vol = (entry.weightKg ?? 0) * (entry.reps ?? 0);
      map.set(dateKey, (map.get(dateKey) ?? 0) + vol);
    }
    const dates = [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .slice(-8);
    return dates;
  }, [allEntries]);

  const recentSets = allEntries.slice(0, 20);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.exerciseTitle, { color: colors.foreground }]} numberOfLines={1}>
            {exerciseName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {pb ? (
          <View
            style={[
              styles.pbCard,
              {
                backgroundColor: colors.primary + '18',
                borderRadius: colors.radius,
                borderColor: colors.primary + '44',
              },
            ]}
          >
            <Ionicons name="star" size={20} color={colors.warning} />
            <View>
              <Text style={[styles.pbLabel, { color: colors.mutedForeground }]}>
                Personal Best
              </Text>
              <Text
                style={[
                  styles.pbValue,
                  { color: colors.foreground, fontVariant: ['tabular-nums'] },
                ]}
              >
                {pb.weightKg}kg × {pb.reps} reps
              </Text>
              <Text style={[styles.pbDate, { color: colors.mutedForeground }]}>
                {formatDate(pb.date)}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.noPbCard,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.noPbText, { color: colors.mutedForeground }]}>
              No personal best yet. Log some sets to track progress.
            </Text>
          </View>
        )}

        {volumeByDate.length > 1 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Volume over time
            </Text>
            <BarChart data={volumeByDate} height={80} />
          </View>
        )}

        {recentSets.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent sets
            </Text>
            {recentSets.map((entry) => (
              <View
                key={entry.id}
                style={[styles.entryRow, { borderBottomColor: colors.separator }]}
              >
                <View style={styles.entryLeft}>
                  <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                    {formatDate(entry.completedAt)}
                  </Text>
                  <Text style={[styles.entrySet, { color: colors.mutedForeground }]}>
                    Set {entry.setNumber}
                  </Text>
                </View>
                <View style={styles.entryRight}>
                  {entry.personalBest && (
                    <Ionicons name="star" size={12} color={colors.warning} />
                  )}
                  <Text
                    style={[
                      styles.entryValue,
                      { color: colors.foreground, fontVariant: ['tabular-nums'] },
                    ]}
                  >
                    {entry.weightKg ? `${entry.weightKg}kg` : ''}
                    {entry.weightKg && entry.reps ? ' × ' : ''}
                    {entry.reps ? `${entry.reps}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {allEntries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No sets logged yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  exerciseTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  content: { paddingHorizontal: 16, gap: 12 },
  pbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
  },
  pbLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pbValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  pbDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  noPbCard: {
    padding: 16,
  },
  noPbText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryLeft: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  entryDate: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    minWidth: 60,
  },
  entrySet: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
