import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { PersonalBest } from '@/context/TrainingContext';

interface ExerciseCardProps {
  name: string;
  sets: number;
  reps: string;
  personalBest?: PersonalBest | null;
  completedSets?: number;
  onPress?: () => void;
}

export function ExerciseCard({
  name,
  sets,
  reps,
  personalBest,
  completedSets = 0,
  onPress,
}: ExerciseCardProps) {
  const colors = useColors();
  const isDone = completedSets >= sets && sets > 0;
  const hasProgress = completedSets > 0 && !isDone;
  const progress = sets > 0 ? Math.min(completedSets / sets, 1) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          opacity: pressed ? 0.88 : 1,
          borderLeftColor: isDone
            ? colors.primary
            : hasProgress
            ? colors.primary + '88'
            : colors.border,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: isDone ? colors.mutedForeground : colors.foreground }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {personalBest && !isDone && (
              <Ionicons name="star" size={11} color={colors.warning} />
            )}
          </View>
          <Text style={[styles.spec, { color: colors.mutedForeground }]}>
            {sets} × {reps}
            {personalBest ? `  ·  PB ${personalBest.weightKg}kg×${personalBest.reps}` : ''}
          </Text>
        </View>

        <View style={styles.right}>
          {isDone ? (
            <View style={[styles.doneCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
            </View>
          ) : hasProgress ? (
            <Text
              style={[
                styles.progressLabel,
                { color: colors.primary, fontVariant: ['tabular-nums'] },
              ]}
            >
              {completedSets}/{sets}
            </Text>
          ) : (
            <Ionicons name="chevron-forward" size={14} color={colors.border} />
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 6,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  info: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  spec: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  right: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  progressTrack: {
    height: 2,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
});
