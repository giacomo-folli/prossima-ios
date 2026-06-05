import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { PersonalBest } from '@/context/TrainingContext';

interface ExerciseCardProps {
  name: string;
  sets: number;
  reps: string;
  muscles?: string[];
  personalBest?: PersonalBest | null;
  completedSets?: number;
  onPress?: () => void;
}

export function ExerciseCard({
  name,
  sets,
  reps,
  muscles,
  personalBest,
  completedSets = 0,
  onPress,
}: ExerciseCardProps) {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDone = completedSets >= sets && sets > 0;
  const hasProgress = completedSets > 0 && !isDone;
  const progress = sets > 0 ? Math.min(completedSets / sets, 1) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={styles.cardPressable}
    >
      {({ pressed }) => (
        <GlassView
          colorScheme={resolvedScheme}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
      <View style={styles.inner}>
        <View style={styles.left}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isDone
                  ? colors.primary
                  : hasProgress
                  ? colors.accent + 'AA'
                  : colors.border,
              },
            ]}
          />
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                { color: isDone ? colors.mutedForeground : colors.foreground },
              ]}
              numberOfLines={1}
            >
              {isDone ? <Text style={[styles.strikeThrough]}>{name}</Text> : name}
            </Text>
            {personalBest && !isDone && (
              <Ionicons name="star" size={10} color={colors.mutedForeground} />
            )}
          </View>
          <Text
            style={[
              styles.spec,
              { color: colors.mutedForeground, fontVariant: ['tabular-nums'] },
            ]}
          >
            {sets} sets · {reps} reps
            {personalBest ? `  ·  PB ${personalBest.weightKg}kg×${personalBest.reps}` : ''}
          </Text>
          {muscles && muscles.length > 0 && (
            <View style={styles.tags}>
              {muscles.slice(0, 3).map((m) => (
                <View
                  key={m}
                  style={[
                    styles.tag,
                    { backgroundColor: colors.secondary, borderRadius: colors.radius },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                    {m}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.right}>
          {isDone ? (
            <View
              style={[
                styles.doneCircle,
                { backgroundColor: colors.primary, borderRadius: 13 },
              ]}
            >
              <Ionicons name="checkmark" size={13} color={colors.primaryForeground} />
            </View>
          ) : hasProgress ? (
            <Text
              style={[
                styles.progressLabel,
                { color: colors.accent, fontVariant: ['tabular-nums'] },
              ]}
            >
              {completedSets}/{sets}
            </Text>
          ) : (
            <Ionicons name="chevron-forward" size={13} color={colors.border} />
          )}
        </View>
      </View>

      {hasProgress && (
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progress * 100}%` },
            ]}
          />
        </View>
      )}
        </GlassView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressable: {
    marginBottom: 8,
  },
  card: {
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  left: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
  },
  spec: { fontSize: 12, letterSpacing: 0.1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, letterSpacing: 0.3 },
  right: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 2 },
  doneCircle: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  progressLabel: { fontSize: 14, fontWeight: '700', },
  progressTrack: { height: 2, marginHorizontal: 16, marginBottom: 12, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
});
