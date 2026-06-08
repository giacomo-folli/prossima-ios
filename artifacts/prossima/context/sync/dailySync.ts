import {
	DailyHealthSample,
	HealthMetricKey,
	HealthTimeSeries,
	HealthWorkout,
	loadAllMetrics,
	writeSample,
	writeWorkouts,
} from "../HealthStore";
import { HealthStats } from "../HealthContext";
import { nativeCall } from "../healthkit/bridge";
import { queryHrvWithFallback } from "../healthkit/fetchers";
import {
	startOfToday,
	toDateStr,
	daysAgo,
	normaliseWeightToKg,
} from "../healthkit/transforms";
import { runMockDailySync } from "../mockData";

export async function syncDailyData(
	nk: any,
	isDev: boolean,
): Promise<{
	stats: HealthStats;
	timeSeries: HealthTimeSeries;
	workouts: HealthWorkout[];
}> {
	if (!nk?.initHealthKit) {
		if (isDev) {
			return await runMockDailySync();
		}
		throw new Error("Apple Health is not initialized or available.");
	}

	const today = startOfToday();
	const todayStr = toDateStr(today);
	const dayRange = {
		startDate: today.toISOString(),
		endDate: new Date().toISOString(),
	};

	const stepsP = nativeCall(
		(cb) => nk.getStepCount({ date: today.toISOString() }, cb),
		(r) => r.value ?? 0,
		0,
	);

	const calP = nativeCall(
		(cb) => nk.getActiveEnergyBurned(dayRange, cb),
		(r) => {
			if (Array.isArray(r)) {
				return r.reduce((acc, s) => acc + (s.value ?? 0), 0);
			}
			return r?.value ?? 0;
		},
		0,
	);

	const timeP = nativeCall(
		(cb) => nk.getAppleExerciseTime(dayRange, cb),
		(r) => {
			if (Array.isArray(r)) {
				return r.reduce((acc, s) => acc + (s.value ?? 0), 0);
			}
			return r?.value ?? 0;
		},
		0,
	);

	const sleepWindowStart = new Date();
	sleepWindowStart.setDate(sleepWindowStart.getDate() - 1);
	sleepWindowStart.setHours(18, 0, 0, 0);

	const sleepP = nativeCall(
		(cb) =>
			nk.getSleepSamples(
				{
					startDate: sleepWindowStart.toISOString(),
					endDate: new Date().toISOString(),
					limit: 200,
					ascending: true,
				},
				cb,
			),
		(results: any[]) => {
			const asleepValues = new Set([
				"ASLEEP",
				"CORE",
				"DEEP",
				"REM",
				"SLEEPING",
			]);
			const deepValues = new Set(["DEEP"]);
			const remValues = new Set(["REM"]);

			let totalMs = 0;
			let deepMs = 0;
			let remMs = 0;

			for (const s of results) {
				const stage = String(s.value).toUpperCase();
				const start = new Date(s.startDate).getTime();
				const end = new Date(s.endDate).getTime();
				const dur = Math.max(0, end - start);

				if (asleepValues.has(stage)) {
					totalMs += dur;
					if (deepValues.has(stage)) deepMs += dur;
					if (remValues.has(stage)) remMs += dur;
				}
			}

			return {
				totalHours: totalMs / (1000 * 60 * 60),
				deepRatio: totalMs > 0 ? deepMs / totalMs : 0,
				remRatio: totalMs > 0 ? remMs / totalMs : 0,
			};
		},
		{ totalHours: 0, deepRatio: 0, remRatio: 0 },
	);

	const workoutP = nativeCall(
		(cb) =>
			nk.getAnchoredWorkouts(
				{
					startDate: daysAgo(7).toISOString(),
					endDate: new Date().toISOString(),
					limit: 20,
				},
				cb,
			),
		(results: any): HealthWorkout[] => {
			const wData = results?.data;
			if (!Array.isArray(wData)) return [];
			return wData.map((w: any) => ({
				id: w.id ?? String(Math.random()),
				activityName: w.activityName ?? "Workout",
				durationMinutes: Math.round((w.duration ?? 0) / 60),
				calories: Math.round(w.calories ?? 0),
				startDate: w.start ?? new Date().toISOString(),
			}));
		},
		[],
	);

	const hrvP = queryHrvWithFallback(nk, sleepWindowStart);

	const rhrP = nativeCall(
		(cb) =>
			nk.getRestingHeartRateSamples(
				{
					...dayRange,
					limit: 1,
					ascending: false,
				},
				cb,
			),
		(results: any[]): number | null => {
			if (!Array.isArray(results) || results.length === 0) return null;
			return results[0].value ?? null;
		},
		null,
	);

	const weightP = nativeCall(
		(cb) =>
			nk.getWeightSamples(
				{
					startDate: daysAgo(90).toISOString(),
					endDate: new Date().toISOString(),
					limit: 1,
					ascending: false,
					unit: "gram",
				},
				cb,
			),
		(results: any[]): number | null => {
			if (!Array.isArray(results) || results.length === 0) return null;
			const sample = results[0];
			return normaliseWeightToKg(sample.value ?? 0, sample.unit || "gram");
		},
		null,
	);

	const fatP = nativeCall(
		(cb) =>
			nk.getBodyFatPercentageSamples(
				{
					startDate: daysAgo(90).toISOString(),
					endDate: new Date().toISOString(),
					limit: 1,
					ascending: false,
				},
				cb,
			),
		(results: any[]): number | null => {
			if (!Array.isArray(results) || results.length === 0) return null;
			return results[0].value ?? null;
		},
		null,
	);

	const vo2P = nativeCall(
		(cb) =>
			nk.getVo2MaxSamples(
				{
					startDate: daysAgo(90).toISOString(),
					endDate: new Date().toISOString(),
					limit: 1,
					ascending: false,
				},
				cb,
			),
		(results: any[]): number | null => {
			if (!Array.isArray(results) || results.length === 0) return null;
			return results[0].value ?? null;
		},
		null,
	);

	const distanceP = nativeCall(
		(cb) => nk.getDistanceWalkingRunning({ date: today.toISOString() }, cb),
		(r) => (r.value ?? 0) * 1000,
		0,
	);

	const bmrP = nativeCall(
		(cb) => nk.getBasalEnergyBurned({ date: today.toISOString() }, cb),
		(r) => r.value ?? 0,
		0,
	);

	const [
		steps,
		calories,
		activityTime,
		sleep,
		fetchedWorkouts,
		todayHrv,
		todayRestingHr,
		bodyWeightKg,
		bodyFatPercent,
		vo2Max,
		distanceMeters,
		basalCalories,
	] = await Promise.all([
		stepsP,
		calP,
		timeP,
		sleepP,
		workoutP,
		hrvP,
		rhrP,
		weightP,
		fatP,
		vo2P,
		distanceP,
		bmrP,
	]);

	const updatedWorkouts = await writeWorkouts(fetchedWorkouts);

	const recentWorkout =
		updatedWorkouts.length > 0
			? updatedWorkouts[updatedWorkouts.length - 1]
			: null;

	const newStats: HealthStats = {
		steps: Math.round(steps),
		calories: Math.round(calories),
		activityTime: Math.round(activityTime),
		sleepHours: Math.round(sleep.totalHours * 10) / 10,
		sleepDeepRatio: sleep.deepRatio,
		sleepRemRatio: sleep.remRatio,
		recentWorkout,
		todayHrv,
		todayRestingHr,
		bodyWeightKg,
		bodyFatPercent,
		vo2Max,
		distanceMeters: Math.round(distanceMeters),
		basalCalories: Math.round(basalCalories),
	};

	const samples: { metric: HealthMetricKey; sample: DailyHealthSample }[] =
		[
			{
				metric: "steps_history",
				sample: {
					date: todayStr,
					value: newStats.steps,
					unit: "steps",
					source: "Apple Health",
				},
			},
			{
				metric: "active_cal_history",
				sample: {
					date: todayStr,
					value: newStats.calories,
					unit: "kcal",
					source: "Apple Health",
				},
			},
			{
				metric: "sleep_history",
				sample: {
					date: todayStr,
					value: newStats.sleepHours,
					unit: "hours",
					source: "Apple Health",
				},
			},
			{
				metric: "distance",
				sample: {
					date: todayStr,
					value: newStats.distanceMeters,
					unit: "meters",
					source: "Apple Health",
				},
			},
			{
				metric: "bmr",
				sample: {
					date: todayStr,
					value: newStats.basalCalories,
					unit: "kcal",
					source: "Apple Health",
				},
			},
		];

	if (todayHrv !== null) {
		samples.push({
			metric: "hrv",
			sample: {
				date: todayStr,
				value: todayHrv,
				unit: "ms",
				source: "Apple Watch",
			},
		});
	}
	if (todayRestingHr !== null) {
		samples.push({
			metric: "resting_hr",
			sample: {
				date: todayStr,
				value: todayRestingHr,
				unit: "bpm",
				source: "Apple Health",
			},
		});
	}
	if (bodyWeightKg !== null) {
		samples.push({
			metric: "body_weight",
			sample: {
				date: todayStr,
				value: bodyWeightKg,
				unit: "kg",
				source: "Apple Health",
			},
		});
	}
	if (bodyFatPercent !== null) {
		samples.push({
			metric: "body_fat",
			sample: {
				date: todayStr,
				value: bodyFatPercent,
				unit: "%",
				source: "Apple Health",
			},
		});
	}
	if (vo2Max !== null) {
		samples.push({
			metric: "vo2max",
			sample: {
				date: todayStr,
				value: vo2Max,
				unit: "mL/kg/min",
				source: "Apple Health",
			},
		});
	}

	await Promise.all(
		samples.map(({ metric, sample }) => writeSample(metric, sample)),
	);

	const ts = await loadAllMetrics();
	return { stats: newStats, timeSeries: ts, workouts: updatedWorkouts };
}
