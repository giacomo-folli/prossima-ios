import React from "react";
import {
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useHealth, HealthWorkout } from "@/context/HealthContext";
import { useProfile } from "@/context/ProfileContext";
import { ConcentricRingChart } from "@/components/ConcentricRingChart";
import { Image } from "expo-image";

function fmtDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/** Format sleep hours as "7h 24m" */
function formatSleep(hours: number): string {
	if (hours <= 0) return "—";
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

export default function HomeScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { isConnected, stats, loading: healthLoading, requestPermissions, syncData } = useHealth();
	const { name, imageUri } = useProfile();
	const [refreshing, setRefreshing] = React.useState(false);

	const onRefresh = React.useCallback(async () => {
		setRefreshing(true);
		await syncData();
		setRefreshing(false);
	}, [syncData]);

	// Most recent Apple Health workout
	const healthWorkout: HealthWorkout | null = stats.recentWorkout;

	const tabBarHeight = Platform.OS === "web" ? 84 : 64;
	const bottomPadding = tabBarHeight + insets.bottom + 16;

	const gradientColors = colors.backgroundGradient;

	if (healthLoading) {
		return <LinearGradient colors={gradientColors} style={{ flex: 1 }} />;
	}

	return (
		<ScrollView
			style={{ flex: 1 }}
			contentContainerStyle={[
				styles.content,
				{ paddingTop: 0, paddingBottom: bottomPadding },
			]}
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="never"
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor={colors.foreground}
				/>
			}
		>
			{/* ── Header ── */}
			<View style={styles.headerSection}>
				<View style={{ flex: 1 }}>
					<Text
						style={[
							styles.greeting,
							{ color: colors.foreground, fontSize: 18, letterSpacing: 0.8 },
						]}
					>
						Welcome back
					</Text>
					<Text
						style={[
							styles.greeting,
							{ color: colors.foreground, letterSpacing: 1.2 },
						]}
					>
						{name}
					</Text>
				</View>
				<View style={[styles.headerRightRow, { zIndex: 10 }]}>
					{imageUri ? (
						<Image source={{ uri: imageUri }} style={styles.avatarCircle} contentFit="cover" />
					) : (
						<View style={[styles.avatarCircle, { backgroundColor: "#8E7355" }]}>
							<Text style={styles.avatarLetter}>{name ? name.charAt(0).toUpperCase() : "M"}</Text>
						</View>
					)}
				</View>
			</View>

			{/* Apple Health Connection Alert */}
			{!isConnected && !healthLoading && (
				<Pressable onPress={requestPermissions} style={styles.healthAlertCard}>
					<GlassView colorScheme={resolvedScheme} style={[styles.healthAlertGlass, { borderColor: colors.border }]}>
						<Ionicons name="heart" size={20} color="#FF2D55" style={{ marginRight: 12 }} />
						<View style={{ flex: 1 }}>
							<Text style={[styles.healthAlertTitle, { color: colors.foreground }]}>Connect Apple Health</Text>
							<Text style={[styles.healthAlertDesc, { color: colors.mutedForeground }]}>Tap to sync calories, steps, sleep & activity</Text>
						</View>
						<Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
					</GlassView>
				</Pressable>
			)}

			{/* ── Activity Rings ── */}
			<View style={styles.chartWrapper}>
				<ConcentricRingChart
					stepsProgress={stats.steps / 15000}
					calProgress={stats.calories / 550}
					activeProgress={stats.activityTime / 60}
					stepsValue={stats.steps.toLocaleString()}
					stepsGoal="15,000"
					calValue={stats.calories.toString()}
					calGoal="550"
					activeValue={`${stats.activityTime}m`}
					activeGoal="60m"
					size={240}
				/>
			</View>

			<View
				style={[styles.cardDivider, { backgroundColor: colors.separator }]}
			/>

			{/* ── Health Quick Stats Capsules ── */}
			<View style={styles.capsulesRow}>
				{/* Sleep capsule */}
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.capsule,
						{
							backgroundColor: colors.card,
							borderRadius: 22,
							borderColor: colors.border,
							flex: 1,
						},
					]}
				>
					<Ionicons
						name="moon"
						size={14}
						color="#5856D6"
						style={{ marginRight: 6 }}
					/>
					<Text style={[styles.capsuleText, { color: colors.mutedForeground }]}>
						Sleep{" "}
						<Text style={[styles.capsuleBold, { color: colors.foreground }]}>
							{isConnected ? formatSleep(stats.sleepHours) : "—"}
						</Text>
					</Text>
				</GlassView>

				{/* Last HealthKit workout capsule */}
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.capsule,
						{
							backgroundColor: colors.card,
							borderRadius: 22,
							borderColor: colors.border,
							flex: 1,
						},
					]}
				>
					<Ionicons
						name="flame"
						size={14}
						color="#FF3B30"
						style={{ marginRight: 6 }}
					/>
					<Text style={[styles.capsuleText, { color: colors.mutedForeground }]} numberOfLines={1}>
						Last workout{" "}
						<Text style={[styles.capsuleBold, { color: colors.foreground }]}>
							{isConnected && healthWorkout
								? `${healthWorkout.durationMinutes}m`
								: "—"}
						</Text>
					</Text>
				</GlassView>
			</View>

			{/* ── Recent Workout from Apple Health ── */}
			{isConnected && healthWorkout && (
				<>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.foreground }]}>
							Recent Activity
						</Text>
					</View>

					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.healthWorkoutCard,
							{
								backgroundColor: colors.card,
								borderRadius: 20,
								borderColor: colors.border,
							},
						]}
					>
						{/* Header row */}
						<View style={styles.healthWorkoutHeader}>
							<View
								style={[
									styles.workoutIconWrap,
									{ backgroundColor: "rgba(255, 59, 48, 0.1)" },
								]}
							>
								<Ionicons name="heart" size={18} color="#FF3B30" />
							</View>
							<View style={{ flex: 1 }}>
								<Text
									style={[styles.healthWorkoutName, { color: colors.foreground }]}
									numberOfLines={1}
								>
									{healthWorkout.activityName}
								</Text>
								<Text style={[styles.healthWorkoutDate, { color: colors.mutedForeground }]}>
									{fmtDate(healthWorkout.startDate)} · via Apple Health
								</Text>
							</View>
						</View>

						{/* Stats row */}
						<View style={styles.healthWorkoutStats}>
							<View style={styles.healthWorkoutStat}>
								<MaterialCommunityIcons name="timer-outline" size={16} color={colors.mutedForeground} />
								<Text style={[styles.healthWorkoutStatVal, { color: colors.foreground }]}>
									{healthWorkout.durationMinutes > 0
										? `${healthWorkout.durationMinutes} min`
										: "—"}
								</Text>
							</View>
							<View style={[styles.hwStatDivider, { backgroundColor: colors.separator }]} />
							<View style={styles.healthWorkoutStat}>
								<MaterialCommunityIcons name="fire" size={16} color="#FF6B00" />
								<Text style={[styles.healthWorkoutStatVal, { color: colors.foreground }]}>
									{healthWorkout.calories > 0
										? `${healthWorkout.calories} cal`
										: "—"}
								</Text>
							</View>
						</View>
					</GlassView>
				</>
			)}

			{/* ── Today's Health Stats ── */}
			{isConnected && (
				<>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.foreground }]}>
							Today
						</Text>
					</View>

					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.todayStatsCard,
							{
								backgroundColor: colors.card,
								borderRadius: 20,
								borderColor: colors.border,
							},
						]}
					>
						{/* Steps */}
						<View style={[styles.statRow, { borderBottomColor: colors.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
							<View style={[styles.statIconWrap, { backgroundColor: "rgba(52, 199, 89, 0.1)" }]}>
								<MaterialCommunityIcons name="shoe-print" size={18} color="#34C759" />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Steps</Text>
								<Text style={[styles.statValue, { color: colors.foreground }]}>
									{stats.steps.toLocaleString()}
								</Text>
							</View>
							<Text style={[styles.statGoal, { color: colors.mutedForeground }]}>/ 15,000</Text>
						</View>

						{/* Calories */}
						<View style={[styles.statRow, { borderBottomColor: colors.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
							<View style={[styles.statIconWrap, { backgroundColor: "rgba(255, 107, 0, 0.1)" }]}>
								<MaterialCommunityIcons name="fire" size={18} color="#FF6B00" />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Calories</Text>
								<Text style={[styles.statValue, { color: colors.foreground }]}>
									{stats.calories} kcal
								</Text>
							</View>
							<Text style={[styles.statGoal, { color: colors.mutedForeground }]}>/ 550</Text>
						</View>

						{/* Activity time */}
						<View style={styles.statRow}>
							<View style={[styles.statIconWrap, { backgroundColor: "rgba(0, 180, 216, 0.1)" }]}>
								<Ionicons name="timer-outline" size={18} color="#00B4D8" />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Activity Time</Text>
								<Text style={[styles.statValue, { color: colors.foreground }]}>
									{stats.activityTime} min
								</Text>
							</View>
							<Text style={[styles.statGoal, { color: colors.mutedForeground }]}>/ 60m</Text>
						</View>
					</GlassView>
				</>
			)}

			{/* Empty state when not connected */}
			{!isConnected && (
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.emptyCard,
						{
							backgroundColor: colors.card,
							borderRadius: 20,
							borderColor: colors.border,
						},
					]}
				>
					<Ionicons name="heart-outline" size={32} color={colors.mutedForeground} />
					<Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
						Connect Apple Health{"\n"}to start seeing your data here.
					</Text>
					<Pressable
						onPress={requestPermissions}
						style={[styles.connectButton, { backgroundColor: colors.primary }]}
					>
						<Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>
							Connect Now
						</Text>
					</Pressable>
				</GlassView>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	content: { paddingHorizontal: 20, gap: 14 },

	headerSection: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	healthAlertCard: {
		marginBottom: 4,
	},
	healthAlertGlass: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 14,
	},
	healthAlertTitle: {
		fontSize: 15,
		fontWeight: "600",
	},
	healthAlertDesc: {
		fontSize: 13,
		marginTop: 2,
	},
	greeting: {
		fontSize: 32,
		fontWeight: "700",
		letterSpacing: -0.5,
		lineHeight: 36,
	},
	headerRightRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	avatarCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.2)",
	},
	avatarLetter: {
		fontSize: 16,
		color: "#FFFFFF",
	},

	chartWrapper: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
	},
	cardDivider: {
		height: StyleSheet.hairlineWidth,
		width: "100%",
		marginVertical: 4,
	},

	capsulesRow: {
		flexDirection: "row",
		gap: 12,
		marginTop: 2,
	},
	capsule: {
		flexDirection: "row",
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	capsuleText: {
		fontSize: 13,
	},
	capsuleBold: {
		fontWeight: "700",
	},

	sectionHeader: {
		marginTop: 8,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "600",
		letterSpacing: -0.3,
	},

	workoutIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10,
	},

	// Apple Health recent workout card
	healthWorkoutCard: {
		padding: 14,
		gap: 14,
	},
	healthWorkoutHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	healthWorkoutName: {
		fontSize: 16,
		fontWeight: "600",
	},
	healthWorkoutDate: {
		fontSize: 12,
		marginTop: 1,
	},
	healthWorkoutStats: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	healthWorkoutStat: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		flex: 1,
	},
	healthWorkoutStatVal: {
		fontSize: 15,
		fontWeight: "600",
	},
	hwStatDivider: {
		width: StyleSheet.hairlineWidth,
		height: 28,
	},

	// Today's stats card
	todayStatsCard: {
		overflow: "hidden",
	},
	statRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 16,
		gap: 12,
	},
	statIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		justifyContent: "center",
		alignItems: "center",
	},
	statLabel: {
		fontSize: 12,
		marginBottom: 2,
	},
	statValue: {
		fontSize: 17,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	statGoal: {
		fontSize: 13,
	},

	// Empty state
	emptyCard: {
		padding: 32,
		alignItems: "center",
		gap: 12,
	},
	emptyCardText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
	connectButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
		marginTop: 4,
	},
	connectButtonText: {
		fontSize: 15,
		fontWeight: "600",
	},
});
