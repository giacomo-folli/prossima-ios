import { HealthTimeSeries, HealthWorkout } from "../HealthStore";
import { fetchHistoricalDataForRange } from "../healthkit/fetchers";
import { persistHistoricalData } from "./persistor";
import { daysAgo, startOfToday } from "../healthkit/transforms";

export async function runBackfill(
	nk: any,
): Promise<{ timeSeries: HealthTimeSeries; workouts: HealthWorkout[] }> {
	const data = await fetchHistoricalDataForRange(
		nk,
		daysAgo(30).toISOString(),
		startOfToday().toISOString(),
	);
	return await persistHistoricalData(data);
}

export async function runHistoricalSync(
	nk: any,
): Promise<{ timeSeries: HealthTimeSeries; workouts: HealthWorkout[] }> {
	const data = await fetchHistoricalDataForRange(
		nk,
		daysAgo(90).toISOString(),
		new Date().toISOString(),
	);
	return await persistHistoricalData(data);
}
