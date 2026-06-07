import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useRef,
	useMemo,
} from "react";
import { Platform, Alert, NativeModules, AppState } from "react-native";
import AppleHealthKitLibrary from "react-native-health";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
	DailyHealthSample,
	HealthMetricKey,
	clearAllHealthData,
	hasCompletedInitialSync,
	markInitialSyncComplete,
	writeMetric,
	writeSample,
	loadAllMetrics,
	HealthWorkout,
	readWorkouts,
	writeWorkouts,
} from "./HealthStore";

export { HealthWorkout };

import {
	computeReadinessScore,
	ReadinessBreakdown,
	SleepNight,
} from "./ReadinessEngine";

// ─── Native bridge ────────────────────────────────────────────────────────────

const getNativeHealthKit = () => {
	if (Platform.OS !== "ios") return null;
	return NativeModules.AppleHealthKit || NativeModules.RNAppleHealthKit || null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HEALTH_CONNECTED_KEY = "@prossima_health_connected";

/** Today's live stats */
export interface HealthStats {
	steps: number;
	calories: number;
	activityTime: number;
	/** Total sleep hours for the most recent night */
	sleepHours: number;
	sleepDeepRatio: number;
	sleepRemRatio: number;
	/** Most recent workout recorded in Apple Health (last 7 days) */
	recentWorkout: HealthWorkout | null;
	/** Today's HRV in ms, null if not yet recorded */
	todayHrv: number | null;
	/** Today's resting HR in bpm, null if not yet recorded */
	todayRestingHr: number | null;
	/** Body weight in kg (most recent measurement) */
	bodyWeightKg: number | null;
	/** Body fat % (most recent measurement, may be null) */
	bodyFatPercent: number | null;
	/** VO2 Max in mL/kg/min (Apple estimate) */
	vo2Max: number | null;
	/** Total distance walked/run today in meters */
	distanceMeters: number;
	/** Basal energy burned today in kcal */
	basalCalories: number;
}

/** Historical time-series data (loaded from HealthStore) */
export type HealthTimeSeries = Record<HealthMetricKey, DailyHealthSample[]>;

interface HealthContextType {
	isConnected: boolean;
	stats: HealthStats;
	timeSeries: HealthTimeSeries;
	workouts: HealthWorkout[];
	readiness: ReadinessBreakdown | null;
	loading: boolean;
	syncing: boolean;
	backfilling: boolean;
	requestPermissions: () => Promise<void>;
	syncData: () => Promise<void>;
	fullHistoricalSync: () => Promise<void>;
	disconnect: () => Promise<void>;
	clearLocalData: () => Promise<void>;
}

// ─── Factories (avoid shared mutable references) ──────────────────────────────

const makeDefaultStats = (): HealthStats => ({
	steps: 0,
	calories: 0,
	activityTime: 0,
	sleepHours: 0,
	sleepDeepRatio: 0,
	sleepRemRatio: 0,
	recentWorkout: null,
	todayHrv: null,
	todayRestingHr: null,
	bodyWeightKg: null,
	bodyFatPercent: null,
	vo2Max: null,
	distanceMeters: 0,
	basalCalories: 0,
});

const makeEmptyTimeSeries = (): HealthTimeSeries => ({
	hrv: [],
	resting_hr: [],
	steps_history: [],
	active_cal_history: [],
	sleep_history: [],
	vo2max: [],
	spo2: [],
	respiratory: [],
	bmr: [],
	distance: [],
	body_weight: [],
	body_fat: [],
	readiness: [],
});

// ─── Permissions list ─────────────────────────────────────────────────────────

function buildPermissions() {
	const P = AppleHealthKitLibrary.Constants.Permissions;
	return {
		permissions: {
			read: [
				// Existing
				P.StepCount,
				P.ActiveEnergyBurned,
				P.AppleExerciseTime,
				P.SleepAnalysis,
				P.Workout,
				// New
				P.HeartRateVariability,
				P.RestingHeartRate,
				P.HeartRate,
				P.BodyMass,
				P.BodyFatPercentage,
				P.Vo2Max,
				P.OxygenSaturation,
				P.RespiratoryRate,
				P.BasalEnergyBurned,
				P.DistanceWalkingRunning,
			],
			write: [] as string[],
		},
	};
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	d.setHours(0, 0, 0, 0);
	return d;
}

function toDateStr(d: Date): string {
	return d.toISOString().slice(0, 10);
}

async function calculateAndPersistPastReadiness(
	ts: HealthTimeSeries,
	wList: HealthWorkout[],
): Promise<HealthTimeSeries> {
	const datesToCalculate: string[] = [];
	// Go up to yesterday. Today's readiness is handled reactively by the useEffect.
	for (let i = 90; i >= 1; i--) {
		datesToCalculate.push(toDateStr(daysAgo(i)));
	}

	const readinessSamplesToWrite: DailyHealthSample[] = [];

	for (const dateStr of datesToCalculate) {
		const hasHrv = ts.hrv.some((s) => s.date === dateStr);
		const hasRhr = ts.resting_hr.some((s) => s.date === dateStr);
		const hasSleep = ts.sleep_history.some((s) => s.date === dateStr);
		const hasWorkout = wList.some(
			(w) => toDateStr(new Date(w.startDate)) === dateStr,
		);

		if (hasHrv || hasRhr || hasSleep || hasWorkout) {
			const hrvVal = ts.hrv.find((s) => s.date === dateStr)?.value ?? null;
			const rhrVal =
				ts.resting_hr.find((s) => s.date === dateStr)?.value ?? null;
			const sleepVal =
				ts.sleep_history.find((s) => s.date === dateStr)?.value ?? null;
			const lastNightSleep: SleepNight | null =
				sleepVal !== null && sleepVal > 0
					? { totalHours: sleepVal, deepRatio: 0, remRatio: 0 }
					: null;

			const breakdown = computeReadinessScore(
				{
					hrvSamples: ts.hrv,
					todayHrv: hrvVal,
					lastNightSleep,
					restingHrSamples: ts.resting_hr,
					todayRestingHr: rhrVal,
					workouts: wList,
				},
				dateStr,
			);

			const existingSample = ts.readiness.find((s) => s.date === dateStr);
			if (!existingSample || existingSample.value !== breakdown.score) {
				readinessSamplesToWrite.push({
					date: dateStr,
					value: breakdown.score,
					unit: "score",
					source: "Prossima",
				});
			}
		}
	}

	if (readinessSamplesToWrite.length > 0) {
		await writeMetric("readiness", readinessSamplesToWrite);
		return await loadAllMetrics();
	}

	return ts;
}

/**
 * Returns the "sleep night" date string for a given sleep segment.
 * Any segment that ends before noon is attributed to the morning of its end
 * date (i.e. the night before). This correctly handles segments that cross
 * midnight (e.g. 11:50 PM → 2:00 AM belongs to the next calendar day's night).
 */
function sleepNightDate(startISO: string, endISO: string): string {
	const end = new Date(endISO);
	// If the segment ends before noon, attribute it to the end date
	// (it's a morning segment belonging to that night).
	// If it ends after noon, attribute to the start date's date.
	if (end.getHours() < 12) {
		return toDateStr(end);
	}
	return toDateStr(new Date(startISO));
}

/**
 * react-native-health returns weight in the unit configured in the user's
 * iOS Health settings — either "lb" or "kg". Normalise to kg.
 */
function normaliseWeightToKg(value: number, unit?: string): number {
	if (unit) {
		const u = unit.toLowerCase();
		if (u.startsWith("lb") || u.startsWith("pound")) {
			return Math.round((value / 2.20462) * 10) / 10;
		}
		if (u.startsWith("gram") || u === "g") {
			return Math.round((value / 1000) * 10) / 10;
		}
		if (u.startsWith("oz") || u.startsWith("ounce")) {
			return Math.round(value * 0.0283495 * 10) / 10;
		}
		if (u.startsWith("stone")) {
			return Math.round(value * 6.35029 * 10) / 10;
		}
	}
	// If unit is "kg" or missing, trust the value as-is
	return Math.round(value * 10) / 10;
}

function nativeCall<T>(
	fn: (cb: (err: any, result: any) => void) => void,
	transform: (result: any) => T,
	fallback: T,
): Promise<T> {
	return new Promise((resolve) => {
		try {
			fn((err, result) => {
				if (err || result == null) {
					resolve(fallback);
				} else {
					try {
						resolve(transform(result));
					} catch {
						resolve(fallback);
					}
				}
			});
		} catch {
			resolve(fallback);
		}
	});
}

/**
 * Buckets an array of { startDate, endDate, value } samples into daily
 * aggregates keyed by date string (YYYY-MM-DD).
 */
function bucketDaily(
	results: any[],
	unit: string,
	mode: "sum" | "avg" | "last" = "avg",
): DailyHealthSample[] {
	const map = new Map<string, number[]>();
	for (const r of results) {
		const date = (r.startDate ?? r.endDate ?? "").slice(0, 10);
		if (!date) continue;
		const val = r.value ?? 0;
		if (!map.has(date)) map.set(date, []);
		map.get(date)!.push(val);
	}
	return Array.from(map.entries()).map(([date, vals]) => ({
		date,
		value:
			mode === "sum"
				? vals.reduce((a, b) => a + b, 0)
				: mode === "last"
					? vals[vals.length - 1]
					: vals.reduce((a, b) => a + b, 0) / vals.length,
		unit,
		source: "Apple Health",
	}));
}

/**
 * Parses a list of raw Apple Health sleep samples into daily totals, correctly
 * attributing cross-midnight segments to the right night via sleepNightDate().
 */
function parseSleepSamples(results: any[]): DailyHealthSample[] {
	const asleepValues = new Set(["ASLEEP", "CORE", "DEEP", "REM", "SLEEPING"]);
	const map = new Map<string, number>();

	for (const s of results) {
		const stage = String(s.value).toUpperCase();
		if (!asleepValues.has(stage)) continue;

		const startISO = s.startDate ?? "";
		const endISO = s.endDate ?? "";
		if (!startISO || !endISO) continue;

		// Use sleepNightDate() so cross-midnight segments land on the
		// correct night rather than always using startDate day.
		const date = sleepNightDate(startISO, endISO);
		const start = new Date(startISO).getTime();
		const end = new Date(endISO).getTime();
		map.set(date, (map.get(date) ?? 0) + Math.max(0, end - start));
	}

	return Array.from(map.entries()).map(([date, ms]) => ({
		date,
		value: Math.round((ms / (1000 * 60 * 60)) * 10) / 10,
		unit: "hours",
		source: "Apple Health",
	}));
}

// ─── Reusable Historical Fetch ────────────────────────────────────────────────

async function fetchHistoricalDataForRange(
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

	// Uses shared parseSleepSamples() with correct midnight attribution
	const sleepHistPromise = nativeCall(
		(cb) => nk.getSleepSamples({ ...range, limit: 2000 }, cb),
		parseSleepSamples,
		[],
	);

	// Reads `unit` field from each sample to normalise correctly
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

/**
 * Writes all metrics from a fetchHistoricalDataForRange result to the store
 * and returns the freshly reloaded time-series.
 */
async function persistHistoricalData(
	data: Awaited<ReturnType<typeof fetchHistoricalDataForRange>>,
): Promise<{ timeSeries: HealthTimeSeries; workouts: HealthWorkout[] }> {
	await Promise.all([
		writeMetric("hrv", data.hrv),
		writeMetric("resting_hr", data.rhr),
		writeMetric("steps_history", data.stepsHist),
		writeMetric("active_cal_history", data.calHist),
		writeMetric("sleep_history", data.sleepHist),
		writeMetric("body_weight", data.weightHist),
		writeMetric("body_fat", data.fatHist),
		writeMetric("vo2max", data.vo2),
		writeMetric("spo2", data.spo2),
		writeMetric("respiratory", data.resp),
		writeMetric("bmr", data.bmr),
		writeMetric("distance", data.dist),
		writeWorkouts(data.workouts),
	]);
	const [timeSeries, workouts] = await Promise.all([
		loadAllMetrics(),
		readWorkouts(),
	]);
	const updatedTs = await calculateAndPersistPastReadiness(
		timeSeries,
		workouts,
	);
	return { timeSeries: updatedTs, workouts };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const HealthContext = createContext<HealthContextType | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
	const [isConnected, setIsConnected] = useState(false);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	// FIX #11: Separate backfill loading state so UI can differentiate
	const [backfilling, setBackfilling] = useState(false);
	const [stats, setStats] = useState<HealthStats>(makeDefaultStats);
	const [timeSeries, setTimeSeries] =
		useState<HealthTimeSeries>(makeEmptyTimeSeries);
	const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
	const [readiness, setReadiness] = useState<ReadinessBreakdown | null>(null);

	// ── Load persisted connection state ────────────────────────────────────────

	const checkConnection = useCallback(async () => {
		try {
			const stored = await AsyncStorage.getItem(HEALTH_CONNECTED_KEY);
			if (stored === "true") {
				const nk = getNativeHealthKit();
				if (nk?.initHealthKit) {
					nk.initHealthKit(buildPermissions(), async (err: any) => {
						if (err) {
							console.warn("HealthKit initialization on startup failed:", err);
						}
						try {
							setIsConnected(true);
							const [ts, w] = await Promise.all([
								loadAllMetrics(),
								readWorkouts(),
							]);
							setTimeSeries(ts);
							setWorkouts(w);
						} catch (e) {
							console.error("Failed to hydrate local health store:", e);
						} finally {
							setLoading(false);
						}
					});
					return;
				} else {
					setIsConnected(true);
					const [ts, w] = await Promise.all([loadAllMetrics(), readWorkouts()]);
					setTimeSeries(ts);
					setWorkouts(w);
				}
			}
		} catch (e) {
			console.error("Failed to check health connection:", e);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		checkConnection();
	}, [checkConnection]);

	// ── Recompute readiness only when the inputs that matter change ────────────
	// Memoize the readiness inputs so the effect only re-runs when HRV,
	// sleep, or resting HR change — not on every step/calorie update.

	const readinessInputs = useMemo(
		() => ({
			todayHrv: stats.todayHrv,
			sleepHours: stats.sleepHours,
			sleepDeepRatio: stats.sleepDeepRatio,
			sleepRemRatio: stats.sleepRemRatio,
			todayRestingHr: stats.todayRestingHr,
		}),
		[
			stats.todayHrv,
			stats.sleepHours,
			stats.sleepDeepRatio,
			stats.sleepRemRatio,
			stats.todayRestingHr,
		],
	);

	useEffect(() => {
		if (!isConnected) {
			setReadiness(null);
			return;
		}

		const lastNightSleep: SleepNight | null =
			readinessInputs.sleepHours > 0
				? {
						totalHours: readinessInputs.sleepHours,
						deepRatio: readinessInputs.sleepDeepRatio,
						remRatio: readinessInputs.sleepRemRatio,
					}
				: null;

		const breakdown = computeReadinessScore({
			hrvSamples: timeSeries.hrv,
			todayHrv: readinessInputs.todayHrv,
			lastNightSleep,
			restingHrSamples: timeSeries.resting_hr,
			todayRestingHr: readinessInputs.todayRestingHr,
			workouts,
		});

		setReadiness(breakdown);

		// Persist today's readiness score into the time-series store
		const today = toDateStr(new Date());
		writeSample("readiness", {
			date: today,
			value: breakdown.score,
			unit: "score",
			source: "Prossima",
		}).catch(() => {});
	}, [
		isConnected,
		readinessInputs,
		timeSeries.hrv,
		timeSeries.resting_hr,
		workouts,
	]);

	// ── Background 30-day backfill ─────────────────────────────────────────────
	// Extracted to useCallback so it has a stable reference and doesn't
	// cause infinite loops when referenced from syncData.

	const backfillMissingData = useCallback(async () => {
		if (!isConnected) return;
		const nk = getNativeHealthKit();
		if (!nk?.initHealthKit) return;

		setBackfilling(true);
		try {
			const data = await fetchHistoricalDataForRange(
				nk,
				daysAgo(30).toISOString(),
				startOfToday().toISOString(),
			);
			const { timeSeries: ts, workouts: w } = await persistHistoricalData(data);
			setTimeSeries(ts);
			setWorkouts(w);
		} catch (e) {
			console.error("Error backfilling missing health data", e);
		} finally {
			setBackfilling(false);
		}
	}, [isConnected]);

	const syncData = useCallback(async () => {
		if (!isConnected) return;

		const nk = getNativeHealthKit();
		if (!nk?.initHealthKit) {
			if (__DEV__) {
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
				setStats(newStats);

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
				setTimeSeries(updatedTs);
				setWorkouts(w);
			} else {
				setStats(makeDefaultStats());
				setWorkouts([]);
			}
			return;
		}

		try {
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

			// getActiveEnergyBurned returns an array of samples. We must sum them up.
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

			// getAppleExerciseTime returns an array of samples. We must sum them up.
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

			// ── HRV ───────────────────────────────────────────────────────────────
			// Query from the prior night (18:00 yesterday) to capture the overnight HRV.
			// If not found, fall back to checking the last 48 hours, and then the last 7 days
			// to ensure we capture the most recent available HRV measurement.
			const queryHrvWithFallback = async (): Promise<number | null> => {
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
			};

			const hrvP = queryHrvWithFallback();

			// Resting HR
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

			// Body weight
			// Pass sample.unit to normaliseWeightToKg so metric devices
			// don't get double-converted.
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

			// Body fat
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

			// VO2 Max─
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

			// ── Distance ──────────────────────────────────────────────────────────
			const distanceP = nativeCall(
				(cb) => nk.getDistanceWalkingRunning({ date: today.toISOString() }, cb),
				(r) => (r.value ?? 0) * 1000, // km → meters
				0,
			);

			// ── Basal calories ────────────────────────────────────────────────────
			// FIX #2: getBasalEnergyBurned with { date } returns a scalar object,
			// not an array. Treat it consistently as a scalar.
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
			setWorkouts(updatedWorkouts);

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

			setStats(newStats);

			// ── Persist today's snapshot into the time-series store ───────────────
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

			// FIX #10: Only one loadAllMetrics call here (not two). The backfill
			// will do its own reload after it finishes.
			const ts = await loadAllMetrics();
			setTimeSeries(ts);

			// FIX #4: backfillMissingData is now a stable useCallback reference,
			// so this fire-and-forget call won't cause re-render loops.
			backfillMissingData().catch((err) =>
				console.error("Backfill failed", err),
			);
		} catch (e) {
			console.error("Error syncing health data", e);
		}
	}, [isConnected, backfillMissingData]);

	// ── Full historical sync (90 days) ────────────────────────────────────────

	const fullHistoricalSync = useCallback(async () => {
		if (!isConnected) return;

		const nk = getNativeHealthKit();
		if (!nk?.initHealthKit) {
			if (__DEV__) {
				setSyncing(true);
				try {
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
					setTimeSeries(updatedTs);
					setWorkouts(w);
					await markInitialSyncComplete();
				} finally {
					setSyncing(false);
				}
			}
			return;
		}

		setSyncing(true);
		try {
			const data = await fetchHistoricalDataForRange(
				nk,
				daysAgo(90).toISOString(),
				new Date().toISOString(),
			);
			const { timeSeries: ts, workouts: w } = await persistHistoricalData(data);
			await markInitialSyncComplete();
			setTimeSeries(ts);
			setWorkouts(w);
		} catch (e) {
			console.error("Error during full historical sync", e);
		} finally {
			setSyncing(false);
		}
	}, [isConnected]);

	// ── Auto-sync on connect and foreground ───────────────────────────────────

	useEffect(() => {
		if (!isConnected) return;

		let cancelled = false;

		(async () => {
			await syncData();
			if (cancelled) return;
			const done = await hasCompletedInitialSync();
			if (!done && !cancelled) {
				await fullHistoricalSync();
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const subscription = AppState.addEventListener("change", (nextState) => {
			if (nextState === "active" && isConnected) {
				syncData();
			}
		});
		return () => subscription.remove();
	}, [isConnected, syncData]);

	// ── Request permissions ───────────────────────────────────────────────────

	const requestPermissions = useCallback(async () => {
		const nk = getNativeHealthKit();
		if (!nk?.initHealthKit) {
			if (__DEV__) {
				await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, "true");
				setIsConnected(true);
				return;
			}
			Alert.alert(
				"Connection Failed",
				"Apple Health is only available on iOS devices.",
			);
			return;
		}

		return new Promise<void>((resolve, reject) => {
			try {
				nk.initHealthKit(buildPermissions(), async (err: any) => {
					if (err) {
						const msg =
							typeof err === "string"
								? err
								: (err?.message ?? "Unknown error occurred.");
						Alert.alert(
							"Connection Failed",
							`Could not connect to Apple Health: ${msg}`,
						);
						reject(err);
						return;
					}
					await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, "true");
					setIsConnected(true);
					resolve();
				});
			} catch (e: any) {
				Alert.alert(
					"Connection Failed",
					`Could not connect to Apple Health: ${e?.message ?? "An unexpected error occurred."}`,
				);
				reject(e);
			}
		});
	}, []);

	// ── Disconnect & Clear ────────────────────────────────────────────────────

	const clearLocalData = useCallback(async () => {
		try {
			await clearAllHealthData();
			setStats(makeDefaultStats());
			setTimeSeries(makeEmptyTimeSeries());
			setWorkouts([]);
			setReadiness(null);
		} catch (e) {
			console.error("Error clearing local data", e);
		}
	}, []);

	const disconnect = useCallback(async () => {
		try {
			await AsyncStorage.removeItem(HEALTH_CONNECTED_KEY);
			await clearLocalData();
			setIsConnected(false);
		} catch (e) {
			console.error("Error disconnecting health", e);
		}
	}, [clearLocalData]);

	return (
		<HealthContext.Provider
			value={{
				isConnected,
				stats,
				timeSeries,
				workouts,
				readiness,
				loading,
				syncing,
				backfilling,
				requestPermissions,
				syncData,
				fullHistoricalSync,
				disconnect,
				clearLocalData,
			}}
		>
			{children}
		</HealthContext.Provider>
	);
}

export function useHealth() {
	const ctx = useContext(HealthContext);
	if (!ctx) throw new Error("useHealth must be used within a HealthProvider");
	return ctx;
}
