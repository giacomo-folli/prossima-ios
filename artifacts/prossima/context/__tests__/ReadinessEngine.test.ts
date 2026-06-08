import {
	computeHrvScore,
	computeSleepScore,
	computeRestingHrScore,
	computeTrainingLoadScore,
	computeReadinessScore,
	ReadinessInputs,
} from "../ReadinessEngine";
import { DailyHealthSample, HealthWorkout } from "../HealthStore";

describe("ReadinessEngine", () => {
	// ─── Pillar 1: HRV Score (35%) ──────────────────────────────────────────────
	describe("computeHrvScore", () => {
		it("should return neutral score (50) if todayHrv is null or <= 0", () => {
			expect(computeHrvScore([], null)).toBe(50);
			expect(computeHrvScore([], -10)).toBe(50);
			expect(computeHrvScore([], 0)).toBe(50);
		});

		it("should return neutral score (50) if there are less than 3 baseline samples", () => {
			const samples: DailyHealthSample[] = [
				{ date: "2026-06-01", value: 55, unit: "ms", source: "Mock" },
				{ date: "2026-06-02", value: 65, unit: "ms", source: "Mock" },
			];
			expect(computeHrvScore(samples, 80, "2026-06-03")).toBe(50);
		});

		it("should calculate correctly based on baseline Z-score", () => {
			// Baseline samples: 50, 60, 70
			// Mean = 60
			// Variance = ((50-60)^2 + (60-60)^2 + (70-60)^2) / 3 = 200 / 3 = 66.67
			// SD = sqrt(66.67) = 8.165
			const samples: DailyHealthSample[] = [
				{ date: "2026-06-01", value: 50, unit: "ms", source: "Mock" },
				{ date: "2026-06-02", value: 60, unit: "ms", source: "Mock" },
				{ date: "2026-06-03", value: 70, unit: "ms", source: "Mock" },
			];

			// todayHrv = mean (60) => Z = 0 => score = 50
			expect(computeHrvScore(samples, 60, "2026-06-03")).toBe(50);

			// todayHrv = +2 SD (60 + 2 * 8.165 = 76.33) => Z = 2 => score = 100
			expect(computeHrvScore(samples, 76.33, "2026-06-03")).toBe(100);

			// todayHrv = -2 SD (60 - 2 * 8.165 = 43.67) => Z = -2 => score = 0
			expect(computeHrvScore(samples, 43.67, "2026-06-03")).toBe(0);

			// Clamping tests
			expect(computeHrvScore(samples, 90, "2026-06-03")).toBe(100);
			expect(computeHrvScore(samples, 20, "2026-06-03")).toBe(0);
		});
	});

	// ─── Pillar 2: Sleep Score (25%) ────────────────────────────────────────────
	describe("computeSleepScore", () => {
		it("should return 0 if sleep is null or totalHours is <= 0", () => {
			expect(computeSleepScore(null)).toBe(0);
			expect(computeSleepScore({ totalHours: 0, deepRatio: 0.2, remRatio: 0.2 })).toBe(0);
			expect(computeSleepScore({ totalHours: -1, deepRatio: 0.2, remRatio: 0.2 })).toBe(0);
		});

		it("should return 100 for optimal sleep (8h total, 20%+ Deep and REM ratios)", () => {
			expect(
				computeSleepScore({
					totalHours: 8,
					deepRatio: 0.2,
					remRatio: 0.2,
				}),
			).toBe(100);
		});

		it("should apply penalties and scale ratios correctly", () => {
			// Under-sleeping: 5h total (duration points = ((5-3)/4)*40 = 20)
			// Deep: 10% (deep points = (0.1/0.2)*30 = 15)
			// REM: 10% (rem points = (0.1/0.2)*30 = 15)
			// Total = 20 + 15 + 15 = 50
			expect(
				computeSleepScore({
					totalHours: 5,
					deepRatio: 0.1,
					remRatio: 0.1,
				}),
			).toBe(50);

			// Oversleeping: 10h total (duration points = 40 - ((10-9)/3)*10 = 36.67)
			// Deep: 25% (max deep points = 30)
			// REM: 25% (max rem points = 30)
			// Total = 37 + 30 + 30 = 97
			expect(
				computeSleepScore({
					totalHours: 10,
					deepRatio: 0.25,
					remRatio: 0.25,
				}),
			).toBe(97);
		});
	});

	// ─── Pillar 3: Resting HR Score (20%) ───────────────────────────────────────
	describe("computeRestingHrScore", () => {
		it("should return 50 if todayRhr is null or <= 0", () => {
			expect(computeRestingHrScore([], null)).toBe(50);
			expect(computeRestingHrScore([], -5)).toBe(50);
		});

		it("should return 50 if there are less than 2 baseline samples", () => {
			const samples: DailyHealthSample[] = [
				{ date: "2026-06-01", value: 60, unit: "bpm", source: "Mock" },
			];
			expect(computeRestingHrScore(samples, 65, "2026-06-02")).toBe(50);
		});

		it("should score correctly based on deviation from 7-day average", () => {
			// Baseline RHR: 60, 64 => avg = 62
			const samples: DailyHealthSample[] = [
				{ date: "2026-06-01", value: 60, unit: "bpm", source: "Mock" },
				{ date: "2026-06-02", value: 64, unit: "bpm", source: "Mock" },
			];

			// todayRhr = avg (62) => delta = 0 => score = 50
			expect(computeRestingHrScore(samples, 62, "2026-06-02")).toBe(50);

			// todayRhr = 5bpm above avg (67) => delta = 5 => score = 50 - 5 * 10 = 0
			expect(computeRestingHrScore(samples, 67, "2026-06-02")).toBe(0);

			// todayRhr = 5bpm below avg (57) => delta = -5 => score = 50 - (-5) * 10 = 100
			expect(computeRestingHrScore(samples, 57, "2026-06-02")).toBe(100);

			// Clamping tests
			expect(computeRestingHrScore(samples, 70, "2026-06-02")).toBe(0);
			expect(computeRestingHrScore(samples, 50, "2026-06-02")).toBe(100);
		});
	});

	// ─── Pillar 4: Training Load Score (20%) ────────────────────────────────────
	describe("computeTrainingLoadScore", () => {
		const refDateStr = "2026-06-28"; // Sunday

		it("should return 80 if there is no chronic history", () => {
			expect(computeTrainingLoadScore([], refDateStr)).toBe(80);
		});

		it("should return 100 for optimal ACWR (0.8 - 1.3)", () => {
			const workouts: HealthWorkout[] = [
				// Chronic period: 1-28 Jun. Acute: 22-28 Jun
				// Workout in acute: 70 min => daily acuteAvg = 70 / 7 = 10 min/day
				// Chronic volume: Workout in acute (70) + workout outside acute (210) = 280 min
				// daily chronicAvg = 280 / 28 = 10 min/day
				// ACWR = 10 / 10 = 1.0 => score = 100
				{ startDate: "2026-06-25T08:00:00Z", durationMinutes: 70, calories: 500, activityName: "Running" },
				{ startDate: "2026-06-10T08:00:00Z", durationMinutes: 210, calories: 1500, activityName: "Cycling" },
			];
			expect(computeTrainingLoadScore(workouts, refDateStr)).toBe(100);
		});

		it("should penalize detraining (ACWR < 0.5)", () => {
			const workouts: HealthWorkout[] = [
				// Acute volume = 0 => acuteAvg = 0
				// Chronic volume = 280 => chronicAvg = 10
				// ACWR = 0 => score = 20 + 0 * 40 = 20
				{ startDate: "2026-06-10T08:00:00Z", durationMinutes: 280, calories: 1500, activityName: "Cycling" },
			];
			expect(computeTrainingLoadScore(workouts, refDateStr)).toBe(20);
		});

		it("should penalize overreaching (ACWR > 1.5)", () => {
			const workouts: HealthWorkout[] = [
				// Acute volume = 280 => acuteAvg = 40
				// Chronic volume = 280 => chronicAvg = 10
				// ACWR = 4.0 => score = Max(0, 100 - (4 - 0.8) * 80) = 0
				{ startDate: "2026-06-25T08:00:00Z", durationMinutes: 280, calories: 2000, activityName: "Running" },
			];
			expect(computeTrainingLoadScore(workouts, refDateStr)).toBe(0);
		});
	});

	// ─── Composite Readiness Score ──────────────────────────────────────────────
	describe("computeReadinessScore", () => {
		const refDateStr = "2026-06-03";

		const hrvSamples: DailyHealthSample[] = [
			{ date: "2026-06-01", value: 60, unit: "ms", source: "Mock" },
			{ date: "2026-06-02", value: 60, unit: "ms", source: "Mock" },
			{ date: "2026-06-03", value: 60, unit: "ms", source: "Mock" },
		];

		const rhrSamples: DailyHealthSample[] = [
			{ date: "2026-06-01", value: 62, unit: "bpm", source: "Mock" },
			{ date: "2026-06-02", value: 62, unit: "bpm", source: "Mock" },
			{ date: "2026-06-03", value: 62, unit: "bpm", source: "Mock" },
		];

		const workouts: HealthWorkout[] = [];

		it("should calculate composite score with sleep inputs included", () => {
			const inputs: ReadinessInputs = {
				hrvSamples,
				todayHrv: 60, // HRV score = 50 (neutral)
				lastNightSleep: { totalHours: 8, deepRatio: 0.2, remRatio: 0.2 }, // Sleep score = 100 (optimal)
				restingHrSamples: rhrSamples,
				todayRestingHr: 62, // RHR score = 50 (neutral)
				workouts, // Load score = 80 (rest day default)
			};

			// Composite = HRV * 0.35 + Sleep * 0.25 + RHR * 0.2 + Load * 0.2
			//           = 50 * 0.35 + 100 * 0.25 + 50 * 0.2 + 80 * 0.2
			//           = 17.5 + 25 + 10 + 16 = 68.5 => Math.round(68.5) = 69
			const result = computeReadinessScore(inputs, refDateStr);
			expect(result.score).toBe(69);
			expect(result.sleep).toBe(100);
			expect(result.label).toBe("Moderate readiness");
			expect(result.level).toBe(2);
			expect(result.hasData).toBe(true);
		});

		it("should calculate composite score without sleep input and normalize weights", () => {
			const inputs: ReadinessInputs = {
				hrvSamples,
				todayHrv: 60, // HRV score = 50
				lastNightSleep: null,
				restingHrSamples: rhrSamples,
				todayRestingHr: 62, // RHR score = 50
				workouts, // Load score = 80
			};

			// Composite = (HRV * 0.35 + RHR * 0.2 + Load * 0.2) / 0.75
			//           = (50 * 0.35 + 50 * 0.2 + 80 * 0.2) / 0.75
			//           = (17.5 + 10 + 16) / 0.75 = 43.5 / 0.75 = 58
			const result = computeReadinessScore(inputs, refDateStr);
			expect(result.score).toBe(58);
			expect(result.sleep).toBeNull();
			expect(result.label).toBe("Moderate readiness");
			expect(result.level).toBe(2);
			expect(result.hasData).toBe(true);
		});

		it("should assign correct label based on composite score", () => {
			const variableHrvSamples: DailyHealthSample[] = [
				{ date: "2026-06-01", value: 50, unit: "ms", source: "Mock" },
				{ date: "2026-06-02", value: 60, unit: "ms", source: "Mock" },
				{ date: "2026-06-03", value: 70, unit: "ms", source: "Mock" },
			];

			const variableRhrSamples: DailyHealthSample[] = [
				{ date: "2026-06-01", value: 60, unit: "bpm", source: "Mock" },
				{ date: "2026-06-02", value: 64, unit: "bpm", source: "Mock" },
			];

			// Test Ready to perform (score >= 85)
			// HRV = 80 (+2.45 SD -> HRV score = 100)
			// RHR = 57 (avg = 62, delta = -5 => RHR score = 100)
			// Load = rest day = 80
			// Composite = (100 * 0.35 + 100 * 0.2 + 80 * 0.2) / 0.75 = (35 + 20 + 16) / 0.75 = 94.67 => 95
			expect(
				computeReadinessScore(
					{
						hrvSamples: variableHrvSamples,
						todayHrv: 80,
						lastNightSleep: null,
						restingHrSamples: variableRhrSamples,
						todayRestingHr: 57,
						workouts,
					},
					refDateStr,
				).label,
			).toBe("Ready to perform");

			// Test Ready to train (score 70-84)
			// HRV = 60 (mean => HRV score = 50)
			// RHR = 57 (RHR score = 100)
			// Load = 80
			// Composite = (50 * 0.35 + 100 * 0.2 + 80 * 0.2) / 0.75 = (17.5 + 20 + 16) / 0.75 = 70.67 => 71
			expect(
				computeReadinessScore(
					{
						hrvSamples: variableHrvSamples,
						todayHrv: 60,
						lastNightSleep: null,
						restingHrSamples: variableRhrSamples,
						todayRestingHr: 57,
						workouts,
					},
					refDateStr,
				).label,
			).toBe("Ready to train");

			// Test Take it easy today (score 40-54)
			// HRV = 43.67 (-2 SD => HRV score = 0)
			// RHR = 59 (avg = 62, delta = -3 => RHR score = 80)
			// Load = 80
			// Composite = (0 * 0.35 + 80 * 0.2 + 80 * 0.2) / 0.75 = 32 / 0.75 = 42.67 => 43
			expect(
				computeReadinessScore(
					{
						hrvSamples: variableHrvSamples,
						todayHrv: 43.67,
						lastNightSleep: null,
						restingHrSamples: variableRhrSamples,
						todayRestingHr: 59,
						workouts,
					},
					refDateStr,
				).label,
			).toBe("Take it easy today");

			// Test Rest & recover (score < 40)
			// HRV = 43.67 (-2 SD => HRV score = 0)
			// RHR = 62 (RHR score = 50)
			// Load = 80
			// Composite = (0 * 0.35 + 50 * 0.2 + 80 * 0.2) / 0.75 = 26 / 0.75 = 34.67 => 35
			expect(
				computeReadinessScore(
					{
						hrvSamples: variableHrvSamples,
						todayHrv: 43.67,
						lastNightSleep: null,
						restingHrSamples: variableRhrSamples,
						todayRestingHr: 62,
						workouts,
					},
					refDateStr,
				).label,
			).toBe("Rest & recover");
		});
	});

	describe("edge cases and extreme values", () => {
		it("should handle completely empty inputs and return defaults with hasData = false", () => {
			const inputs: ReadinessInputs = {
				hrvSamples: [],
				todayHrv: null,
				lastNightSleep: null,
				restingHrSamples: [],
				todayRestingHr: null,
				workouts: [],
			};

			const result = computeReadinessScore(inputs, "2026-06-08");
			// HRV default = 50
			// RHR default = 50
			// Load default = 80
			// Composite = (50 * 0.35 + 50 * 0.2 + 80 * 0.2) / 0.75 = 58
			expect(result.score).toBe(58);
			expect(result.hasData).toBe(false);
			expect(result.level).toBe(0);
		});

		it("should handle workouts on the exact 7-day and 28-day boundaries", () => {
			const refDateStr = "2026-06-08";
			// Workout 1: exactly 7 days ago (starts 2026-06-01 08:00:00 local) -> included in acute and chronic
			// Workout 2: exactly 28 days ago (starts 2026-05-11 08:00:00 local) -> included in chronic
			// Workout 3: 29 days ago (2026-05-10 23:59:59 local) -> excluded
			const workouts: HealthWorkout[] = [
				{ startDate: new Date(2026, 5, 1, 8, 0, 0).toISOString(), durationMinutes: 60, calories: 400, activityName: "Run" },
				{ startDate: new Date(2026, 4, 11, 8, 0, 0).toISOString(), durationMinutes: 120, calories: 800, activityName: "Bike" },
				{ startDate: new Date(2026, 4, 10, 23, 59, 59).toISOString(), durationMinutes: 180, calories: 1200, activityName: "Row" },
			];

			// acute7Total = 60 => acuteAvg = 60 / 7 = 8.57 min/day
			// chronic28Total = Workout 1 (60) + Workout 2 (120) = 180 => chronicAvg = 180 / 28 = 6.43 min/day
			// ACWR = 8.57 / 6.43 = 1.333
			// since ACWR > 1.3, score is overreach:
			// 100 - (1.333 - 0.8) * 80 = 100 - 42.67 = 57.33 => 57
			const score = computeTrainingLoadScore(workouts, refDateStr);
			expect(score).toBe(57);
		});
	});
});
