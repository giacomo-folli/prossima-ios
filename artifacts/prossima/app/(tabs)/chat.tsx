import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	FlatList,
	KeyboardAvoidingView,
	Keyboard,
	Platform,
	Pressable,
	Animated,
	LayoutAnimation,
	UIManager,
} from "react-native";

import { GlassView } from "expo-glass-effect";
import { useHealth } from "@/context/HealthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useCardStyle } from "@/hooks/useCardStyle";

// Enable LayoutAnimation on Android
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
}

interface ThinkingStep {
	id: string;
	text: string;
	icon: "search" | "sparkles" | "analytics" | "checkmark";
	done: boolean;
}

const THINKING_STEPS: ThinkingStep[] = [
	{
		id: "1",
		text: "Analyzing your recent recovery signals",
		icon: "search",
		done: false,
	},
	{
		id: "2",
		text: "Reviewing sleep, effort, and biomarker trends",
		icon: "analytics",
		done: false,
	},
	{
		id: "3",
		text: "Preparing insights and recommendations",
		icon: "sparkles",
		done: false,
	},
];

const SUGGESTION_CHIPS = [
	{ id: "1", text: "Review my sleep", icon: "moon" as const },
	{ id: "2", text: "Training readiness", icon: "fitness" as const },
	{ id: "3", text: "Recovery tips", icon: "heart" as const },
];

