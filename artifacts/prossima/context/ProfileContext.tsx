import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type WidgetConfig = {
	id: string;
	visible: boolean;
};

export const DEFAULT_HEALTH_WIDGETS: WidgetConfig[] = [
	{ id: "readiness", visible: true },
	{ id: "hrv", visible: true },
	{ id: "rhr", visible: true },
	{ id: "sleep", visible: true },
	{ id: "weight", visible: true },
	{ id: "vo2max", visible: true },
	{ id: "vitals", visible: true },
	{ id: "steps", visible: true },
];

export const DEFAULT_WORKOUT_WIDGETS: WidgetConfig[] = [
	{ id: "workouts", visible: true },
	{ id: "calories", visible: true },
	{ id: "duration", visible: true },
];

export interface ProfileContextType {
	name: string;
	setName: (name: string) => Promise<void>;
	imageUri: string | null;
	setImageUri: (uri: string | null) => Promise<void>;
	stepsGoal: number;
	setStepsGoal: (goal: number) => Promise<void>;
	caloriesGoal: number;
	setCaloriesGoal: (goal: number) => Promise<void>;
	activityTimeGoal: number;
	setActivityTimeGoal: (goal: number) => Promise<void>;
	healthWidgets: WidgetConfig[];
	setHealthWidgets: (widgets: WidgetConfig[]) => Promise<void>;
	workoutWidgets: WidgetConfig[];
	setWorkoutWidgets: (widgets: WidgetConfig[]) => Promise<void>;
	loading: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
	name: "Lilli",
	setName: async () => {},
	imageUri: null,
	setImageUri: async () => {},
	stepsGoal: 15000,
	setStepsGoal: async () => {},
	caloriesGoal: 550,
	setCaloriesGoal: async () => {},
	activityTimeGoal: 60,
	setActivityTimeGoal: async () => {},
	healthWidgets: DEFAULT_HEALTH_WIDGETS,
	setHealthWidgets: async () => {},
	workoutWidgets: DEFAULT_WORKOUT_WIDGETS,
	setWorkoutWidgets: async () => {},
	loading: true,
});

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
	const [name, setNameState] = useState("Lilli");
	const [imageUri, setImageUriState] = useState<string | null>(null);
	const [stepsGoal, setStepsGoalState] = useState<number>(15000);
	const [caloriesGoal, setCaloriesGoalState] = useState<number>(550);
	const [activityTimeGoal, setActivityTimeGoalState] = useState<number>(60);
	const [healthWidgets, setHealthWidgetsState] = useState<WidgetConfig[]>(DEFAULT_HEALTH_WIDGETS);
	const [workoutWidgets, setWorkoutWidgetsState] = useState<WidgetConfig[]>(DEFAULT_WORKOUT_WIDGETS);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadProfile = async () => {
			try {
				const storedName = await AsyncStorage.getItem("profile_name");
				const storedImage = await AsyncStorage.getItem("profile_image");
				const storedStepsGoal = await AsyncStorage.getItem("goal_steps");
				const storedCaloriesGoal = await AsyncStorage.getItem("goal_calories");
				const storedActivityTimeGoal = await AsyncStorage.getItem("goal_activity_time");
				const storedHealthWidgets = await AsyncStorage.getItem("widgets_health");
				const storedWorkoutWidgets = await AsyncStorage.getItem("widgets_workout");

				if (storedName) setNameState(storedName);
				if (storedImage) setImageUriState(storedImage);
				if (storedStepsGoal) setStepsGoalState(Number(storedStepsGoal));
				if (storedCaloriesGoal) setCaloriesGoalState(Number(storedCaloriesGoal));
				if (storedActivityTimeGoal) setActivityTimeGoalState(Number(storedActivityTimeGoal));
				if (storedHealthWidgets) {
					try {
						setHealthWidgetsState(JSON.parse(storedHealthWidgets));
					} catch (e) {}
				}
				if (storedWorkoutWidgets) {
					try {
						setWorkoutWidgetsState(JSON.parse(storedWorkoutWidgets));
					} catch (e) {}
				}
			} catch (e) {
				console.error("Failed to load profile", e);
			} finally {
				setLoading(false);
			}
		};
		loadProfile();
	}, []);

	const setName = async (newName: string) => {
		setNameState(newName);
		await AsyncStorage.setItem("profile_name", newName);
	};

	const setImageUri = async (newUri: string | null) => {
		setImageUriState(newUri);
		if (newUri) {
			await AsyncStorage.setItem("profile_image", newUri);
		} else {
			await AsyncStorage.removeItem("profile_image");
		}
	};

	const setStepsGoal = async (goal: number) => {
		setStepsGoalState(goal);
		await AsyncStorage.setItem("goal_steps", String(goal));
	};

	const setCaloriesGoal = async (goal: number) => {
		setCaloriesGoalState(goal);
		await AsyncStorage.setItem("goal_calories", String(goal));
	};

	const setActivityTimeGoal = async (goal: number) => {
		setActivityTimeGoalState(goal);
		await AsyncStorage.setItem("goal_activity_time", String(goal));
	};

	const setHealthWidgets = async (widgets: WidgetConfig[]) => {
		setHealthWidgetsState(widgets);
		await AsyncStorage.setItem("widgets_health", JSON.stringify(widgets));
	};

	const setWorkoutWidgets = async (widgets: WidgetConfig[]) => {
		setWorkoutWidgetsState(widgets);
		await AsyncStorage.setItem("widgets_workout", JSON.stringify(widgets));
	};

	return (
		<ProfileContext.Provider
			value={{
				name,
				setName,
				imageUri,
				setImageUri,
				stepsGoal,
				setStepsGoal,
				caloriesGoal,
				setCaloriesGoal,
				activityTimeGoal,
				setActivityTimeGoal,
				healthWidgets,
				setHealthWidgets,
				workoutWidgets,
				setWorkoutWidgets,
				loading,
			}}
		>
			{children}
		</ProfileContext.Provider>
	);
};

export const useProfile = () => useContext(ProfileContext);
