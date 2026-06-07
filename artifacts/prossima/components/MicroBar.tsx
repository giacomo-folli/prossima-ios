import { View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

export function MicroBar({
	data,
	accentColor,
}: {
	data: { label: string; value: number }[];
	accentColor: string;
}) {
	const colors = useColors();
	const maxValue = Math.max(...data.map((d) => d.value), 1);
	const BAR_MAX_H = 38;
	const CONTAINER_H = 54;

	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "flex-end",
				gap: 3,
				height: CONTAINER_H,
			}}
		>
			{data.map((item, i) => {
				const barH =
					maxValue > 0
						? Math.max((item.value / maxValue) * BAR_MAX_H, item.value > 0 ? 3 : 0)
						: 0;
				const isTop = item.value === maxValue && item.value > 0;
				return (
					<View
						key={i}
						style={{
							flex: 1,
							height: CONTAINER_H,
							justifyContent: "flex-end",
							alignItems: "center",
						}}
					>
						{item.value > 0 && (
							<Text
								style={{
									fontSize: 9,
									fontWeight: isTop ? "700" : "500",
									color: isTop ? accentColor : colors.mutedForeground,
									opacity: isTop ? 1.0 : 0.6,
									marginBottom: 2,
								}}
								numberOfLines={1}
							>
								{item.value >= 1000 ? `${(item.value / 1000).toFixed(1).replace(/\.0$/, "")}k` : item.value}
							</Text>
						)}
						<View
							style={{
								height: Math.max(barH, 2),
								width: "100%",
								borderRadius: 4,
								backgroundColor: isTop ? accentColor : `${accentColor}44`,
							}}
						/>
					</View>
				);
			})}
		</View>
	);
}
