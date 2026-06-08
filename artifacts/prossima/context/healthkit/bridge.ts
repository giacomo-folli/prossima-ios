import { Platform, NativeModules } from "react-native";

export const getNativeHealthKit = () => {
	if (Platform.OS !== "ios") return null;
	return NativeModules.AppleHealthKit || NativeModules.RNAppleHealthKit || null;
};

export function nativeCall<T>(
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
