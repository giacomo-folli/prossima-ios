import React, { useState } from "react";
import {
	Alert,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	Modal,
	KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme, ThemePreference } from "@/context/ThemeContext";
import { useTraining, DEFAULT_YAML } from "@/context/TrainingContext";
import { useHealth } from "@/context/HealthContext";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] =
	[
		{ value: "system", label: "System", icon: "phone-portrait-outline" },
		{ value: "light", label: "Light", icon: "sunny-outline" },
		{ value: "dark", label: "Dark", icon: "moon-outline" },
	];

// Sub-components for Settings Layout
interface SettingSectionProps {
	label?: string;
	children: React.ReactNode;
	footer?: string;
}

const SettingSection: React.FC<SettingSectionProps> = ({
	label,
	children,
	footer,
}) => {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	return (
		<View style={styles.sectionContainer}>
			{label && (
				<Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
					{label}
				</Text>
			)}
			<GlassView
				colorScheme={resolvedScheme}
				style={[
					styles.sectionCard,
					{
						backgroundColor: colors.card,
						borderRadius: colors.radius,
						borderWidth: 1,
						borderColor: colors.border,
					},
				]}
			>
				{children}
			</GlassView>
			{footer && (
				<Text style={[styles.sectionFooter, { color: colors.mutedForeground }]}>
					{footer}
				</Text>
			)}
		</View>
	);
};

interface SettingRowProps {
	icon: keyof typeof Ionicons.glyphMap;
	iconBg: string;
	label: string;
	sublabel?: string;
	rightContent?: React.ReactNode;
	onPress?: () => void;
	isLast?: boolean;
	destructive?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
	icon,
	iconBg,
	label,
	sublabel,
	rightContent,
	onPress,
	isLast,
	destructive,
}) => {
	const colors = useColors();

	const rowContent = (
		<View
			style={[
				styles.rowContainer,
				!isLast && {
					borderBottomColor: colors.separator,
					borderBottomWidth: StyleSheet.hairlineWidth,
				},
			]}
		>
			<View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
				<Ionicons name={icon} size={15} color="#FFFFFF" />
			</View>
			<View style={styles.rowTextContainer}>
				<Text
					style={[
						styles.rowLabel,
						destructive
							? { color: colors.destructive }
							: { color: colors.foreground },
					]}
					numberOfLines={1}
				>
					{label}
				</Text>
				{sublabel && (
					<Text
						style={[styles.rowSublabel, { color: colors.mutedForeground }]}
						numberOfLines={2}
					>
						{sublabel}
					</Text>
				)}
			</View>
			{rightContent ? (
				<View style={styles.rightContentContainer}>{rightContent}</View>
			) : onPress ? (
				<Ionicons
					name="chevron-forward"
					size={14}
					color={colors.mutedForeground}
				/>
			) : null}
		</View>
	);

	if (onPress) {
		return (
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={`${label}${sublabel ? `, ${sublabel}` : ""}`}
				style={({ pressed }) => [
					styles.rowPressable,
					pressed && { backgroundColor: colors.secondary },
				]}
			>
				{rowContent}
			</Pressable>
		);
	}

	return <View style={styles.rowPressable}>{rowContent}</View>;
};

