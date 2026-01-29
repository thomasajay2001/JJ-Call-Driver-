import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

import HomeTab from "./home";
import RideTab from "./myRides";
import ProfileTab from "./profile";
import RatingsTab from "./rating";

const Tab = createBottomTabNavigator();

const settings = ({
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
      {/* 🔻 BOTTOM NAVIGATION */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#F6B100",
          tabBarInactiveTintColor: "#888",
          tabBarStyle: {
            height: 40,
            paddingBottom: 8,
            paddingTop: 5,
          },

          tabBarIcon: ({ color, size }) => {
            let iconName: any = "home";

            if (route.name === "Home") iconName = "home";
            if (route.name === "Ride") iconName = "car";
            if (route.name === "Ratings") iconName = "star";
            if (route.name === "Profile") iconName = "person";

            return <Ionicons name={iconName} size={size || 22} color={color} />;
          },
        })}
      >
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
          {() => <ProfileTab name={name} mobile={mobile} vehicle={vehicle} />}
        </Tab.Screen>
      </Tab.Navigator>
    </>
  );
};

export default settings;
