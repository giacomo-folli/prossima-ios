import { DailyHealthSample, HealthWorkout } from "../HealthStore";
import { nativeCall } from "./bridge";
import {
	bucketDaily,
	parseSleepSamples,
	normaliseWeightToKg,
	daysAgo,
} from "./transforms";

export async function queryHrvWithFallback(
	nk: any,
	sleepWindowStart: Date,
): Promise<number | null> {
	let samples = await new Promise<any[]>((resolve) => {
		try {
			nk.getHeartRateVariabilitySamples(
				{
					startDate: sleepWindowStart.toISOString(),
					endDate: new Date().toISOString(),
					limit: 50,
					ascending: false,
				},
				(err: any, results: any[]) =>
					resolve(Array.isArray(results) ? results : []),
			);
		} catch {
			resolve([]);
		}
	});

	if (samples.length === 0) {
		const start48h = new Date();
		start48h.setDate(start48h.getDate() - 2);
		samples = await new Promise<any[]>((resolve) => {
			try {
				nk.getHeartRateVariabilitySamples(
					{
						startDate: start48h.toISOString(),
						endDate: new Date().toISOString(),
						limit: 50,
						ascending: false,
					},
					(err: any, results: any[]) =>
						resolve(Array.isArray(results) ? results : []),
				);
			} catch {
				resolve([]);
			}
		});
	}

	if (samples.length === 0) {
		const start7d = new Date();
		start7d.setDate(start7d.getDate() - 7);
		samples = await new Promise<any[]>((resolve) => {
			try {
				nk.getHeartRateVariabilitySamples(
					{
						startDate: start7d.toISOString(),
						endDate: new Date().toISOString(),
						limit: 50,
						ascending: false,
					},
					(err: any, results: any[]) =>
						resolve(Array.isArray(results) ? results : []),
				);
			} catch {
				resolve([]);
			}
		});
	}

	if (samples.length === 0) return null;
	const bestSample = samples[0];
	return bestSample.value !== undefined && bestSample.value !== null
		? bestSample.value * 1000
		: null;
}

export async function fetchHistoricalDataForRange(
	nk: any,
	startDate: string,
	endDate: string,
) {
	const range = { startDate, endDate, limit: 500, ascending: true };

	const hrvPromise = nativeCall(
		(cb) => nk.getHeartRateVariabilitySamples({ ...range, limit: 3000 }, cb),
		(r: any[]) =>
			bucketDaily(
				r.map((s) => ({ ...s, value: (s.value ?? 0) * 1000 })),
				"ms",
				"avg",
			),
		[],
	);

	const rhrPromise = nativeCall(
		(cb) => nk.getRestingHeartRateSamples(range, cb),
		(r: any[]) => bucketDaily(r, "bpm", "avg"),
		[],
	);

	const stepsHistPromise = nativeCall(
		(cb) => nk.getDailyStepCountSamples(range, cb),
		(r: any[]) => bucketDaily(r, "steps", "sum"),
		[],
	);

	const calHistPromise = nativeCall(
		(cb) => nk.getDailyActiveEnergyBurned(range, cb),
		(r: any[]) => bucketDaily(r, "kcal", "sum"),
		[],
	);

	const sleepHistPromise = nativeCall(
		(cb) => nk.getSleepSamples({ ...range, limit: 2000 }, cb),
		parseSleepSamples,
		[],
	);

	const weightHistPromise = nativeCall(
		(cb) => nk.getWeightSamples({ ...range, unit: "gram" }, cb),
		(r: any[]): DailyHealthSample[] =>
			r.map((s) => ({
				date: (s.startDate ?? "").slice(0, 10),
				value: normaliseWeightToKg(s.value ?? 0, s.unit || "gram"),
				unit: "kg",
				source: "Apple Health",
			})),
		[],
	);

	const fatHistPromise = nativeCall(
		(cb) => nk.getBodyFatPercentageSamples(range, cb),
		(r: any[]): DailyHealthSample[] =>
			r.map((s) => ({
				date: (s.startDate ?? "").slice(0, 10),
				value: s.value ?? 0,
				unit: "%",
				source: "Apple Health",
			})),
		[],
	);

	const vo2Promise = nativeCall(
		(cb) => nk.getVo2MaxSamples(range, cb),
		(r: any[]): DailyHealthSample[] =>
			r.map((s) => ({
				date: (s.startDate ?? "").slice(0, 10),
				value: s.value ?? 0,
				unit: "mL/kg/min",
				source: "Apple Health",
			})),
		[],
	);

	const spo2Promise = nativeCall(
		(cb) => nk.getOxygenSaturationSamples({ ...range, limit: 3000 }, cb),
		(r: any[]) => bucketDaily(r, "%", "avg"),
		[],
	);

	const respPromise = nativeCall(
		(cb) => nk.getRespiratoryRateSamples({ ...range, limit: 3000 }, cb),
		(r: any[]) => bucketDaily(r, "breaths/min", "avg"),
		[],
	);

	const bmrPromise = nativeCall(
		(cb) => nk.getDailyBasalEnergyBurned(range, cb),
		(r: any[]) => bucketDaily(r, "kcal", "sum"),
		[],
	);

	const distPromise = nativeCall(
		(cb) => nk.getDailyDistanceWalkingRunning(range, cb),
		(r: any[]): DailyHealthSample[] =>
			r.map((s) => ({
				date: (s.startDate ?? "").slice(0, 10),
				value: Math.round((s.value ?? 0) * 1000), // km → m
				unit: "meters",
				source: "Apple Health",
			})),
		[],
	);

	const workoutsPromise = nativeCall(
		(cb) =>
			nk.getAnchoredWorkouts(
				{
					startDate,
					endDate,
					limit: 500,
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

	const [
		hrv,
		rhr,
		stepsHist,
		calHist,
		sleepHist,
		weightHist,
		fatHist,
		vo2,
		spo2,
		resp,
		bmr,
		dist,
		workouts,
	] = await Promise.all([
		hrvPromise,
		rhrPromise,
		stepsHistPromise,
		calHistPromise,
		sleepHistPromise,
		weightHistPromise,
		fatHistPromise,
		vo2Promise,
		spo2Promise,
		respPromise,
		bmrPromise,
		distPromise,
		workoutsPromise,
	]);

	return {
		hrv,
		rhr,
		stepsHist,
		calHist,
		sleepHist,
		weightHist,
		fatHist,
		vo2,
		spo2,
		resp,
		bmr,
		dist,
		workouts,
	};
}
