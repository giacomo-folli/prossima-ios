import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const progress = sets > 0 ? Math.min(completedSets / sets, 1) : 0;
  const isDone = completedSets >= sets && sets > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {personalBest && (
              <View style={[styles.pbBadge, { backgroundColor: colors.warning + '22' }]}>
                <Ionicons name="star" size={10} color={colors.warning} />
              </View>
            )}
          </View>
          <Text style={[styles.spec, { color: colors.mutedForeground }]}>
            {sets} sets × {reps}
          </Text>
          {personalBest && (
            <Text style={[styles.pb, { color: colors.mutedForeground }]}>
              Best: {personalBest.weightKg}kg × {personalBest.reps}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          {isDone ? (
            <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          ) : completedSets > 0 ? (
            <Text style={[styles.setsCount, { color: colors.primary, fontVariant: ['tabular-nums'] }]}>
              {completedSets}/{sets}
            </Text>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          )}
        </View>
      </View>
      {completedSets > 0 && !isDone && (
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${progress * 100}%`,
                borderRadius: 2,
              },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  pbBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spec: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  pb: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontVariant: ['tabular-nums'],
  },
  right: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsCount: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
