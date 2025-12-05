module.exports = {
  expo: {
    name: "AutoNew",
    slug: "autonew",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "autonew",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.autonew.app"
    },
    android: {
      package: "com.autonew.app",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#0C553C",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      gradle: {
        buildToolsVersion: "35.0.0",
        kotlinVersion: "1.9.24"
      }
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 250,
          resizeMode: "contain",
          backgroundColor: "#0C553C",
          dark: {
            backgroundColor: "#0C553C"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      apiUrl: process.env.API_URL || "https://autonewapp-backend.onrender.com/api",
      eas: {
        projectId: "21904db9-9532-43b1-b36d-f2f581ba6c2e"
      }
    }
  }
};
