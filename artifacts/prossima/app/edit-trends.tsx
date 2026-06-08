import React, { useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useProfile, WidgetConfig } from "@/context/ProfileContext";

const WIDGET_LABELS: Record<string, string> = {
	readiness: "Readiness Score",
	hrv: "HRV Trend",
	rhr: "Resting Heart Rate",
	sleep: "Sleep Duration",
	weight: "Body Weight",
	vo2max: "VO2 Max",
	vitals: "Recovery Vitals",
	steps: "Daily Steps",
	workouts: "Workouts",
	calories: "Active Energy",
	duration: "Avg Duration",
};

export default function EditTrendsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const profile = useProfile();

	const [healthWidgets, setHealthWidgets] = useState<WidgetConfig[]>(
		profile.healthWidgets,
	);
	const [workoutWidgets, setWorkoutWidgets] = useState<WidgetConfig[]>(
		profile.workoutWidgets,
	);

	const handleSave = async () => {
		await profile.setHealthWidgets(healthWidgets);
		await profile.setWorkoutWidgets(workoutWidgets);
		router.back();
	};

	const moveItem = (
		list: WidgetConfig[],
		setList: (val: WidgetConfig[]) => void,
		index: number,
		direction: "up" | "down",
	) => {
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === list.length - 1) return;

		const newList = [...list];
		const swapIndex = direction === "up" ? index - 1 : index + 1;
		[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
		setList(newList);
	};

	const toggleVisibility = (
		list: WidgetConfig[],
		setList: (val: WidgetConfig[]) => void,
		index: number,
	) => {
		const newList = [...list];
		newList[index] = { ...newList[index], visible: !newList[index].visible };
		setList(newList);
	};

	const renderWidgetRow = (
		item: WidgetConfig,
		index: number,
		list: WidgetConfig[],
		setList: (val: WidgetConfig[]) => void,
	) => {
		const isFirst = index === 0;
		const isLast = index === list.length - 1;

		return (
			<View
				key={item.id}
				style={[
					styles.row,
					{
						borderBottomColor: colors.separator,
						borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
					},
				]}
			>
				<View style={styles.rowContent}>
					<Text style={[styles.rowLabel, { color: colors.foreground }]}>
						{WIDGET_LABELS[item.id] || item.id}
					</Text>
					<Switch
						value={item.visible}
						onValueChange={() => toggleVisibility(list, setList, index)}
						trackColor={{ false: colors.border, true: colors.primary }}
						thumbColor={Platform.OS === "android" ? "#fff" : undefined}
						ios_backgroundColor={colors.border}
					/>
				</View>
				<View style={styles.controls}>
					<TouchableOpacity
						onPress={() => moveItem(list, setList, index, "up")}
						disabled={isFirst}
						style={[styles.arrowBtn, isFirst && { opacity: 0.3 }]}
					>
						<Ionicons name="arrow-up" size={20} color={colors.primary} />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => moveItem(list, setList, index, "down")}
						disabled={isLast}
						style={[styles.arrowBtn, isLast && { opacity: 0.3 }]}
					>
						<Ionicons name="arrow-down" size={20} color={colors.primary} />
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Stack.Screen
				options={{
					title: "Customize Trends",
					headerStyle: { backgroundColor: colors.background },
					headerTintColor: colors.foreground,
					headerShadowVisible: false,
					headerRight: () => (
						<TouchableOpacity onPress={handleSave}>
							<Text
								style={{
									color: colors.primary,
									fontSize: 17,
									fontWeight: "600",
								}}
							>
								Save
							</Text>
						</TouchableOpacity>
					),
				}}
			/>
			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{
					paddingHorizontal: 20,
					paddingTop: 20,
					paddingBottom: insets.bottom + 40,
					gap: 24,
				}}
			>
				<Text style={[styles.description, { color: colors.mutedForeground }]}>
					Choose which widgets to display on the Trends page and reorder them to
					your liking.
				</Text>

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
						HEALTH WIDGETS
					</Text>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.card,
							{
								backgroundColor: colors.card,
								borderRadius: colors.radius,
								borderColor: colors.border,
								borderWidth: 1,
							},
						]}
					>
						{healthWidgets.map((item, index) =>
							renderWidgetRow(item, index, healthWidgets, setHealthWidgets),
						)}
					</GlassView>
				</View>

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
						WORKOUTS WIDGETS
					</Text>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.card,
							{
								backgroundColor: colors.card,
								borderRadius: colors.radius,
								borderColor: colors.border,
								borderWidth: 1,
							},
						]}
					>
						{workoutWidgets.map((item, index) =>
							renderWidgetRow(item, index, workoutWidgets, setWorkoutWidgets),
						)}
					</GlassView>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	description: {
		fontSize: 15,
		lineHeight: 22,
	},
	section: {
		gap: 8,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1,
		paddingLeft: 4,
	},
	card: {
		overflow: "hidden",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		minHeight: 64,
	},
	rowContent: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingRight: 16,
	},
	rowLabel: {
		fontSize: 16,
		fontWeight: "500",
	},
	controls: {
		flexDirection: "row",
		gap: 4,
	},
	arrowBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(128,128,128,0.1)",
		alignItems: "center",
		justifyContent: "center",
	},
});
