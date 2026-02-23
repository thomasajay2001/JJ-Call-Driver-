// config.ts
import Constants from "expo-constants";

export const BASE_URL =
  (Constants.expoConfig?.extra as any)?.BASE_URL || "http://16.171.16.170:3000";
