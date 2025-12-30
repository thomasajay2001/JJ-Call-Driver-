import React from "react";
import { StyleSheet, Text, View } from "react-native";

const DriverHeader = ({ name="", vehicle="", status='online' }: any) => {
  return (
    <View style={styles.header}>
      <Text style={styles.name}>{name}</Text>
      <Text>{vehicle}</Text>
      <Text style={{ color: status === "online" ? "green" : "red" }}>
        {/* {status.toUpperCase()} */}
      </Text>
    </View>
  );
};

export default DriverHeader;

const styles = StyleSheet.create({
  header: {
    padding: 15,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
