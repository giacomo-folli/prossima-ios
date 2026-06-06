import { View } from "react-native";

export function MicroBar({
	data,
	accentColor,
}: {
	data: { label: string; value: number }[];
	accentColor: string;
}) {
	const maxValue = Math.max(...data.map((d) => d.value), 1);
	const H = 48;

	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "flex-end",
				gap: 3,
				height: H,
			}}
		>
			{data.map((item, i) => {
				const barH =
					maxValue > 0
						? Math.max((item.value / maxValue) * H, item.value > 0 ? 3 : 0)
						: 0;
				const isTop = item.value === maxValue && item.value > 0;
				return (
					<View
						key={i}
						style={{ flex: 1, height: H, justifyContent: "flex-end" }}
					>
						<View
							style={{
								height: Math.max(barH, 2),
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
