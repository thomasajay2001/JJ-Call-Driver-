import React from "react";
import { Button, View } from "react-native";

const RideTab = ({ status, startRide, completeRide }: any) => {
  return (
    <View style={{ padding: 20 }}>
      {status === "online" && (
        <Button title="Start Ride" onPress={startRide} />
      )}

      {status === "inride" && (
        <Button title="Complete Ride" onPress={completeRide} color="orange" />
      )}
    </View>
  );
};

export default RideTab;