export default function SettingsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { preference, setPreference } = useTheme();
	const { yamlSource, loadPlan, parseError, plan, resetAllData, sessions } =
		useTraining();
	const { isConnected, requestPermissions, disconnect } = useHealth();

	const handleDisconnectHealth = () => {
		Alert.alert(
			"Disconnect Apple Health",
			"Are you sure you want to disconnect? We won't be able to sync your fitness data.",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Disconnect", style: "destructive", onPress: disconnect },
			]
		);
	};

	const [yamlModalVisible, setYamlModalVisible] = useState(false);
	const [yamlDraft, setYamlDraft] = useState(yamlSource);
	const [saving, setSaving] = useState(false);
	const [ok, setOk] = useState(false);

	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

	const isDark = resolvedScheme === "dark";
	const gradientColors = colors.backgroundGradient;

	const handleSave = async () => {
		setSaving(true);
		try {
			await loadPlan(yamlDraft);
			setOk(true);
			setYamlModalVisible(false);
			setTimeout(() => setOk(false), 3000);
		} catch (e: any) {
			Alert.alert("Invalid YAML", e.message);
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () =>
		Alert.alert(
			"Reset All Data",
			`Delete all ${sessions.length} sessions permanently? This cannot be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Reset", style: "destructive", onPress: resetAllData },
			],
		);

	const handleResetYaml = () =>
		Alert.alert(
			"Reset Plan",
			"Replace current plan with default Push Pull Legs?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					onPress: async () => {
						setYamlDraft(DEFAULT_YAML);
						await loadPlan(DEFAULT_YAML);
					},
				},
			],
		);

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingTop: topPad, paddingBottom: botPad + 32 },
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="never"
		>
			<Text style={[styles.screenTitle, { color: colors.foreground }]}>
				Settings
			</Text>

			{ok && (
				<View
					style={[
						styles.toastBanner,
						{
							backgroundColor: colors.success + "20",
							borderColor: colors.success,
						},
					]}
				>
					<Ionicons name="checkmark-circle" size={15} color={colors.success} />
					<Text
						style={[
							styles.toastText,
							{ color: colors.successForeground || colors.foreground },
						]}
					>
						Plan updated successfully
					</Text>
				</View>
			)}

			{/* Appearance Section */}
			<SettingSection label="APPEARANCE">
				<SettingRow
					icon="color-palette"
					iconBg="#A180F4"
					label="App Theme"
					isLast={true}
					rightContent={
						<View
							style={[
								styles.segmentedContainer,
								{ backgroundColor: colors.secondary },
							]}
						>
							{THEME_OPTIONS.map((opt) => {
								const active = preference === opt.value;
								return (
									<Pressable
										key={opt.value}
										onPress={() => setPreference(opt.value)}
										accessibilityRole="radio"
										accessibilityState={{ checked: active }}
										accessibilityLabel={`Switch theme to ${opt.label}`}
										style={({ pressed }) => [
											styles.segmentedButton,
											active && { backgroundColor: colors.primary },
											pressed && !active && { opacity: 0.7 },
										]}
									>
										<Ionicons
											name={opt.icon as any}
											size={12}
											color={
												active
													? colors.primaryForeground
													: colors.mutedForeground
											}
										/>
										<Text
											style={[
												styles.segmentedText,
												{
													color: active
														? colors.primaryForeground
														: colors.mutedForeground,
												},
											]}
										>
											{opt.label}
										</Text>
									</Pressable>
								);
							})}
						</View>
					}
				/>
			</SettingSection>

			{/* Training Plan Section */}
			<SettingSection label="TRAINING PLAN">
				<SettingRow
					icon="fitness"
					iconBg="#007AFF"
					label={plan ? plan.name : "No active plan"}
					sublabel={
						plan
							? `${plan.days.length} days · ${plan.days.reduce((a, d) => a + d.exercises.length, 0)} exercises`
							: "Configure a plan to start training"
					}
					isLast={false}
				/>
				<SettingRow
					icon="code-slash"
					iconBg="#30B0C7"
					label="Edit Plan YAML"
					onPress={() => {
						setYamlDraft(yamlSource);
						setYamlModalVisible(true);
					}}
					isLast={false}
				/>
				<SettingRow
					icon="refresh"
					iconBg="#FF9500"
					label="Reset to Default Plan"
					onPress={handleResetYaml}
					isLast={true}
				/>
			</SettingSection>

			{/* Integrations Section */}
			<SettingSection label="INTEGRATIONS">
				<SettingRow
					icon="heart"
					iconBg="#FF2D55"
					label="Apple Health"
					sublabel={
						isConnected
							? "Connected"
							: "Sync calories, steps, and activity"
					}
					isLast={true}
					rightContent={
						isConnected ? (
							<Text style={{ color: colors.success, fontSize: 14, fontWeight: "500" }}>
								Connected
							</Text>
						) : undefined
					}
					onPress={isConnected ? handleDisconnectHealth : requestPermissions}
				/>
			</SettingSection>

			{/* History Section */}
			<SettingSection label="HISTORY & STATS">
				<SettingRow
					icon="calendar"
					iconBg="#34C759"
					label="Total Sessions Logged"
					isLast={true}
					rightContent={
						<Text style={[styles.statsValue, { color: colors.foreground }]}>
							{sessions.length}
						</Text>
					}
				/>
			</SettingSection>

			{/* About Section */}
			<SettingSection label="ABOUT">
				<SettingRow
					icon="information-circle"
					iconBg="#8E8E93"
					label="App Version"
					isLast={false}
					rightContent={
						<Text style={[styles.infoValue, { color: colors.mutedForeground }]}>
							1.0.0
						</Text>
					}
				/>
				<SettingRow
					icon="leaf"
					iconBg="#52D171"
					label="Philosophy"
					isLast={true}
					rightContent={
						<Text style={[styles.infoValue, { color: colors.mutedForeground }]}>
							Less is more
						</Text>
					}
				/>
			</SettingSection>

			{/* Danger Zone Section */}
			<SettingSection
				label="DANGER ZONE"
				footer="This will permanently delete all session data. This action is irreversible."
			>
				<SettingRow
					icon="trash-outline"
					iconBg="#FF3B30"
					label="Reset All Session Data"
					destructive={true}
					onPress={handleReset}
					isLast={true}
				/>
			</SettingSection>

			{/* YAML Editor Modal */}
			<Modal
				visible={yamlModalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setYamlModalVisible(false)}
			>
				<LinearGradient colors={gradientColors} style={styles.modalRoot}>
					<View
						style={[
							styles.modalHeader,
							{ borderBottomColor: colors.separator },
						]}
					>
						<Pressable
							onPress={() => setYamlModalVisible(false)}
							accessibilityRole="button"
							accessibilityLabel="Cancel"
							style={styles.modalHeaderBtn}
						>
							<Text
								style={[
									styles.modalHeaderBtnText,
									{ color: colors.mutedForeground },
								]}
							>
								Cancel
							</Text>
						</Pressable>
						<Text style={[styles.modalTitle, { color: colors.foreground }]}>
							Edit YAML Plan
						</Text>
						<Pressable
							onPress={handleSave}
							disabled={saving}
							accessibilityRole="button"
							accessibilityLabel="Apply"
							style={styles.modalHeaderBtn}
						>
							<Text
								style={[
									styles.modalHeaderBtnText,
									{ color: colors.primary, fontWeight: "600" },
								]}
							>
								{saving ? "Applying..." : "Apply"}
							</Text>
						</Pressable>
					</View>

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						style={{ flex: 1 }}
					>
						<ScrollView
							style={{ flex: 1 }}
							contentContainerStyle={styles.modalScrollContent}
							keyboardShouldPersistTaps="handled"
							contentInsetAdjustmentBehavior="never"
						>
							<Text
								style={[
									styles.modalHelpText,
									{ color: colors.mutedForeground },
								]}
							>
								Define your days, exercises, sets, reps, rest timers, muscles,
								and notes in YAML format.
							</Text>

							{parseError && (
								<View
									style={[
										styles.modalErrorBanner,
										{
											backgroundColor: colors.destructive + "14",
											borderColor: colors.destructive,
										},
									]}
								>
									<Ionicons
										name="warning-outline"
										size={16}
										color={colors.destructive}
									/>
									<Text
										style={[
											styles.modalErrorText,
											{ color: colors.destructive },
										]}
									>
										{parseError}
									</Text>
								</View>
							)}

							<TextInput
								style={[
									styles.yamlTextInput,
									{
										color: colors.foreground,
										backgroundColor: colors.card,
										borderColor: parseError
											? colors.destructive
											: colors.border,
										borderRadius: colors.radius,
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
						</ScrollView>
					</KeyboardAvoidingView>
				</LinearGradient>
			</Modal>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: 20, gap: 16 },
	screenTitle: {
		fontSize: 36,
		fontWeight: "300",
		letterSpacing: -0.5,
		marginBottom: 4,
	},

	toastBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 8,
	},
	toastText: {
		fontSize: 14,
	},

	// SettingSection styles
	sectionContainer: {
		gap: 8,
	},
	sectionLabel: {
		fontSize: 10,
		letterSpacing: 2,
		paddingLeft: 4,
	},
	sectionFooter: {
		fontSize: 12,
		paddingLeft: 4,
		marginTop: 4,
		lineHeight: 16,
	},
	sectionCard: {
		overflow: "hidden",
	},

	// SettingRow styles
	rowPressable: {
		minHeight: 48,
		justifyContent: "center",
	},
	rowContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		flex: 1,
	},
	iconContainer: {
		width: 28,
		height: 28,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	rowTextContainer: {
		flex: 1,
		justifyContent: "center",
		marginRight: 8,
	},
	rowLabel: {
		fontSize: 15,
	},
	rowSublabel: {
		fontSize: 12,
		marginTop: 2,
	},
	rightContentContainer: {
		justifyContent: "center",
	},

	// Segmented picker styles
	segmentedContainer: {
		flexDirection: "row",
		padding: 2,
		borderRadius: 30,
		alignItems: "center",
	},
	segmentedButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 30,
		gap: 4,
	},
	segmentedText: {
		fontSize: 11,
	},

	statsValue: {
		fontSize: 15,
	},
	infoValue: {
		fontSize: 14,
	},

	// Modal styles
	modalRoot: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	modalHeaderBtn: {
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	modalHeaderBtnText: {
		fontSize: 16,
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: "600",
	},
	modalScrollContent: {
		padding: 20,
		gap: 16,
	},
	modalHelpText: {
		fontSize: 13,
		lineHeight: 18,
	},
	modalErrorBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
	},
	modalErrorText: {
		fontSize: 13,
		flex: 1,
	},
	yamlTextInput: {
		padding: 16,
		fontSize: 13,
		lineHeight: 20,
		minHeight: 320,
		borderWidth: 1,
		textAlignVertical: "top",
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
});
