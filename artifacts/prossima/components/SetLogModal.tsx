import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { PersonalBest } from '@/context/TrainingContext';

interface SetLogModalProps {
  visible: boolean;
  exerciseName: string;
  plannedReps: string;
  restSeconds: number;
  setNumber: number;
  previousWeight?: number;
  previousReps?: number;
  personalBest?: PersonalBest | null;
  onLog: (weightKg: number, reps: number) => void;
  onClose: () => void;
}

export function SetLogModal({
  visible,
  exerciseName,
  plannedReps,
  restSeconds,
  setNumber,
  previousWeight,
  previousReps,
  personalBest,
  onLog,
  onClose,
}: SetLogModalProps) {
  const colors = useColors();
  const [weight, setWeight] = useState(previousWeight ? String(previousWeight) : '');
  const [reps, setReps] = useState(previousReps ? String(previousReps) : '');

  const handleLog = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    if (r <= 0) return;
    onLog(w, r);
    onClose();
  };

  const handleOpen = () => {
    setWeight(previousWeight ? String(previousWeight) : '');
    setReps(previousReps ? String(previousReps) : '');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.title, { color: colors.foreground }]}>
              {exerciseName}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Set {setNumber} · Planned: {plannedReps}
            </Text>

            {personalBest && (
              <View style={[styles.pbRow, { backgroundColor: colors.warning + '18' }]}>
                <Text style={[styles.pbText, { color: colors.warning }]}>
                  Best: {personalBest.weightKg}kg × {personalBest.reps} reps
                </Text>
              </View>
            )}

            <View style={styles.inputs}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Weight (kg)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.muted,
                      borderRadius: 12,
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Reps
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.muted,
                      borderRadius: 12,
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                  keyboardType="number-pad"
                  value={reps}
                  onChangeText={setReps}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="done"
                  onSubmitEditing={handleLog}
                />
              </View>
            </View>

            <Pressable
              onPress={handleLog}
              style={({ pressed }) => [
                styles.logButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.logButtonText, { color: colors.primaryForeground }]}>
                Log Set
              </Text>
            </Pressable>

            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  pbRow: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  pbText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    fontVariant: ['tabular-nums'],
  },
  inputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  logButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logButtonText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
