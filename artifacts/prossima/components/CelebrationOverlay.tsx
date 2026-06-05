import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

const MESSAGES = [
  'Session complete.',
  'Work done.',
  'Showing up is everything.',
  'Another one.',
  'You did the thing.',
  'Consistent.',
  'That counts.',
  'Good session.',
  'Progress.',
];

interface Props {
  visible: boolean;
  durationSeconds: number;
  sessionLabel: string;
  onDismiss: () => void;
}

export function CelebrationOverlay({ visible, durationSeconds, sessionLabel, onDismiss }: Props) {
  const colors = useColors();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const m = Math.floor(durationSeconds / 60);
  const s = durationSeconds % 60;
  const durStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

  useEffect(() => {
    if (visible) {
      scale.value = 0.8;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 16, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 180 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderRadius: 20 }, cardStyle]}>
          <View style={[styles.accent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
          <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>{sessionLabel}</Text>
          <Text style={[styles.duration, { color: colors.primary, fontVariant: ['tabular-nums'] }]}>{durStr}</Text>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', overflow: 'hidden', padding: 32, alignItems: 'center', gap: 10 },
  accent: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  message: { fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.8, lineHeight: 34 },
  dayLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  duration: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 4, letterSpacing: -0.5 },
  doneBtn: { marginTop: 16, width: '100%', height: 52, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
