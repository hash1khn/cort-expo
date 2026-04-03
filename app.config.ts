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
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(
      (process.env.APP_ENV as "development" | "preview" | "production") ||
        "development"
    );
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
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
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
          "iosGoogleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
          "androidGoogleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_API_KEY
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