import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
];

interface CelebrationOverlayProps {
  visible: boolean;
  durationSeconds: number;
  sessionLabel: string;
  onDismiss: () => void;
}

export function CelebrationOverlay({
  visible,
  durationSeconds,
  sessionLabel,
  onDismiss,
}: CelebrationOverlayProps) {
  const colors = useColors();
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationStr =
    minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  useEffect(() => {
    if (visible) {
      scale.value = 0.7;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: 28,
            },
            cardStyle,
          ]}
        >
          <View style={[styles.dot, { backgroundColor: colors.success }]} />

          <Text style={[styles.message, { color: colors.foreground }]}>
            {message}
          </Text>

          <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>
            {sessionLabel}
          </Text>

          <Text
            style={[
              styles.duration,
              { color: colors.primary, fontVariant: ['tabular-nums'] },
            ]}
          >
            {durationStr}
          </Text>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.doneButton,
              {
                backgroundColor: colors.primary,
                borderRadius: 14,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.doneText, { color: colors.primaryForeground }]}>
              Done
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  message: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  dayLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  duration: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  doneButton: {
    marginTop: 16,
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
