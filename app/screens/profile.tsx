import React from "react";
import { Text, View } from "react-native";

const ProfileTab = ({ name, mobile, vehicle }: any) => {
  return (
    <View style={{ padding: 20 }}>
      <Text>Name: {name}</Text>
      <Text>Mobile: {mobile}</Text>
      <Text>Vehicle: {vehicle}</Text>
    </View>
  );
};

export default ProfileTab;
