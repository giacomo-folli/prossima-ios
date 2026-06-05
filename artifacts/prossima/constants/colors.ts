export type ThemePalette = {
	text: string;
	tint: string;
	background: string;
	backgroundGradient: [string, string, string];
	foreground: string;
	card: string;
	cardForeground: string;
	cardElevated: string;
	primary: string;
	primaryForeground: string;
	secondary: string;
	secondaryForeground: string;
	muted: string;
	mutedForeground: string;
	accent: string;
	accentForeground: string;
	destructive: string;
	destructiveForeground: string;
	success: string;
	successForeground: string;
	warning: string;
	border: string;
	input: string;
	separator: string;
};

const colors = {
	dark: {
		text: "#F1F5F9",
		tint: "#3B82F6",
		background: "#0B0E14",
		backgroundGradient: ["#0B0E14", "#151D2A", "#0B0E14"],
		foreground: "#F8FAFC",
		card: "rgba(255, 255, 255, 0.08)",
		cardForeground: "#F8FAFC",
		cardElevated: "rgba(21, 29, 43, 0.98)",
		primary: "#F8FAFC",
		primaryForeground: "#0B0E14",
		secondary: "rgba(255, 255, 255, 0.15)",
		secondaryForeground: "#F8FAFC",
		muted: "rgba(255, 255, 255, 0.05)",
		mutedForeground: "#94A3B8",
		accent: "#3B82F6",
		accentForeground: "#FFFFFF",
		destructive: "#EF4444",
		destructiveForeground: "#FFFFFF",
		success: "#10B981",
		successForeground: "#FFFFFF",
		warning: "#F59E0B",
		border: "rgba(255, 255, 255, 0.15)",
		input: "rgba(255, 255, 255, 0.1)",
		separator: "rgba(255, 255, 255, 0.12)",
	} as ThemePalette,
	light: {
		text: "#0F172A",
		tint: "#007AFF",
		background: "#F1F5F9",
		backgroundGradient: ["#E2E8F0", "#F8FAFC", "#E8EEF5"],
		foreground: "#0F172A",
		card: "rgba(255, 255, 255, 0.65)",
		cardForeground: "#0F172A",
		cardElevated: "rgba(255, 255, 255, 0.98)",
		primary: "#0F172A",
		primaryForeground: "#FFFFFF",
		secondary: "rgba(0, 0, 0, 0.04)",
		secondaryForeground: "#0F172A",
		muted: "rgba(0, 0, 0, 0.02)",
		mutedForeground: "#64748B",
		accent: "#3B82F6",
		accentForeground: "#FFFFFF",
		destructive: "#DC2626",
		destructiveForeground: "#FFFFFF",
		success: "#10B981",
		successForeground: "#FFFFFF",
		warning: "#D97706",
		border: "rgba(0, 0, 0, 0.08)",
		input: "#FFFFFF",
		separator: "rgba(0, 0, 0, 0.06)",
	} as ThemePalette,
	radius: 16,
} as const;

export default colors;
