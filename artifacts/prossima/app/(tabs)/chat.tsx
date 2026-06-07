import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	SafeAreaView,
} from "react-native";
import { useHealth } from "@/context/HealthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
}

export default function ChatScreen() {
	const { stats, readiness } = useHealth();
	const colors = useColors();
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "1",
			role: "assistant",
			content:
				"Hi! I'm your Prossima AI coach. How can I help you with your health data today?",
		},
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const flatListRef = useRef<FlatList>(null);

	const sendMessage = async () => {
		if (!input.trim() || isLoading) return;

		const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

		if (!GROQ_API_KEY) {
			const errorMessage: Message = {
				id: Date.now().toString(),
				role: "assistant",
				content:
					"API Key missing. Please ensure EXPO_PUBLIC_GROQ_API_KEY is set in your .env file and restart your Expo server with 'npx expo start -c'.",
			};
			setMessages((prev) => [...prev, errorMessage]);
			return;
		}

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input.trim(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		try {
			// Construct the system prompt with current health context
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
- Body wheight: ${stats.bodyWeightKg ?? "N/A"}kg
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
		} catch (error: any) {
			console.error("Chat Error:", error);
			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: `Error: ${error.message || "Unknown connection error"}. Please check your internet connection or API key.`,
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				flatListRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}
	}, [messages]);

	const renderMessage = ({ item }: { item: Message }) => {
		const isUser = item.role === "user";
		return (
			<View
				style={[
					styles.messageContainer,
					isUser ? styles.userMessage : styles.assistantMessage,
					{ backgroundColor: isUser ? "#00B4D8" : colors.card },
				]}
			>
				<Text
					style={[styles.messageText, { color: isUser ? "#FFF" : colors.text }]}
				>
					{item.content}
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<FlatList
					ref={flatListRef}
					data={messages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.messageList}
					onContentSizeChange={() =>
						flatListRef.current?.scrollToEnd({ animated: true })
					}
				/>

				{isLoading && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#00B4D8" />
						<Text
							style={[styles.loadingText, { color: colors.mutedForeground }]}
						>
							Thinking...
						</Text>
					</View>
				)}

				<View
					style={[
						styles.inputContainer,
						{
							backgroundColor: colors.background,
						},
					]}
				>
					<TextInput
						style={[
							styles.input,
							{
								color: colors.text,
								backgroundColor: colors.card,
								borderColor: colors.border,
							},
						]}
						value={input}
						onChangeText={setInput}
						placeholder="Ask me anything..."
						placeholderTextColor={colors.mutedForeground}
						multiline
					/>
					<TouchableOpacity
						style={[styles.sendButton, { backgroundColor: "#00B4D8" }]}
						onPress={sendMessage}
						disabled={!input.trim() || isLoading}
					>
						<Feather name="send" size={20} color="#FFF" />
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(0,0,0,0.1)",
		alignItems: "center",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "bold",
	},
	messageList: {
		padding: 16,
		paddingBottom: 32,
	},
	messageContainer: {
		padding: 12,
		borderRadius: 16,
		marginBottom: 12,
		maxWidth: "85%",
	},
	userMessage: {
		alignSelf: "flex-end",
		borderBottomRightRadius: 4,
	},
	assistantMessage: {
		alignSelf: "flex-start",
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 16,
		lineHeight: 22,
	},
	inputContainer: {
		flexDirection: "row",
		paddingHorizontal: 20,
		paddingVertical: 12,
		alignItems: "flex-end",
	},
	input: {
		flex: 1,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 10,
		fontSize: 16,
		maxHeight: 120,
		borderWidth: 1,
	},
	sendButton: {
		width: 44,
		height: 44,
		borderRadius: 99,
		marginLeft: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	loadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
	},
	loadingText: {
		marginLeft: 8,
		fontSize: 14,
	},
	istantMessage: {
		alignSelf: "flex-start",
		borderBottomLeftRadius: 4,
	},
});
