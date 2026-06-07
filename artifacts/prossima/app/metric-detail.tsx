import React, { useState, useMemo, useRef, useEffect } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	Pressable,
	Platform,
	Dimensions,
	Animated,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import Svg, { Path, Line, Circle, Text as SvgText } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useHealth } from "@/context/HealthContext";
import { METRIC_DETAILS, MetricConfig } from "@/constants/metrics";
import { DailyHealthSample } from "@/context/HealthStore";
import { BlurView } from "expo-blur";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RangeKey = "1W" | "1M" | "3M" | "6M" | "1Y";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
	{ key: "1W", label: "1W", days: 7 },
	{ key: "1M", label: "1M", days: 30 },
	{ key: "3M", label: "3M", days: 90 },
	{ key: "6M", label: "6M", days: 180 },
	{ key: "1Y", label: "1Y", days: 365 },
];

function startOfDay(d: Date) {
	const c = new Date(d);
	c.setHours(0, 0, 0, 0);
	return c;
}

function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	d.setHours(0, 0, 0, 0);
	return d;
}

function toDateStr(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function fmt(n: number, decimals = 0) {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

function fmtDateLabel(dateStr: string) {
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	} catch {
		return dateStr;
	}
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
				.slice(0, 3);
		} else if (days <= 90) {
			label = start.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		} else {
			label = start.toLocaleDateString("en-US", { month: "short" });
		}

		return { start, end, label };
	});
}

function bucketHealthSamples(
	samples: DailyHealthSample[],
	buckets: { start: Date; end: Date; label: string }[],
	mode: "avg" | "sum" | "last" = "avg",
): { label: string; value: number; dateStr: string }[] {
	return buckets.map((b) => {
		const inRange = samples.filter((s) => {
			const d = new Date(s.date);
			return d >= b.start && d < b.end;
		});
		if (inRange.length === 0) {
			return {
				label: b.label,
				value: 0,
				dateStr: toDateStr(b.start),
			};
		}
		let value: number;
		if (mode === "sum") {
			value = inRange.reduce((a, s) => a + s.value, 0);
		} else if (mode === "last") {
			value = inRange[inRange.length - 1].value;
		} else {
			value = inRange.reduce((a, s) => a + s.value, 0) / inRange.length;
		}
		return {
			label: b.label,
			value: Math.round(value * 10) / 10,
			dateStr: toDateStr(b.start),
		};
	});
}

// ─── Scrubbing Line Chart Component ──────────────────────────────────────────

interface ChartPoint {
	label: string;
	value: number;
	dateStr: string;
}

interface ScrubbingLineChartProps {
	data: ChartPoint[];
	height?: number;
	accentColor: string;
	allowZero?: boolean;
	startFromZero?: boolean;
	referenceValue?: number;
	referenceLabel?: string;
	unit: string;
	labelColor?: string;
	onScrub: (
		point: {
			label: string;
			value: number;
			dateStr: string;
			index: number;
		} | null,
	) => void;
	onScrubStatusChange: (isScrubbing: boolean) => void;
}

