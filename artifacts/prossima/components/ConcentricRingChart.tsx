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
	const ringSteps = "#34C759"; // Green matching steps metric
	const ringCal = "#FF6B00"; // Orange matching calories metric
	const ringActive = "#00B4D8"; // Teal/Blue matching activity time metric

	const trackReadiness = "rgba(148, 163, 184, 0.12)";
	const trackSteps = "rgba(52, 199, 89, 0.12)";
	const trackCal = "rgba(255, 107, 0, 0.12)";
	const trackActive = "rgba(0, 180, 216, 0.12)";

	const strokeWidth = 12;
	const spacing = 4;
	const center = size / 2;

	const hasReadiness = readinessProgress !== undefined;

	// Calculate radiuses
	const rReadiness = (size - strokeWidth) / 2 - 2; // outermost
	const rSteps = hasReadiness
		? rReadiness - strokeWidth - spacing
		: (size - strokeWidth) / 2 - 2;
	const rCal = rSteps - strokeWidth - spacing; // middle
	const rActive = rCal - strokeWidth - spacing; // innermost

	// Circumferences
	const cReadiness = 2 * Math.PI * rReadiness;
	const cSteps = 2 * Math.PI * rSteps;
	const cCal = 2 * Math.PI * rCal;
	const cActive = 2 * Math.PI * rActive;

	// Dash Offsets
	const offsetReadiness =
		cReadiness * (1 - Math.min(Math.max(readinessProgress || 0, 0), 1));
	const offsetSteps = cSteps * (1 - Math.min(Math.max(stepsProgress, 0), 1));
	const offsetCal = cCal * (1 - Math.min(Math.max(calProgress, 0), 1));
	const offsetActive = cActive * (1 - Math.min(Math.max(activeProgress, 0), 1));

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

				{/* Steps Ring Track and Progress */}
				<Circle
					cx={center}
					cy={center}
					r={rSteps}
					stroke={trackSteps}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={center}
					cy={center}
					r={rSteps}
					stroke={ringSteps}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${cSteps} ${cSteps}`}
					strokeDashoffset={offsetSteps}
					strokeLinecap="round"
					rotation="-90"
					origin={`${center}, ${center}`}
				/>

				{/* Calories Ring Track and Progress */}
				<Circle
					cx={center}
					cy={center}
					r={rCal}
					stroke={trackCal}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={center}
					cy={center}
					r={rCal}
					stroke={ringCal}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${cCal} ${cCal}`}
					strokeDashoffset={offsetCal}
					strokeLinecap="round"
					rotation="-90"
					origin={`${center}, ${center}`}
				/>

				{/* Activity Ring Track and Progress */}
				<Circle
					cx={center}
					cy={center}
					r={rActive}
					stroke={trackActive}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={center}
					cy={center}
					r={rActive}
					stroke={ringActive}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${cActive} ${cActive}`}
					strokeDashoffset={offsetActive}
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
					<Text style={[styles.stepsTitle, { color: "#34C759" }]}>Steps:</Text>
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
