import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  visible, exerciseName, plannedReps, setNumber,
  previousWeight, previousReps, personalBest, onLog, onClose,
}: SetLogModalProps) {
  const colors = useColors();
  const [weight, setWeight] = useState(previousWeight ? String(previousWeight) : '');
  const [reps, setReps] = useState(previousReps ? String(previousReps) : '');

  const handleOpen = () => {
    setWeight(previousWeight ? String(previousWeight) : '');
    setReps(previousReps ? String(previousReps) : '');
  };

  const handleLog = () => {
    const r = parseInt(reps) || 0;
    if (r <= 0) return;
    onLog(parseFloat(weight) || 0, r);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={handleOpen}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.cardElevated }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHead}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{exerciseName}</Text>
                <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                  Set {setNumber} · {plannedReps} reps planned
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {personalBest && (
              <View style={[styles.pbBanner, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
                <Ionicons name="star" size={12} color={colors.accent} />
                <Text style={[styles.pbBannerText, { color: colors.mutedForeground, fontVariant: ['tabular-nums'] }]}>
                  PB: {personalBest.weightKg}kg × {personalBest.reps}
                </Text>
              </View>
            )}

            <View style={styles.inputs}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>KG</Text>
                <TextInput
                  style={[
                    styles.numInput,
                    { color: colors.foreground, backgroundColor: colors.secondary, borderRadius: 14 },
                  ]}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>REPS</Text>
                <TextInput
                  style={[
                    styles.numInput,
                    { color: colors.foreground, backgroundColor: colors.secondary, borderRadius: 14 },
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
                styles.logBtn,
                { backgroundColor: colors.primary, borderRadius: 50, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.logBtnText, { color: colors.primaryForeground }]}>Log Set</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 40 },
  handle: { width: 32, height: 3, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, marginTop: 2 },
  pbBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, marginBottom: 16 },
  pbBannerText: { fontSize: 13, },
  inputs: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  inputGroup: { flex: 1, alignItems: 'center', gap: 8 },
  inputLabel: { fontSize: 10, letterSpacing: 2 },
  numInput: {
    width: '100%', height: 80, fontSize: 38, textAlign: 'center', fontVariant: ['tabular-nums'], letterSpacing: -1,
  },
  divider: { width: 1, height: 80, marginHorizontal: 10 },
  logBtn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  logBtnText: { fontSize: 16, fontWeight: '600', },
});