function smoothPath(points: { x: number; y: number }[]): string {
	if (points.length === 0) return "";
	if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const cpX = (curr.x - prev.x) / 3;
		const cp1x = prev.x + cpX;
		const cp2x = curr.x - cpX;
		d += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`;
	}
	return d;
}

function areaPath(
	points: { x: number; y: number }[],
	baselineY: number,
): string {
	if (points.length === 0) return "";
	const line = smoothPath(points);
	const last = points[points.length - 1];
	const first = points[0];
	return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function ScrubbingLineChart({
	data,
	height = 200,
	accentColor,
	allowZero = false,
	startFromZero = true,
	referenceValue,
	referenceLabel,
	unit,
	labelColor = "#94A3B8",
	onScrub,
	onScrubStatusChange,
}: ScrubbingLineChartProps) {
	const [containerWidth, setContainerWidth] = useState(
		Dimensions.get("window").width - 40,
	);
	const progress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		progress.setValue(0);
		Animated.timing(progress, {
			toValue: 1,
			duration: 700,
			useNativeDriver: false,
		}).start();
	}, [data]);

	const PAD_LEFT = 36;
	const PAD_RIGHT = 12;
	const PAD_TOP = 16;
	const AXIS_HEIGHT = 20;

	const chartW = containerWidth - PAD_LEFT - PAD_RIGHT;
	const chartH = height - PAD_TOP - AXIS_HEIGHT;

	const hasData = data.some((d) => allowZero || d.value > 0);

	const { chartMin, chartMax, chartRange } = useMemo(() => {
		if (!hasData || data.length === 0) {
			return { chartMin: 0, chartMax: 1, chartRange: 1 };
		}
		const values = data.map((d) => (allowZero || d.value > 0 ? d.value : NaN));
		const nonNaN = values.filter((v) => !isNaN(v));
		if (nonNaN.length === 0) {
			return { chartMin: 0, chartMax: 1, chartRange: 1 };
		}

		const minVal = startFromZero ? 0 : Math.min(...nonNaN);
		const peakVal = Math.max(...nonNaN);
		const maxVal = peakVal > 0 ? peakVal * 1.12 : 1;
		const range = maxVal - minVal || 1;

		return { chartMin: minVal, chartMax: maxVal, chartRange: range };
	}, [data, hasData, allowZero, startFromZero]);

	const points = useMemo(() => {
		if (!hasData || data.length === 0) return [];
		return data.map((d, i) => {
			const x = PAD_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;
			const val = allowZero || d.value > 0 ? d.value : NaN;
			const y = isNaN(val)
				? NaN
				: PAD_TOP + chartH - ((val - chartMin) / chartRange) * chartH;
			return { x, y, value: val, label: d.label, dateStr: d.dateStr };
		});
	}, [
		data,
		chartW,
		chartH,
		PAD_LEFT,
		PAD_TOP,
		hasData,
		allowZero,
		chartMin,
		chartRange,
	]);

	const validPoints = useMemo(
		() => points.filter((p) => !isNaN(p.y)),
		[points],
	);

	const linePathStr = useMemo(() => smoothPath(validPoints), [validPoints]);
	const fillPathStr = useMemo(
		() => areaPath(validPoints, PAD_TOP + chartH),
		[validPoints, PAD_TOP, chartH],
	);

	const pathLength = chartW * 2;
	const strokeDashoffset = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [pathLength, 0],
	});

	// Guides calculation (always draw 3 lines: min, mid, max)
	const guides = useMemo(() => {
		if (!hasData) return [];
		return [0, 0.5, 1].map((frac) => {
			const val = chartMin + frac * chartRange;
			const yPos = PAD_TOP + chartH - frac * chartH;
			return { val, yPos };
		});
	}, [hasData, PAD_TOP, chartH, chartMin, chartRange]);

	const refLineY = useMemo(() => {
		if (referenceValue === undefined || !hasData) return null;
		const frac = (referenceValue - chartMin) / chartRange;
		if (frac < 0 || frac > 1.2) return null; // out of chart bounds
		return PAD_TOP + chartH - frac * chartH;
	}, [referenceValue, hasData, PAD_TOP, chartH, chartMin, chartRange]);

	// ── Scrub Touch Event Handler ─────────────────────────────────────────────
	const [activeScrubIndex, setActiveScrubIndex] = useState<number | null>(null);

	const handleGesture = (evt: any) => {
		const { locationX } = evt.nativeEvent;
		const relativeX = (locationX - PAD_LEFT) / chartW;
		let index = Math.round(relativeX * (data.length - 1));
		index = Math.max(0, Math.min(data.length - 1, index));

		if (data[index] && (allowZero || data[index].value > 0)) {
			setActiveScrubIndex(index);
			onScrub({
				label: data[index].label,
				value: data[index].value,
				dateStr: data[index].dateStr,
				index,
			});
		}
	};

	const startScrubbing = (evt: any) => {
		onScrubStatusChange(true);
		handleGesture(evt);
	};

	const endScrubbing = () => {
		onScrubStatusChange(false);
		setActiveScrubIndex(null);
		onScrub(null);
	};

	const gradientId = `scrub_lg_${accentColor.replace("#", "")}`;

	return (
		<View
			style={[styles.chartWrapper, { height: height + AXIS_HEIGHT }]}
			onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
			onStartShouldSetResponder={() => true}
			onMoveShouldSetResponder={() => true}
			onResponderGrant={startScrubbing}
			onResponderMove={handleGesture}
			onResponderRelease={endScrubbing}
			onResponderTerminate={endScrubbing}
		>
			<Svg
				width={containerWidth}
				height={height + AXIS_HEIGHT}
				style={StyleSheet.absoluteFill}
			>
				{/* Horizontal Guides */}
				{guides.map((g, i) => (
					<React.Fragment key={i}>
						<Line
							x1={PAD_LEFT}
							y1={g.yPos}
							x2={PAD_LEFT + chartW}
							y2={g.yPos}
							stroke={labelColor}
							strokeOpacity={0.1}
							strokeWidth={1}
						/>
						<SvgText
							x={PAD_LEFT - 6}
							y={g.yPos + 3}
							fontSize={9}
							fill={labelColor}
							textAnchor="end"
						>
							{fmt(g.val)}
						</SvgText>
					</React.Fragment>
				))}

				{/* Reference Value Line */}
				{refLineY !== null && (
					<>
						<Line
							x1={PAD_LEFT}
							y1={refLineY}
							x2={PAD_LEFT + chartW}
							y2={refLineY}
							stroke={accentColor}
							strokeOpacity={0.4}
							strokeWidth={1}
							strokeDasharray="4 3"
						/>
						{referenceLabel && (
							<SvgText
								x={PAD_LEFT + chartW - 2}
								y={refLineY - 4}
								fontSize={9}
								fill={accentColor}
								fillOpacity={0.7}
								textAnchor="end"
							>
								{referenceLabel}
							</SvgText>
						)}
					</>
				)}

				{hasData ? (
					<>
						{/* Area Fill */}
						<Path d={fillPathStr} fill={`url(#${gradientId})`} />

						{/* Animated Line Path */}
						<AnimatedPath
							d={linePathStr}
							stroke={accentColor}
							strokeWidth={2.5}
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeDasharray={pathLength}
							strokeDashoffset={strokeDashoffset}
						/>

						{/* Interactive Scrub Line & Dot */}
						{activeScrubIndex !== null && points[activeScrubIndex] && (
							<>
								{/* Vertical line indicator */}
								<Line
									x1={points[activeScrubIndex].x}
									y1={PAD_TOP}
									x2={points[activeScrubIndex].x}
									y2={PAD_TOP + chartH}
									stroke={accentColor}
									strokeOpacity={0.4}
									strokeWidth={1}
								/>
								{/* Highlighted dot shadow */}
								<Circle
									cx={points[activeScrubIndex].x}
									cy={points[activeScrubIndex].y}
									r={6}
									fill={accentColor}
									fillOpacity={0.3}
								/>
								{/* Highlighted dot center */}
								<Circle
									cx={points[activeScrubIndex].x}
									cy={points[activeScrubIndex].y}
									r={3.5}
									fill="white"
									stroke={accentColor}
									strokeWidth={2}
								/>
							</>
						)}
					</>
				) : (
					/* Dashed center baseline if no data */
					<Line
						x1={PAD_LEFT}
						y1={PAD_TOP + chartH / 2}
						x2={PAD_LEFT + chartW}
						y2={PAD_TOP + chartH / 2}
						stroke={labelColor}
						strokeOpacity={0.2}
						strokeWidth={1}
						strokeDasharray="4 4"
					/>
				)}

				{/* X-Axis Labels */}
				{data.map((d, i) => {
					// Draw labels only for 1st, middle, and last points if range is large, else step-wise
					const isFirst = i === 0;
					const isLast = i === data.length - 1;
					const isMid = i === Math.floor(data.length / 2);
					const shouldShow =
						data.length <= 7 ? true : isFirst || isLast || isMid;

					if (!shouldShow) return null;

					const x = PAD_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;
					return (
						<SvgText
							key={i}
							x={x}
							y={height + AXIS_HEIGHT - 4}
							fontSize={9}
							fill={labelColor}
							textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
						>
							{d.label}
						</SvgText>
					);
				})}
			</Svg>
		</View>
	);
}

