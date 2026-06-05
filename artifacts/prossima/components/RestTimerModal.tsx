import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface RestTimerModalProps {
  visible: boolean;
  exerciseName: string;
  totalSeconds: number;
  onDismiss: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function RestTimerModal({
  visible,
  exerciseName,
  totalSeconds,
  onDismiss,
}: RestTimerModalProps) {
  const colors = useColors();
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      cleanup();
      return;
    }

    setRemaining(totalSeconds);
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: totalSeconds * 1000,
      easing: Easing.linear,
    });

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          cleanup();
          onDismiss();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return cleanup;
  }, [visible, totalSeconds]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: 24,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Rest after {exerciseName}
          </Text>

          <Text
            style={[
              styles.timer,
              { color: colors.foreground, fontVariant: ['tabular-nums'] },
            ]}
          >
            {minutes > 0 ? `${minutes}:${pad(seconds)}` : `${seconds}s`}
          </Text>

          <View style={[styles.trackBg, { backgroundColor: colors.muted }]}>
            <Animated.View
              style={[
                styles.trackFill,
                { backgroundColor: colors.primary },
                progressStyle,
              ]}
            />
          </View>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.skipButton,
              {
                borderColor: colors.border,
                borderRadius: 14,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Skip Rest
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  timer: {
    fontSize: 64,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -2,
  },
  trackBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});
