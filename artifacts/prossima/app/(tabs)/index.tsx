import React, { useMemo } from "react";
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
import { useTraining } from "@/context/TrainingContext";
import { useHealth, HealthWorkout } from "@/context/HealthContext";
import { useProfile } from "@/context/ProfileContext";
import { ConcentricRingChart } from "@/components/ConcentricRingChart";
import { Image } from "expo-image";

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const h = Math.floor(m / 60);
	if (h > 0) return `${h}h ${m % 60}m`;
	return `${m}m`;
}

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
	const { plan, currentDayIndex, loading, sessions } = useTraining();
	const { isConnected, stats, loading: healthLoading, requestPermissions, syncData } = useHealth();
	const { name, imageUri } = useProfile();
	const [refreshing, setRefreshing] = React.useState(false);

	const onRefresh = React.useCallback(async () => {
		setRefreshing(true);
		await syncData();
		setRefreshing(false);
	}, [syncData]);

	// Today's planned workout day
	const today = plan?.days[currentDayIndex % plan.days.length] ?? null;

	// Most recent completed session (app-logged)
	const lastSession = sessions.length > 0 ? sessions[0] : null;

	// Most recent Apple Health workout
	const healthWorkout: HealthWorkout | null = stats.recentWorkout;

	const tabBarHeight = Platform.OS === "web" ? 84 : 64;
	const bottomPadding = tabBarHeight + insets.bottom + 16;

	const isDark = resolvedScheme === "dark";
	const gradientColors = colors.backgroundGradient;

	if (loading) {
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
							<Text style={[styles.healthAlertDesc, { color: colors.mutedForeground }]}>Tap to sync calories, steps, and activity</Text>
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
				{/* Sleep capsule — real data from HealthKit SleepAnalysis */}
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
						Sleep:{" "}
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
						Last workout:{" "}
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

			{/* ── Today's Workout ── */}
			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, { color: colors.foreground }]}>
					Today's Workout
				</Text>
			</View>

			{today ? (
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.todayCard,
						{
							backgroundColor: colors.card,
							borderRadius: 20,
							borderColor: colors.border,
						},
					]}
				>
					{/* Day label & exercise count */}
					<View style={styles.todayCardHeader}>
						<View
							style={[
								styles.workoutIconWrap,
								{ backgroundColor: "rgba(94, 92, 230, 0.12)" },
							]}
						>
							<MaterialCommunityIcons name="dumbbell" size={18} color="#5856D6" />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.todayDayLabel, { color: colors.foreground }]}>
								{today.label}
							</Text>
							<Text style={[styles.todayMeta, { color: colors.mutedForeground }]}>
								{today.exercises.length} exercise{today.exercises.length !== 1 ? "s" : ""}
							</Text>
						</View>
						<View style={[styles.dayBadge, { backgroundColor: colors.muted }]}>
							<Text style={[styles.dayBadgeText, { color: colors.accent }]}>
								Day {(currentDayIndex % (plan?.days.length ?? 1)) + 1}
							</Text>
						</View>
					</View>

					{/* Exercise list (first 4) */}
					{today.exercises.slice(0, 4).map((ex, i) => (
						<View
							key={ex.id}
							style={[
								styles.exerciseRow,
								i < Math.min(today.exercises.length, 4) - 1 && {
									borderBottomWidth: StyleSheet.hairlineWidth,
									borderBottomColor: colors.separator,
								},
							]}
						>
							<View style={[styles.exDot, { backgroundColor: colors.accent }]} />
							<Text
								style={[styles.exName, { color: colors.foreground }]}
								numberOfLines={1}
							>
								{ex.name}
							</Text>
							<Text style={[styles.exMeta, { color: colors.mutedForeground }]}>
								{ex.sets} × {ex.reps}
							</Text>
						</View>
					))}

					{today.exercises.length > 4 && (
						<Text style={[styles.moreText, { color: colors.mutedForeground }]}>
							+{today.exercises.length - 4} more exercises
						</Text>
					)}
				</GlassView>
			) : (
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
					<Ionicons name="calendar-outline" size={28} color={colors.mutedForeground} />
					<Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
						No training plan yet.{"\n"}Add one in Settings.
					</Text>
				</GlassView>
			)}

			{/* ── Last Session ── */}
			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, { color: colors.foreground }]}>
					Last Session
				</Text>
			</View>

			{lastSession ? (
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.lastSessionCard,
						{
							backgroundColor: colors.card,
							borderRadius: 20,
							borderColor: colors.border,
						},
					]}
				>
					<View style={styles.lastSessionHeader}>
						<View
							style={[
								styles.workoutIconWrap,
								{ backgroundColor: "rgba(0, 180, 216, 0.1)" },
							]}
						>
							<Ionicons name="barbell" size={18} color="#00B4D8" />
						</View>
						<View style={{ flex: 1 }}>
							<Text
								style={[styles.lastSessionLabel, { color: colors.foreground }]}
								numberOfLines={1}
							>
								{lastSession.dayLabel}
							</Text>
							<Text style={[styles.lastSessionMeta, { color: colors.mutedForeground }]}>
								{fmtDate(lastSession.date)} · {formatDuration(lastSession.durationSeconds)}
							</Text>
						</View>
						{/* Volume badge */}
						{(() => {
							const vol = lastSession.entries.reduce(
								(a, e) => (e.weightKg && e.reps ? a + e.weightKg * e.reps : a),
								0
							);
							return vol > 0 ? (
								<View style={[styles.volBadge, { backgroundColor: "rgba(0, 180, 216, 0.1)" }]}>
									<Text style={[styles.volBadgeText, { color: "#00B4D8" }]}>
										{vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)}kg`}
									</Text>
								</View>
							) : null;
						})()}
					</View>

					{/* Sets summary row */}
					<View style={styles.lastSessionStats}>
						<View style={styles.lastSessionStat}>
							<Text style={[styles.lastSessionStatVal, { color: colors.foreground }]}>
								{lastSession.entries.length}
							</Text>
							<Text style={[styles.lastSessionStatLabel, { color: colors.mutedForeground }]}>
								sets
							</Text>
						</View>
						<View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
						<View style={styles.lastSessionStat}>
							<Text style={[styles.lastSessionStatVal, { color: colors.foreground }]}>
								{[...new Set(lastSession.entries.map((e) => e.exerciseName))].length}
							</Text>
							<Text style={[styles.lastSessionStatLabel, { color: colors.mutedForeground }]}>
								exercises
							</Text>
						</View>
						<View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
						<View style={styles.lastSessionStat}>
							<Text style={[styles.lastSessionStatVal, { color: colors.foreground }]}>
								{sessions.length}
							</Text>
							<Text style={[styles.lastSessionStatLabel, { color: colors.mutedForeground }]}>
								total sessions
							</Text>
						</View>
					</View>
				</GlassView>
			) : (
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
					<Ionicons name="fitness-outline" size={28} color={colors.mutedForeground} />
					<Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
						No sessions yet.{"\n"}Complete your first workout to see stats here.
					</Text>
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

	// Today's Workout card
	todayCard: {
		padding: 14,
		gap: 0,
	},
	todayCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	workoutIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10,
	},
	todayDayLabel: {
		fontSize: 16,
		fontWeight: "600",
	},
	todayMeta: {
		fontSize: 12,
		marginTop: 1,
	},
	dayBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 10,
	},
	dayBadgeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	exerciseRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 9,
		gap: 10,
	},
	exDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	exName: {
		flex: 1,
		fontSize: 14,
		fontWeight: "500",
	},
	exMeta: {
		fontSize: 13,
		fontVariant: ["tabular-nums"],
	},
	moreText: {
		fontSize: 12,
		textAlign: "center",
		marginTop: 8,
	},

	// Last Session card
	lastSessionCard: {
		padding: 14,
		gap: 14,
	},
	lastSessionHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	lastSessionLabel: {
		fontSize: 16,
		fontWeight: "600",
	},
	lastSessionMeta: {
		fontSize: 12,
		marginTop: 1,
	},
	volBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 10,
	},
	volBadgeText: {
		fontSize: 12,
		fontWeight: "700",
	},
	lastSessionStats: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
	},
	lastSessionStat: {
		alignItems: "center",
		flex: 1,
	},
	lastSessionStatVal: {
		fontSize: 22,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	lastSessionStatLabel: {
		fontSize: 11,
		marginTop: 2,
	},
	statDivider: {
		width: StyleSheet.hairlineWidth,
		height: 36,
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

	// Empty state
	emptyCard: {
		padding: 28,
		alignItems: "center",
		gap: 10,
	},
	emptyCardText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});
