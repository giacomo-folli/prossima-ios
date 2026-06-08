import React, { useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { MicroBar } from "@/components/MicroBar";
import { LineChart } from "@/components/LineChart";
import { useCardStyle } from "@/hooks/useCardStyle";

interface TrendCardProps {
	icon: React.ReactNode;
	title: string;
	subtitle?: string;
	value: string;
	unit: string;
	delta: number | null;
	positiveIsGood: boolean;
	chartData: { label: string; value: number }[];
	accentColor: string;
	note?: string;
	/** "bar" | "line" */
	chartType?: ChartType;
	/** Passed through to LineChart: reference line value */
	referenceValue?: number;
	/** Passed through to LineChart: reference line label */
	referenceLabel?: string;
	/** Passed through to LineChart: format y-axis labels */
	formatY?: (v: number) => string;
	/** Passed through to LineChart: show y-axis value labels */
	showYLabels?: boolean;
	onPress?: () => void;
}

/** Which chart style a TrendCard renders */
type ChartType = "bar" | "line";

export function TrendCard({
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
	chartType = "bar",
	referenceValue,
	referenceLabel,
	formatY,
	showYLabels,
	onPress,
}: TrendCardProps) {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const hasData = chartData.some((d) => d.value > 0);
	const cardStyle = useCardStyle("standard");

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
		<Pressable
			onPress={onPress}
			disabled={!onPress}
			style={({ pressed }) => [
				{
					opacity: pressed ? 0.85 : 1,
					transform: [{ scale: pressed ? 0.99 : 1 }],
				},
			]}
		>
			<GlassView colorScheme={resolvedScheme} style={[styles.card, cardStyle]}>
				{/* Header */}
				<View style={styles.cardHeader}>
					<View
						style={[
							styles.cardIconWrap,
							{ backgroundColor: `${accentColor}18` },
						]}
					>
						{icon}
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.cardTitle, { color: colors.foreground }]}>
							{title}
						</Text>
						<Text
							style={[styles.cardSubtitle, { color: colors.mutedForeground }]}
						>
							{!!subtitle
								? subtitle
								: delta !== null &&
									hasData && (
										<>
											<Ionicons name={deltaIcon} size={10} color={deltaColor} />
											<Text style={[styles.deltaText, { color: deltaColor }]}>
												{Math.abs(delta).toFixed(0)}%
											</Text>
										</>
									)}
						</Text>
					</View>
					<View style={styles.cardValueBlock}>
						<Text style={[styles.cardValue, { color: colors.foreground }]}>
							{hasData ? value : "—"}
						</Text>
						<Text style={[styles.cardUnit, { color: colors.mutedForeground }]}>
							{unit}
						</Text>
					</View>
				</View>

				{/* Chart area */}
				{hasData ? (
					chartType === "line" ? (
						<LineChart
							data={chartData}
							height={80}
							accentColor={accentColor}
							labelColor={colors.mutedForeground}
							guideCount={2}
							showYLabels={showYLabels}
							referenceValue={referenceValue}
							referenceLabel={referenceLabel}
							formatY={formatY}
							strokeWidth={2}
							animationDuration={700}
						/>
					) : (
						<>
							<MicroBar data={chartData} accentColor={accentColor} />
							{/* X-axis labels for bar chart */}
							<View style={styles.axisRow}>
								{chartData.map((d, i) => {
									const visible =
										chartData.length <= 7 ||
										(chartData.length >= 20
											? i === 0 || i === chartData.length - 1
											: i % 2 === 0);
									return (
										<Text
											key={i}
											style={[
												styles.axisLabel,
												{ color: colors.mutedForeground, flex: 1 },
											]}
											numberOfLines={2}
										>
											{visible ? d.label : ""}
										</Text>
									);
								})}
							</View>
						</>
					)
				) : (
					<View style={styles.noDataRow}>
						<Ionicons
							name="analytics-outline"
							size={18}
							color={colors.mutedForeground}
						/>
						<Text
							style={[styles.noDataText, { color: colors.mutedForeground }]}
						>
							No data for this period
						</Text>
					</View>
				)}

				{note ? (
					<Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
						{note}
					</Text>
				) : null}
			</GlassView>
		</Pressable>
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
});
