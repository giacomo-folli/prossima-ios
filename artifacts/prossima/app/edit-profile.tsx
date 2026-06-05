import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/context/ProfileContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@/context/ThemeContext";

export default function EditProfileScreen() {
	const colors = useColors();
	const { resolvedScheme } = useTheme();
	const { name, setName, imageUri, setImageUri } = useProfile();
	const insets = useSafeAreaInsets();
	
	const [draftName, setDraftName] = useState(name);
	const [draftImage, setDraftImage] = useState(imageUri);

	const handlePickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0].uri) {
			setDraftImage(result.assets[0].uri);
		}
	};

	const handleSave = async () => {
		if (draftName.trim()) {
			await setName(draftName.trim());
		}
		await setImageUri(draftImage);
		router.back();
	};

	return (
		<KeyboardAvoidingView 
			style={{ flex: 1, backgroundColor: colors.background }}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<Stack.Screen 
				options={{ 
					headerTitle: "Edit Profile",
					headerStyle: { backgroundColor: colors.background },
					headerTintColor: colors.foreground,
					headerShadowVisible: false,
					headerRight: () => (
						<Pressable onPress={handleSave}>
							<Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Save</Text>
						</Pressable>
					)
				}} 
			/>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
				<View style={styles.imageSection}>
					<Pressable onPress={handlePickImage} style={styles.imageContainer}>
						{draftImage ? (
							<Image source={{ uri: draftImage }} style={styles.image} contentFit="cover" />
						) : (
							<View style={[styles.placeholderImage, { backgroundColor: colors.card }]}>
								<Text style={[styles.placeholderText, { color: colors.foreground }]}>
									{draftName ? draftName.charAt(0).toUpperCase() : "M"}
								</Text>
							</View>
						)}
						<View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
							<Ionicons name="camera" size={16} color="#FFF" />
						</View>
					</Pressable>
				</View>

				<View style={styles.formSection}>
					<Text style={[styles.label, { color: colors.mutedForeground }]}>NAME</Text>
					<GlassView colorScheme={resolvedScheme} style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
						<TextInput
							style={[styles.input, { color: colors.foreground }]}
							value={draftName}
							onChangeText={setDraftName}
							placeholder="Enter your name"
							placeholderTextColor={colors.mutedForeground}
							autoCorrect={false}
						/>
					</GlassView>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	content: {
		padding: 20,
	},
	imageSection: {
		alignItems: 'center',
		marginVertical: 32,
	},
	imageContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		justifyContent: 'center',
		alignItems: 'center',
	},
	image: {
		width: 120,
		height: 120,
		borderRadius: 60,
	},
	placeholderImage: {
		width: 120,
		height: 120,
		borderRadius: 60,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
	},
	placeholderText: {
		fontSize: 48,
		fontWeight: '600',
	},
	editBadge: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#000',
	},
	formSection: {
		gap: 8,
	},
	label: {
		fontSize: 12,
		letterSpacing: 1,
		marginLeft: 4,
	},
	inputContainer: {
		borderRadius: 12,
		borderWidth: 1,
		overflow: 'hidden',
	},
	input: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
	},
});
