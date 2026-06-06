import React, { useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "@/context/ThemeContext";

// Validation constants
const STEPS_LIMITS = { min: 1000, max: 100000, step: 1000 };
const CALORIES_LIMITS = { min: 50, max: 5000, step: 50 };
const TIME_LIMITS = { min: 5, max: 720, step: 5 };

export default function EditGoalsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const {
		stepsGoal,
		setStepsGoal,
		caloriesGoal,
		setCaloriesGoal,
		activityTimeGoal,
		setActivityTimeGoal,
	} = useProfile();

	const [draftSteps, setDraftSteps] = useState(String(stepsGoal));
	const [draftCalories, setDraftCalories] = useState(String(caloriesGoal));
	const [draftTime, setDraftTime] = useState(String(activityTimeGoal));

	// Validation helpers
	const getStepsError = () => {
		const val = Number(draftSteps);
		if (isNaN(val) || val < STEPS_LIMITS.min || val > STEPS_LIMITS.max) {
			return `Steps goal must be between ${STEPS_LIMITS.min.toLocaleString()} and ${STEPS_LIMITS.max.toLocaleString()}`;
		}
		return null;
	};

	const getCaloriesError = () => {
		const val = Number(draftCalories);
		if (isNaN(val) || val < CALORIES_LIMITS.min || val > CALORIES_LIMITS.max) {
			return `Calories goal must be between ${CALORIES_LIMITS.min} and ${CALORIES_LIMITS.max} kcal`;
		}
		return null;
	};

	const getTimeError = () => {
		const val = Number(draftTime);
		if (isNaN(val) || val < TIME_LIMITS.min || val > TIME_LIMITS.max) {
			return `Activity time must be between ${TIME_LIMITS.min} and ${TIME_LIMITS.max} minutes`;
		}
		return null;
	};

	const hasErrors = getStepsError() || getCaloriesError() || getTimeError();

	const handleSave = async () => {
		if (hasErrors) {
			Alert.alert("Invalid Goals", "Please correct the invalid values before saving.");
			return;
		}

		await Promise.all([
			setStepsGoal(Number(draftSteps)),
			setCaloriesGoal(Number(draftCalories)),
			setActivityTimeGoal(Number(draftTime)),
		]);

		router.back();
	};

	// Adjusters
	const adjustSteps = (amount: number) => {
		const current = isNaN(Number(draftSteps)) ? stepsGoal : Number(draftSteps);
		const next = Math.max(
			STEPS_LIMITS.min,
			Math.min(STEPS_LIMITS.max, current + amount)
		);
		setDraftSteps(String(next));
	};

	const adjustCalories = (amount: number) => {
		const current = isNaN(Number(draftCalories)) ? caloriesGoal : Number(draftCalories);
		const next = Math.max(
			CALORIES_LIMITS.min,
			Math.min(CALORIES_LIMITS.max, current + amount)
		);
		setDraftCalories(String(next));
	};

	const adjustTime = (amount: number) => {
		const current = isNaN(Number(draftTime)) ? activityTimeGoal : Number(draftTime);
		const next = Math.max(
			TIME_LIMITS.min,
			Math.min(TIME_LIMITS.max, current + amount)
		);
		setDraftTime(String(next));
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: colors.background }}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<Stack.Screen
				options={{
					headerTitle: "Personal Goals",
					headerStyle: { backgroundColor: colors.background },
					headerTintColor: colors.foreground,
					headerShadowVisible: false,
					headerRight: () => (
						<Pressable onPress={handleSave} disabled={!!hasErrors} style={({ pressed }) => ({ opacity: pressed || hasErrors ? 0.5 : 1 })}>
							<Text
								style={{
									color: hasErrors ? colors.mutedForeground : colors.primary,
									fontSize: 16,
									fontWeight: "600",
								}}
							>
								Save
							</Text>
						</Pressable>
					),
				}}
			/>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: insets.bottom + 20 },
				]}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.descriptionSection}>
					<Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
						Customize your daily health goals. Prossima uses these values to calculate your progress rings and readiness targets.
					</Text>
				</View>

				{/* Steps Section */}
				<View style={styles.formGroup}>
					<View style={styles.labelRow}>
						<Text style={[styles.label, { color: colors.mutedForeground }]}>
							DAILY STEPS
						</Text>
						<Text style={[styles.limitLabel, { color: colors.mutedForeground }]}>
							{STEPS_LIMITS.min.toLocaleString()} - {STEPS_LIMITS.max.toLocaleString()}
						</Text>
					</View>
					<View style={styles.stepperContainer}>
						<Pressable
							onPress={() => adjustSteps(-STEPS_LIMITS.step)}
							style={({ pressed }) => [
								styles.stepperButton,
								{ backgroundColor: colors.card, borderColor: colors.border },
								pressed && { backgroundColor: colors.secondary },
							]}
						>
							<Ionicons name="remove" size={20} color={colors.foreground} />
						</Pressable>

						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.inputContainer,
								{ borderColor: colors.border, backgroundColor: colors.card },
							]}
						>
							<TextInput
								style={[styles.input, { color: colors.foreground }]}
								value={draftSteps}
								onChangeText={setDraftSteps}
								keyboardType="numeric"
								placeholder={String(stepsGoal)}
								placeholderTextColor={colors.mutedForeground}
								autoCorrect={false}
							/>
						</GlassView>

						<Pressable
							onPress={() => adjustSteps(STEPS_LIMITS.step)}
							style={({ pressed }) => [
								styles.stepperButton,
								{ backgroundColor: colors.card, borderColor: colors.border },
								pressed && { backgroundColor: colors.secondary },
							]}
						>
							<Ionicons name="add" size={20} color={colors.foreground} />
						</Pressable>
					</View>
					{getStepsError() ? (
						<Text style={[styles.errorText, { color: colors.destructive }]}>
							{getStepsError()}
						</Text>
					) : (
						<Text style={[styles.hintText, { color: colors.mutedForeground }]}>
							Recommended: 10,000 - 15,000 steps for general wellness.
						</Text>
					)}
				</View>

				{/* Calories Section */}
				<View style={styles.formGroup}>
					<View style={styles.labelRow}>
						<Text style={[styles.label, { color: colors.mutedForeground }]}>
							ACTIVE CALORIES (KCAL)
						</Text>
						<Text style={[styles.limitLabel, { color: colors.mutedForeground }]}>
							{CALORIES_LIMITS.min} - {CALORIES_LIMITS.max}
						</Text>
					</View>
					<View style={styles.stepperContainer}>
						<Pressable
							onPress={() => adjustCalories(-CALORIES_LIMITS.step)}
							style={({ pressed }) => [
								styles.stepperButton,
								{ backgroundColor: colors.card, borderColor: colors.border },
								pressed && { backgroundColor: colors.secondary },
							]}
						>
							<Ionicons name="remove" size={20} color={colors.foreground} />
						</Pressable>

						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.inputContainer,
								{ borderColor: colors.border, backgroundColor: colors.card },
							]}
						>
							<TextInput
								style={[styles.input, { color: colors.foreground }]}
								value={draftCalories}
								onChangeText={setDraftCalories}
								keyboardType="numeric"
								placeholder={String(caloriesGoal)}
								placeholderTextColor={colors.mutedForeground}
								autoCorrect={false}
							/>
						</GlassView>

						<Pressable
							onPress={() => adjustCalories(CALORIES_LIMITS.step)}
							style={({ pressed }) => [
								styles.stepperButton,
								{ backgroundColor: colors.card, borderColor: colors.border },
								pressed && { backgroundColor: colors.secondary },
							]}
						>
							<Ionicons name="add" size={20} color={colors.foreground} />
						</Pressable>
					</View>
					{getCaloriesError() ? (
						<Text style={[styles.errorText, { color: colors.destructive }]}>
							{getCaloriesError()}
						</Text>
					) : (
						<Text style={[styles.hintText, { color: colors.mutedForeground }]}>
							Active calories burned through exercise and daily activity.
						</Text>
					)}
				</View>

				{/* Activity Time Section */}
				<View style={styles.formGroup}>
					<View style={styles.labelRow}>
						<Text style={[styles.label, { color: colors.mutedForeground }]}>
							ACTIVITY TIME (MINUTES)
						</Text>
						<Text style={[styles.limitLabel, { color: colors.mutedForeground }]}>
							{TIME_LIMITS.min} - {TIME_LIMITS.max}
						</Text>
					</View>
					<View style={styles.stepperContainer}>
						<Pressable
							onPress={() => adjustTime(-TIME_LIMITS.step)}
							style={({ pressed }) => [
								styles.stepperButton,
								{ backgroundColor: colors.card, borderColor: colors.border },
								pressed && { backgroundColor: colors.secondary },
							]}
						>
							<Ionicons name="remove" size={20} color={colors.foreground} />
						</Pressable>

						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.inputContainer,
								{ borderColor: colors.border, backgroundColor: colors.card },
							]}
						>
							<TextInput
								style={[styles.input, { color: colors.foreground }]}
								value={draftTime}
								onChangeText={setDraftTime}
								keyboardType="numeric"
								placeholder={String(activityTimeGoal)}
								placeholderTextColor={colors.mutedForeground}
								autoCorrect={false}
							/>
						</GlassView>

						<Pressable
							onPress={() => adjustTime(TIME_LIMITS.step)}
							style={({ pressed }) => [
								styles.stepperButton,
								{ backgroundColor: colors.card, borderColor: colors.border },
								pressed && { backgroundColor: colors.secondary },
							]}
						>
							<Ionicons name="add" size={20} color={colors.foreground} />
						</Pressable>
					</View>
					{getTimeError() ? (
						<Text style={[styles.errorText, { color: colors.destructive }]}>
							{getTimeError()}
						</Text>
					) : (
						<Text style={[styles.hintText, { color: colors.mutedForeground }]}>
							Total minutes of moderate-to-vigorous exercise and active movement.
						</Text>
					)}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	content: {
		padding: 20,
		gap: 24,
	},
	descriptionSection: {
		marginBottom: 8,
	},
	descriptionText: {
		fontSize: 14,
		lineHeight: 20,
	},
	formGroup: {
		gap: 8,
	},
	labelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 4,
	},
	label: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1,
	},
	limitLabel: {
		fontSize: 11,
		fontWeight: "500",
	},
	stepperContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	stepperButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
	},
	inputContainer: {
		flex: 1,
		borderRadius: 12,
		borderWidth: 1,
		overflow: "hidden",
	},
	input: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 18,
		fontWeight: "600",
		textAlign: "center",
	},
	errorText: {
		fontSize: 12,
		paddingHorizontal: 4,
		fontWeight: "500",
	},
	hintText: {
		fontSize: 12,
		paddingHorizontal: 4,
		lineHeight: 16,
	},
});
