import { DailyHealthSample } from "../HealthStore";

export function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

export function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function toDateStr(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function sleepNightDate(startISO: string, endISO: string): string {
	const end = new Date(endISO);
	if (end.getHours() < 12) {
		return toDateStr(end);
	}
	return toDateStr(new Date(startISO));
}

export function normaliseWeightToKg(value: number, unit?: string): number {
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
	return Math.round(value * 10) / 10;
}

export function bucketDaily(
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

export function parseSleepSamples(results: any[]): DailyHealthSample[] {
	const asleepValues = new Set(["ASLEEP", "CORE", "DEEP", "REM", "SLEEPING"]);
	const map = new Map<string, number>();

	for (const s of results) {
		const stage = String(s.value).toUpperCase();
		if (!asleepValues.has(stage)) continue;

		const startISO = s.startDate ?? "";
		const endISO = s.endDate ?? "";
		if (!startISO || !endISO) continue;

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
