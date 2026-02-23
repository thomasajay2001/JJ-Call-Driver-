import "dotenv/config";

export default {
  expo: {
    name: "jjcalldriver",
    slug: "myApp",
    version: "1.0.0",

    extra: {
      BASE_URL: process.env.BASE_URL || "http://13.53.193.48:3000",
      eas: {
        projectId: "417b4c1d-8b29-4183-b431-46d1f756f85e",  // ← new ID
      },
    },

    android: {
      package: "com.jjcall.driver",
      usesCleartextTraffic: true,
    },
  },
};