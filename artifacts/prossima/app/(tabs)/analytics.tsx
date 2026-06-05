import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useTraining } from "@/context/TrainingContext";
import { BarChart } from "@/components/BarChart";
import { RingChart } from "@/components/RingChart";
import { Session } from "@/types";

function fmt(s: number) {
	const m = Math.floor(s / 60);
	return m > 0 ? `${m}m` : `${s}s`;
}

function fmtDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function SessionRow({ session }: { session: Session }) {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const exNames = [...new Set(session.entries.map((e) => e.exerciseName))];
	return (
		<GlassView
			colorScheme={resolvedScheme}
			style={[
				styles.sessionRow,
				{
					backgroundColor: colors.card,
					borderRadius: 20,
					borderColor: colors.border,
				},
			]}
		>
			<View
				style={[
					styles.sessionIconWrap,
					{ backgroundColor: "rgba(94, 92, 230, 0.1)" },
				]}
			>
				<Ionicons name="barbell" size={20} color="#5E5CE6" />
			</View>
			<View style={{ flex: 1, gap: 2 }}>
				<Text style={[styles.sessionDay, { color: colors.foreground }]}>
					{session.dayLabel}
				</Text>
				<Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
					{fmtDate(session.date)} · {fmt(session.durationSeconds)} ·{" "}
					{session.entries.length} sets
				</Text>
				{exNames.length > 0 && (
					<Text
						style={[styles.sessionEx, { color: colors.mutedForeground }]}
						numberOfLines={1}
					>
						{exNames.join(" · ")}
					</Text>
				)}
			</View>
		</GlassView>
	);
}

const MONTH_GOAL = 12;

