import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface RingChartProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label: string;
  value: string;
  sublabel?: string;
}

export function RingChart({
  progress,
  size = 80,
  strokeWidth = 6,
  color,
  trackColor,
  label,
  value,
  sublabel,
}: RingChartProps) {
  const colors = useColors();
  const c = color ?? colors.accent;
  const t = trackColor ?? colors.border;

  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const dashOffset = circumference * (1 - clampedProgress);
  const center = size / 2;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={center} cy={center} r={r} stroke={t} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={center} cy={center} r={r}
            stroke={c} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.value, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
            {value}
          </Text>
          {sublabel ? (
            <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '600', lineHeight: 18 },
  sublabel: { fontSize: 9, marginTop: 1 },
  label: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
});