const preprocessMarkdown = (text: string): string => {
	if (!text) return "";
	return text
		.replace(/^(?:\s*#{1,6}\s+)(.*)$/gm, "**$1**")
		.replace(/^(?:\s*[-*]\s+)/gm, "• ");
};

const renderFormattedText = (text: string) => {
	if (!text) return null;

	const processed = preprocessMarkdown(text);
	const boldParts = processed.split(/(\*\*.*?\*\*|__.*?__)/g);

	return boldParts.map((boldPart, boldIndex) => {
		const isBold =
			(boldPart.startsWith("**") && boldPart.endsWith("**")) ||
			(boldPart.startsWith("__") && boldPart.endsWith("__"));
		const textToProcess = isBold ? boldPart.slice(2, -2) : boldPart;

		const italicParts = textToProcess.split(/(\*.*?\*|_.*?_)/g);

		return italicParts.map((italicPart, italicIndex) => {
			const isItalic =
				(italicPart.startsWith("*") && italicPart.endsWith("*")) ||
				(italicPart.startsWith("_") && italicPart.endsWith("_"));
			const cleanText = isItalic ? italicPart.slice(1, -1) : italicPart;

			if (cleanText === "") return null;

			return (
				<Text
					key={`${boldIndex}-${italicIndex}`}
					style={[
						isBold && { fontWeight: "700" },
						isItalic && { fontStyle: "italic" },
					]}
				>
					{cleanText}
				</Text>
			);
		});
	});
};

export default function ChatScreen() {
	const { stats, readiness } = useHealth();
	const { resolvedScheme } = useTheme();
	const colors = useColors();
	const insets = useSafeAreaInsets();
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
	const [thinkingExpanded, setThinkingExpanded] = useState(false);
	const [thinkingSeconds, setThinkingSeconds] = useState(0);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const flatListRef = useRef<FlatList>(null);
	const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Pulsing dot animation for thinking
	const pulseAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (isLoading) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 800,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 0,
						duration: 800,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			pulseAnim.setValue(0);
		}
	}, [isLoading, pulseAnim]);

	const pulseOpacity = pulseAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.4, 1],
	});

	const cardStyle = useCardStyle("standard");

	const simulateThinkingSteps = useCallback(() => {
		setThinkingSteps(THINKING_STEPS.map((s) => ({ ...s, done: false })));
		setThinkingSeconds(0);
		setThinkingExpanded(false);

		// Start thinking timer
		thinkingTimerRef.current = setInterval(() => {
			setThinkingSeconds((prev) => prev + 1);
		}, 1000);

		// Sequentially mark steps as done
		THINKING_STEPS.forEach((_, index) => {
			setTimeout(
				() => {
					LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
					setThinkingSteps((prev) =>
						prev.map((s, i) => (i <= index ? { ...s, done: true } : s)),
					);
				},
				(index + 1) * 1200,
			);
		});
	}, []);

	const clearThinking = useCallback(() => {
		if (thinkingTimerRef.current) {
			clearInterval(thinkingTimerRef.current);
			thinkingTimerRef.current = null;
		}
		setThinkingSteps([]);
		setThinkingSeconds(0);
		setThinkingExpanded(false);
	}, []);

	const handleSuggestion = (text: string) => {
		setInput(text);
		setTimeout(() => sendMessage(text), 50);
	};

	const handleGetReview = () => {
		const reviewMessage =
			"Give me an overall review of my health based on my latest metrics.";
		setInput(reviewMessage);
		setTimeout(() => sendMessage(reviewMessage), 50);
	};

	const handleCopy = (messageId: string, content: string) => {
		if (Platform.OS === "web") {
			navigator.clipboard?.writeText(content);
		} else {
			Clipboard.setStringAsync(content);
		}

		setCopiedId(messageId);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const sendMessage = async (messageToSend?: string) => {
		const currentInput = (messageToSend || input).trim();
		if (!currentInput || isLoading) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: currentInput,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		simulateThinkingSteps();

		try {
			const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
			if (!GROQ_API_KEY) {
				throw new Error(
					"API Key missing. Please set EXPO_PUBLIC_GROQ_API_KEY in .env",
				);
			}

			const systemPrompt = `You are the AI Health and Performance Coach for Prossima, a minimalist fitness app focused on progressive progression. 

Analyze the following daily biometric data to provide a concise, highly actionable, and professional coaching insight.

### User Biometrics:
- Readiness Score: ${readiness?.score ?? "N/A"}/100
- Steps Today: ${stats.steps}
- Active Calories: ${stats.calories} kcal
- Sleep Duration: ${stats.sleepHours} hours (Deep: ${Math.round(stats.sleepDeepRatio * 100)}%, REM: ${Math.round(stats.sleepRemRatio * 100)}%)
- Current HRV: ${stats.todayHrv ?? "N/A"} ms
- Resting HR: ${stats.todayRestingHr ?? "N/A"} bpm
- VO2 Max: ${stats.vo2Max ?? "N/A"}
- Activity time: ${stats.activityTime}
- Recent workout calories: ${stats.recentWorkout?.calories ?? "N/A"}
- Recent workout duration: ${stats.recentWorkout?.durationMinutes ?? "N/A"}
- Recent workout date: ${stats.recentWorkout?.startDate ?? "N/A"}
- Body weight: ${stats.bodyWeightKg ?? "N/A"}kg
- Body fat percent: ${stats.bodyFatPercent ?? "N/A"}
- Distance walked recently: ${stats.distanceMeters ?? "N/A"}
- Basal calories: ${stats.basalCalories} kcal

### Response Guidelines:
1. **Tone:** Professional, encouraging, and data-driven. No generic fluff ("Great job!", "Keep it up!"). Sound like a high-level performance coach.
2. **Structure:** Keep it under 150 words total, split into two brief sections:
   - **The Insight:** A 1-2 sentence analysis connecting the recovery metrics (HRV, Sleep, RHR) to their Readiness.
   - **The Action Item:** Exactly one clear, specific recommendation for today's training or recovery (e.g., greenlight a progressive overload session, suggest a low-intensity active recovery run, or prioritize an early bedtime).
3. **Context:** Focus on incremental training progression. If metrics are low, pivot to optimizing recovery so they can push harder tomorrow.`;

			const response = await fetch(
				"https://api.groq.com/openai/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${GROQ_API_KEY}`,
					},
					body: JSON.stringify({
						model: "llama-3.1-8b-instant",
						messages: [
							{ role: "system", content: systemPrompt },
							...messages.map((m) => ({ role: m.role, content: m.content })),
							{ role: "user", content: userMessage.content },
						],
						temperature: 0.7,
						max_tokens: 1024,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error("Groq API Error:", response.status, errorData);
				throw new Error(
					errorData.error?.message || `Groq API returned ${response.status}`,
				);
			}

			const data = await response.json();

			if (data.choices && data.choices[0]) {
				const assistantMessage: Message = {
					id: (Date.now() + 1).toString(),
					role: "assistant",
					content: data.choices[0].message.content,
				};
				setMessages((prev) => [...prev, assistantMessage]);
			} else {
				throw new Error("Invalid response structure from Groq");
			}
		} catch (error: unknown) {
			console.error("Chat Error:", error);
			const errorMsg =
				error instanceof Error ? error.message : "Unknown connection error";
			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: `Error: ${errorMsg}. Please check your internet connection or API key.`,
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
			clearThinking();
		}
	};

	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				flatListRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}
	}, [messages]);

	// Track keyboard visibility
	useEffect(() => {
		const showSub = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			() => setKeyboardVisible(true),
		);
		const hideSub = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => setKeyboardVisible(false),
		);
		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	// Clean up thinking timer on unmount
	useEffect(() => {
		return () => {
			if (thinkingTimerRef.current) {
				clearInterval(thinkingTimerRef.current);
			}
		};
	}, []);

	const renderMessage = ({ item }: { item: Message }) => {
		const isUser = item.role === "user";

		if (isUser) {
			return (
				<View style={styles.userBubbleRow}>
					<View style={[styles.userBubble, { backgroundColor: colors.accent }]}>
						<Text style={[styles.messageText, { color: "#FFFFFF" }]}>
							{renderFormattedText(item.content)}
						</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={styles.assistantBubbleRow}>
				<View
					style={[
						styles.aiAvatarWrap,
						{ backgroundColor: colors.accent + "1A" },
					]}
				>
					<Ionicons name="sparkles" size={14} color={colors.accent} />
				</View>
				<View style={{ flex: 1 }}>
					<GlassView
						colorScheme={resolvedScheme}
						style={[
							styles.assistantBubble,
							cardStyle,
						]}
					>
						<Text style={[styles.messageText, { color: colors.text }]}>
							{renderFormattedText(item.content)}
						</Text>
					</GlassView>
					{/* Action buttons */}
					<View style={styles.messageActions}>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={() => handleCopy(item.id, item.content)}
							activeOpacity={0.6}
						>
							<Ionicons
								name={copiedId === item.id ? "checkmark" : "copy-outline"}
								size={15}
								color={
									copiedId === item.id ? colors.success : colors.mutedForeground
								}
							/>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	};

	const renderThinkingSteps = () => {
		if (!isLoading || thinkingSteps.length === 0) return null;

		const allDone = thinkingSteps.every((s) => s.done);

		return (
			<View style={styles.thinkingContainer}>
				<View style={styles.assistantBubbleRow}>
					<View
						style={[
							styles.aiAvatarWrap,
							{ backgroundColor: colors.accent + "1A" },
						]}
					>
						<Animated.View style={{ opacity: pulseOpacity }}>
							<Ionicons name="sparkles" size={14} color={colors.accent} />
						</Animated.View>
					</View>
					<View style={{ flex: 1 }}>
						<GlassView
							colorScheme={resolvedScheme}
							style={[
								styles.thinkingCard,
								cardStyle,
							]}
						>
							<Pressable
								onPress={() => {
									LayoutAnimation.configureNext(
										LayoutAnimation.Presets.easeInEaseOut,
									);
									setThinkingExpanded((prev) => !prev);
								}}
								style={styles.thinkingHeader}
							>
								<View style={styles.thinkingHeaderLeft}>
									<Animated.View
										style={[
											styles.thinkingDot,
											{ opacity: pulseOpacity, backgroundColor: colors.accent },
										]}
									/>
									<Text
										style={[
											styles.thinkingHeaderText,
											{ color: colors.mutedForeground },
										]}
									>
										{allDone
											? `Thought for ${thinkingSeconds}s`
											: `Thinking for ${thinkingSeconds}s`}
									</Text>
								</View>
								<Ionicons
									name={thinkingExpanded ? "chevron-up" : "chevron-down"}
									size={16}
									color={colors.mutedForeground}
								/>
							</Pressable>

							{thinkingExpanded && (
								<View style={styles.thinkingStepsList}>
									{thinkingSteps.map((step) => {
										const stepIconMap = {
											search: "search" as const,
											sparkles: "sparkles" as const,
											analytics: "analytics" as const,
											checkmark: "checkmark-circle" as const,
										};
										return (
											<View key={step.id} style={styles.thinkingStep}>
												<Ionicons
													name={
														step.done
															? "checkmark-circle"
															: stepIconMap[step.icon]
													}
													size={14}
													color={
														step.done ? colors.success : colors.mutedForeground
													}
												/>
												<Text
													style={[
														styles.thinkingStepText,
														{
															color: step.done
																? colors.text
																: colors.mutedForeground,
														},
													]}
												>
													{step.text}
												</Text>
												<Ionicons
													name="chevron-forward"
													size={12}
													color={colors.mutedForeground}
													style={{ opacity: 0.5 }}
												/>
											</View>
										);
									})}
									{allDone && (
										<View style={styles.thinkingStep}>
											<Ionicons
												name="checkmark-circle"
												size={14}
												color={colors.success}
											/>
											<Text
												style={[
													styles.thinkingStepText,
													{
														color: colors.text,
														fontWeight: "600",
													},
												]}
											>
												Done
											</Text>
										</View>
									)}
								</View>
							)}
						</GlassView>
					</View>
				</View>
			</View>
		);
	};

	const ListEmptyComponent = (
		<View style={styles.emptyContainer}>
			<View
				style={[
					styles.emptyIconWrap,
					{ backgroundColor: colors.accent + "15" },
				]}
			>
				<Ionicons name="sparkles" size={32} color={colors.accent} />
			</View>
			<Text style={[styles.emptyTitle, { color: colors.foreground }]}>
				AI Health Coach
			</Text>
			<Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
				Get personalized insights based on your latest health metrics and
				recovery data.
			</Text>
			<TouchableOpacity
				style={[styles.reviewButton, { backgroundColor: colors.accent }]}
				onPress={handleGetReview}
				disabled={isLoading}
				activeOpacity={0.85}
			>
				<Ionicons
					name="flash"
					size={18}
					color="#FFFFFF"
					style={{ marginRight: 8 }}
				/>
				<Text style={styles.reviewButtonText}>
					{isLoading ? "Analyzing..." : "Get A Review"}
				</Text>
			</TouchableOpacity>

			{/* Suggestion chips */}
			<View style={styles.chipsContainer}>
				{SUGGESTION_CHIPS.map((chip) => (
					<Pressable
						key={chip.id}
						style={({ pressed }) => [
							styles.chip,
							{
								backgroundColor: pressed ? colors.secondary : colors.card,
								borderColor: colors.border,
							},
						]}
						onPress={() => handleSuggestion(chip.text)}
					>
						<Ionicons
							name={chip.icon}
							size={14}
							color={colors.mutedForeground}
						/>
						<Text style={[styles.chipText, { color: colors.foreground }]}>
							{chip.text}
						</Text>
					</Pressable>
				))}
			</View>
		</View>
	);

	const tabBarHeight = Platform.OS === "web" ? 84 : 64;
	const topPad = Platform.OS === "web" ? 20 : insets.top;
	const bottomPadding = tabBarHeight + insets.bottom;
	const gradientColors = colors.backgroundGradient;

	return (
		<View style={styles.container}>
			<AnimatedBackground />

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
				keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
			>
				{/* Screen header */}
				<View style={[styles.screenHeader, { paddingTop: topPad + 16 }]}>
					<View>
						<Text style={[styles.screenTitle, { color: colors.foreground }]}>
							Chat
						</Text>
						<Text
							style={[styles.screenSubtitle, { color: colors.mutedForeground }]}
						>
							AI Health Coach
						</Text>
					</View>
					<View
						style={[
							styles.headerIcon,
							{ backgroundColor: colors.accent + "15" },
						]}
					>
						<Ionicons name="sparkles" size={18} color={colors.accent} />
					</View>
				</View>

				<FlatList
					ref={flatListRef}
					data={messages}
					renderItem={renderMessage}
					ListEmptyComponent={!isLoading ? ListEmptyComponent : null}
					ListFooterComponent={renderThinkingSteps}
					keyExtractor={(item) => item.id}
					contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
					onContentSizeChange={() =>
						flatListRef.current?.scrollToEnd({ animated: true })
					}
					showsVerticalScrollIndicator={false}
				/>

				{/* Input area */}
				<View
					style={[
						styles.inputOuterContainer,
						{
							paddingBottom: keyboardVisible ? 8 : Math.max(bottomPadding, 16),
						},
					]}
				>
					<View style={styles.inputContainer}>
						<View
							style={[
								styles.inputFieldWrap,
								{
									backgroundColor: colors.card,
									borderColor: colors.border,
								},
							]}
						>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={input}
								onChangeText={setInput}
								placeholder="Ask anything..."
								placeholderTextColor={colors.mutedForeground}
								multiline
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.sendButton,
								{
									backgroundColor: colors.accent,
									opacity: !input.trim() || isLoading ? 0.5 : 1,
								},
							]}
							onPress={() => sendMessage()}
							disabled={!input.trim() || isLoading}
							activeOpacity={0.85}
						>
							<Ionicons name="arrow-up" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	// ── Screen Header ──
	screenHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingBottom: 8,
	},
	screenTitle: {
		fontSize: 34,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	screenSubtitle: {
		fontSize: 16,
		fontWeight: "500",
		marginTop: 4,
	},
	headerIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 6,
	},

	// ── Message List ──
	messageList: {
		flexGrow: 1,
		paddingHorizontal: 20,
		paddingTop: 8,
	},

	// ── User Bubble ──
	userBubbleRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		marginBottom: 16,
	},
	userBubble: {
		maxWidth: "82%",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 20,
		borderBottomRightRadius: 6,
	},

	// ── Assistant Bubble ──
	assistantBubbleRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 16,
		gap: 10,
	},
	aiAvatarWrap: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 2,
	},
	assistantBubble: {
		borderRadius: 20,
		borderBottomLeftRadius: 6,
		paddingVertical: 14,
		paddingHorizontal: 16,
		overflow: "hidden",
	},

	// ── Message Text ──
	messageText: {
		fontSize: 15,
		lineHeight: 22,
	},

	// ── Message Actions ──
	messageActions: {
		flexDirection: "row",
		marginTop: 6,
		marginLeft: 4,
		gap: 4,
	},
	actionButton: {
		padding: 6,
		borderRadius: 8,
	},

	// ── Thinking Steps ──
	thinkingContainer: {
		marginBottom: 16,
	},
	thinkingCard: {
		borderRadius: 16,
		overflow: "hidden",
	},
	thinkingHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	thinkingHeaderLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	thinkingDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	thinkingHeaderText: {
		fontSize: 13,
		fontWeight: "500",
	},
	thinkingStepsList: {
		paddingHorizontal: 14,
		paddingBottom: 12,
		gap: 8,
	},
	thinkingStep: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	thinkingStepText: {
		fontSize: 13,
		flex: 1,
	},

	// ── Empty State ──
	emptyContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
		paddingBottom: 60,
	},
	emptyIconWrap: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	emptyTitle: {
		fontSize: 28,
		fontWeight: "700",
		letterSpacing: -0.5,
		textAlign: "center",
	},
	emptySubtitle: {
		fontSize: 15,
		marginTop: 8,
		textAlign: "center",
		maxWidth: "85%",
		lineHeight: 22,
	},
	reviewButton: {
		marginTop: 28,
		paddingVertical: 14,
		paddingHorizontal: 28,
		borderRadius: 50,
		flexDirection: "row",
		alignItems: "center",
	},
	reviewButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFFFFF",
	},

	// ── Suggestion Chips ──
	chipsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		marginTop: 20,
		gap: 8,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 20,
		borderWidth: StyleSheet.hairlineWidth,
		gap: 6,
	},
	chipText: {
		fontSize: 13,
		fontWeight: "500",
	},

	// ── Input Area ──
	inputOuterContainer: {
		overflow: "hidden",
	},
	inputContainer: {
		flexDirection: "row",
		paddingHorizontal: 12,
		paddingVertical: 10,
		alignItems: "flex-end",
		backgroundColor: "transparent",
		gap: 8,
	},
	inputIconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
	inputFieldWrap: {
		flex: 1,
		flexDirection: "row",
		alignItems: "flex-end",
		borderRadius: 22,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	input: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 10,
		fontSize: 15,
		maxHeight: 120,
	},
	sendButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
});
