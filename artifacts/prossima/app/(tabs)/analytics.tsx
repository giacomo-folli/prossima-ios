import React, { useMemo, useState } from "react";
import {
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { METRIC_COLORS } from "@/constants/colors";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useHealth } from "@/context/HealthContext";
import { useProfile } from "@/context/ProfileContext";
import { LineChart } from "@/components/LineChart";
import { DailyHealthSample } from "@/context/HealthStore";
import { TrendCard } from "@/components/TrendCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useCardStyle } from "@/hooks/useCardStyle";

// ─── Types ───────────────────────────────────────────────────────────────────

type RangeKey = "1W" | "1M" | "3M" | "6M" | "1Y";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
	{ key: "1W", label: "1W", days: 7 },
	{ key: "1M", label: "1M", days: 30 },
	{ key: "3M", label: "3M", days: 90 },
	{ key: "6M", label: "6M", days: 180 },
	{ key: "1Y", label: "1Y", days: 365 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getReadinessColor(level: number) {
	switch (level) {
		case 3:
			return "#00E5FF";
		case 2:
			return "#FF9F0A";
		case 1:
			return "#FF2D55";
		default:
			return "#64748B";
	}
}

function startOfDay(d: Date) {
	const c = new Date(d);
	c.setHours(0, 0, 0, 0);
	return c;
}

function buildBuckets(
	days: number,
	buckets: number,
): { start: Date; end: Date; label: string }[] {
	const now = new Date();
	const rangeStart = startOfDay(new Date());
	rangeStart.setDate(rangeStart.getDate() - days);

	const msPerBucket = (now.getTime() - rangeStart.getTime()) / buckets;

	return Array.from({ length: buckets }, (_, i) => {
		const start = new Date(rangeStart.getTime() + i * msPerBucket);
		const end = new Date(rangeStart.getTime() + (i + 1) * msPerBucket);

		let label: string;
		if (i === buckets - 1) {
			label = "Now";
		} else if (days <= 7) {
			label = start
				.toLocaleDateString("en-US", { weekday: "short" })
				.slice(0, 2);
		} else if (days <= 90) {
			label = start
				.toLocaleDateString("en-US", { month: "short", day: "numeric" })
				.replace(" ", "\n");
		} else {
			label = start.toLocaleDateString("en-US", { month: "short" });
		}

		return { start, end, label };
	});
}

function fmt(n: number, decimals = 0) {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

function halfDelta(values: number[]): number | null {
	if (!values.length) return null;
	const half = Math.floor(values.length / 2);
	const first = values.slice(0, half);
	const second = values.slice(half);
	const avgFirst = first.reduce((a, b) => a + b, 0) / (first.length || 1);
	const avgSecond = second.reduce((a, b) => a + b, 0) / (second.length || 1);
	if (avgFirst === 0) return null;
	return ((avgSecond - avgFirst) / avgFirst) * 100;
}

// ─── Range Selector ──────────────────────────────────────────────────────────

function RangeSelector({
	selected,
	onChange,
}: {
	selected: RangeKey;
	onChange: (k: RangeKey) => void;
}) {
	const colors = useColors();
	return (
		<View
			style={[
				styles.rangeRow,
				{ backgroundColor: colors.muted, borderColor: colors.border },
			]}
		>
			{RANGES.map((r) => {
				const active = r.key === selected;
				return (
					<Pressable
						key={r.key}
						style={[
							styles.rangeBtn,
							active && { backgroundColor: colors.accent },
						]}
						onPress={() => onChange(r.key)}
					>
						<Text
							style={[
								styles.rangeBtnText,
								{ color: active ? "#fff" : colors.mutedForeground },
							]}
						>
							{r.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

// ─── Health sample bucketing ──────────────────────────────────────────────────

function bucketHealthSamples(
	samples: DailyHealthSample[],
	buckets: { start: Date; end: Date; label: string }[],
	mode: "avg" | "sum" | "last" = "avg",
): { label: string; value: number }[] {
	return buckets.map((b) => {
		const inRange = samples.filter((s) => {
			const d = new Date(s.date);
			return d >= b.start && d < b.end;
		});
		if (inRange.length === 0) return { label: b.label, value: 0 };
		let value: number;
		if (mode === "sum") {
			value = inRange.reduce((a, s) => a + s.value, 0);
		} else if (mode === "last") {
			value = inRange[inRange.length - 1].value;
		} else {
			value = inRange.reduce((a, s) => a + s.value, 0) / inRange.length;
		}
		return { label: b.label, value: Math.round(value * 10) / 10 };
	});
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TrendsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { isConnected, stats, timeSeries, workouts, readiness } = useHealth();
	const { stepsGoal } = useProfile();

	const cardStyle = useCardStyle("standard");

	const [range, setRange] = useState<RangeKey>("1W");
	const rangeDays = RANGES.find((r) => r.key === range)!.days;

	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

	const bucketCount = useMemo(() => {
		if (rangeDays <= 7) return 7;
		if (rangeDays <= 30) return 8;
		if (rangeDays <= 90) return 9;
		if (rangeDays <= 180) return 9;
		return 12;
	}, [rangeDays]);

	const buckets = useMemo(
		() => buildBuckets(rangeDays, bucketCount),
		[rangeDays, bucketCount],
	);

	// ── Workout Calories (Active Energy) ──────────────────────────────────────
	const caloriesData = useMemo(() => {
		return buckets.map((b) => {
			const cal = workouts
				.filter((w) => {
					const d = new Date(w.startDate);
					return d >= b.start && d < b.end;
				})
				.reduce((acc, w) => acc + w.calories, 0);
			return { label: b.label, value: Math.round(cal) };
		});
	}, [buckets, workouts]);

	// ── Workout frequency ────────────────────────────────────────────────────
	const workoutsData = useMemo(() => {
		return buckets.map((b) => {
			const count = workouts.filter((w) => {
				const d = new Date(w.startDate);
				return d >= b.start && d < b.end;
			}).length;
			return { label: b.label, value: count };
		});
	}, [buckets, workouts]);

	// ── Avg session duration ─────────────────────────────────────────────────
	const durationData = useMemo(() => {
		return buckets.map((b) => {
			const inBucket = workouts.filter((w) => {
				const d = new Date(w.startDate);
				return d >= b.start && d < b.end;
			});
			const avg =
				inBucket.length > 0
					? inBucket.reduce((a, w) => a + w.durationMinutes, 0) /
						inBucket.length
					: 0;
			return { label: b.label, value: Math.round(avg) };
		});
	}, [buckets, workouts]);

	// ── Summaries ────────────────────────────────────────────────────────────
	const totalCalories = caloriesData.reduce((a, b) => a + b.value, 0);
	const totalWorkouts = workoutsData.reduce((a, b) => a + b.value, 0);
	const avgCalories =
		totalWorkouts > 0 ? Math.round(totalCalories / totalWorkouts) : 0;
	const avgDurationMin =
		durationData.filter((d) => d.value > 0).length > 0
			? Math.round(
					durationData.reduce((a, b) => a + b.value, 0) /
						durationData.filter((d) => d.value > 0).length,
				)
			: 0;

	const caloriesDelta = halfDelta(caloriesData.map((d) => d.value));
	const workoutsDelta = halfDelta(workoutsData.map((d) => d.value));
	const durationDelta = halfDelta(durationData.map((d) => d.value));

	// ── Health time-series ───────────────────────────────────────────────────
	const hrvData = useMemo(
		() => bucketHealthSamples(timeSeries.hrv, buckets, "avg"),
		[timeSeries.hrv, buckets],
	);
	const rhrData = useMemo(
		() => bucketHealthSamples(timeSeries.resting_hr, buckets, "avg"),
		[timeSeries.resting_hr, buckets],
	);
	const sleepData = useMemo(
		() => bucketHealthSamples(timeSeries.sleep_history, buckets, "avg"),
		[timeSeries.sleep_history, buckets],
	);
	const weightData = useMemo(
		() => bucketHealthSamples(timeSeries.body_weight, buckets, "last"),
		[timeSeries.body_weight, buckets],
	);
	const vo2Data = useMemo(
		() => bucketHealthSamples(timeSeries.vo2max, buckets, "last"),
		[timeSeries.vo2max, buckets],
	);
	const spo2Data = useMemo(
		() => bucketHealthSamples(timeSeries.spo2, buckets, "avg"),
		[timeSeries.spo2, buckets],
	);
	const respData = useMemo(
		() => bucketHealthSamples(timeSeries.respiratory, buckets, "avg"),
		[timeSeries.respiratory, buckets],
	);
	const readinessHistData = useMemo(
		() => bucketHealthSamples(timeSeries.readiness, buckets, "avg"),
		[timeSeries.readiness, buckets],
	);

	// ── Steps — now shown as a line chart ────────────────────────────────────
	const stepsHistData = useMemo(
		() => bucketHealthSamples(timeSeries.steps_history, buckets, "sum"),
		[timeSeries.steps_history, buckets],
	);

	// ── Latest scalar values for display ─────────────────────────────────────
	const latestHrv =
		timeSeries.hrv.length > 0
			? timeSeries.hrv[timeSeries.hrv.length - 1].value
			: stats.todayHrv;
	const latestRhr =
		timeSeries.resting_hr.length > 0
			? timeSeries.resting_hr[timeSeries.resting_hr.length - 1].value
			: stats.todayRestingHr;
	const latestWeight =
		timeSeries.body_weight.length > 0
			? timeSeries.body_weight[timeSeries.body_weight.length - 1].value
			: stats.bodyWeightKg;
	const latestVo2 =
		timeSeries.vo2max.length > 0
			? timeSeries.vo2max[timeSeries.vo2max.length - 1].value
			: stats.vo2Max;

	const avgSleepInRange =
		sleepData.filter((d) => d.value > 0).length > 0
			? sleepData.reduce((a, b) => a + b.value, 0) /
				sleepData.filter((d) => d.value > 0).length
			: 0;

	const avgStepsInRange =
		stepsHistData.filter((d) => d.value > 0).length > 0
			? Math.round(
					stepsHistData.reduce((a, b) => a + b.value, 0) /
						stepsHistData.filter((d) => d.value > 0).length,
				)
			: 0;

	// ── Deltas ───────────────────────────────────────────────────────────────
	const hrvDelta = halfDelta(hrvData.map((d) => d.value));
	const rhrDelta = halfDelta(rhrData.map((d) => d.value));
	const sleepDelta = halfDelta(sleepData.map((d) => d.value));
	const weightDelta = halfDelta(weightData.map((d) => d.value));
	const readinessDelta = halfDelta(readinessHistData.map((d) => d.value));
	const stepsDelta = halfDelta(stepsHistData.map((d) => d.value));

	const rangeLabel = RANGES.find((r) => r.key === range)!.label;

	return (
		<View style={{ flex: 1 }}>
			<AnimatedBackground />
			<ScrollView
				style={{ flex: 1, backgroundColor: "transparent" }}
				contentContainerStyle={[
					styles.content,
					// Match the + 16 padding
					{ paddingTop: topPad + 16, paddingBottom: botPad + 80 },
				]}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="never"
			>
				{/* ── Unified Header ── */}
				<View style={styles.screenHeader}>
					<Text style={[styles.screenTitle, { color: colors.foreground }]}>
						Trends
					</Text>
				</View>

				{/* ── Range Selector ── */}
				<RangeSelector selected={range} onChange={setRange} />

				{/* ═══════════════════════════════════════════════════════════════
			    ── Health Section ─────────────────────────────────────────── */}
				{isConnected && (
					<>
						<Text
							style={[
								styles.sectionHeading,
								{ color: colors.foreground, marginTop: 8 },
							]}
						>
							Health · {rangeLabel}
						</Text>

						{/* ── Readiness Score History ── */}
						{readiness !== null && (
							<Pressable
								onPress={() =>
									router.push({
										pathname: "/metric-detail",
										params: { metric: "readiness" },
									})
								}
								style={({ pressed }) => [
									{
										opacity: pressed ? 0.85 : 1,
										transform: [{ scale: pressed ? 0.99 : 1 }],
									},
								]}
							>
								<GlassView
									colorScheme={resolvedScheme}
									style={[styles.readinessSummaryCard, cardStyle]}
								>
									{(() => {
										const readinessColor = getReadinessColor(
											readiness.level ?? 0,
										);
										const iconBg =
											readiness.level === 3
												? "rgba(0, 229, 255, 0.12)"
												: readiness.level === 2
													? "rgba(255, 159, 10, 0.12)"
													: readiness.level === 1
														? "rgba(255, 45, 85, 0.12)"
														: "rgba(100, 116, 139, 0.12)";
										return (
											<View style={styles.readinessCardHeader}>
												<View
													style={[
														styles.readinessIconWrap,
														{ backgroundColor: iconBg },
													]}
												>
													<Ionicons
														name="flash"
														size={18}
														color={readinessColor}
													/>
												</View>
												<View style={{ flex: 1 }}>
													<Text
														style={[
															styles.cardTitle,
															{ color: colors.foreground },
														]}
													>
														Readiness Score
													</Text>
													{readinessDelta !== null && readiness.hasData && (
														<View
															style={[
																styles.deltaBadge,
																{
																	backgroundColor:
																		(readinessDelta >= 0
																			? readinessColor
																			: "#EF4444") + "18",
																},
															]}
														>
															<Ionicons
																name={
																	readinessDelta >= 0
																		? "arrow-up"
																		: "arrow-down"
																}
																size={10}
																color={
																	readinessDelta >= 0
																		? readinessColor
																		: "#EF4444"
																}
															/>
															<Text
																style={[
																	styles.deltaText,
																	{
																		color:
																			readinessDelta >= 0
																				? readinessColor
																				: "#EF4444",
																	},
																]}
															>
																{Math.abs(readinessDelta).toFixed(0)}%
															</Text>
														</View>
													)}
												</View>
												<View style={styles.cardValueBlock}>
													<Text
														style={[
															styles.cardValue,
															{
																color: readinessColor,
																fontSize: 26,
																fontWeight: "800",
															},
														]}
													>
														{readiness.hasData ? readiness.score : "—"}
													</Text>
													<Text
														style={[
															styles.cardUnit,
															{ color: colors.mutedForeground },
														]}
													>
														/ 100
													</Text>
												</View>
											</View>
										);
									})()}

									{/* Pillar breakdown */}
									{readiness.hasData && (
										<View
											style={[
												styles.pillarRow,
												{ borderTopColor: colors.separator },
											]}
										>
											{[
												{
													label: "HRV",
													value: readiness.hrv,
													color: METRIC_COLORS.hrv,
												},
												{
													label: "Sleep",
													value:
														readiness.sleep !== null ? readiness.sleep : "—",
													color: METRIC_COLORS.sleep,
												},
												{
													label: "HR",
													value: readiness.rhr,
													color: METRIC_COLORS.restingHr,
												},
												{
													label: "Load",
													value: readiness.load,
													color: METRIC_COLORS.activeTime,
												},
											].map((p) => (
												<View key={p.label} style={styles.pillarItem}>
													<Text
														style={[styles.pillarValue, { color: p.color }]}
													>
														{p.value}
													</Text>
													<Text
														style={[
															styles.pillarLabel,
															{ color: colors.mutedForeground },
														]}
													>
														{p.label}
													</Text>
												</View>
											))}
										</View>
									)}

									{/* Readiness history — line chart */}
									{readinessHistData.some((d) => d.value > 0) ? (
										<LineChart
											data={readinessHistData}
											height={64}
											accentColor={getReadinessColor(readiness.level ?? 0)}
											labelColor={colors.mutedForeground}
											guideCount={0}
											animationDuration={600}
										/>
									) : (
										<View style={styles.noDataRow}>
											<Text
												style={[
													styles.noDataText,
													{ color: colors.mutedForeground },
												]}
											>
												Score history will appear here over time
											</Text>
										</View>
									)}
								</GlassView>
							</Pressable>
						)}

						{/* ── HRV Trend ── */}
						<TrendCard
							icon={
								<MaterialCommunityIcons
									name="pulse"
									size={18}
									color={METRIC_COLORS.hrv}
								/>
							}
							title="HRV"
							value={latestHrv !== null ? fmt(latestHrv, 1) : "—"}
							unit="ms"
							delta={hrvDelta}
							positiveIsGood
							chartData={hrvData}
							accentColor={METRIC_COLORS.hrv}
							chartType="line"
							showYLabels
							formatY={(v) => `${Math.round(v)}ms`}
							note={
								latestHrv !== null
									? `Latest: ${latestHrv.toFixed(1)} ms`
									: undefined
							}
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "hrv" },
								})
							}
						/>

						{/* ── Resting HR Trend ── */}
						<TrendCard
							icon={
								<Ionicons
									name="heart"
									size={18}
									color={METRIC_COLORS.restingHr}
								/>
							}
							title="Resting Heart Rate"
							value={latestRhr !== null ? fmt(latestRhr) : "—"}
							unit="bpm"
							delta={rhrDelta}
							positiveIsGood={false}
							chartData={rhrData}
							accentColor={METRIC_COLORS.restingHr}
							chartType="line"
							showYLabels
							formatY={(v) => `${Math.round(v)}`}
							note="Falling trend = improving cardiovascular fitness"
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "restingHr" },
								})
							}
						/>

						{/* ── Sleep Duration — LINE CHART with 8h reference ── */}
						<TrendCard
							icon={
								<Ionicons name="moon" size={18} color={METRIC_COLORS.sleep} />
							}
							title="Sleep Duration"
							value={avgSleepInRange > 0 ? fmt(avgSleepInRange, 1) : "—"}
							unit="h / night"
							delta={sleepDelta}
							positiveIsGood
							chartData={sleepData}
							accentColor={METRIC_COLORS.sleep}
							chartType="line"
							referenceValue={8}
							referenceLabel="8h target"
							showYLabels
							formatY={(v) => `${v.toFixed(1)}h`}
							note={
								avgSleepInRange > 0
									? `7–9h optimal · averaging ${fmt(avgSleepInRange, 1)}h`
									: undefined
							}
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "sleep" },
								})
							}
						/>

						{/* ── Body Weight ── */}
						{(weightData.some((d) => d.value > 0) || latestWeight !== null) && (
							<TrendCard
								icon={
									<MaterialCommunityIcons
										name="scale-bathroom"
										size={18}
										color={METRIC_COLORS.weight}
									/>
								}
								title="Body Weight"
								value={latestWeight !== null ? fmt(latestWeight, 1) : "—"}
								unit="kg"
								delta={weightDelta}
								positiveIsGood={false}
								chartData={weightData}
								accentColor={METRIC_COLORS.weight}
								chartType="line"
								showYLabels
								formatY={(v) => `${v.toFixed(1)}`}
								onPress={() =>
									router.push({
										pathname: "/metric-detail",
										params: { metric: "weight" },
									})
								}
							/>
						)}

						{/* ── VO2 Max ── */}
						{(vo2Data.some((d) => d.value > 0) || latestVo2 !== null) && (
							<TrendCard
								icon={
									<Ionicons
										name="cellular"
										size={18}
										color={METRIC_COLORS.vo2max}
									/>
								}
								title="VO2 Max"
								value={latestVo2 !== null ? fmt(latestVo2, 1) : "—"}
								unit="mL/kg/min"
								delta={null}
								positiveIsGood
								chartData={vo2Data}
								accentColor={METRIC_COLORS.vo2max}
								chartType="line"
								showYLabels
								formatY={(v) => `${Math.round(v)}`}
								note="Updated by Apple Health after outdoor workouts"
								onPress={() =>
									router.push({
										pathname: "/metric-detail",
										params: { metric: "vo2max" },
									})
								}
							/>
						)}

						{/* ── Recovery Vitals (SpO2 + Respiratory) ── */}
						{(spo2Data.some((d) => d.value > 0) ||
							respData.some((d) => d.value > 0)) && (
							<Pressable
								onPress={() =>
									router.push({
										pathname: "/metric-detail",
										params: { metric: "vitals" },
									})
								}
								style={({ pressed }) => [
									{
										opacity: pressed ? 0.85 : 1,
										transform: [{ scale: pressed ? 0.99 : 1 }],
									},
								]}
							>
								<GlassView
									colorScheme={resolvedScheme}
									style={[styles.card, cardStyle]}
								>
									<View style={styles.cardHeader}>
										<View
											style={[
												styles.cardIconWrap,
												{ backgroundColor: METRIC_COLORS.spo2 + "1F" },
											]}
										>
											<Ionicons
												name="water"
												size={18}
												color={METRIC_COLORS.spo2}
											/>
										</View>
										<View style={{ flex: 1 }}>
											<Text
												style={[styles.cardTitle, { color: colors.foreground }]}
											>
												Recovery Vitals
											</Text>
											<Text
												style={[
													styles.cardSubtitle,
													{ color: colors.mutedForeground },
												]}
											>
												Blood oxygen · Respiratory rate
											</Text>
										</View>
									</View>
									<View style={styles.vitalsRow}>
										{spo2Data.some((d) => d.value > 0) && (
											<View style={styles.vitalItem}>
												<Text
													style={[
														styles.vitalValue,
														{ color: colors.foreground },
													]}
												>
													{fmt(
														spo2Data.filter((d) => d.value > 0).slice(-1)[0]
															?.value ?? 0,
														1,
													)}
													%
												</Text>
												<Text
													style={[
														styles.vitalLabel,
														{ color: colors.mutedForeground },
													]}
												>
													SpO2
												</Text>
												<LineChart
													data={spo2Data}
													height={48}
													accentColor={METRIC_COLORS.spo2}
													labelColor={colors.mutedForeground}
													guideCount={0}
													animationDuration={500}
												/>
											</View>
										)}
										{spo2Data.some((d) => d.value > 0) &&
											respData.some((d) => d.value > 0) && (
												<View
													style={[
														styles.vitalDivider,
														{ backgroundColor: colors.separator },
													]}
												/>
											)}
										{respData.some((d) => d.value > 0) && (
											<View style={styles.vitalItem}>
												<Text
													style={[
														styles.vitalValue,
														{ color: colors.foreground },
													]}
												>
													{fmt(
														respData.filter((d) => d.value > 0).slice(-1)[0]
															?.value ?? 0,
														1,
													)}{" "}
													bpm
												</Text>
												<Text
													style={[
														styles.vitalLabel,
														{ color: colors.mutedForeground },
													]}
												>
													Resp Rate
												</Text>
												<LineChart
													data={respData}
													height={48}
													accentColor={METRIC_COLORS.respiratory}
													labelColor={colors.mutedForeground}
													guideCount={0}
													animationDuration={500}
												/>
											</View>
										)}
									</View>
								</GlassView>
							</Pressable>
						)}

						{/* ── Daily Steps — now always rendered as a LINE chart ── */}
						<TrendCard
							icon={
								<MaterialCommunityIcons
									name="shoe-print"
									size={18}
									color={METRIC_COLORS.steps}
								/>
							}
							title="Daily Steps"
							value={avgStepsInRange > 0 ? fmt(avgStepsInRange) : "—"}
							unit="avg / day"
							delta={stepsDelta}
							positiveIsGood
							chartData={stepsHistData}
							accentColor={METRIC_COLORS.steps}
							chartType="line"
							referenceValue={stepsGoal}
							referenceLabel={`${(stepsGoal / 1000).toFixed(1).replace(/\.0$/, "")}k goal`}
							showYLabels
							formatY={(v) =>
								v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${Math.round(v)}`
							}
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "steps" },
								})
							}
						/>
					</>
				)}

				{/* ═══════════════════════════════════════════════════════════════
			    ── Training Section ───────────────────────────────────────── */}
				{totalWorkouts !== 0 ? (
					<>
						<Text style={[styles.sectionHeading, { color: colors.foreground }]}>
							Workouts · {rangeLabel}
						</Text>

						<TrendCard
							icon={
								<Ionicons
									name="heart"
									size={18}
									color={METRIC_COLORS.workout}
								/>
							}
							title="Workouts"
							value={fmt(totalWorkouts)}
							unit="sessions"
							delta={workoutsDelta}
							positiveIsGood
							chartData={workoutsData}
							accentColor={METRIC_COLORS.workout}
							note={
								totalWorkouts > 0
									? `${(totalWorkouts / (rangeDays / 7)).toFixed(1)} per week on average`
									: undefined
							}
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "workouts" },
								})
							}
						/>

						<TrendCard
							icon={
								<MaterialCommunityIcons
									name="fire"
									size={18}
									color={METRIC_COLORS.calories}
								/>
							}
							title="Active Energy"
							subtitle="Avg per session"
							value={fmt(avgCalories)}
							unit="kcal"
							delta={caloriesDelta}
							positiveIsGood
							chartData={caloriesData}
							accentColor={METRIC_COLORS.calories}
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "calories" },
								})
							}
						/>

						<TrendCard
							icon={
								<Ionicons
									name="time-outline"
									size={18}
									color={METRIC_COLORS.activeTime}
								/>
							}
							title="Avg Duration"
							value={avgDurationMin > 0 ? fmt(avgDurationMin) : "—"}
							unit="min"
							delta={durationDelta}
							positiveIsGood
							chartData={durationData}
							accentColor={METRIC_COLORS.activeTime}
							onPress={() =>
								router.push({
									pathname: "/metric-detail",
									params: { metric: "duration" },
								})
							}
						/>
					</>
				) : (
					<GlassView
						colorScheme={resolvedScheme}
						style={[styles.emptyCard, cardStyle]}
					>
						<Ionicons
							name="leaf-outline"
							size={32}
							color={colors.mutedForeground}
						/>
						<Text style={[styles.emptyTitle, { color: colors.foreground }]}>
							No workout data
						</Text>
						<Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
							Sync workouts from Apple Health to see your trends here.
						</Text>
					</GlassView>
				)}
			</ScrollView>
		</View>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	content: { paddingHorizontal: 20, gap: 14 },

	screenTitle: {
		fontSize: 34,
		fontWeight: "700",
		letterSpacing: -0.5,
	},

	rangeRow: {
		flexDirection: "row",
		borderRadius: 14,
		padding: 4,
		gap: 2,
	},
	rangeBtn: {
		flex: 1,
		paddingVertical: 7,
		borderRadius: 10,
		alignItems: "center",
	},
	rangeBtnText: {
		fontSize: 13,
		fontWeight: "600",
		letterSpacing: 0.2,
	},

	sectionHeading: {
		fontSize: 18,
		fontWeight: "600",
		letterSpacing: -0.2,
		marginTop: 4,
		marginBottom: -2,
	},

	card: {
		padding: 16,
		gap: 12,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	cardIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: "600",
	},
	cardSubtitle: {
		fontSize: 12,
		marginTop: 1,
	},
	cardValueBlock: {
		alignItems: "flex-end",
		gap: 0,
	},
	cardValue: {
		fontSize: 20,
		fontWeight: "700",
		letterSpacing: -0.5,
		fontVariant: ["tabular-nums"],
	},
	cardUnit: {
		fontSize: 11,
	},
	deltaBadge: {
		maxWidth: 50,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 2,
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 8,
		marginTop: 2,
	},
	deltaText: {
		fontSize: 11,
		fontWeight: "600",
	},
	noDataRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 16,
	},
	noDataText: {
		fontSize: 13,
	},
	axisRow: {
		flexDirection: "row",
		marginTop: -4,
	},
	axisLabel: {
		fontSize: 9,
		textAlign: "center",
		letterSpacing: 0.2,
	},
	cardNote: {
		fontSize: 12,
		textAlign: "center",
		marginTop: -4,
	},

	pbCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		gap: 14,
	},
	pbIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	pbTitle: {
		fontSize: 16,
		fontWeight: "600",
	},
	pbSub: {
		fontSize: 12,
		marginTop: 2,
	},

	emptyCard: {
		padding: 32,
		alignItems: "center",
		gap: 10,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	emptyBody: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},

	readinessSummaryCard: {
		padding: 16,
		gap: 12,
	},
	readinessCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	readinessIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	pillarRow: {
		flexDirection: "row",
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 12,
		gap: 4,
	},
	pillarItem: {
		flex: 1,
		alignItems: "center",
		gap: 3,
	},
	pillarValue: {
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	pillarLabel: {
		fontSize: 11,
		letterSpacing: 0.3,
	},

	vitalsRow: {
		flexDirection: "row",
		gap: 12,
		alignItems: "flex-start",
	},
	vitalItem: {
		flex: 1,
		gap: 4,
	},
	vitalValue: {
		fontSize: 20,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	vitalLabel: {
		fontSize: 11,
		letterSpacing: 0.3,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	vitalDivider: {
		width: StyleSheet.hairlineWidth,
		alignSelf: "stretch",
		marginVertical: 4,
	},
	screenHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
});
