import {
	DailyHealthSample,
	HealthMetricKey,
	HealthTimeSeries,
	HealthWorkout,
	loadAllMetrics,
	readWorkouts,
	writeMetric,
	writeSample,
	writeWorkouts,
} from "./HealthStore";
import { HealthStats } from "./HealthContext";
import { calculateAndPersistPastReadiness } from "./sync/persistor";
import { toDateStr, daysAgo } from "./healthkit/transforms";

export async function runMockDailySync(): Promise<{
	stats: HealthStats;
	timeSeries: HealthTimeSeries;
	workouts: HealthWorkout[];
}> {
	const mockRecentWorkout: HealthWorkout = {
		id: "mock-workout-today",
		activityName: "Running",
		durationMinutes: Number((45 * Math.random()).toFixed(0)),
		calories: Number((450 * Math.random()).toFixed(0)),
		startDate: new Date().toISOString(),
	};
	const newStats: HealthStats = {
		steps: Number((8432 * Math.random()).toFixed(0)),
		calories: Number((450 * Math.random()).toFixed(0)),
		activityTime: Number((45 * Math.random()).toFixed(0)),
		sleepHours: Number((7.2 * Math.random()).toFixed(0)),
		sleepDeepRatio: 0.2,
		sleepRemRatio: 0.25,
		recentWorkout: mockRecentWorkout,
		todayHrv: Number((65 * Math.random()).toFixed(0)),
		todayRestingHr: Number((55 * Math.random()).toFixed(0)),
		bodyWeightKg: Number((75.5 * Math.random()).toFixed(0)),
		bodyFatPercent: 15.2,
		vo2Max: Number((45.1 * Math.random()).toFixed(0)),
		distanceMeters: Number((6200 * Math.random()).toFixed(0)),
		basalCalories: Number((1800 * Math.random()).toFixed(0)),
	};

	const todayStr = toDateStr(new Date());
	const samples: {
		metric: HealthMetricKey;
		sample: DailyHealthSample;
	}[] = [
		{
			metric: "steps_history",
			sample: {
				date: todayStr,
				value: newStats.steps,
				unit: "steps",
				source: "Mock",
			},
		},
		{
			metric: "active_cal_history",
			sample: {
				date: todayStr,
				value: newStats.calories,
				unit: "kcal",
				source: "Mock",
			},
		},
		{
			metric: "sleep_history",
			sample: {
				date: todayStr,
				value: newStats.sleepHours,
				unit: "hours",
				source: "Mock",
			},
		},
		{
			metric: "distance",
			sample: {
				date: todayStr,
				value: newStats.distanceMeters,
				unit: "meters",
				source: "Mock",
			},
		},
		{
			metric: "bmr",
			sample: {
				date: todayStr,
				value: newStats.basalCalories,
				unit: "kcal",
				source: "Mock",
			},
		},
	];

	if (newStats.todayHrv !== null) {
		samples.push({
			metric: "hrv",
			sample: {
				date: todayStr,
				value: newStats.todayHrv,
				unit: "ms",
				source: "Mock",
			},
		});
	}
	if (newStats.todayRestingHr !== null) {
		samples.push({
			metric: "resting_hr",
			sample: {
				date: todayStr,
				value: newStats.todayRestingHr,
				unit: "bpm",
				source: "Mock",
			},
		});
	}
	if (newStats.bodyWeightKg !== null) {
		samples.push({
			metric: "body_weight",
			sample: {
				date: todayStr,
				value: newStats.bodyWeightKg,
				unit: "kg",
				source: "Mock",
			},
		});
	}
	if (newStats.bodyFatPercent !== null) {
		samples.push({
			metric: "body_fat",
			sample: {
				date: todayStr,
				value: newStats.bodyFatPercent,
				unit: "%",
				source: "Mock",
			},
		});
	}
	if (newStats.vo2Max !== null) {
		samples.push({
			metric: "vo2max",
			sample: {
				date: todayStr,
				value: newStats.vo2Max,
				unit: "mL/kg/min",
				source: "Mock",
			},
		});
	}

	await Promise.all([
		...samples.map(({ metric, sample }) => writeSample(metric, sample)),
		writeWorkouts([mockRecentWorkout]),
	]);

	const [ts, w] = await Promise.all([loadAllMetrics(), readWorkouts()]);
	const updatedTs = await calculateAndPersistPastReadiness(ts, w);
	return { stats: newStats, timeSeries: updatedTs, workouts: w };
}

export async function runMockHistoricalSync(): Promise<{
	timeSeries: HealthTimeSeries;
	workouts: HealthWorkout[];
}> {
	const mockTs: HealthTimeSeries = {
		hrv: Array.from({ length: 30 }).map((_, i) => ({
			date: toDateStr(daysAgo(i)),
			value: 60 + Math.random() * 10,
			unit: "ms",
			source: "Mock",
		})),
		resting_hr: Array.from({ length: 30 }).map((_, i) => ({
			date: toDateStr(daysAgo(i)),
			value: 55 + Math.random() * 5,
			unit: "bpm",
			source: "Mock",
		})),
		steps_history: Array.from({ length: 30 }).map((_, i) => ({
			date: toDateStr(daysAgo(i)),
			value: 5000 + Math.random() * 5000,
			unit: "steps",
			source: "Mock",
		})),
		active_cal_history: Array.from({ length: 30 }).map((_, i) => ({
			date: toDateStr(daysAgo(i)),
			value: 300 + Math.random() * 300,
			unit: "kcal",
			source: "Mock",
		})),
		sleep_history: Array.from({ length: 30 }).map((_, i) => ({
			date: toDateStr(daysAgo(i)),
			value: 6 + Math.random() * 2,
			unit: "hours",
			source: "Mock",
		})),
		vo2max: Array.from({ length: 30 }).map((_, i) => ({
			date: toDateStr(daysAgo(i)),
			value: 45,
			unit: "mL/kg/min",
			source: "Mock",
		})),
		spo2: [],
		respiratory: [],
		bmr: [],
		distance: [],
		body_weight: [],
		body_fat: [],
		readiness: [],
	};

	const mockWorkouts: HealthWorkout[] = [];
	const activities = ["Running", "Cycling", "Strength Training"];
	for (let i = 0; i < 30; i++) {
		const date = daysAgo(i);
		date.setHours(8, 0, 0, 0);
		mockWorkouts.push({
			id: `mock-workout-${i}`,
			activityName:
				activities[Math.floor(Math.random() * activities.length)],
			durationMinutes: 30 + Math.floor(Math.random() * 45),
			calories: 200 + Math.floor(Math.random() * 300),
			startDate: date.toISOString(),
		});
	}

	await Promise.all([
		writeMetric("hrv", mockTs.hrv),
		writeMetric("resting_hr", mockTs.resting_hr),
		writeMetric("steps_history", mockTs.steps_history),
		writeMetric("active_cal_history", mockTs.active_cal_history),
		writeMetric("sleep_history", mockTs.sleep_history),
		writeMetric("vo2max", mockTs.vo2max),
		writeWorkouts(mockWorkouts),
	]);

	const [ts, w] = await Promise.all([loadAllMetrics(), readWorkouts()]);
	const updatedTs = await calculateAndPersistPastReadiness(ts, w);
	return { timeSeries: updatedTs, workouts: w };
}
