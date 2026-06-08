import { useRef, useEffect } from "react";
import { Animated } from "react-native";

export function useAnimatedGradient() {
	const animValue = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(animValue, {
					toValue: 1,
					duration: 18000,
					useNativeDriver: true,
				}),
				Animated.timing(animValue, {
					toValue: 0,
					duration: 18000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [animValue]);

	const translateX = animValue.interpolate({
		inputRange: [0, 1],
		outputRange: [-30, 10],
	});
	const translateY = animValue.interpolate({
		inputRange: [0, 1],
		outputRange: [-20, 20],
	});
	const scale = animValue.interpolate({
		inputRange: [0, 1],
		outputRange: [1.15, 1.3],
	});

	return { translateX, translateY, scale };
}
