import {
	DailyHealthSample,
	HealthTimeSeries,
	HealthWorkout,
	loadAllMetrics,
	readWorkouts,
	writeMetric,
	writeWorkouts,
} from "../HealthStore";
import { computeReadinessScore, SleepNight } from "../ReadinessEngine";
import { daysAgo, toDateStr } from "../healthkit/transforms";
import { fetchHistoricalDataForRange } from "../healthkit/fetchers";

export async function calculateAndPersistPastReadiness(
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

export async function persistHistoricalData(
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
