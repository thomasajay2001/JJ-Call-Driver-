import 'dotenv/config';

export default {
  expo: {
    name: "jjcalldriver",
    slug: "myApp", // ⚠️ MUST match EAS project slug
    version: "1.0.0",

    extra: {
      BASE_URL: process.env.BASE_URL || "http://192.168.0.3:3000",
      eas: {
        projectId: "42ba8b28-bba5-43d3-9be4-0c5bec49785a",
      },
    },

    android: {
      package: "com.jjcall.driver",
      usesCleartextTraffic: true,
    },
  },
};
