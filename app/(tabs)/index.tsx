import { StyleSheet } from 'react-native';

import { Redirect } from 'expo-router';

// export default function HomeScreen() {
//   return <Redirect href="/(tabs)/driver-dashboard" />;
// import { Redirect } from "expo-router";
// import { StyleSheet } from 'react-native';

export default function HomeScreen() {
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
