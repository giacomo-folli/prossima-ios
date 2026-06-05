import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  showLabels?: boolean;
}

export function BarChart({ data, height = 80, showLabels = true }: BarChartProps) {
  const colors = useColors();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height }]}>
        {data.map((item, i) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * height : 0;
          const isHighest = item.value === maxValue && item.value > 0;
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={[styles.barTrack, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: isHighest ? colors.primary : colors.primary + '55',
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>
              {showLabels && (
                <Text
                  style={[
                    styles.barLabel,
                    {
                      color: colors.mutedForeground,
                    },
                  ]}
                  numberOfLines={1}
                >
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
  container: {
    width: '100%',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