export default function AnalyticsScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { sessions, getPersonalBest, plan } = useTraining();

	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

	const isDark = resolvedScheme === "dark";
	const gradientColors = colors.backgroundGradient;

	const { thisMonth, totalVolume, avgDur, longestSession } = useMemo(() => {
		const now = new Date();
		const thisMonth = sessions.filter((s) => {
			const d = new Date(s.date);
			return (
				d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
			);
		}).length;
		const totalVolume = sessions.reduce(
			(acc, s) =>
				acc +
				s.entries.reduce(
					(a, e) => (e.weightKg && e.reps ? a + e.weightKg * e.reps : a),
					0,
				),
			0,
		);
		const avgDur = sessions.length
			? Math.round(
					sessions.reduce((a, s) => a + s.durationSeconds, 0) / sessions.length,
				)
			: 0;
		const longestSession = sessions.length
			? Math.max(...sessions.map((s) => s.durationSeconds))
			: 0;
		return { thisMonth, totalVolume, avgDur, longestSession };
	}, [sessions]);

	const weeklyData = useMemo(() => {
		const now = new Date();
		return Array.from({ length: 8 }, (_, i) => {
			const wk = 7 - i;
			const start = new Date(now);
			start.setDate(now.getDate() - wk * 7);
			const end = new Date(start);
			end.setDate(start.getDate() + 7);
			const count = sessions.filter((s) => {
				const d = new Date(s.date);
				return d >= start && d < end;
			}).length;
			return { label: wk === 0 ? "Now" : `-${wk}w`, value: count };
		}).reverse();
	}, [sessions]);

	const bestLifts = useMemo(() => {
		if (!plan) return [];
		const names = [
			...new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.name))),
		];
		return names
			.map((n) => ({ name: n, pb: getPersonalBest(n) }))
			.filter((x) => x.pb)
			.sort((a, b) => (b.pb?.volume ?? 0) - (a.pb?.volume ?? 0))
			.slice(0, 6);
	}, [plan, getPersonalBest]);

	if (!sessions.length) {
		return (
			<LinearGradient
				colors={gradientColors}
				style={[styles.center, { paddingTop: topPad }]}
			>
				<Ionicons
					name="leaf-outline"
					size={36}
					color={colors.mutedForeground}
				/>
				<Text style={[styles.emptyTitle, { color: colors.foreground }]}>
					No data yet
				</Text>
				<Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
					Complete a session to see your stats.
				</Text>
			</LinearGradient>
		);
	}

	const avgMin = Math.floor(avgDur / 60);
	const longestMin = Math.floor(longestSession / 60);
	const volDisplay =
		totalVolume >= 1000
			? `${(totalVolume / 1000).toFixed(1)}t`
			: `${Math.round(totalVolume)}`;

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingTop: topPad, paddingBottom: botPad + 80 },
			]}
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="never"
		>
			<Text style={[styles.screenTitle, { color: colors.foreground }]}>
				Review
			</Text>

			<GlassView
				colorScheme={resolvedScheme}
				style={[
					styles.ringsCard,
					{
						backgroundColor: colors.card,
						borderRadius: 20,
						borderColor: colors.border,
					},
				]}
			>
				<Text style={[styles.sectionLabel, { color: colors.foreground }]}>
					THIS MONTH
				</Text>
				<View style={styles.ringsRow}>
					<RingChart
						progress={Math.min(thisMonth / MONTH_GOAL, 1)}
						size={90}
						strokeWidth={7}
						label="Sessions"
						value={String(thisMonth)}
						sublabel={`/ ${MONTH_GOAL}`}
						color={colors.accent}
					/>
					<View
						style={[styles.ringDivider, { backgroundColor: colors.separator }]}
					/>
					<RingChart
						progress={Math.min(totalVolume / 50000, 1)}
						size={90}
						strokeWidth={7}
						label="Volume"
						value={volDisplay}
						sublabel={totalVolume < 1000 ? "kg" : undefined}
						color={colors.accent}
					/>
					<View
						style={[styles.ringDivider, { backgroundColor: colors.separator }]}
					/>
					<RingChart
						progress={longestMin > 0 ? Math.min(avgMin / longestMin, 1) : 0}
						size={90}
						strokeWidth={7}
						label="Avg Time"
						value={avgMin > 0 ? `${avgMin}` : "—"}
						sublabel={avgMin > 0 ? "min" : undefined}
						color={colors.accent}
					/>
				</View>
				<Text style={[styles.totalLine, { color: colors.mutedForeground }]}>
					{sessions.length} sessions total
				</Text>
			</GlassView>

			<GlassView
				colorScheme={resolvedScheme}
				style={[
					styles.section,
					{
						backgroundColor: colors.card,
						borderRadius: 20,
						borderColor: colors.border,
					},
				]}
			>
				<Text style={[styles.sectionLabel, { color: colors.foreground }]}>
					SESSIONS / WEEK
				</Text>
				<BarChart data={weeklyData} height={72} />
			</GlassView>

			{bestLifts.length > 0 && (
				<GlassView
					colorScheme={resolvedScheme}
					style={[
						styles.section,
						{
							backgroundColor: colors.card,
							borderRadius: 20,
							borderColor: colors.border,
						},
					]}
				>
					<Text style={[styles.sectionLabel, { color: colors.foreground }]}>
						BEST LIFTS
					</Text>
					{bestLifts.map(({ name, pb }) => (
						<View
							key={name}
							style={[styles.pbRow, { borderBottomColor: colors.separator }]}
						>
							<Text
								style={[styles.pbName, { color: colors.foreground }]}
								numberOfLines={1}
							>
								{name}
							</Text>
							<View
								style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
							>
								<Ionicons name="star" size={14} color="#FFD700" />
								<Text
									style={[
										styles.pbVal,
										{
											color: colors.foreground,
											fontVariant: ["tabular-nums"],
										},
									]}
								>
									{pb!.weightKg}kg × {pb!.reps}
								</Text>
							</View>
						</View>
					))}
				</GlassView>
			)}

			<Text style={[styles.sectionHeader, { color: colors.foreground }]}>
				Recent
			</Text>
			{sessions.slice(0, 10).map((s) => (
				<SessionRow key={s.id} session={s} />
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
	},
	emptyBody: {
		fontSize: 14,
		textAlign: "center",
	},
	content: { paddingHorizontal: 20, gap: 14 },
	screenTitle: {
		fontSize: 32,
		fontWeight: "700",
		letterSpacing: -0.5,
		lineHeight: 36,
		marginBottom: 4,
	},
	ringsCard: { padding: 20, gap: 20 },
	ringsRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
	},
	ringDivider: { width: StyleSheet.hairlineWidth, height: 64 },
	totalLine: {
		fontSize: 12,
		textAlign: "center",
		marginTop: -4,
	},
	section: { padding: 16, gap: 14 },
	sectionLabel: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1.2,
		marginBottom: 4,
	},
	pbRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	pbName: { fontSize: 15, flex: 1, fontWeight: "500" },
	pbVal: { fontSize: 15, fontWeight: "600" },
	sectionHeader: {
		fontSize: 20,
		fontWeight: "600",
		letterSpacing: -0.3,
		marginTop: 8,
		marginBottom: 4,
	},
	sessionRow: { padding: 16, marginBottom: 4, flexDirection: "row", alignItems: "center" },
	sessionIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 14,
	},
	sessionDay: {
		fontSize: 16,
		fontWeight: "600",
	},
	sessionMeta: {
		fontSize: 13,
		fontVariant: ["tabular-nums"],
	},
	sessionEx: { fontSize: 12, marginTop: 2 },
});

