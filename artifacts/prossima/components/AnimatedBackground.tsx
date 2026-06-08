import React from "react";
import { StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAnimatedGradient } from "@/hooks/useAnimatedGradient";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function AnimatedBackground() {
	const colors = useColors();
	const { translateX, translateY, scale } = useAnimatedGradient();
	const gradientColors = colors.backgroundGradient;

	return (
		<AnimatedLinearGradient
			colors={gradientColors}
			start={{ x: 1, y: 0 }}
			end={{ x: 0, y: 1 }}
			style={[
				StyleSheet.absoluteFill,
				{
					transform: [{ translateX }, { translateY }, { scale }],
				},
			]}
		/>
	);
}