// ─── Main Details Screen Component ───────────────────────────────────────────

export default function MetricDetailScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { metric: metricParam } = useLocalSearchParams<{ metric: string }>();
	const { isConnected, stats, timeSeries, workouts, readiness } = useHealth();

	const [range, setRange] = useState<RangeKey>("1W");
	const [scrollEnabled, setScrollEnabled] = useState(true);
	const [scrubbedPoint, setScrubbedPoint] = useState<{
		label: string;
		value: number;
		dateStr: string;
	} | null>(null);

	// Safe parameter resolving
	const metric = metricParam || "readiness";
	const config: MetricConfig | undefined = METRIC_DETAILS[metric];

	if (!config) {
		return (
			<View
				style={[
					styles.fallbackContainer,
					{ backgroundColor: colors.background },
				]}
			>
				<Text style={[styles.fallbackText, { color: colors.foreground }]}>
					Metric not found
				</Text>
				<Pressable style={styles.backBtn} onPress={() => router.back()}>
					<Text style={{ color: "#FFF", fontWeight: "700" }}>Go Back</Text>
				</Pressable>
			</View>
		);
	}

	const rangeDays = RANGES.find((r) => r.key === range)!.days;

	// Bucket calculations depending on range
	const bucketCount = useMemo(() => {
		if (rangeDays <= 7) return 7;
		if (rangeDays <= 30) return 8;
		return 9;
	}, [rangeDays]);

	const buckets = useMemo(
		() => buildBuckets(rangeDays, bucketCount),
		[rangeDays, bucketCount],
	);

	// Toggle sub-metric for "vitals" (Blood Oxygen vs. Respiratory Rate)
	const [vitalsSubMetric, setVitalsSubMetric] = useState<"spo2" | "resp">(
		"spo2",
	);

	// ── Extract Time-Series data for current metric ──
	const chartData = useMemo((): ChartPoint[] => {
		switch (metric) {
			case "readiness":
				return bucketHealthSamples(timeSeries.readiness, buckets, "avg");
			case "hrv":
				return bucketHealthSamples(timeSeries.hrv, buckets, "avg");
			case "restingHr":
				return bucketHealthSamples(timeSeries.resting_hr, buckets, "avg");
			case "sleep":
				return bucketHealthSamples(timeSeries.sleep_history, buckets, "avg");
			case "weight":
				return bucketHealthSamples(timeSeries.body_weight, buckets, "last");
			case "vo2max":
				return bucketHealthSamples(timeSeries.vo2max, buckets, "last");
			case "vitals":
				return bucketHealthSamples(
					vitalsSubMetric === "spo2" ? timeSeries.spo2 : timeSeries.respiratory,
					buckets,
					"avg",
				);
			case "steps":
				return bucketHealthSamples(timeSeries.steps_history, buckets, "sum");
			case "workouts":
				return buckets.map((b) => {
					const count = workouts.filter((w) => {
						const d = new Date(w.startDate);
						return d >= b.start && d < b.end;
					}).length;
					return { label: b.label, value: count, dateStr: toDateStr(b.start) };
				});
			case "calories":
				return buckets.map((b) => {
					const kcal = workouts
						.filter((w) => {
							const d = new Date(w.startDate);
							return d >= b.start && d < b.end;
						})
						.reduce((acc, w) => acc + w.calories, 0);
					return { label: b.label, value: kcal, dateStr: toDateStr(b.start) };
				});
			case "duration":
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
					return {
						label: b.label,
						value: Math.round(avg),
						dateStr: toDateStr(b.start),
					};
				});
			default:
				return [];
		}
	}, [metric, buckets, timeSeries, workouts, vitalsSubMetric]);

	// ── Extract Statistics for current timeframe ──
	const statsSummary = useMemo(() => {
		const nonZero = chartData.filter((d) => d.value > 0);
		if (nonZero.length === 0) return { avg: 0, max: 0, min: 0, total: 0 };

		const values = nonZero.map((d) => d.value);
		const sum = values.reduce((a, b) => a + b, 0);
		const totalWorkouts = workouts.filter((w) => {
			const d = new Date(w.startDate);
			return d >= daysAgo(rangeDays);
		}).length;

		let avgValue = sum / values.length;
		// If training calories or training duration, calculate average per workout session
		if ((metric === "calories" || metric === "duration") && totalWorkouts > 0) {
			const totalSum =
				metric === "calories"
					? workouts
							.filter((w) => new Date(w.startDate) >= daysAgo(rangeDays))
							.reduce((a, w) => a + w.calories, 0)
					: workouts
							.filter((w) => new Date(w.startDate) >= daysAgo(rangeDays))
							.reduce((a, w) => a + w.durationMinutes, 0);
			avgValue = totalSum / totalWorkouts;
		}

		return {
			avg: avgValue,
			max: Math.max(...values),
			min: Math.min(...values),
			total: sum,
		};
	}, [chartData, metric, workouts, rangeDays]);

	// ── Raw History logs list ──
	const rawHistoryLogs = useMemo(() => {
		// Return workouts or metric daily samples chronologically (newest first)
		if (
			metric === "workouts" ||
			metric === "calories" ||
			metric === "duration"
		) {
			return workouts
				.filter((w) => new Date(w.startDate) >= daysAgo(rangeDays))
				.sort(
					(a, b) =>
						new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
				);
		}

		let samples: DailyHealthSample[] = [];
		if (metric === "readiness") samples = timeSeries.readiness;
		else if (metric === "hrv") samples = timeSeries.hrv;
		else if (metric === "restingHr") samples = timeSeries.resting_hr;
		else if (metric === "sleep") samples = timeSeries.sleep_history;
		else if (metric === "weight") samples = timeSeries.body_weight;
		else if (metric === "vo2max") samples = timeSeries.vo2max;
		else if (metric === "vitals") {
			samples =
				vitalsSubMetric === "spo2" ? timeSeries.spo2 : timeSeries.respiratory;
		} else if (metric === "steps") samples = timeSeries.steps_history;

		return [...samples]
			.filter((s) => new Date(s.date) >= daysAgo(rangeDays) && s.value > 0)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}, [metric, rangeDays, timeSeries, workouts, vitalsSubMetric]);

	const topPad = Platform.OS === "web" ? 16 : insets.top;

	// Dynamic Unit depending on vitals toggle
	const activeUnit = useMemo(() => {
		if (metric === "vitals") {
			return vitalsSubMetric === "spo2" ? "%" : "breaths/min";
		}
		return config.unit;
	}, [metric, vitalsSubMetric, config.unit]);

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<View style={styles.headerContainer}>
				<BlurView
					intensity={60}
					tint={resolvedScheme === "dark" ? "dark" : "light"}
					style={styles.headerBlur}
				>
					<View style={[styles.headerInner]}>
						<View
							style={[
								styles.headerIconWrap,
								{ backgroundColor: config.color + "22" },
							]}
						>
							{config.iconType === "material" ? (
								<MaterialCommunityIcons
									name={config.iconName as any}
									size={18}
									color={config.color}
								/>
							) : (
								<Ionicons
									name={config.iconName as any}
									size={18}
									color={config.color}
								/>
							)}
						</View>
						<Text style={[styles.headerTitle, { color: colors.foreground }]}>
							{config.title}
						</Text>
					</View>
					<View style={[styles.headerDivider]} />
				</BlurView>
			</View>

			<ScrollView
				style={{ flex: 1 }}
				scrollEnabled={scrollEnabled}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingHorizontal: 20,
					paddingTop: topPad + 50,
					paddingBottom: insets.bottom + 40,
					gap: 16,
				}}
			>
				{/* Timeframe Selector Row */}
				<View style={[styles.rangeRow, { backgroundColor: colors.muted }]}>
					{RANGES.map((r) => {
						const active = r.key === range;
						return (
							<Pressable
								key={r.key}
								style={[
									styles.rangeBtn,
									active && { backgroundColor: colors.accent },
								]}
								onPress={() => setRange(r.key)}
							>
								<Text
									style={[
										styles.rangeBtnText,
										{ color: active ? "#FFF" : colors.mutedForeground },
									]}
								>
									{r.label}
								</Text>
							</Pressable>
						);
					})}
				</View>

				{/* Vitals Sub-metric Selector */}
				{metric === "vitals" && (
					<View
						style={[styles.vitalsSelectorRow, { borderColor: colors.border }]}
					>
						<Pressable
							style={[
								styles.vitalsSelectorBtn,
								vitalsSubMetric === "spo2" && {
									backgroundColor: colors.accent,
								},
							]}
							onPress={() => setVitalsSubMetric("spo2")}
						>
							<Text
								style={[
									styles.vitalsSelectorText,
									{
										color:
											vitalsSubMetric === "spo2"
												? "#FFF"
												: colors.mutedForeground,
									},
								]}
							>
								Blood Oxygen (SpO2)
							</Text>
						</Pressable>
						<Pressable
							style={[
								styles.vitalsSelectorBtn,
								vitalsSubMetric === "resp" && {
									backgroundColor: colors.accent,
								},
							]}
							onPress={() => setVitalsSubMetric("resp")}
						>
							<Text
								style={[
									styles.vitalsSelectorText,
									{
										color:
											vitalsSubMetric === "resp"
												? "#FFF"
												: colors.mutedForeground,
									},
								]}
							>
								Resp Rate
							</Text>
						</Pressable>
					</View>
				)}

				{/* Prominent Current / Scrubbed Value Display */}
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.card,
						{ backgroundColor: colors.card, borderColor: colors.border },
					]}
				>
					<View style={styles.valueDisplayHeader}>
						<Text
							style={[
								styles.valueDisplayLabel,
								{ color: colors.mutedForeground },
							]}
						>
							{scrubbedPoint
								? fmtDateLabel(scrubbedPoint.dateStr)
								: `Average (${range})`}
						</Text>
						<View style={styles.valueRow}>
							<Text style={[styles.valueText, { color: colors.foreground }]}>
								{scrubbedPoint
									? fmt(
											scrubbedPoint.value,
											metric === "sleep" ||
												metric === "vo2max" ||
												metric === "weight"
												? 1
												: 0,
										)
									: fmt(
											statsSummary.avg,
											metric === "sleep" ||
												metric === "vo2max" ||
												metric === "weight"
												? 1
												: 0,
										)}
							</Text>
							<Text
								style={[styles.unitText, { color: colors.mutedForeground }]}
							>
								{activeUnit}
							</Text>
						</View>
					</View>

					{/* Detailed Interactive Chart */}
					<ScrubbingLineChart
						data={chartData}
						height={200}
						accentColor={config.color}
						allowZero={config.allowZero}
						startFromZero={config.startFromZero}
						unit={activeUnit}
						onScrub={setScrubbedPoint}
						onScrubStatusChange={(isScrubbing) =>
							setScrollEnabled(!isScrubbing)
						}
					/>
				</GlassView>

				{/* Summary Statistics Cards */}
				<View style={styles.statsCapsulesGrid}>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.statCapsule,
							{ backgroundColor: colors.card, borderColor: colors.border },
						]}
					>
						<Text
							style={[
								styles.statCapsuleLabel,
								{ color: colors.mutedForeground },
							]}
						>
							{metric === "steps" ||
							metric === "workouts" ||
							metric === "calories"
								? "Total"
								: "Average"}
						</Text>
						<Text style={[styles.statCapsuleVal, { color: colors.foreground }]}>
							{metric === "steps" ||
							metric === "workouts" ||
							metric === "calories"
								? fmt(statsSummary.total)
								: fmt(
										statsSummary.avg,
										metric === "sleep" ||
											metric === "vo2max" ||
											metric === "weight"
											? 1
											: 0,
									)}
							<Text
								style={[
									styles.statCapsuleUnit,
									{ color: colors.mutedForeground },
								]}
							>
								{" "}
								{activeUnit}
							</Text>
						</Text>
					</GlassView>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.statCapsule,
							{ backgroundColor: colors.card, borderColor: colors.border },
						]}
					>
						<Text
							style={[
								styles.statCapsuleLabel,
								{ color: colors.mutedForeground },
							]}
						>
							Max
						</Text>
						<Text style={[styles.statCapsuleVal, { color: colors.foreground }]}>
							{fmt(
								statsSummary.max,
								metric === "sleep" || metric === "vo2max" || metric === "weight"
									? 1
									: 0,
							)}
							<Text
								style={[
									styles.statCapsuleUnit,
									{ color: colors.mutedForeground },
								]}
							>
								{" "}
								{activeUnit}
							</Text>
						</Text>
					</GlassView>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.statCapsule,
							{ backgroundColor: colors.card, borderColor: colors.border },
						]}
					>
						<Text
							style={[
								styles.statCapsuleLabel,
								{ color: colors.mutedForeground },
							]}
						>
							Min
						</Text>
						<Text style={[styles.statCapsuleVal, { color: colors.foreground }]}>
							{fmt(
								statsSummary.min,
								metric === "sleep" || metric === "vo2max" || metric === "weight"
									? 1
									: 0,
							)}
							<Text
								style={[
									styles.statCapsuleUnit,
									{ color: colors.mutedForeground },
								]}
							>
								{" "}
								{activeUnit}
							</Text>
						</Text>
					</GlassView>
				</View>

				{/* Metadata Section */}
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.card,
						{ backgroundColor: colors.card, borderColor: colors.border },
					]}
				>
					<Text
						style={[styles.cardSectionLabel, { color: colors.mutedForeground }]}
					>
						About this metric
					</Text>
					<Text style={[styles.explanationText, { color: colors.foreground }]}>
						{config.explanation}
					</Text>
				</GlassView>

				{/* Recommendations & Tips */}
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.card,
						{ backgroundColor: colors.card, borderColor: colors.border },
					]}
				>
					<Text
						style={[styles.cardSectionLabel, { color: colors.mutedForeground }]}
					>
						Tips & Recommendations
					</Text>
					{config.tips.map((tip, idx) => (
						<View key={idx} style={styles.tipRow}>
							<Ionicons
								name="sparkles"
								size={14}
								color={config.color}
								style={{ marginTop: 3 }}
							/>
							<Text style={[styles.tipText, { color: colors.foreground }]}>
								{tip}
							</Text>
						</View>
					))}
				</GlassView>

				{/* Raw History Table */}
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							borderColor: colors.border,
							padding: 0,
						},
					]}
				>
					<View style={styles.tableHeader}>
						<Text
							style={[styles.tableHeaderTitle, { color: colors.foreground }]}
						>
							History Log
						</Text>
						<Text
							style={[
								styles.tableHeaderCount,
								{ color: colors.mutedForeground },
							]}
						>
							{rawHistoryLogs.length} records in {range}
						</Text>
					</View>

					{rawHistoryLogs.length > 0 ? (
						<View style={styles.tableBody}>
							{rawHistoryLogs.map((item: any, idx) => {
								const isLastItem = idx === rawHistoryLogs.length - 1;
								// Formatting date and values dynamically depending on workout vs sample
								const isWorkoutType = "activityName" in item;
								const date = isWorkoutType
									? fmtDateLabel(item.startDate)
									: fmtDateLabel(item.date);
								const valueStr = isWorkoutType
									? `${item.activityName} · ${item.durationMinutes}m (${item.calories} kcal)`
									: `${fmt(item.value, metric === "sleep" || metric === "vo2max" || metric === "weight" ? 1 : 0)} ${activeUnit}`;

								return (
									<View
										key={item.id || item.date || idx}
										style={[
											styles.tableRow,
											!isLastItem && {
												borderBottomColor: colors.separator,
												borderBottomWidth: StyleSheet.hairlineWidth,
											},
										]}
									>
										<Text
											style={[
												styles.tableRowDate,
												{ color: colors.mutedForeground },
											]}
										>
											{date}
										</Text>
										<Text
											style={[
												styles.tableRowValue,
												{ color: colors.foreground },
											]}
											numberOfLines={1}
										>
											{valueStr}
										</Text>
									</View>
								);
							})}
						</View>
					) : (
						<View style={styles.noHistory}>
							<Text
								style={[
									styles.noHistoryText,
									{ color: colors.mutedForeground },
								]}
							>
								No records found for this period
							</Text>
						</View>
					)}
				</GlassView>
			</ScrollView>
		</View>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	fallbackContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	fallbackText: {
		fontSize: 18,
		fontWeight: "600",
	},
	headerContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
		backgroundColor: "none",
	},
	headerBlur: {
		overflow: "hidden",
	},
	headerInner: {
		flexDirection: "row",
		alignItems: "center",
		height: 80,
		paddingHorizontal: 25,
		gap: 10,
	},
	headerIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 100,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "600",
		flex: 1,
		letterSpacing: -0.2,
	},
	headerDivider: {
		height: StyleSheet.hairlineWidth,
	},
	backBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	closeBtn: {
		width: 35,
		height: 35,
		backgroundColor: "#00000012",
		borderRadius: 100,
		alignItems: "center",
		justifyContent: "center",
	},
	rangeRow: {
		flexDirection: "row",
		padding: 3,
		gap: 2,
	},
	rangeBtn: {
		flex: 1,
		paddingVertical: 6,
		borderRadius: 9,
		alignItems: "center",
	},
	rangeBtnText: {
		fontSize: 12,
		fontWeight: "600",
	},
	vitalsSelectorRow: {
		flexDirection: "row",
		borderRadius: 12,
		padding: 3,
		gap: 2,
		backgroundColor: "rgba(0,0,0,0.03)",
	},
	vitalsSelectorBtn: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: 9,
		alignItems: "center",
	},
	vitalsSelectorText: {
		fontSize: 12,
		fontWeight: "600",
	},
	card: {
		padding: 16,
		borderRadius: 20,
		overflow: "hidden",
	},
	valueDisplayHeader: {
		marginBottom: 8,
	},
	valueDisplayLabel: {
		fontSize: 12,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	valueRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 4,
	},
	valueText: {
		fontSize: 32,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	unitText: {
		fontSize: 14,
		fontWeight: "600",
	},
	chartWrapper: {
		width: "100%",
		position: "relative",
		marginVertical: 4,
	},
	chartInstruction: {
		fontSize: 10,
		textAlign: "center",
		marginTop: 6,
		fontStyle: "italic",
	},
	statsCapsulesGrid: {
		flexDirection: "row",
		gap: 10,
	},
	statCapsule: {
		flex: 1,
		padding: 12,
		borderRadius: 16,
		gap: 4,
	},
	statCapsuleLabel: {
		fontSize: 11,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	statCapsuleVal: {
		fontSize: 15,
		fontWeight: "700",
	},
	statCapsuleUnit: {
		fontSize: 10,
		fontWeight: "500",
	},
	cardSectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginBottom: 6,
	},
	explanationText: {
		fontSize: 14,
		lineHeight: 20,
	},
	rangeBadge: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 6,
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 10,
		marginTop: 4,
	},
	rangeBadgeText: {
		fontSize: 13,
		fontWeight: "600",
	},
	tipRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 8,
		alignItems: "flex-start",
	},
	tipText: {
		fontSize: 14,
		lineHeight: 20,
		flex: 1,
	},
	tableHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(255,255,255,0.08)",
	},
	tableHeaderTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
	tableHeaderCount: {
		fontSize: 11,
		fontWeight: "500",
	},
	tableBody: {
		maxHeight: 300,
	},
	tableRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	tableRowDate: {
		fontSize: 13,
		fontWeight: "500",
	},
	tableRowValue: {
		fontSize: 13,
		fontWeight: "600",
		textAlign: "right",
		flex: 1,
		marginLeft: 16,
	},
	noHistory: {
		padding: 24,
		alignItems: "center",
	},
	noHistoryText: {
		fontSize: 13,
	},
});
