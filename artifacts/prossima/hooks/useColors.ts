import colors from "@/constants/colors";

/**
 * Returns design tokens. Prossima is always dark — forced dark mode
 * regardless of system preference, matching the gym environment aesthetic.
 */
export function useColors() {
  const palette = (colors as Record<string, typeof colors.light>).dark ?? colors.light;
  return { ...palette, radius: colors.radius };
}
