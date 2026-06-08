/**
 * ReadinessWidget — the hero card on the Home screen.
 *
 * Displays a large animated arc gauge showing the Readiness Score (0–100),
 * four pillar indicator dots, and a contextual label. Designed to replace
 * the concentric activity rings as the primary visual focus on the home screen.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ReadinessBreakdown } from '@/context/ReadinessEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReadinessWidgetProps {
  readiness: ReadinessBreakdown | null;
  isConnected: boolean;
  onConnectPress?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToColor(score: number, level: 0 | 1 | 2 | 3): { start: string; end: string } {
  switch (level) {
    case 3: return { start: '#34D399', end: '#10B981' }; // green
    case 2: return { start: '#FCD34D', end: '#F59E0B' }; // amber
    case 1: return { start: '#F87171', end: '#EF4444' }; // red
    default: return { start: '#94A3B8', end: '#64748B' }; // grey / no data
  }
}

// ─── Arc Gauge ─────────────────────────────────────────────────────────────────

interface ArcGaugeProps {
  score: number;
  level: 0 | 1 | 2 | 3;
  size: number;
}

function ArcGauge({ score, level, size }: ArcGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc goes from 225° to 315° (270° sweep, opening at the bottom)
  const startAngle = 225;
  const totalDegrees = 270;
  const clampedScore = Math.max(0, Math.min(100, score));
  const progressDegrees = (clampedScore / 100) * totalDegrees;

  function polarToCartesian(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function arcPath(fromDeg: number, toDeg: number) {
    const start = polarToCartesian(fromDeg);
    const end = polarToCartesian(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const trackPath = arcPath(startAngle, startAngle + totalDegrees);
  const progressPath =
    progressDegrees > 0
      ? arcPath(startAngle, startAngle + progressDegrees)
      : null;

  const colors = scoreToColor(score, level);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.start} />
          <Stop offset="1" stopColor={colors.end} />
        </LinearGradient>
      </Defs>
      {/* Track */}
      <Path
        d={trackPath}
        fill="none"
        stroke="rgba(148,163,184,0.2)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Progress */}
      {progressPath && (
        <Path
          d={progressPath}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

// ─── Pillar Dot ──────────────────────────────────────────────────────────────

interface PillarDotProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  weight: string;
}

function PillarDot({ icon, label, score, weight }: PillarDotProps) {
  const colors = useColors();
  const dotColor =
    score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : score >= 30 ? '#EF4444' : '#64748B';

  return (
    <View style={styles.pillarDot}>
      <View style={[styles.pillarIconRing, { borderColor: dotColor + '60', backgroundColor: dotColor + '15' }]}>
        {icon}
      </View>
      <Text style={[styles.pillarLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.pillarWeight, { color: dotColor }]}>{weight}</Text>
    </View>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export function ReadinessWidget({
  readiness,
  isConnected,
  onConnectPress,
}: ReadinessWidgetProps) {
  const colors = useColors();
  const { resolvedScheme } = useTheme();

  // Animated score counter
  const animatedScore = useRef(new Animated.Value(0)).current;
  const displayScore = useRef(0);

  useEffect(() => {
    const target = readiness?.hasData ? readiness.score : 0;
    Animated.timing(animatedScore, {
      toValue: target,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [readiness?.score]);

  if (!isConnected) {
    return (
      <Pressable onPress={onConnectPress}>
        <GlassView
          colorScheme={resolvedScheme}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              alignItems: 'center',
              paddingVertical: 28,
            },
          ]}
        >
          <View style={[styles.pillarIconRing, { borderColor: '#94A3B8', width: 48, height: 48, borderRadius: 24, marginBottom: 12 }]}>
            <Ionicons name="heart-outline" size={22} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.noDataTitle, { color: colors.foreground }]}>
            Connect Apple Health
          </Text>
          <Text style={[styles.noDataSub, { color: colors.mutedForeground }]}>
            Tap to unlock your Readiness Score
          </Text>
        </GlassView>
      </Pressable>
    );
  }

  const score = readiness?.score ?? 0;
  const level = readiness?.level ?? 0;
  const label = readiness?.label ?? 'Calculating...';
  const hasData = readiness?.hasData ?? false;
  const gaugeColors = scoreToColor(score, level);

  return (
    <GlassView
      colorScheme={resolvedScheme}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.readinessBadge, { backgroundColor: gaugeColors.end + '20' }]}>
          <Ionicons name="flash" size={12} color={gaugeColors.end} />
          <Text style={[styles.readinessBadgeText, { color: gaugeColors.end }]}>
            READINESS
          </Text>
        </View>
        {readiness?.hasData && (
          <Text style={[styles.scoreSubLabel, { color: colors.mutedForeground }]}>
            Today
          </Text>
        )}
      </View>

      {/* Gauge + Score */}
      <View style={styles.gaugeContainer}>
        <ArcGauge score={score} level={level} size={180} />
        <View style={styles.gaugeCenterContent}>
          <Animated.Text
            style={[styles.scoreNumber, { color: hasData ? gaugeColors.end : colors.mutedForeground }]}
          >
            {hasData
              ? animatedScore.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0', '100'],
                  extrapolate: 'clamp',
                })
              : '—'}
          </Animated.Text>
          {hasData && (
            <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}>
              / 100
            </Text>
          )}
        </View>
      </View>

      {/* Status label */}
      <Text style={[styles.statusLabel, { color: colors.foreground }]}>
        {hasData ? label : 'Connect Apple Health for your score'}
      </Text>

      {/* Pillar breakdown */}
      {hasData && (
        <View style={[styles.pillarsRow, { borderTopColor: colors.separator }]}>
          <PillarDot
            icon={<MaterialCommunityIcons name="pulse" size={14} color="#10B981" />}
            label="HRV"
            score={readiness?.hrv ?? 50}
            weight="35%"
          />
          <View style={[styles.pillarDivider, { backgroundColor: colors.separator }]} />
          <PillarDot
            icon={<Ionicons name="moon" size={14} color="#5856D6" />}
            label="Sleep"
            score={readiness?.sleep ?? 50}
            weight="25%"
          />
          <View style={[styles.pillarDivider, { backgroundColor: colors.separator }]} />
          <PillarDot
            icon={<Ionicons name="heart" size={14} color="#FF3B30" />}
            label="HR"
            score={readiness?.rhr ?? 50}
            weight="20%"
          />
          <View style={[styles.pillarDivider, { backgroundColor: colors.separator }]} />
          <PillarDot
            icon={<MaterialCommunityIcons name="dumbbell" size={14} color="#00B4D8" />}
            label="Load"
            score={readiness?.load ?? 50}
            weight="20%"
          />
        </View>
      )}

      {/* Coach's Note */}
      {hasData && readiness?.prompt && (
        <View style={[styles.coachNote, { backgroundColor: colors.background + '80' }]}>
          <MaterialCommunityIcons name="whistle" size={16} color={gaugeColors.end} />
          <Text style={[styles.coachNoteText, { color: colors.foreground }]}>
            {readiness.prompt}
          </Text>
        </View>
      )}
    </GlassView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  readinessBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scoreSubLabel: {
    fontSize: 12,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  gaugeCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 2,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: 58,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  pillarsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 12,
  },
  pillarDot: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pillarIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pillarWeight: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillarDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 4,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noDataSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  coachNote: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  coachNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
