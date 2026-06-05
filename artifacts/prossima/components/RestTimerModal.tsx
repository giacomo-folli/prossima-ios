import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface RestTimerModalProps {
  visible: boolean;
  exerciseName: string;
  totalSeconds: number;
  onDismiss: () => void;
}

export function RestTimerModal({ visible, exerciseName, totalSeconds, onDismiss }: RestTimerModalProps) {
  const colors = useColors();
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  const cleanup = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (!visible) { cleanup(); return; }
    setRemaining(totalSeconds);
    progress.value = 1;
    progress.value = withTiming(0, { duration: totalSeconds * 1000, easing: Easing.linear });
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { cleanup(); onDismiss(); return 0; }
        return r - 1;
      });
    }, 1000);
    return cleanup;
  }, [visible, totalSeconds]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: 20 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Rest · {exerciseName}</Text>
          <Text style={[styles.time, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
            {m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`}
          </Text>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, fillStyle]} />
          </View>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.skipBtn,
              { borderColor: colors.border, borderRadius: 8, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', padding: 28, alignItems: 'center', gap: 16 },
  label: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  time: { fontSize: 64, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: -3, lineHeight: 68 },
  track: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  skipBtn: { paddingHorizontal: 28, paddingVertical: 10, borderWidth: 1 },
  skipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
