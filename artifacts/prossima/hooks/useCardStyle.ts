import { useMemo } from "react";
import { ViewStyle } from "react-native";
import { useColors } from "./useColors";
import { useTheme } from "@/context/ThemeContext";

export function useCardStyle(variant: "standard" | "capsule" = "standard"): ViewStyle {
	const colors = useColors();
	const { resolvedScheme } = useTheme();

	return useMemo(() => {
		const isDark = resolvedScheme === "dark";
		if (variant === "capsule") {
			return {
				backgroundColor: colors.card,
				borderRadius: 22,
				borderColor: colors.border,
				shadowColor: isDark ? "#000000" : "rgba(15, 23, 42, 0.04)",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: isDark ? 0.25 : 0.5,
				shadowRadius: 6,
				elevation: 2,
			};
		}

		return {
			backgroundColor: colors.card,
			borderRadius: 20,
			borderColor: colors.border,
			shadowColor: isDark ? "#000000" : "rgba(15, 23, 42, 0.08)",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: isDark ? 0.35 : 0.6,
			shadowRadius: 12,
			elevation: 4,
		};
	}, [colors, resolvedScheme, variant]);
}
