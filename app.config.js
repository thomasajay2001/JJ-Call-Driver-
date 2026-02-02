import 'dotenv/config';

export default {
  expo: {
    name: "myApp",
    slug: "myApp",
    version: "1.0.0",
    extra: {
      BASE_URL: process.env.BASE_URL || "http://192.168.0.9:3000",
    },
  },
};
