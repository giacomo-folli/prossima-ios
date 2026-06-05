import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from 'expo-glass-effect';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useTraining } from '@/context/TrainingContext';
import { BarChart } from '@/components/BarChart';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { getExerciseEntries, getPersonalBest } = useTraining();

  const name = decodeURIComponent(id);
  const allEntries = getExerciseEntries(name);
  const pb = getPersonalBest(name);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const isDark = resolvedScheme === 'dark';
  const gradientColors = colors.backgroundGradient;

  const volumeByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allEntries) {
      const k = fmtDate(e.completedAt);
      map.set(k, (map.get(k) ?? 0) + (e.weightKg ?? 0) * (e.reps ?? 0));
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).slice(-8);
  }, [allEntries]);

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <GlassView
        colorScheme={resolvedScheme}
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.separator,
            borderBottomWidth: StyleSheet.hairlineWidth,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ width: 36 }} />
      </GlassView>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {pb ? (
          <GlassView
            colorScheme={resolvedScheme}
            style={[styles.pbCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border }]}
          >
            <View>
              <Text style={[styles.pbMeta, { color: colors.mutedForeground }]}>
                PERSONAL BEST · {fmtDate(pb.date)}
              </Text>
              <Text style={[styles.pbValue, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
                {pb.weightKg}kg × {pb.reps}
              </Text>
            </View>
            <Ionicons name="star" size={18} color={colors.accent} />
          </GlassView>
        ) : (
          <GlassView
            colorScheme={resolvedScheme}
            style={[styles.noPb, { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.noPbText, { color: colors.mutedForeground }]}>
              No personal best yet. Log some sets.
            </Text>
          </GlassView>
        )}

        {volumeByDate.length > 1 && (
          <GlassView
            colorScheme={resolvedScheme}
            style={[styles.section, { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>VOLUME OVER TIME</Text>
            <BarChart data={volumeByDate} height={72} />
          </GlassView>
        )}

        {allEntries.length > 0 && (
          <GlassView
            colorScheme={resolvedScheme}
            style={[styles.section, { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT SETS</Text>
            {allEntries.slice(0, 20).map((e) => (
              <View key={e.id} style={[styles.entryRow, { borderBottomColor: colors.separator }]}>
                <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>{fmtDate(e.completedAt)}</Text>
                <Text style={[styles.entrySet, { color: colors.mutedForeground }]}>Set {e.setNumber}</Text>
                <View style={styles.entryRight}>
                  {e.personalBest && <Ionicons name="star" size={10} color={colors.accent} />}
                  <Text style={[styles.entryVal, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
                    {e.weightKg ? `${e.weightKg}kg` : ''}{e.weightKg && e.reps ? ' × ' : ''}{e.reps ?? ''}
                  </Text>
                </View>
              </View>
            ))}
          </GlassView>
        )}

        {!allEntries.length && (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No sets logged yet.</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 20, gap: 10 },
  pbCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20,
  },
  pbMeta: { fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
  pbValue: { fontSize: 28, fontWeight: '300', letterSpacing: -0.5 },
  noPb: { padding: 16 },
  noPbText: { fontSize: 14, textAlign: 'center' },
  section: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, letterSpacing: 2 },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  entryDate: { fontSize: 12, minWidth: 58 },
  entrySet: { fontSize: 11, flex: 1 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryVal: { fontSize: 14, fontWeight: '600', },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontSize: 14, },
});
