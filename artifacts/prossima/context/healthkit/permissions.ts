import AppleHealthKitLibrary from "react-native-health";

export function buildPermissions() {
	const P = AppleHealthKitLibrary.Constants.Permissions;
	return {
		permissions: {
			read: [
				P.StepCount,
				P.ActiveEnergyBurned,
				P.AppleExerciseTime,
				P.SleepAnalysis,
				P.Workout,
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
				P.ActivitySummary,
			],
			write: [] as string[],
		},
	};
}
