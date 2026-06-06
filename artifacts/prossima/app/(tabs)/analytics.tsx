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
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useTraining } from "@/context/TrainingContext";
import { useHealth } from "@/context/HealthContext";
import { BarChart } from "@/components/BarChart";

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

function startOfDay(d: Date) {
	const c = new Date(d);
	c.setHours(0, 0, 0, 0);
	return c;
}

/**
 * Divide [rangeStart, now] into `buckets` equally-sized buckets and
 * return a label per bucket.
 */
function buildBuckets(
	days: number,
	buckets: number
): { start: Date; end: Date; label: string }[] {
	const now = new Date();
	const rangeStart = startOfDay(new Date());
	rangeStart.setDate(rangeStart.getDate() - days);

	const msPerBucket = (now.getTime() - rangeStart.getTime()) / buckets;

	return Array.from({ length: buckets }, (_, i) => {
		const start = new Date(rangeStart.getTime() + i * msPerBucket);
		const end = new Date(rangeStart.getTime() + (i + 1) * msPerBucket);

		// Label: last bucket always shows "Now", others show shortest useful date
		let label: string;
		if (i === buckets - 1) {
			label = "Now";
		} else if (days <= 7) {
			label = start.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
		} else if (days <= 90) {
			label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }).replace(" ", "\n");
		} else {
			label = start.toLocaleDateString("en-US", { month: "short" });
		}

		return { start, end, label };
	});
}

/** Arrow + colour for the trend delta chip */
function trendMeta(delta: number | null): {
	icon: "arrow-up" | "arrow-down" | "remove";
	color: string;
	good: boolean;
} {
	if (delta === null || delta === 0)
		return { icon: "remove", color: "#94A3B8", good: true };
	if (delta > 0) return { icon: "arrow-up", color: "#10B981", good: true };
	return { icon: "arrow-down", color: "#EF4444", good: false };
}

function fmt(n: number, decimals = 0) {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

/** Return % delta between first and second halves of `values`. Null if no data. */
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

// ─── Mini MicroBar (inline sparkline without labels) ─────────────────────────

function MicroBar({
	data,
	accentColor,
}: {
	data: { label: string; value: number }[];
	accentColor: string;
}) {
	const colors = useColors();
	const maxValue = Math.max(...data.map((d) => d.value), 1);
	const H = 48;

	return (
		<View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: H }}>
			{data.map((item, i) => {
				const barH = maxValue > 0 ? Math.max((item.value / maxValue) * H, item.value > 0 ? 3 : 0) : 0;
				const isTop = item.value === maxValue && item.value > 0;
				return (
					<View
						key={i}
						style={{
							flex: 1,
							height: H,
							justifyContent: "flex-end",
						}}
					>
						<View
							style={{
								height: Math.max(barH, 2),
								borderRadius: 4,
								backgroundColor: isTop
									? accentColor
									: `${accentColor}44`,
							}}
						/>
					</View>
				);
			})}
		</View>
	);
}

// ─── Trend Card ──────────────────────────────────────────────────────────────

interface TrendCardProps {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	value: string;
	unit: string;
	delta: number | null;
	positiveIsGood: boolean;
	chartData: { label: string; value: number }[];
	accentColor: string;
	/** optional note below the chart */
	note?: string;
}

