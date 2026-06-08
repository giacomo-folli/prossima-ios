import {
	startOfToday,
	daysAgo,
	toDateStr,
	sleepNightDate,
	normaliseWeightToKg,
	bucketDaily,
	parseSleepSamples,
} from "../transforms";

describe("healthkit/transforms", () => {
	describe("date helpers", () => {
		it("should return start of today at midnight local time", () => {
			const today = startOfToday();
			expect(today.getHours()).toBe(0);
			expect(today.getMinutes()).toBe(0);
			expect(today.getSeconds()).toBe(0);
			expect(today.getMilliseconds()).toBe(0);
		});

		it("should return days ago at midnight local time", () => {
			const d = daysAgo(3);
			const expected = startOfToday();
			expected.setDate(expected.getDate() - 3);
			expect(d.getTime()).toBe(expected.getTime());
		});

		it("should format Date to YYYY-MM-DD string", () => {
			const d = new Date(Date.UTC(2026, 5, 8)); // 8 June 2026 UTC
			expect(toDateStr(d)).toBe("2026-06-08");
		});
	});

	describe("sleepNightDate", () => {
		it("should attribute sleep ending before noon to the end date (the night before)", () => {
			// Ends 8:30 AM on 2026-06-08
			expect(sleepNightDate("2026-06-07T22:30:00Z", "2026-06-08T08:30:00Z")).toBe("2026-06-08");
		});

		it("should attribute sleep ending after noon to the start date", () => {
			// Ends 1:30 PM on 2026-06-08
			expect(sleepNightDate("2026-06-08T10:30:00Z", "2026-06-08T13:30:00Z")).toBe("2026-06-08");
		});
	});

	describe("normaliseWeightToKg", () => {
		it("should normalise lbs to kg", () => {
			// 150 lbs = 150 / 2.20462 = 68.038 kg -> 68 kg
			expect(normaliseWeightToKg(150, "lb")).toBe(68);
			expect(normaliseWeightToKg(150, "pounds")).toBe(68);
		});

		it("should normalise grams to kg", () => {
			expect(normaliseWeightToKg(75000, "g")).toBe(75);
			expect(normaliseWeightToKg(75000, "grams")).toBe(75);
		});

		it("should normalise stones to kg", () => {
			// 10 stone = 10 * 6.35029 = 63.5029 kg -> 63.5 kg
			expect(normaliseWeightToKg(10, "stone")).toBe(63.5);
		});

		it("should normalise ounces to kg", () => {
			// 2400 oz = 2400 * 0.0283495 = 68.038 kg -> 68 kg
			expect(normaliseWeightToKg(2400, "oz")).toBe(68);
		});

		it("should trust value as-is for kg unit or missing unit", () => {
			expect(normaliseWeightToKg(75.5, "kg")).toBe(75.5);
			expect(normaliseWeightToKg(75.5)).toBe(75.5);
		});
	});

	describe("bucketDaily", () => {
		const rawSamples = [
			{ startDate: "2026-06-08T08:00:00Z", value: 10 },
			{ startDate: "2026-06-08T12:00:00Z", value: 20 },
			{ startDate: "2026-06-09T09:00:00Z", value: 30 },
		];

		it("should aggregate using mode avg", () => {
			const res = bucketDaily(rawSamples, "ms", "avg");
			expect(res).toEqual([
				{ date: "2026-06-08", value: 15, unit: "ms", source: "Apple Health" },
				{ date: "2026-06-09", value: 30, unit: "ms", source: "Apple Health" },
			]);
		});

		it("should aggregate using mode sum", () => {
			const res = bucketDaily(rawSamples, "steps", "sum");
			expect(res).toEqual([
				{ date: "2026-06-08", value: 30, unit: "steps", source: "Apple Health" },
				{ date: "2026-06-09", value: 30, unit: "steps", source: "Apple Health" },
			]);
		});

		it("should aggregate using mode last", () => {
			const res = bucketDaily(rawSamples, "kg", "last");
			expect(res).toEqual([
				{ date: "2026-06-08", value: 20, unit: "kg", source: "Apple Health" },
				{ date: "2026-06-09", value: 30, unit: "kg", source: "Apple Health" },
			]);
		});
	});

	describe("parseSleepSamples", () => {
		it("should sum sleep stage durations and attribute correctly", () => {
			const rawSleep = [
				{ startDate: "2026-06-07T23:00:00Z", endDate: "2026-06-08T03:00:00Z", value: "CORE" }, // 4h sleep
				{ startDate: "2026-06-08T03:30:00Z", endDate: "2026-06-08T05:30:00Z", value: "DEEP" }, // 2h sleep
				{ startDate: "2026-06-08T06:00:00Z", endDate: "2026-06-08T07:00:00Z", value: "AWAKE" }, // 1h awake (should ignore)
			];

			const res = parseSleepSamples(rawSleep);
			expect(res).toEqual([
				{ date: "2026-06-08", value: 6, unit: "hours", source: "Apple Health" },
			]);
		});
	});
});
