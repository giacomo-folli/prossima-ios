import { useMemo } from "react";
import colors, { ThemePalette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors(): ThemePalette & { radius: number; themeName: "light" | "dark" } {
	const { resolvedScheme } = useTheme();

	return useMemo(() => {
		const palette = resolvedScheme === "dark" ? colors.dark : colors.light;
		return { ...palette, radius: colors.radius, themeName: resolvedScheme };
	}, [resolvedScheme]);
}
