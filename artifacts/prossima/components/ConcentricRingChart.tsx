import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ConcentricRingChartProps {
	readinessProgress?: number; // 0 to 1
	readinessColor?: string;
	readinessValue?: string;
	stepsProgress: number; // 0 to 1
	calProgress: number; // 0 to 1
	activeProgress: number; // 0 to 1
	stepsValue: string;
	stepsGoal: string;
	calValue: string;
	calGoal: string;
	activeValue: string;
	activeGoal: string;
	size?: number;
}

export function ConcentricRingChart({
	readinessProgress,
	readinessColor = "#10B981",
	readinessValue,
	stepsProgress,
	calProgress,
	activeProgress,
	stepsValue,
	stepsGoal,
	calValue,
	calGoal,
	activeValue,
	activeGoal,
	size = 240,
}: ConcentricRingChartProps) {
	const colors = useColors();

	// Color schemes for rings
	const ringTeal = "#00B4D8";
	const ringOrange = "#FF6B00";
	const ringGreen = "#10B981";

	const trackReadiness = "rgba(148, 163, 184, 0.12)";
	const trackTeal = "rgba(0, 180, 216, 0.12)";
	const trackOrange = "rgba(255, 107, 0, 0.12)";
	const trackGreen = "rgba(16, 185, 129, 0.12)";

	const strokeWidth = 12;
	const spacing = 4;
	const center = size / 2;

	const hasReadiness = readinessProgress !== undefined;

	// Calculate radiuses
	const rReadiness = (size - strokeWidth) / 2 - 2; // outermost
	const rTeal = hasReadiness
		? rReadiness - strokeWidth - spacing
		: (size - strokeWidth) / 2 - 2;
	const rOrange = rTeal - strokeWidth - spacing; // middle
	const rGreen = rOrange - strokeWidth - spacing; // innermost

	// Circumferences
	const cReadiness = 2 * Math.PI * rReadiness;
	const cTeal = 2 * Math.PI * rTeal;
	const cOrange = 2 * Math.PI * rOrange;
	const cGreen = 2 * Math.PI * rGreen;

	// Dash Offsets
	const offsetReadiness =
		cReadiness * (1 - Math.min(Math.max(readinessProgress || 0, 0), 1));
	const offsetTeal = cTeal * (1 - Math.min(Math.max(stepsProgress, 0), 1));
	const offsetOrange = cOrange * (1 - Math.min(Math.max(calProgress, 0), 1));
	const offsetGreen = cGreen * (1 - Math.min(Math.max(activeProgress, 0), 1));

	return (
		<View style={[styles.container, { width: size, height: size }]}>
			<Svg width={size} height={size} style={StyleSheet.absoluteFill}>
				{/* Readiness Ring Track and Progress */}
				{hasReadiness && (
					<>
						<Circle
							cx={center}
							cy={center}
							r={rReadiness}
							stroke={trackReadiness}
							strokeWidth={strokeWidth}
							fill="none"
						/>
						<Circle
							cx={center}
							cy={center}
							r={rReadiness}
							stroke={readinessColor}
							strokeWidth={strokeWidth}
							fill="none"
							strokeDasharray={`${cReadiness} ${cReadiness}`}
							strokeDashoffset={offsetReadiness}
							strokeLinecap="round"
							rotation="-90"
							origin={`${center}, ${center}`}
						/>
					</>
				)}

				{/* Teal Ring Track and Progress */}
				<Circle
					cx={center}
					cy={center}
					r={rTeal}
					stroke={trackTeal}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={center}
					cy={center}
					r={rTeal}
					stroke={ringTeal}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${cTeal} ${cTeal}`}
					strokeDashoffset={offsetTeal}
					strokeLinecap="round"
					rotation="-90"
					origin={`${center}, ${center}`}
				/>

				{/* Orange Ring Track and Progress */}
				<Circle
					cx={center}
					cy={center}
					r={rOrange}
					stroke={trackOrange}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={center}
					cy={center}
					r={rOrange}
					stroke={ringOrange}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${cOrange} ${cOrange}`}
					strokeDashoffset={offsetOrange}
					strokeLinecap="round"
					rotation="-90"
					origin={`${center}, ${center}`}
				/>

				{/* Green Ring Track and Progress */}
				<Circle
					cx={center}
					cy={center}
					r={rGreen}
					stroke={trackGreen}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={center}
					cy={center}
					r={rGreen}
					stroke={ringGreen}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${cGreen} ${cGreen}`}
					strokeDashoffset={offsetGreen}
					strokeLinecap="round"
					rotation="-90"
					origin={`${center}, ${center}`}
				/>
			</Svg>

			{/* Central Labels */}
			<View style={[StyleSheet.absoluteFill, styles.centerArea]}>
				{hasReadiness && readinessValue !== undefined && (
					<>
						<Text style={[styles.readinessTitle, { color: readinessColor }]}>
							Readiness
						</Text>
						<View style={styles.readinessRow}>
							<Text
								style={[
									styles.readinessValueText,
									{ color: colors.foreground },
								]}
							>
								{readinessValue}
							</Text>
						</View>
					</>
				)}
				{!hasReadiness && (
					<Text style={[styles.stepsTitle, { color: "#0084A3" }]}>Steps:</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignSelf: "center",
		justifyContent: "center",
		alignItems: "center",
	},
	centerArea: {
		justifyContent: "center",
		alignItems: "center",
		padding: 8,
		gap: 2,
	},
	readinessTitle: {
		fontSize: 11,
		textTransform: "uppercase",
		letterSpacing: 0.8,
		fontWeight: "600",
	},
	readinessRow: {
		flexDirection: "row",
		alignItems: "baseline",
		marginBottom: 4,
	},
	readinessValueText: {
		fontSize: 24,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	stepsTitle: {
		fontSize: 11,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	stepsRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	stepsValueText: {
		fontSize: 22,
		letterSpacing: -0.5,
	},
	stepsGoalText: {
		fontSize: 12,
	},
	calText: {
		fontSize: 11,
		flexDirection: "row",
		alignItems: "center",
	},
	activeText: {
		fontSize: 11,
		flexDirection: "row",
		alignItems: "center",
	},
	boldVal: {
		fontWeight: "600",
	},
});
