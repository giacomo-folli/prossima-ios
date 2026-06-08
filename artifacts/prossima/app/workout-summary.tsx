import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/context/HealthContext";
import { GlassView } from "expo-glass-effect";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { METRIC_COLORS } from "@/constants/colors";

function fmtDateFull(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export default function WorkoutSummaryScreen() {
	const { startDate } = useLocalSearchParams<{ startDate: string }>();
	const { workouts } = useHealth();
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const router = useRouter();

	const workout = workouts.find((w) => w.startDate === startDate);

	if (!workout) {
		return (
			<View style={[styles.root, { backgroundColor: colors.background }]}>
				<Text style={{ color: colors.foreground }}>Workout not found.</Text>
				<Pressable onPress={() => router.back()} style={styles.closeBtn}>
					<Text style={{ color: colors.primary }}>Close</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			{/* Handle bar for bottom sheet */}
			<View style={styles.handleContainer}>
				<View style={[styles.handle, { backgroundColor: colors.mutedForeground }]} />
			</View>

			<View style={styles.header}>
				<View
					style={[
						styles.iconWrap,
						{ backgroundColor: METRIC_COLORS.workout + "1A" },
					]}
				>
					<Ionicons name="heart" size={28} color={METRIC_COLORS.workout} />
				</View>
				<Text style={[styles.title, { color: colors.foreground }]}>
					{workout.activityName}
				</Text>
				<Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
					{fmtDateFull(workout.startDate)}
				</Text>
			</View>

			<View style={styles.statsContainer}>
				<GlassView
					colorScheme={resolvedScheme}
					style={styles.statCard}
				>
					<MaterialCommunityIcons
						name="timer-outline"
						size={24}
						color={colors.mutedForeground}
					/>
					<View style={styles.statContent}>
						<Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
							Duration
						</Text>
						<Text style={[styles.statValue, { color: colors.foreground }]}>
							{workout.durationMinutes} min
						</Text>
					</View>
				</GlassView>

				<GlassView
					colorScheme={resolvedScheme}
					style={styles.statCard}
				>
					<MaterialCommunityIcons
						name="fire"
						size={24}
						color={METRIC_COLORS.calories}
					/>
					<View style={styles.statContent}>
						<Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
							Active Calories
						</Text>
						<Text style={[styles.statValue, { color: colors.foreground }]}>
							{workout.calories} kcal
						</Text>
					</View>
				</GlassView>
			</View>

			<View style={styles.footer}>
				<Pressable
					style={[styles.doneBtn, { backgroundColor: colors.primary }]}
					onPress={() => router.back()}
				>
					<Text style={styles.doneBtnText}>Done</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		padding: 20,
	},
	handleContainer: {
		alignItems: "center",
		paddingVertical: 10,
		marginBottom: 10,
	},
	handle: {
		width: 40,
		height: 5,
		borderRadius: 3,
		opacity: 0.3,
	},
	header: {
		alignItems: "center",
		marginBottom: 30,
	},
	iconWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: "700",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 15,
	},
	statsContainer: {
		flexDirection: "row",
		gap: 16,
		marginBottom: 30,
	},
	statCard: {
		flex: 1,
		padding: 20,
		borderRadius: 24,
		alignItems: "center",
		gap: 12,
	},
	statContent: {
		alignItems: "center",
	},
	statLabel: {
		fontSize: 13,
		marginBottom: 4,
	},
	statValue: {
		fontSize: 22,
		fontWeight: "700",
	},
	footer: {
		marginTop: "auto",
		paddingBottom: 20,
	},
	doneBtn: {
		height: 54,
		borderRadius: 27,
		justifyContent: "center",
		alignItems: "center",
	},
	doneBtnText: {
		color: "white",
		fontSize: 17,
		fontWeight: "600",
	},
	closeBtn: {
		marginTop: 20,
		padding: 10,
	},
});
