import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ProfileContextType {
  name: string;
  setName: (name: string) => Promise<void>;
  imageUri: string | null;
  setImageUri: (uri: string | null) => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  name: "Maya",
  setName: async () => {},
  imageUri: null,
  setImageUri: async () => {},
  loading: true,
});

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [name, setNameState] = useState("Maya");
  const [imageUri, setImageUriState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedName = await AsyncStorage.getItem("profile_name");
        const storedImage = await AsyncStorage.getItem("profile_image");
        if (storedName) setNameState(storedName);
        if (storedImage) setImageUriState(storedImage);
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

  return (
    <ProfileContext.Provider value={{ name, setName, imageUri, setImageUri, loading }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
