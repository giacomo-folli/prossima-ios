import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, {
	Path,
	Defs,
	LinearGradient,
	Stop,
	Line,
	Circle,
	Text as SvgText,
} from "react-native-svg";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineChartDataPoint {
	/** x-axis label shown below the chart */
	label: string;
	/** numeric value; 0 is treated as "no data" unless allowZero is true */
	value: number;
}

export interface LineChartProps {
	data: LineChartDataPoint[];

	/** Chart canvas height in dp (default 80) */
	height?: number;

	/** Accent / line colour (default "#5856D6") */
	accentColor?: string;

	/** If set, draws a dashed horizontal reference line at this value */
	referenceValue?: number;
	/** Label shown next to the reference line */
	referenceLabel?: string;

	/** Colour for axis labels and guide lines */
	labelColor?: string;

	/** Format function for y-axis guide labels */
	formatY?: (value: number) => string;

	/**
	 * Number of horizontal guide lines (default 2).
	 * Set to 0 to hide all guides.
	 */
	guideCount?: number;

	/** Whether to show y-axis value labels next to guides (default false) */
	showYLabels?: boolean;

	/** Whether zero values count as real data (default false) */
	allowZero?: boolean;

	/** Stroke width (default 2) */
	strokeWidth?: number;

	/** Duration of the draw-on animation in ms (default 600) */
	animationDuration?: number;
}

