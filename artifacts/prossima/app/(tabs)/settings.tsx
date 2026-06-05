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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTheme, ThemePreference } from '@/context/ThemeContext';
import { useTraining, DEFAULT_YAML } from '@/context/TrainingContext';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useTheme();
  const { yamlSource, loadPlan, parseError, plan, resetAllData, sessions } = useTraining();

  const [editingYaml, setEditingYaml] = useState(false);
  const [yamlDraft, setYamlDraft] = useState(yamlSource);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const isDark = resolvedScheme === 'dark';
  const gradientColors: [string, string, string] = isDark
    ? ['#111811', '#162016', '#111811']
    : ['#B8D4B0', '#C4D9BC', '#CCE0C4'];

  const handleSave = async () => {
    setSaving(true);
    try {
      await loadPlan(yamlDraft);
      setOk(true);
      setEditingYaml(false);
      setTimeout(() => setOk(false), 3000);
    } catch (e: any) {
      Alert.alert('Invalid YAML', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () =>
    Alert.alert('Reset All Data', `Delete all ${sessions.length} sessions permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAllData },
    ]);

  const handleResetYaml = () =>
    Alert.alert('Reset Plan', 'Replace with default Push Pull Legs?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: async () => { setYamlDraft(DEFAULT_YAML); await loadPlan(DEFAULT_YAML); } },
    ]);

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 28, paddingBottom: botPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Settings</Text>

        {/* Appearance */}
        <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
          <View style={[styles.segmentRow, { backgroundColor: colors.secondary, borderRadius: 50 }]}>
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setPreference(opt.value)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderRadius: 50,
                      opacity: pressed && !active ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={13}
                    color={active ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Training Plan */}
        <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={styles.groupHead}>
            <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>TRAINING PLAN</Text>
            {plan && (
              <Text style={[styles.planName, { color: colors.foreground }]} numberOfLines={1}>
                {plan.name}
              </Text>
            )}
          </View>
          {plan && (
            <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>
              {plan.days.length} days · {plan.days.reduce((a, d) => a + d.exercises.length, 0)} exercises
            </Text>
          )}

          {parseError && !editingYaml && (
            <View style={[styles.banner, { backgroundColor: colors.destructive + '18' }]}>
              <Ionicons name="warning-outline" size={13} color={colors.destructive} />
              <Text style={[styles.bannerText, { color: colors.destructive }]} numberOfLines={2}>{parseError}</Text>
            </View>
          )}
          {ok && (
            <View style={[styles.banner, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
              <Text style={[styles.bannerText, { color: colors.accent }]}>Plan updated</Text>
            </View>
          )}

          {editingYaml ? (
            <View>
              <TextInput
                style={[
                  styles.yamlInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    borderColor: parseError ? colors.destructive : colors.border,
                  },
                ]}
                value={yamlDraft}
                onChangeText={setYamlDraft}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholderTextColor={colors.mutedForeground}
              />
              <View style={styles.rowBtns}>
                <Pressable
                  onPress={() => { setEditingYaml(false); setYamlDraft(yamlSource); }}
                  style={({ pressed }) => [
                    styles.secBtn,
                    { borderColor: colors.border, borderRadius: 50, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.secBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.primBtn,
                    { backgroundColor: colors.primary, borderRadius: 50, opacity: pressed || saving ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.primBtnText, { color: colors.primaryForeground }]}>
                    {saving ? 'Applying...' : 'Apply Plan'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <Pressable
                onPress={() => { setYamlDraft(yamlSource); setEditingYaml(true); }}
                style={({ pressed }) => [
                  styles.actionRow,
                  { backgroundColor: colors.secondary, borderRadius: 50, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="code-slash" size={15} color={colors.accent} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Edit YAML Plan</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={handleResetYaml}
                style={({ pressed }) => [
                  styles.actionRow,
                  { backgroundColor: colors.secondary, borderRadius: 50, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={15} color={colors.mutedForeground} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Reset to Default Plan</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* About */}
        <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
          {[['App', 'Prossima'], ['Sessions logged', String(sessions.length)], ['Philosophy', 'Less is more']].map(([k, v]) => (
            <View key={k} style={[styles.infoRow, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>{k}</Text>
              <Text style={[styles.infoVal, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Danger */}
        <View style={[styles.group, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={[styles.groupLabel, { color: colors.destructive }]}>DANGER ZONE</Text>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.actionRow,
              { backgroundColor: colors.destructive + '14', borderRadius: 50, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={15} color={colors.destructive} />
            <Text style={[styles.actionText, { color: colors.destructive }]}>Reset All Session Data</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  screenTitle: { fontSize: 36, fontWeight: '300', fontFamily: 'Inter_400Regular', letterSpacing: -0.5, marginBottom: 8 },
  group: { padding: 16, gap: 12 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 2 },
  planName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', maxWidth: '60%' },
  planMeta: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: -4 },
  segmentRow: { flexDirection: 'row', padding: 4, gap: 2 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  segmentText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10 },
  bannerText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  yamlInput: {
    padding: 12, fontSize: 12, lineHeight: 18, minHeight: 260,
    borderWidth: 1, textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  secBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  primBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  primBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  actionText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  infoKey: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  infoVal: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
