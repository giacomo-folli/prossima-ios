import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTraining, DEFAULT_YAML } from '@/context/TrainingContext';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { yamlSource, loadPlan, parseError, plan, resetAllData, sessions } = useTraining();

  const [editingYaml, setEditingYaml] = useState(false);
  const [yamlDraft, setYamlDraft] = useState(yamlSource);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleSaveYaml = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await loadPlan(yamlDraft);
      setSaveSuccess(true);
      setEditingYaml(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      Alert.alert('Invalid YAML', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      `This will delete all ${sessions.length} sessions permanently. The training plan will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetAllData(),
        },
      ]
    );
  };

  const handleResetYaml = () => {
    Alert.alert('Reset Plan', 'Replace with the default Push Pull Legs plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          setYamlDraft(DEFAULT_YAML);
          await loadPlan(DEFAULT_YAML);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding + 16,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 32,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>
        Settings
      </Text>

      <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <View style={styles.groupHeader}>
          <Text style={[styles.groupTitle, { color: colors.foreground }]}>
            Training Plan
          </Text>
          {plan && (
            <Text style={[styles.planName, { color: colors.mutedForeground }]}>
              {plan.name}
            </Text>
          )}
        </View>

        {plan && (
          <View style={styles.planMeta}>
            <Text style={[styles.planMetaText, { color: colors.mutedForeground }]}>
              {plan.days.length} days · {plan.days.reduce((a, d) => a + d.exercises.length, 0)} exercises
            </Text>
          </View>
        )}

        {parseError && !editingYaml && (
          <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '18' }]}>
            <Ionicons name="warning" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={2}>
              {parseError}
            </Text>
          </View>
        )}

        {saveSuccess && (
          <View style={[styles.successBanner, { backgroundColor: colors.success + '18' }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>
              Plan updated successfully
            </Text>
          </View>
        )}

        {editingYaml ? (
          <View>
            <TextInput
              style={[
                styles.yamlEditor,
                {
                  color: colors.foreground,
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  borderColor: parseError ? colors.destructive : colors.border,
                  fontVariant: ['tabular-nums'],
                },
              ]}
              value={yamlDraft}
              onChangeText={setYamlDraft}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="Paste your YAML plan here..."
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.editorButtons}>
              <Pressable
                onPress={() => {
                  setEditingYaml(false);
                  setYamlDraft(yamlSource);
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: 12,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveYaml}
                disabled={saving}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    opacity: pressed || saving ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  {saving ? 'Saving...' : 'Apply Plan'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.planActions}>
            <Pressable
              onPress={() => {
                setYamlDraft(yamlSource);
                setEditingYaml(true);
              }}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="code-slash" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>
                Edit YAML Plan
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={handleResetYaml}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="refresh" size={16} color={colors.mutedForeground} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>
                Reset to Default Plan
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <Text style={[styles.groupTitle, { color: colors.foreground }]}>
          About
        </Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>App</Text>
          <Text style={[styles.infoVal, { color: colors.foreground }]}>Prossima</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>Sessions logged</Text>
          <Text style={[styles.infoVal, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
            {sessions.length}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>Philosophy</Text>
          <Text style={[styles.infoVal, { color: colors.foreground }]}>Less is more</Text>
        </View>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <Text style={[styles.groupTitle, { color: colors.destructive }]}>
          Danger Zone
        </Text>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.actionRow,
            {
              backgroundColor: colors.destructive + '18',
              borderRadius: 12,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          <Text style={[styles.actionText, { color: colors.destructive }]}>
            Reset All Session Data
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  group: {
    padding: 16,
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  planName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  planMeta: {},
  planMetaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  successText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  yamlEditor: {
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 280,
    borderWidth: 1,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  editorButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  planActions: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoKey: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  infoVal: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
