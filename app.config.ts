import { ConfigContext, ExpoConfig } from "expo/config";
import { version } from "./package.json";

const EAS_PROJECT_ID = "a65c02f9-c871-48e9-ada3-75d921c93682";
const PROJECT_SLUG = "Cort";
const OWNER = "cort-technologies";

// App production config
const APP_NAME = "Cort";
const BUNDLE_IDENTIFIER = "com.corttechnologies.cort";
const PACKAGE_NAME = "com.corttechnologies.cort";
const ICON = "./assets/cort-app-icon.png";
const ADAPTIVE_ICON = "./assets/adaptive-icon.png";
const SCHEME = "cort";

export default ({ config }: ConfigContext): ExpoConfig => {
  console.log(" Building app for environment:", process.env.APP_ENV);
  const APP_ENV =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";
  const IS_DEV = APP_ENV === "development";
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(APP_ENV);
  return {
    ...config,
    name: name,
    version,
    slug: PROJECT_SLUG,
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: icon,
    scheme: scheme,
    splash: {
      image: "./assets/cort-app-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F4593B",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleIdentifier,
     
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ["fetch", "remote-notification", "location"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#f47f00",
      },
      package: packageName,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      "googleServicesFile": "./google-services.json",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      router: {},
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      [
        "expo-dev-client",
        {
          addGeneratedScheme: IS_DEV,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/cort-app-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#F4593B",
        },
      ],
     [
        "react-native-maps",
        {
          "iosGoogleMapsApiKey": process.env.EXPO_PUBLIC_IOS_GOOGLE_API_KEY,
          "androidGoogleMapsApiKey": process.env.EXPO_PUBLIC_ANDROID_GOOGLE_API_KEY
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "$(PRODUCT_NAME) uses your location during active rides so dispatch can track progress in real time, even when the app is in the background.",
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true,
          "isIosBackgroundLocationEnabled": true
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
    },
    owner: OWNER,
  };
};

export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
  if (environment === "production") {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME,
    };
  }
  if (environment === "preview") {
    return {
      name: `${APP_NAME} (Preview)`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: `${SCHEME}-preview`,
    };
  }
  return {
    name: `${APP_NAME} (Dev)`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: ICON,
    adaptiveIcon: ADAPTIVE_ICON,
    scheme: `${SCHEME}-dev`,
  };
};