function TrendCard({
	icon,
	title,
	subtitle,
	value,
	unit,
	delta,
	positiveIsGood,
	chartData,
	accentColor,
	note,
}: TrendCardProps) {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const hasData = chartData.some((d) => d.value > 0);

	// Flip good/bad logic for metrics where down = bad (e.g. sleep)
	const { icon: deltaIcon, color: deltaColor } = useMemo(() => {
		if (delta === null || delta === 0)
			return { icon: "remove" as const, color: "#94A3B8" };
		const isUp = delta > 0;
		const isGood = positiveIsGood ? isUp : !isUp;
		return {
			icon: isUp ? ("arrow-up" as const) : ("arrow-down" as const),
			color: isGood ? "#10B981" : "#EF4444",
		};
	}, [delta, positiveIsGood]);

	return (
		<GlassView
			colorScheme={resolvedScheme}
			style={[
				styles.card,
				{
					backgroundColor: colors.card,
					borderRadius: 20,
					borderColor: colors.border,
				},
			]}
		>
			{/* Header row */}
			<View style={styles.cardHeader}>
				<View style={[styles.cardIconWrap, { backgroundColor: `${accentColor}18` }]}>
					{icon}
				</View>
				<View style={{ flex: 1 }}>
					<Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
					<Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
				</View>
				{/* Value + delta */}
				<View style={styles.cardValueBlock}>
					<Text style={[styles.cardValue, { color: colors.foreground }]}>
						{hasData ? value : "—"}
					</Text>
					<Text style={[styles.cardUnit, { color: colors.mutedForeground }]}>{unit}</Text>
					{delta !== null && hasData && (
						<View style={[styles.deltaBadge, { backgroundColor: `${deltaColor}18` }]}>
							<Ionicons name={deltaIcon} size={10} color={deltaColor} />
							<Text style={[styles.deltaText, { color: deltaColor }]}>
								{Math.abs(delta).toFixed(0)}%
							</Text>
						</View>
					)}
				</View>
			</View>

			{/* Mini bar chart */}
			{hasData ? (
				<MicroBar data={chartData} accentColor={accentColor} />
			) : (
				<View style={styles.noDataRow}>
					<Ionicons name="analytics-outline" size={18} color={colors.mutedForeground} />
					<Text style={[styles.noDataText, { color: colors.mutedForeground }]}>
						No data for this period
					</Text>
				</View>
			)}

			{/* X-axis labels */}
			{hasData && (
				<View style={styles.axisRow}>
					{chartData.map((d, i) => (
						<Text
							key={i}
							style={[styles.axisLabel, { color: colors.mutedForeground, flex: 1 }]}
							numberOfLines={1}
						>
							{i === 0 || i === chartData.length - 1 ? d.label : ""}
						</Text>
					))}
				</View>
			)}

			{note ? (
				<Text style={[styles.cardNote, { color: colors.mutedForeground }]}>{note}</Text>
			) : null}
		</GlassView>
	);
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
		<View style={[styles.rangeRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TrendsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { sessions } = useTraining();
	const { isConnected, stats } = useHealth();

	const [range, setRange] = useState<RangeKey>("1W");
	const rangeDays = RANGES.find((r) => r.key === range)!.days;

	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

	// Bucket count: keep bars readable
	const bucketCount = useMemo(() => {
		if (rangeDays <= 7) return 7;
		if (rangeDays <= 30) return 8;
		if (rangeDays <= 90) return 9;
		if (rangeDays <= 180) return 9;
		return 12;
	}, [rangeDays]);

	const buckets = useMemo(
		() => buildBuckets(rangeDays, bucketCount),
		[rangeDays, bucketCount]
	);

	// ── Training Volume per bucket ───────────────────────────────────────────
	const volumeData = useMemo(() => {
		return buckets.map((b) => {
			const vol = sessions
				.filter((s) => {
					const d = new Date(s.date);
					return d >= b.start && d < b.end;
				})
				.reduce(
					(acc, s) =>
						acc +
						s.entries.reduce(
							(a, e) => (e.weightKg && e.reps ? a + e.weightKg * e.reps : a),
							0
						),
					0
				);
			return { label: b.label, value: Math.round(vol) };
		});
	}, [buckets, sessions]);

	// ── Workout frequency (session count) per bucket ─────────────────────────
	const workoutsData = useMemo(() => {
		return buckets.map((b) => {
			const count = sessions.filter((s) => {
				const d = new Date(s.date);
				return d >= b.start && d < b.end;
			}).length;
			return { label: b.label, value: count };
		});
	}, [buckets, sessions]);

	// ── Avg session duration per bucket ─────────────────────────────────────
	const durationData = useMemo(() => {
		return buckets.map((b) => {
			const inBucket = sessions.filter((s) => {
				const d = new Date(s.date);
				return d >= b.start && d < b.end;
			});
			const avg =
				inBucket.length > 0
					? inBucket.reduce((a, s) => a + s.durationSeconds, 0) /
					  inBucket.length /
					  60
					: 0;
			return { label: b.label, value: Math.round(avg) };
		});
	}, [buckets, sessions]);

	// ── Aggregate summaries ──────────────────────────────────────────────────
	const totalVolume = volumeData.reduce((a, b) => a + b.value, 0);
	const totalWorkouts = workoutsData.reduce((a, b) => a + b.value, 0);
	const avgDurationMin =
		durationData.filter((d) => d.value > 0).length > 0
			? Math.round(
					durationData.reduce((a, b) => a + b.value, 0) /
						durationData.filter((d) => d.value > 0).length
			  )
			: 0;

	// Deltas (compare first half vs second half of period)
	const volumeDelta = halfDelta(volumeData.map((d) => d.value));
	const workoutsDelta = halfDelta(workoutsData.map((d) => d.value));
	const durationDelta = halfDelta(durationData.map((d) => d.value));

	// ── Personal bests count in window ──────────────────────────────────────
	const pbInWindow = useMemo(() => {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - rangeDays);
		return sessions
			.filter((s) => new Date(s.date) >= cutoff)
			.flatMap((s) => s.entries)
			.filter((e) => e.personalBest).length;
	}, [sessions, rangeDays]);

	// ── Health data (today only — HealthKit does not give historical per-day) ─
	// We show today's live values as single-point "snapshot" tiles when connected.
	// For the bar charts of health metrics, we can only show what's in sessions.
	// Apple HealthKit historical queries are out of scope here (would require
	// storing time-series ourselves), so we show a "Live Today" card.

	const rangeLabel = RANGES.find((r) => r.key === range)!.label;

	return (
		<ScrollView
			style={{ flex: 1 }}
			contentContainerStyle={[
				styles.content,
				{ paddingTop: topPad, paddingBottom: botPad + 80 },
			]}
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="never"
		>
			{/* ── Header ── */}
			<Text style={[styles.screenTitle, { color: colors.foreground }]}>Trends</Text>

			{/* ── Range Selector ── */}
			<RangeSelector selected={range} onChange={setRange} />

			{/* ── Live Health Snapshot (Apple Health) ── */}
			{isConnected && (
				<>
					<Text style={[styles.sectionHeading, { color: colors.foreground }]}>
						Today's Health
					</Text>

					<View style={styles.healthRow}>
						{/* Sleep */}
						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.healthTile,
								{ backgroundColor: colors.card, borderColor: colors.border },
							]}
						>
							<View style={[styles.tileIcon, { backgroundColor: "rgba(88,86,214,0.12)" }]}>
								<Ionicons name="moon" size={16} color="#5856D6" />
							</View>
							<Text style={[styles.tileValue, { color: colors.foreground }]}>
								{stats.sleepHours > 0
									? `${Math.floor(stats.sleepHours)}h ${Math.round((stats.sleepHours % 1) * 60)}m`
									: "—"}
							</Text>
							<Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>
								Sleep
							</Text>
						</GlassView>

						{/* Steps */}
						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.healthTile,
								{ backgroundColor: colors.card, borderColor: colors.border },
							]}
						>
							<View style={[styles.tileIcon, { backgroundColor: "rgba(0,180,216,0.12)" }]}>
								<MaterialCommunityIcons name="shoe-print" size={16} color="#00B4D8" />
							</View>
							<Text style={[styles.tileValue, { color: colors.foreground }]}>
								{stats.steps > 0 ? fmt(stats.steps) : "—"}
							</Text>
							<Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>
								Steps
							</Text>
						</GlassView>

						{/* Active cal */}
						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.healthTile,
								{ backgroundColor: colors.card, borderColor: colors.border },
							]}
						>
							<View style={[styles.tileIcon, { backgroundColor: "rgba(255,107,0,0.12)" }]}>
								<MaterialCommunityIcons name="fire" size={16} color="#FF6B00" />
							</View>
							<Text style={[styles.tileValue, { color: colors.foreground }]}>
								{stats.calories > 0 ? fmt(stats.calories) : "—"}
							</Text>
							<Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>
								Cal
							</Text>
						</GlassView>

						{/* Activity time */}
						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.healthTile,
								{ backgroundColor: colors.card, borderColor: colors.border },
							]}
						>
							<View style={[styles.tileIcon, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
								<Ionicons name="timer-outline" size={16} color="#10B981" />
							</View>
							<Text style={[styles.tileValue, { color: colors.foreground }]}>
								{stats.activityTime > 0 ? `${stats.activityTime}m` : "—"}
							</Text>
							<Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>
								Active
							</Text>
						</GlassView>
					</View>
				</>
			)}

			{/* ── Training Trend Cards ── */}
			<Text style={[styles.sectionHeading, { color: colors.foreground }]}>
				Training · {rangeLabel}
			</Text>

			{/* Workout Frequency */}
			<TrendCard
				icon={<Ionicons name="barbell" size={18} color="#5856D6" />}
				title="Workouts"
				subtitle="Sessions logged"
				value={fmt(totalWorkouts)}
				unit="sessions"
				delta={workoutsDelta}
				positiveIsGood
				chartData={workoutsData}
				accentColor="#5856D6"
				note={
					totalWorkouts > 0
						? `${(totalWorkouts / (rangeDays / 7)).toFixed(1)} per week on average`
						: undefined
				}
			/>

			{/* Training Volume */}
			<TrendCard
				icon={<MaterialCommunityIcons name="dumbbell" size={18} color="#00B4D8" />}
				title="Volume"
				subtitle="Total weight lifted"
				value={
					totalVolume >= 1000
						? fmt(totalVolume / 1000, 1)
						: fmt(totalVolume)
				}
				unit={totalVolume >= 1000 ? "tonnes" : "kg"}
				delta={volumeDelta}
				positiveIsGood
				chartData={volumeData}
				accentColor="#00B4D8"
			/>

			{/* Avg Session Duration */}
			<TrendCard
				icon={<Ionicons name="time-outline" size={18} color="#10B981" />}
				title="Avg Duration"
				subtitle="Per session"
				value={avgDurationMin > 0 ? fmt(avgDurationMin) : "—"}
				unit="min"
				delta={durationDelta}
				positiveIsGood
				chartData={durationData}
				accentColor="#10B981"
			/>

			{/* Personal Bests */}
			{pbInWindow > 0 && (
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.pbCard,
						{
							backgroundColor: colors.card,
							borderRadius: 20,
							borderColor: colors.border,
						},
					]}
				>
					<View style={[styles.pbIconWrap, { backgroundColor: "rgba(255,215,0,0.12)" }]}>
						<Ionicons name="star" size={20} color="#FFD700" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.pbTitle, { color: colors.foreground }]}>
							{pbInWindow} Personal Best{pbInWindow > 1 ? "s" : ""}
						</Text>
						<Text style={[styles.pbSub, { color: colors.mutedForeground }]}>
							Achieved in the last {rangeLabel}
						</Text>
					</View>
				</GlassView>
			)}

			{/* Empty state */}
			{totalWorkouts === 0 && (
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
					<Ionicons name="leaf-outline" size={32} color={colors.mutedForeground} />
					<Text style={[styles.emptyTitle, { color: colors.foreground }]}>
						No training data
					</Text>
					<Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
						Complete sessions to see your trends here.
					</Text>
				</GlassView>
			)}
		</ScrollView>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	content: { paddingHorizontal: 20, gap: 14 },

	screenTitle: {
		fontSize: 32,
		fontWeight: "700",
		letterSpacing: -0.5,
		lineHeight: 36,
		marginBottom: 4,
	},

	// Range selector
	rangeRow: {
		flexDirection: "row",
		borderRadius: 14,
		padding: 4,
		gap: 2,
		borderWidth: StyleSheet.hairlineWidth,
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

	// Health tiles row
	healthRow: {
		flexDirection: "row",
		gap: 10,
	},
	healthTile: {
		flex: 1,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 6,
		gap: 6,
	},
	tileIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	tileValue: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.3,
		textAlign: "center",
	},
	tileLabel: {
		fontSize: 10,
		letterSpacing: 0.3,
		textTransform: "uppercase",
	},

	// Trend card
	card: {
		padding: 16,
		gap: 12,
		borderWidth: StyleSheet.hairlineWidth,
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
		gap: 2,
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
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
		paddingHorizontal: 6,
		paddingVertical: 2,
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

	// Personal bests card
	pbCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		gap: 14,
		borderWidth: StyleSheet.hairlineWidth,
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

	// Empty
	emptyCard: {
		padding: 32,
		alignItems: "center",
		gap: 10,
		borderWidth: StyleSheet.hairlineWidth,
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
});
