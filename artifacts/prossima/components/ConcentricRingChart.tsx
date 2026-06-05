import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ConcentricRingChartProps {
  stepsProgress: number; // 0 to 1
  calProgress: number;   // 0 to 1
  activeProgress: number;// 0 to 1
  stepsValue: string;
  stepsGoal: string;
  calValue: string;
  calGoal: string;
  activeValue: string;
  activeGoal: string;
  size?: number;
}

export function ConcentricRingChart({
  stepsProgress,
  calProgress,
  activeProgress,
  stepsValue,
  stepsGoal,
  calValue,
  calGoal,
  activeValue,
  activeGoal,
  size = 240,
}: ConcentricRingChartProps) {
  const colors = useColors();

  // Color schemes for rings
  const ringTeal = '#00B4D8';
  const ringOrange = '#FF6B00';
  const ringGreen = '#10B981';

  const trackTeal = 'rgba(0, 180, 216, 0.12)';
  const trackOrange = 'rgba(255, 107, 0, 0.12)';
  const trackGreen = 'rgba(16, 185, 129, 0.12)';

  const strokeWidth = 12;
  const spacing = 5;
  const center = size / 2;

  // Calculate radiuses
  const rTeal = (size - strokeWidth) / 2 - 2; // outermost
  const rOrange = rTeal - strokeWidth - spacing; // middle
  const rGreen = rOrange - strokeWidth - spacing; // innermost

  // Circumferences
  const cTeal = 2 * Math.PI * rTeal;
  const cOrange = 2 * Math.PI * rOrange;
  const cGreen = 2 * Math.PI * rGreen;

  // Dash Offsets
  const offsetTeal = cTeal * (1 - Math.min(Math.max(stepsProgress, 0), 1));
  const offsetOrange = cOrange * (1 - Math.min(Math.max(calProgress, 0), 1));
  const offsetGreen = cGreen * (1 - Math.min(Math.max(activeProgress, 0), 1));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Teal Ring Track and Progress */}
        <Circle cx={center} cy={center} r={rTeal} stroke={trackTeal} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={rTeal}
          stroke={ringTeal}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${cTeal} ${cTeal}`}
          strokeDashoffset={offsetTeal}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />

        {/* Orange Ring Track and Progress */}
        <Circle cx={center} cy={center} r={rOrange} stroke={trackOrange} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={rOrange}
          stroke={ringOrange}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${cOrange} ${cOrange}`}
          strokeDashoffset={offsetOrange}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />

        {/* Green Ring Track and Progress */}
        <Circle cx={center} cy={center} r={rGreen} stroke={trackGreen} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={rGreen}
          stroke={ringGreen}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${cGreen} ${cGreen}`}
          strokeDashoffset={offsetGreen}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Central Labels */}
      <View style={[StyleSheet.absoluteFill, styles.centerArea]}>
        <Text style={[styles.stepsTitle, { color: '#0084A3' }]}>Steps:</Text>
        <View style={styles.stepsRow}>
          <Text style={[styles.stepsValueText, { color: colors.foreground }]}>{stepsValue}</Text>
          <Text style={[styles.stepsGoalText, { color: colors.mutedForeground }]}>/{stepsGoal}</Text>
        </View>

        <Text style={[styles.calText, { color: colors.foreground }]}>
          <Ionicons name="flame" size={13} color={ringOrange} />
          {' '}Cal: <Text style={styles.boldVal}>{calValue}</Text>
          <Text style={{ color: colors.mutedForeground }}>/{calGoal}</Text>
        </Text>

        <Text style={[styles.activeText, { color: colors.foreground }]}>
          <Ionicons name="time" size={13} color={ringGreen} />
          {' '}Active: <Text style={styles.boldVal}>{activeValue}</Text>
          <Text style={{ color: colors.mutedForeground }}>/{activeGoal}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerArea: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    gap: 2,
  },
  stepsTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  stepsValueText: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  stepsGoalText: {
    fontSize: 12,
  },
  calText: {
    fontSize: 12.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeText: {
    fontSize: 12.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  boldVal: {
  },
});
