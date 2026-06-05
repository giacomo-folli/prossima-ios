import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  showLabels?: boolean;
}

export function BarChart({ data, height = 72, showLabels = true }: BarChartProps) {
  const colors = useColors();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height }]}>
        {data.map((item, i) => {
          const barH = maxValue > 0 ? (item.value / maxValue) * height : 0;
          const isTop = item.value === maxValue && item.value > 0;
          return (
            <View key={i} style={styles.barWrap}>
              <View style={[styles.track, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barH, item.value > 0 ? 3 : 0),
                      backgroundColor: isTop ? colors.accent : colors.border,
                      borderRadius: 6,
                    },
                  ]}
                />
              </View>
              {showLabels && (
                <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barWrap: { flex: 1, alignItems: 'center', gap: 6 },
  track: { width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  label: { fontSize: 9, textAlign: 'center', letterSpacing: 0.2 },
});
