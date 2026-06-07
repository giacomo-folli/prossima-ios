import { METRIC_COLORS } from "./colors";

export interface MetricConfig {
	title: string;
	iconName: string;
	iconType: "ionicons" | "material";
	color: string;
	explanation: string;
	whyItMatters: string;
	normalRange?: string;
	tips: string[];
	unit: string;
	allowZero?: boolean;
	startFromZero?: boolean;
}

export const METRIC_DETAILS: Record<string, MetricConfig> = {
	readiness: {
		title: "Readiness Score",
		iconName: "flash",
		iconType: "ionicons",
		color: "#00E5FF",
		explanation: "Readiness is a daily metric from 0 to 100 that tells you how prepared your body is for physical and mental strain.",
		whyItMatters: "It combines HRV (35%), sleep (25%, if recorded), resting HR (20%), and training load (20%). It helps prevent overtraining and guides you on when to push hard or rest.",
		normalRange: "70 to 100 (Optimal)",
		tips: [
			"Prioritize consistent sleep schedules.",
			"Avoid high-intensity training when your score is below 50.",
			"Incorporate active recovery days to bounce back."
		],
		unit: "score",
		startFromZero: true,
	},
	hrv: {
		title: "Heart Rate Variability",
		iconName: "pulse",
		iconType: "material",
		color: METRIC_COLORS.hrv,
		explanation: "HRV measures the variation in time between consecutive heartbeats in milliseconds (ms). It is regulated by the autonomic nervous system.",
		whyItMatters: "A higher HRV indicates your nervous system is balanced and ready to adapt to stressors. A drop in HRV is a strong indicator of fatigue, stress, or upcoming illness.",
		normalRange: "Varies by individual (higher is better)",
		tips: [
			"Reduce mental stress through meditation or breathing exercises.",
			"Avoid eating heavy meals within 3 hours of sleeping.",
			"Allow adequate recovery after high-intensity workouts."
		],
		unit: "ms",
		startFromZero: false,
	},
	restingHr: {
		title: "Resting Heart Rate",
		iconName: "heart",
		iconType: "ionicons",
		color: METRIC_COLORS.restingHr,
		explanation: "Your resting heart rate is the number of times your heart beats per minute (bpm) when you are completely at rest.",
		whyItMatters: "A lower RHR indicates efficient heart function and cardiorespiratory fitness. An elevated resting HR can indicate fatigue, overreaching, or a lack of recovery.",
		normalRange: "50 to 80 bpm for most active adults",
		tips: [
			"Incorporate steady-state zone 2 aerobic exercise into your week.",
			"Stay properly hydrated, especially in warmer weather.",
			"Avoid alcohol, which significantly elevates overnight RHR."
		],
		unit: "bpm",
		startFromZero: false,
	},
	sleep: {
		title: "Sleep Duration",
		iconName: "moon",
		iconType: "ionicons",
		color: METRIC_COLORS.sleep,
		explanation: "Sleep duration tracks the total hours you spent asleep last night.",
		whyItMatters: "Sleep is the cornerstone of physical recovery, hormone regulation, and cognitive function. Chronic sleep deficit hinders muscle repair and immune system health.",
		normalRange: "7 to 9 hours per night",
		tips: [
			"Go to bed and wake up at the same time every day.",
			"Make your bedroom cool, dark, and quiet.",
			"Limit screens and blue light exposure 1 hour before sleep."
		],
		unit: "hours",
		startFromZero: true,
	},
	weight: {
		title: "Body Weight",
		iconName: "scale-bathroom",
		iconType: "material",
		color: METRIC_COLORS.weight,
		explanation: "Body weight is the measurement of your total body mass in kilograms.",
		whyItMatters: "Tracking weight helps monitor energy balance and hydration status. It is crucial for strength-to-weight ratio sports and general body composition tracking.",
		normalRange: "Varies based on height, composition, and goals",
		tips: [
			"Weigh yourself under the same conditions (e.g. morning, fasting).",
			"Focus on weekly trends rather than daily fluctuations.",
			"Combine weight tracking with body fat tracking to monitor lean mass."
		],
		unit: "kg",
		startFromZero: false,
	},
	vo2max: {
		title: "VO2 Max",
		iconName: "cellular",
		iconType: "ionicons",
		color: METRIC_COLORS.vo2max,
		explanation: "VO2 Max measures the maximum amount of oxygen your body can use during intense exercise.",
		whyItMatters: "It is the gold standard indicator of cardiovascular fitness and aerobic endurance. Improving your VO2 Max enhances overall health and longevity.",
		normalRange: "Age and gender dependent (higher is better)",
		tips: [
			"Perform weekly high-intensity interval training (HIIT) sessions.",
			"Increase your total weekly running or cycling volume.",
			"Include tempo runs to push your lactate threshold."
		],
		unit: "mL/kg/min",
		startFromZero: false,
	},
	vitals: {
		title: "Recovery Vitals",
		iconName: "water",
		iconType: "ionicons",
		color: METRIC_COLORS.spo2,
		explanation: "Vitals track blood oxygen saturation (SpO2) and sleeping respiratory rate.",
		whyItMatters: "SpO2 measures the percentage of oxygen in your blood (normal: 95-100%). Sleeping respiratory rate tracks breaths per minute. Shifts can signal illness, low oxygen environments, or high physiological stress.",
		normalRange: "SpO2: 95%+ · Resp Rate: 12-20 breaths/min",
		tips: [
			"Monitor for deviations from your normal personal baseline.",
			"Elevated sleeping respiratory rate often precedes visible symptoms of a cold or fever."
		],
		unit: "vitals",
		startFromZero: false,
	},
	steps: {
		title: "Daily Steps",
		iconName: "shoe-print",
		iconType: "material",
		color: METRIC_COLORS.steps,
		explanation: "Tracks the total steps walked or run throughout the day.",
		whyItMatters: "Steps are an excellent measure of non-exercise activity thermogenesis (NEAT) and help prevent sedentary lifestyle diseases.",
		normalRange: "8,000 to 10,000+ steps per day",
		tips: [
			"Take short walking breaks every hour during work.",
			"Park further away or choose the stairs over the elevator.",
			"Add a 15-minute walk after lunch or dinner."
		],
		unit: "steps",
		startFromZero: true,
	},
	workouts: {
		title: "Workouts",
		iconName: "heart",
		iconType: "ionicons",
		color: METRIC_COLORS.workout,
		explanation: "Workouts tracks the total number of structured exercise sessions logged.",
		whyItMatters: "Consistency in training frequency is key to long-term cardiovascular and muscular adaptation.",
		normalRange: "3 to 5 sessions per week for balanced fitness",
		tips: [
			"Balance heavy strength and conditioning sessions with light cardio.",
			"Ensure at least 1-2 rest days per week to allow recovery.",
			"Log workouts consistently to keep your Training Load accurate."
		],
		unit: "sessions",
		startFromZero: true,
	},
	calories: {
		title: "Active Energy",
		iconName: "fire",
		iconType: "material",
		color: METRIC_COLORS.calories,
		explanation: "Active Energy is the active calories burned through exercise, workouts, and general daily movement.",
		whyItMatters: "Helps you monitor your energy output, manage body weight goals, and properly fuel your recovery.",
		normalRange: "Goal-dependent (e.g. 500+ active kcal/day)",
		tips: [
			"Match your daily food intake to your active output (carbohydrates are crucial for intense days).",
			"A higher active energy output requires longer sleep and recovery."
		],
		unit: "kcal",
		startFromZero: true,
	},
	duration: {
		title: "Avg Duration",
		iconName: "time-outline",
		iconType: "ionicons",
		color: METRIC_COLORS.activeTime,
		explanation: "The average duration in minutes of your exercise sessions.",
		whyItMatters: "Tracks training volume and time under tension, ensuring your training sessions are of adequate duration to trigger metabolic adaptation.",
		normalRange: "30 to 90 minutes per session",
		tips: [
			"Keep workouts focused; avoid rest periods extending past 2-3 minutes unless training maximum strength.",
			"Quality is more important than duration — avoid junk volume."
		],
		unit: "min",
		startFromZero: true,
	}
};
