import React from "react";
import {
	Alert,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme, ThemePreference } from "@/context/ThemeContext";
import { useHealth } from "@/context/HealthContext";
import { useProfile } from "@/context/ProfileContext";
import { Image } from "expo-image";
import { router } from "expo-router";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] =
	[
		{ value: "system", label: "System", icon: "phone-portrait-outline" },
		{ value: "light", label: "Light", icon: "sunny-outline" },
		{ value: "dark", label: "Dark", icon: "moon-outline" },
	];

// ─── Sub-components ────────────────────────────────────────────────────────────

interface SettingSectionProps {
	label?: string;
	children: React.ReactNode;
	footer?: string;
}

const SettingSection: React.FC<SettingSectionProps> = ({
	label,
	children,
	footer,
}) => {
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
			{footer && (
				<Text style={[styles.sectionFooter, { color: colors.mutedForeground }]}>
					{footer}
				</Text>
			)}
		</View>
	);
};

interface SettingRowProps {
	icon: keyof typeof Ionicons.glyphMap;
	iconBg: string;
	label: string;
	sublabel?: string;
	rightContent?: React.ReactNode;
	onPress?: () => void;
	isLast?: boolean;
	destructive?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
	icon,
	iconBg,
	label,
	sublabel,
	rightContent,
	onPress,
	isLast,
	destructive,
}) => {
	const colors = useColors();

	const rowContent = (
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
					style={[
						styles.rowLabel,
						destructive
							? { color: colors.destructive }
							: { color: colors.foreground },
					]}
					numberOfLines={1}
				>
					{label}
				</Text>
				{sublabel && (
					<Text
						style={[styles.rowSublabel, { color: colors.mutedForeground }]}
						numberOfLines={2}
					>
						{sublabel}
					</Text>
				)}
			</View>
			{rightContent ? (
				<View style={styles.rightContentContainer}>{rightContent}</View>
			) : onPress ? (
				<Ionicons
					name="chevron-forward"
					size={14}
					color={colors.mutedForeground}
				/>
			) : null}
		</View>
	);

	if (onPress) {
		return (
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={`${label}${sublabel ? `, ${sublabel}` : ""}`}
				style={({ pressed }) => [
					styles.rowPressable,
					pressed && { backgroundColor: colors.secondary },
				]}
			>
				{rowContent}
			</Pressable>
		);
	}

	return <View style={styles.rowPressable}>{rowContent}</View>;
};

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { preference, setPreference } = useTheme();
	const { isConnected, requestPermissions, disconnect } = useHealth();
	const { name, imageUri } = useProfile();

	const tabBarHeight = Platform.OS === "web" ? 84 : 64;
	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const botPad = insets.bottom + tabBarHeight + (Platform.OS === "web" ? 34 : 0);

	const handleDisconnectHealth = () => {
		Alert.alert(
			"Disconnect Apple Health",
			"Are you sure you want to disconnect? We won't be able to sync your fitness data.",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Disconnect", style: "destructive", onPress: disconnect },
			],
		);
	};

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingTop: topPad, paddingBottom: botPad + 16 },
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="never"
		>
			{/* ── Page Title ── */}
			<Text style={[styles.screenTitle, { color: colors.foreground }]}>
				Settings
			</Text>

			{/* ── Profile Card ── */}
			<Pressable
				style={styles.profileCard}
				onPress={() => router.push("/edit-profile")}
			>
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.profileCardInner,
						{
							backgroundColor: colors.card,
							borderRadius: colors.radius,
							borderWidth: 1,
							borderColor: colors.border,
						},
					]}
				>
					{imageUri ? (
						<Image
							source={{ uri: imageUri }}
							style={styles.profileImage}
							contentFit="cover"
						/>
					) : (
						<View
							style={[
								styles.profileAvatarPlaceholder,
								{ backgroundColor: "#8E7355" },
							]}
						>
							<Text style={styles.profileAvatarText}>
								{name ? name.charAt(0).toUpperCase() : "M"}
							</Text>
						</View>
					)}
					<View style={styles.profileInfo}>
						<Text style={[styles.profileName, { color: colors.foreground }]}>
							{name}
						</Text>
						<Text style={[styles.profileSub, { color: colors.primary }]}>
							Edit Profile
						</Text>
					</View>
					<Ionicons
						name="chevron-forward"
						size={20}
						color={colors.mutedForeground}
					/>
				</GlassView>
			</Pressable>

			{/* ── Appearance ── */}
			<SettingSection label="APPEARANCE">
				<View style={{ padding: 16 }}>
					<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
						<View style={[styles.iconContainer, { backgroundColor: "#A180F4" }]}>
							<Ionicons name="color-palette" size={15} color="#FFFFFF" />
						</View>
						<Text style={[styles.rowLabel, { color: colors.foreground, marginLeft: 0 }]}>
							App Theme
						</Text>
					</View>

					<View
						style={[
							styles.segmentedContainer,
							{ backgroundColor: colors.secondary, padding: 4 },
						]}
					>
						{THEME_OPTIONS.map((opt) => {
							const active = preference === opt.value;
							return (
								<Pressable
									key={opt.value}
									onPress={() => setPreference(opt.value)}
									accessibilityRole="radio"
									accessibilityState={{ checked: active }}
									accessibilityLabel={`Switch theme to ${opt.label}`}
									style={({ pressed }) => [
										styles.segmentedButton,
										{ flex: 1, paddingVertical: 10 },
										active && { backgroundColor: colors.primary },
										pressed && !active && { opacity: 0.7 },
									]}
								>
									<Ionicons
										name={opt.icon as any}
										size={16}
										color={
											active
												? colors.primaryForeground
												: colors.mutedForeground
										}
									/>
									<Text
										style={[
											styles.segmentedText,
											{
												fontSize: 14,
												fontWeight: active ? "600" : "500",
												color: active
													? colors.primaryForeground
													: colors.mutedForeground,
											},
										]}
									>
										{opt.label}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>
			</SettingSection>

			{/* ── Apple Health ── */}
			<SettingSection
				label="APPLE HEALTH"
				footer={
					isConnected
						? "Syncing steps, calories, sleep, HRV, resting HR, body weight, VO2 Max, SpO2, respiratory rate & workouts."
						: "Connect to unlock your Readiness Score and full health trend analysis."
				}
			>
				<SettingRow
					icon="heart"
					iconBg="#FF2D55"
					label="Apple Health"
					sublabel={
						isConnected
							? "Connected · syncing HRV, sleep, HR & more"
							: "Unlock Readiness Score & 10 health metrics"
					}
					isLast={true}
					rightContent={
						isConnected ? (
							<View style={[styles.connectedBadge, { backgroundColor: colors.success + "20", borderColor: colors.success }]}>
								<View style={[styles.connectedDot, { backgroundColor: colors.success }]} />
								<Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>
									Connected
								</Text>
							</View>
						) : undefined
					}
					onPress={isConnected ? handleDisconnectHealth : requestPermissions}
				/>
			</SettingSection>

			{/* ── About ── */}
			<SettingSection label="ABOUT">
				<SettingRow
					icon="information-circle"
					iconBg="#8E8E93"
					label="App Version"
					isLast={false}
					rightContent={
						<Text style={[styles.infoValue, { color: colors.mutedForeground }]}>
							1.0.0
						</Text>
					}
				/>
				<SettingRow
					icon="heart-outline"
					iconBg="#FF6B8A"
					label="Data Source"
					isLast={true}
					rightContent={
						<Text style={[styles.infoValue, { color: colors.mutedForeground }]}>
							Apple Health
						</Text>
					}
				/>
			</SettingSection>
		</ScrollView>
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

	// Profile Card
	profileCard: {
		marginBottom: 4,
	},
	profileCardInner: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		overflow: "hidden",
	},
	profileImage: {
		width: 56,
		height: 56,
		borderRadius: 28,
	},
	profileAvatarPlaceholder: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
	},
	profileAvatarText: {
		fontSize: 22,
		color: "#FFFFFF",
		fontWeight: "600",
	},
	profileInfo: {
		flex: 1,
		marginLeft: 14,
		justifyContent: "center",
	},
	profileName: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 3,
	},
	profileSub: {
		fontSize: 14,
		fontWeight: "500",
	},

	// SettingSection styles
	sectionContainer: {
		gap: 8,
	},
	sectionLabel: {
		fontSize: 10,
		letterSpacing: 2,
		paddingLeft: 4,
		fontWeight: "600",
	},
	sectionFooter: {
		fontSize: 12,
		paddingLeft: 4,
		marginTop: 4,
		lineHeight: 16,
	},
	sectionCard: {
		overflow: "hidden",
	},

	// SettingRow styles
	rowPressable: {
		minHeight: 52,
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
	rightContentContainer: {
		justifyContent: "center",
	},

	// Connected badge
	connectedBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20,
		borderWidth: 1,
	},
	connectedDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},

	// Segmented picker styles
	segmentedContainer: {
		flexDirection: "row",
		padding: 2,
		borderRadius: 30,
		alignItems: "center",
	},
	segmentedButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 30,
		gap: 4,
	},
	segmentedText: {
		fontSize: 11,
	},

	infoValue: {
		fontSize: 14,
	},
});
