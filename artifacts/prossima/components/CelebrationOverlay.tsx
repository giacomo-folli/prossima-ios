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
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const m = Math.floor(durationSeconds / 60);
  const s = durationSeconds % 60;
  const durStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

  useEffect(() => {
    if (visible) {
      scale.value = 0.9;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 18, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 220 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.card, { backgroundColor: colors.cardElevated, borderRadius: 24 }, cardStyle]}>
          <Text style={[styles.sessionLabel, { color: colors.mutedForeground }]}>
            {sessionLabel.toUpperCase()}
          </Text>
          <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
          <Text style={[styles.duration, { color: colors.accent, fontVariant: ['tabular-nums'] }]}>
            {durStr}
          </Text>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.primary, borderRadius: 50, opacity: pressed ? 0.8 : 1 },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', padding: 36, alignItems: 'center', gap: 12 },
  sessionLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 2, marginBottom: 4 },
  message: { fontSize: 28, fontWeight: '300', fontFamily: 'Inter_400Regular', textAlign: 'center', letterSpacing: -0.5, lineHeight: 34 },
  duration: { fontSize: 22, fontWeight: '300', fontFamily: 'Inter_400Regular', marginTop: 4, letterSpacing: -0.3 },
  doneBtn: { marginTop: 20, width: '100%', height: 52, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
