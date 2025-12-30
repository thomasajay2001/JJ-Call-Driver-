// import { Text, View } from 'react-native';

// export default function Settings() {
//   return (
//     <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//       <Text>My Rides</Text>
//     </View>
//   );
// }
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import React from "react";

import DriverHeader from "./header";
import HomeTab from "./home";
import RideTab from "./myRides";
import ProfileTab from "./profile";
import RatingsTab from "./rating";

const Tab = createMaterialTopTabNavigator();

const DriverDashboard = ({
  name,
  vehicle,
  status,
  mobile,
  notifications,
  onAccept,
  onDecline,
  startRide,
  completeRide,
}: any) => {
  return (
    <>
      <DriverHeader name={name} vehicle={vehicle} status={status} />

      <Tab.Navigator>
        <Tab.Screen name="Home">
          {() => (
            <HomeTab
              notifications={notifications}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Ride">
          {() => (
            <RideTab
              status={status}
              startRide={startRide}
              completeRide={completeRide}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Ratings" component={RatingsTab} />

        <Tab.Screen name="Profile">
          {() => (
            <ProfileTab
              name={name}
              mobile={mobile}
              vehicle={vehicle}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </>
  );
};

export default DriverDashboard;
