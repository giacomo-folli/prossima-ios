import React, { useMemo } from "react";
import {
	Alert,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useTraining } from "@/context/TrainingContext";
import { useSession } from "@/context/SessionContext";
import { useHealth } from "@/context/HealthContext";
import { ConcentricRingChart } from "@/components/ConcentricRingChart";

function getGreeting() {
	const h = new Date().getHours();
	if (h < 12) return "Good morning, Maya!";
	if (h < 17) return "Good afternoon, Maya!";
	return "Good evening, Maya!";
}

function formatDayDate(date: Date) {
	return date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
	});
}

export default function HomeScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { plan, currentDayIndex, loading } = useTraining();
	const { activeSession, startSession } = useSession();
	const { isConnected, stats, loading: healthLoading, requestPermissions, syncData } = useHealth();
	const [refreshing, setRefreshing] = React.useState(false);

	const onRefresh = React.useCallback(async () => {
		setRefreshing(true);
		await syncData();
		setRefreshing(false);
	}, [syncData]);

	const today = plan?.days[currentDayIndex % plan.days.length] ?? null;

	const handleStart = () => {
		if (!today || !plan) {
			router.navigate("/(tabs)/settings");
			return;
		}
		if (!activeSession) {
			startSession(plan.name, today.label, today.exercises);
		}
		router.navigate("/(tabs)/session");
	};

	const handleRunAlert = () => {
		Alert.alert(
			"Morning Run Details",
			`Logged: Today\nDuration: 34 min\nDistance: 4.2 km\nCalories: 280 kcal\n\nGreat job keeping active today!`,
			[{ text: "Dismiss", style: "cancel" }],
		);
	};

	const handleHeartRateAlert = () => {
		Alert.alert(
			"Heart Rate Status",
			`Current: 72 bpm\nResting Average: 64 bpm\nMax Today: 145 bpm\n\nYour heart rate variability is optimal.`,
			[{ text: "Dismiss", style: "cancel" }],
		);
	};

	const handleSleepAlert = () => {
		Alert.alert(
			"Sleep Log",
			`Duration: 7h 12m\nDeep Sleep: 2h 15m\nREM Sleep: 1h 48m\nSleep Score: 86/100 (Good)\n\nRecovery is on track. Ready for exercise.`,
			[{ text: "Dismiss", style: "cancel" }],
		);
	};

	const topPadding = Platform.OS === "web" ? 20 : insets.top;
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
				{ paddingTop: topPadding, paddingBottom: bottomPadding },
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
					{/* <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
							{formatDayDate(new Date())}
						</Text> */}
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
						Maya
					</Text>
				</View>
				<View style={styles.headerRightRow}>
					{activeSession && (
						<Pressable
							onPress={() => router.navigate("/(tabs)/session")}
							style={({ pressed }) => [
								styles.liveChip,
								{ backgroundColor: "#FF3B30", opacity: pressed ? 0.8 : 1 },
							]}
						>
							<View style={[styles.liveDot, { backgroundColor: "#FFFFFF" }]} />
							<Text style={styles.liveChipText}>Live</Text>
						</Pressable>
					)}
					<Pressable onPress={() => router.navigate("/(tabs)/settings")}>
						<View style={[styles.avatarCircle, { backgroundColor: "#8E7355" }]}>
							<Text style={styles.avatarLetter}>M</Text>
						</View>
					</Pressable>
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

			{/* ── Today's Workouts Section ── */}
			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, { color: colors.foreground }]}>
					Today's Workouts
				</Text>
			</View>

			<View style={styles.workoutsRow}>
				{/* Morning Run Card */}
				<Pressable onPress={handleRunAlert} style={{ flex: 1 }}>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.workoutCard,
							{
								backgroundColor: colors.card,
								borderRadius: 20,
								borderColor: colors.border,
							},
						]}
					>
						<View
							style={[
								styles.workoutIconWrap,
								{ backgroundColor: "rgba(0, 180, 216, 0.08)" },
							]}
						>
							<MaterialCommunityIcons name="run" size={18} color="#00B4D8" />
						</View>
						<View style={styles.workoutInfo}>
							<Text
								style={[styles.workoutName, { color: colors.foreground }]}
								numberOfLines={1}
							>
								Morning Run
							</Text>
							<Text
								style={[styles.workoutDuration, { color: colors.foreground }]}
							>
								34 min
							</Text>
							<Text
								style={[styles.workoutMeta, { color: colors.mutedForeground }]}
								numberOfLines={1}
							>
								4.2 km · 280 cal
							</Text>
						</View>
					</GlassView>
				</Pressable>

				{/* Strength Card */}
				<Pressable onPress={handleStart} style={{ flex: 1 }}>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.workoutCard,
							{
								backgroundColor: colors.card,
								borderRadius: 20,
								
								borderColor: colors.border,
							},
						]}
					>
						<View
							style={[
								styles.workoutIconWrap,
								{ backgroundColor: "rgba(255, 107, 0, 0.08)" },
							]}
						>
							<MaterialCommunityIcons
								name="dumbbell"
								size={18}
								color="#FF6B00"
							/>
						</View>
						<View style={styles.workoutInfo}>
							<Text
								style={[styles.workoutName, { color: colors.foreground }]}
								numberOfLines={1}
							>
								Strength
							</Text>
							<Text
								style={[styles.workoutDuration, { color: colors.foreground }]}
							>
								{activeSession ? "In Progress" : today ? today.label : "45 min"}
							</Text>
							<Text
								style={[styles.workoutMeta, { color: colors.mutedForeground }]}
								numberOfLines={1}
							>
								{today ? `${today.exercises.length} ex · 150 cal` : "150 cal"}
							</Text>
						</View>
					</GlassView>
				</Pressable>
			</View>

			{/* Health Capsules Row */}
			<View style={styles.capsulesRow}>
				{/* Heart Rate Capsule */}
				<Pressable onPress={handleHeartRateAlert} style={{ flex: 1 }}>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.capsule,
							{
								backgroundColor: colors.card,
								borderRadius: 22,
								
								borderColor: colors.border,
							},
						]}
					>
						<Ionicons
							name="heart"
							size={14}
							color="#FF3B30"
							style={{ marginRight: 6 }}
						/>
						<Text
							style={[styles.capsuleText, { color: colors.mutedForeground }]}
						>
							Heart Rate:{" "}
							<Text style={[styles.capsuleBold, { color: colors.foreground }]}>
								72 bpm
							</Text>
						</Text>
					</GlassView>
				</Pressable>

				{/* Sleep Capsule */}
				<Pressable onPress={handleSleepAlert} style={{ flex: 1 }}>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.capsule,
							{
								backgroundColor: colors.card,
								borderRadius: 22,
								
								borderColor: colors.border,
							},
						]}
					>
						<Ionicons
							name="moon"
							size={14}
							color="#5856D6"
							style={{ marginRight: 6 }}
						/>
						<Text
							style={[styles.capsuleText, { color: colors.mutedForeground }]}
						>
							Sleep:{" "}
							<Text style={[styles.capsuleBold, { color: colors.foreground }]}>
								7h 12m
							</Text>
						</Text>
					</GlassView>
				</Pressable>
			</View>
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
	dateLabel: {
		fontSize: 13,
		textTransform: "none",
		letterSpacing: 0.2,
		marginBottom: 4,
	},
	healthAlertCard: {
		marginBottom: 4,
	},
	healthAlertGlass: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 14
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
	liveChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	liveDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	liveChipText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#FFFFFF",
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

	activityCard: {
		padding: 16,
		gap: 12,
	},
	activityTitle: {
		fontSize: 18,
		letterSpacing: -0.2,
		marginBottom: 4,
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
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
	},
	statCol: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	statIconBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: "center",
		alignItems: "center",
	},
	statTextWrap: {
		justifyContent: "center",
	},
	statName: {
		fontSize: 11,
	},
	statValue: {
		fontSize: 14,
		marginTop: 1,
	},

	sectionHeader: {
		marginTop: 8,
	},
	sectionTitle: {
		fontSize: 20,
		letterSpacing: -0.3,
	},

	workoutsRow: {
		flexDirection: "row",
		gap: 12,
	},
	workoutCard: {
		flexDirection: "row",
		padding: 12,
		alignItems: "center",
	},
	workoutIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10,
	},
	workoutInfo: {
		flex: 1,
	},
	workoutName: {
		fontSize: 15,
	},
	workoutDuration: {
		fontSize: 13,
		marginTop: 1,
	},
	workoutMeta: {
		fontSize: 11.5,
		marginTop: 1,
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
	},
});
