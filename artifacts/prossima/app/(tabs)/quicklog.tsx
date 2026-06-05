import React, { useState } from "react";
import {
	Alert,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

interface LogSectionProps {
	label?: string;
	children: React.ReactNode;
}

const LogSection: React.FC<LogSectionProps> = ({ label, children }) => {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	return (
		<View style={styles.sectionContainer}>
			{label && (
				<Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
					{label}
				</Text>
			)}
			<GlassView
				colorScheme={resolvedScheme}
				style={[
					styles.sectionCard,
					{
						backgroundColor: colors.card,
						borderRadius: colors.radius,
						borderWidth: 1,
						borderColor: colors.border,
					},
				]}
			>
				{children}
			</GlassView>
		</View>
	);
};

interface LogRowProps {
	icon: keyof typeof Ionicons.glyphMap;
	iconBg: string;
	label: string;
	sublabel?: string;
	onPress: () => void;
	isLast?: boolean;
}

const LogRow: React.FC<LogRowProps> = ({
	icon,
	iconBg,
	label,
	sublabel,
	onPress,
	isLast,
}) => {
	const colors = useColors();

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.rowPressable,
				pressed && { backgroundColor: colors.secondary },
			]}
		>
			<View
				style={[
					styles.rowContainer,
					!isLast && {
						borderBottomColor: colors.separator,
						borderBottomWidth: StyleSheet.hairlineWidth,
					},
				]}
			>
				<View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
					<Ionicons name={icon} size={15} color="#FFFFFF" />
				</View>
				<View style={styles.rowTextContainer}>
					<Text
						style={[styles.rowLabel, { color: colors.foreground }]}
						numberOfLines={1}
					>
						{label}
					</Text>
					{sublabel && (
						<Text
							style={[styles.rowSublabel, { color: colors.mutedForeground }]}
							numberOfLines={1}
						>
							{sublabel}
						</Text>
					)}
				</View>
				<Ionicons
					name="chevron-forward"
					size={14}
					color={colors.mutedForeground}
				/>
			</View>
		</Pressable>
	);
};

export default function QuickLogScreen() {
	const colors = useColors();
	const insets = useSafeAreaInsets();
	const { resolvedScheme } = useTheme();

	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
	const gradientColors = colors.backgroundGradient;

	const handleLog = (type: string) => {
		Alert.alert("Quick Log", `Logged ${type} successfully!`);
	};

	return (
		<LinearGradient colors={gradientColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPad, paddingBottom: botPad + 80 },
				]}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="never"
			>
				<Text style={[styles.screenTitle, { color: colors.foreground }]}>
					Quick Log
				</Text>

				<LogSection label="WORKOUT">
					<LogRow
						icon="fitness"
						iconBg="#007AFF"
						label="Log Active Session"
						sublabel="Start or resume your workout plan"
						onPress={() => handleLog("Active Session")}
						isLast={false}
					/>
					<LogRow
						icon="add-circle"
						iconBg="#30B0C7"
						label="Custom Workout"
						sublabel="Log a workout not in your plan"
						onPress={() => handleLog("Custom Workout")}
						isLast={true}
					/>
				</LogSection>

				<LogSection label="HEALTH METRICS">
					<LogRow
						icon="speedometer-outline"
						iconBg="#A180F4"
						label="Log Weight"
						sublabel="Track your body weight today"
						onPress={() => handleLog("Weight")}
						isLast={false}
					/>
					<LogRow
						icon="water"
						iconBg="#34C759"
						label="Log Water Intake"
						sublabel="Add water consumption (ml)"
						onPress={() => handleLog("Water Intake")}
						isLast={false}
					/>
					<LogRow
						icon="moon"
						iconBg="#FF9500"
						label="Log Sleep"
						sublabel="Record last night's sleep duration"
						onPress={() => handleLog("Sleep")}
						isLast={true}
					/>
				</LogSection>
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: 20, gap: 16 },
	screenTitle: {
		fontSize: 36,
		fontWeight: "300",
		letterSpacing: -0.5,
		marginBottom: 4,
	},

	sectionContainer: {
		gap: 8,
	},
	sectionLabel: {
		fontSize: 10,
		letterSpacing: 2,
		paddingLeft: 4,
	},
	sectionCard: {
		overflow: "hidden",
	},

	rowPressable: {
		minHeight: 48,
		justifyContent: "center",
	},
	rowContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		flex: 1,
	},
	iconContainer: {
		width: 28,
		height: 28,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	rowTextContainer: {
		flex: 1,
		justifyContent: "center",
		marginRight: 8,
	},
	rowLabel: {
		fontSize: 15,
	},
	rowSublabel: {
		fontSize: 12,
		marginTop: 2,
	},
});
