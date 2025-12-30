import React from "react";
import { Text, View } from "react-native";

const RatingsTab = () => {
  return (
    <View style={{ alignItems: "center", marginTop: 50 }}>
      <Text style={{ fontSize: 40 }}>⭐ 4.8</Text>
      <Text>Based on 230 rides</Text>
    </View>
  );
};

export default RatingsTab;
