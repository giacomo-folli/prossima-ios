import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
	DailyHealthSample,
	clearAllHealthData,
	hasCompletedInitialSync,
	markInitialSyncComplete,
	writeSample,
	loadAllMetrics,
	HealthWorkout,
	readWorkouts,
	HealthTimeSeries,
} from "./HealthStore";

export { HealthWorkout, HealthTimeSeries };

import {
	computeReadinessScore,
	ReadinessBreakdown,
	SleepNight,
} from "./ReadinessEngine";

// Sub-modules
import { getNativeHealthKit } from "./healthkit/bridge";
import { buildPermissions } from "./healthkit/permissions";
import { toDateStr } from "./healthkit/transforms";
import { syncDailyData } from "./sync/dailySync";
import { runBackfill, runHistoricalSync } from "./sync/historicalSync";
import { runMockHistoricalSync } from "./mockData";

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

// ─── Context ──────────────────────────────────────────────────────────────────

const HealthContext = createContext<HealthContextType | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
	const [isConnected, setIsConnected] = useState(false);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
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

	const backfillMissingData = useCallback(async () => {
		if (!isConnected) return;
		const nk = getNativeHealthKit();
		if (!nk?.initHealthKit) return;

		setBackfilling(true);
		try {
			const { timeSeries: ts, workouts: w } = await runBackfill(nk);
			setTimeSeries(ts);
			setWorkouts(w);
		} catch (e) {
			console.error("Error backfilling missing health data", e);
		} finally {
			setBackfilling(false);
		}
	}, [isConnected]);

	// ── Daily Sync ─────────────────────────────────────────────────────────────

	const syncData = useCallback(async () => {
		if (!isConnected) return;
		const nk = getNativeHealthKit();

		try {
			const { stats: newStats, timeSeries: ts, workouts: w } = await syncDailyData(
				nk,
				__DEV__,
			);
			setStats(newStats);
			setTimeSeries(ts);
			setWorkouts(w);

			// Fire-and-forget backfill
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
					const { timeSeries: ts, workouts: w } = await runMockHistoricalSync();
					await markInitialSyncComplete();
					setTimeSeries(ts);
					setWorkouts(w);
				} catch (e) {
					console.error("Error during mock historical sync", e);
				} finally {
					setSyncing(false);
				}
			}
			return;
		}

		setSyncing(true);
		try {
			const { timeSeries: ts, workouts: w } = await runHistoricalSync(nk);
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
