import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/**
 * Returns design tokens for the resolved color scheme.
 * The scheme is determined by the user's preference (System / Light / Dark)
 * stored in ThemeContext, defaulting to following the system.
 */
export function useColors() {
  const { resolvedScheme } = useTheme();
  const palette =
    resolvedScheme === "dark"
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