// ─── AnimatedPath wrapper ─────────────────────────────────────────────────────
// react-native-svg does not export AnimatedPath natively; we wrap it.

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a smooth cubic bezier SVG path through an array of {x,y} points. */
function smoothPath(points: { x: number; y: number }[]): string {
	if (points.length === 0) return "";
	if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		// Control points at 1/3 of the horizontal gap
		const cpX = (curr.x - prev.x) / 3;
		const cp1x = prev.x + cpX;
		const cp2x = curr.x - cpX;
		d += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`;
	}

	return d;
}

/** Build a closed area path (line path + vertical drop to baseline). */
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

// ─── Component ────────────────────────────────────────────────────────────────

export function LineChart({
	data,
	height = 80,
	accentColor = "#5856D6",
	referenceValue,
	referenceLabel,
	labelColor = "#94A3B8",
	formatY = (v) => String(Math.round(v)),
	guideCount = 2,
	showYLabels = false,
	allowZero = false,
	strokeWidth = 2,
	animationDuration = 600,
}: LineChartProps) {
	// ── Filter to real data points ──────────────────────────────────────────
	const hasData = data.some((d) => allowZero || d.value > 0);

	// ── Animation ──────────────────────────────────────────────────────────
	const progress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		progress.setValue(0);
		Animated.timing(progress, {
			toValue: 1,
			duration: animationDuration,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false, // SVG props don't support native driver
		}).start();
	}, [data, animationDuration]);

	// ── Layout constants ───────────────────────────────────────────────────
	const Y_LABEL_WIDTH = showYLabels ? 28 : 0;
	const AXIS_HEIGHT = 16; // space below chart for x labels
	const PAD_TOP = 8;
	const PAD_LEFT = Y_LABEL_WIDTH + 4;
	const PAD_RIGHT = 8;

	// We measure the container via onLayout; default to something reasonable.
	const [containerWidth, setContainerWidth] = React.useState(300);

	const chartW = containerWidth - PAD_LEFT - PAD_RIGHT;
	const chartH = height - PAD_TOP - AXIS_HEIGHT;

	// ── Compute point positions ────────────────────────────────────────────
	const points = useMemo(() => {
		if (!hasData || data.length === 0) return [];

		const values = data.map((d) =>
			allowZero ? d.value : d.value > 0 ? d.value : NaN,
		);
		const nonNaN = values.filter((v) => !isNaN(v));
		const minVal = Math.min(...nonNaN);
		const maxVal = Math.max(...nonNaN);
		const range = maxVal - minVal || 1;

		return data.map((d, i) => {
			const x = PAD_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;
			const val = allowZero ? d.value : d.value > 0 ? d.value : NaN;
			const y = isNaN(val)
				? NaN
				: PAD_TOP + chartH - ((val - minVal) / range) * (chartH - PAD_TOP / 2);
			return { x, y, value: val, label: d.label };
		});
	}, [data, chartW, chartH, PAD_LEFT, PAD_TOP, hasData, allowZero]);

	// Only connected (non-NaN) segments
	const validPoints = useMemo(
		() => points.filter((p) => !isNaN(p.y)),
		[points],
	);

	// ── Guide lines ────────────────────────────────────────────────────────
	const guides = useMemo(() => {
		if (guideCount === 0 || !hasData || validPoints.length === 0) return [];
		const ys = validPoints.map((p) => p.value);
		const minV = Math.min(...ys);
		const maxV = Math.max(...ys);
		const range = maxV - minV || 1;

		return Array.from({ length: guideCount }, (_, i) => {
			const frac = i / (guideCount - 1 || 1);
			const val = minV + frac * range;
			const yPos =
				PAD_TOP + chartH - ((val - minV) / range) * (chartH - PAD_TOP / 2);
			return { val, yPos };
		});
	}, [guideCount, hasData, validPoints, PAD_TOP, chartH]);

	// ── Reference line position ────────────────────────────────────────────
	const refLineY = useMemo(() => {
		if (referenceValue === undefined || !hasData || validPoints.length === 0)
			return null;
		const ys = validPoints.map((p) => p.value);
		const minV = Math.min(...ys);
		const maxV = Math.max(...ys);
		const range = maxV - minV || 1;
		return (
			PAD_TOP +
			chartH -
			((referenceValue - minV) / range) * (chartH - PAD_TOP / 2)
		);
	}, [referenceValue, hasData, validPoints, PAD_TOP, chartH]);

	// ── SVG paths ──────────────────────────────────────────────────────────
	const linePath = useMemo(() => smoothPath(validPoints), [validPoints]);
	const fillPath = useMemo(
		() => areaPath(validPoints, PAD_TOP + chartH),
		[validPoints, PAD_TOP, chartH],
	);

	// ── Animated strokeDashoffset trick ───────────────────────────────────
	// We approximate path length; react-native-svg doesn't expose getTotalLength.
	// A safe over-estimate is chartW * 2.
	const pathLength = chartW * 2;
	const strokeDashoffset = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [pathLength, 0],
	});

	// ── X-axis labels ──────────────────────────────────────────────────────
	const showLabel = (i: number) => {
		if (data.length <= 7) return true;
		if (data.length >= 20) return i === 0 || i === data.length - 1;
		return i % 2 == 0;
	};

	// ── Last valid dot ──────────────────────────────────────────────────────
	const lastDot =
		validPoints.length > 0 ? validPoints[validPoints.length - 1] : null;

	const gradientId = `lg_${accentColor.replace("#", "")}`;

	return (
		<View
			style={[styles.wrapper, { height: height + AXIS_HEIGHT }]}
			onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
		>
			<Svg
				width={containerWidth}
				height={height + AXIS_HEIGHT}
				style={StyleSheet.absoluteFill}
			>
				<Defs>
					<LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0" stopColor={accentColor} stopOpacity="0.28" />
						<Stop offset="1" stopColor={accentColor} stopOpacity="0.02" />
					</LinearGradient>
				</Defs>

				{/* ── Horizontal guide lines ── */}
				{guides.map((g, i) => (
					<React.Fragment key={i}>
						<Line
							x1={PAD_LEFT}
							y1={g.yPos}
							x2={PAD_LEFT + chartW}
							y2={g.yPos}
							stroke={labelColor}
							strokeOpacity={0.12}
							strokeWidth={StyleSheet.hairlineWidth}
						/>
						{showYLabels && (
							<SvgText
								x={PAD_LEFT - 4}
								y={g.yPos + 4}
								fontSize={9}
								fill={labelColor}
								textAnchor="end"
							>
								{formatY(g.val)}
							</SvgText>
						)}
					</React.Fragment>
				))}

				{/* ── Reference line ── */}
				{refLineY !== null && (
					<>
						<Line
							x1={PAD_LEFT}
							y1={refLineY}
							x2={PAD_LEFT + chartW}
							y2={refLineY}
							stroke={accentColor}
							strokeOpacity={0.5}
							strokeWidth={1}
							strokeDasharray="4 3"
						/>
						{referenceLabel && (
							<SvgText
								x={PAD_LEFT + chartW - 2}
								y={refLineY - 4}
								fontSize={9}
								fill={accentColor}
								fillOpacity={0.8}
								textAnchor="end"
							>
								{referenceLabel}
							</SvgText>
						)}
					</>
				)}

				{hasData ? (
					<>
						{/* ── Gradient area fill ── */}
						<Path d={fillPath} fill={`url(#${gradientId})`} />

						{/* ── Animated line ── */}
						<AnimatedPath
							d={linePath}
							stroke={accentColor}
							strokeWidth={strokeWidth}
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeDasharray={pathLength}
							strokeDashoffset={strokeDashoffset}
						/>

						{/* ── Last-point dot ── */}
						{lastDot && (
							<>
								{/* Outer glow ring */}
								<Circle
									cx={lastDot.x}
									cy={lastDot.y}
									r={5}
									fill={accentColor}
									fillOpacity={0.2}
								/>
								{/* Inner dot */}
								<Circle
									cx={lastDot.x}
									cy={lastDot.y}
									r={3}
									fill={accentColor}
								/>
								<Circle
									cx={lastDot.x}
									cy={lastDot.y}
									r={1.5}
									fill="white"
									fillOpacity={0.9}
								/>
							</>
						)}
					</>
				) : (
					/* ── Zero-state dashed baseline ── */
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

				{/* ── X-axis labels ── */}
				{data.map((d, i) => {
					if (!showLabel(i)) return null;
					const x = PAD_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;
					return (
						<SvgText
							key={i}
							x={x}
							y={height + AXIS_HEIGHT - 2}
							fontSize={9}
							fill={labelColor}
							textAnchor={
								i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"
							}
						>
							{d.label}
						</SvgText>
					);
				})}
			</Svg>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	wrapper: {
		width: "100%",
		position: "relative",
	},
});
