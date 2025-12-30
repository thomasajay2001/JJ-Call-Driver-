import React from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

const HomeTab = ({ notifications=[], onAccept, onDecline }: any) => {
  return (
    <ScrollView style={styles.container}

    
    >
      {notifications.map((b: any) => (
        <View key={b.bookingId} style={styles.card}>
          <Text>{b.name}</Text>
          <Text>{b.pickup} → {b.drop}</Text>
          <Text>{b.phone}</Text>

          <Button title="Accept" onPress={() => onAccept(b)} />
          <Button title="Decline" color="red" onPress={() => onDecline(b)} />
        </View>
      ))}
    </ScrollView>
  );
};

export default HomeTab;

const styles = StyleSheet.create({
  container: { padding: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
});
