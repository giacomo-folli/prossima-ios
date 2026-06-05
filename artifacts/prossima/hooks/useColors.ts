import colors, { ThemePalette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors(): ThemePalette & { radius: number } {
	const { resolvedScheme } = useTheme();

	const palette = resolvedScheme === "dark" ? colors.dark : colors.light;

	return { ...palette, radius: colors.radius };
}
