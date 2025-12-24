// @ts-nocheck
import React, { useContext } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { NotificationContext } from '../context/NotificationContext'
import { View, TouchableOpacity, Text } from 'react-native'

import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import OTPVerifyScreen from '../screens/OTPVerifyScreen'
import ShiftListScreen from '../screens/ShiftListScreen'
import FeedScreen from '../screens/FeedScreen'
import MyShiftsScreen from '../screens/MyShiftsScreen'
import MyApplicationsScreen from '../screens/MyApplicationsScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import LogHoursScreen from '../screens/LogHoursScreen'
import HoursReportScreen from '../screens/HoursReportScreen'
import MyReportsScreen from '../screens/MyReportsScreen'
import AuditScreen from '../screens/AuditScreen'
import ShiftFormScreen from '../screens/ShiftFormScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Stack = createNativeStackNavigator()

// Header notification bell component
const NotificationBell = ({ navigation, unreadCount }) => {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={{ marginRight: 16 }}
    >
      <Text style={{ fontSize: 20 }}>🔔</Text>
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#EF4444',
            borderRadius: 10,
            width: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text
            style={{
              color: '#FFF',
              fontSize: 11,
              fontWeight: '700'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function AppNavigator() {
  const { user, loading } = useAuth()
  const notificationContext = useContext(NotificationContext)
  const unreadCount = notificationContext?.unreadCount || 0

  if (loading) return null

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator
          initialRouteName="Feed"
          screenOptions={({ navigation }) => ({
            headerRight: () => (
              <NotificationBell
                navigation={navigation}
                unreadCount={unreadCount}
              />
            )
          })}
        >
          <Stack.Screen
            name="Feed"
            component={FeedScreen}
            options={{ title: 'Available Shifts' }}
          />
          <Stack.Screen
            name="MyShifts"
            component={MyShiftsScreen}
            options={{ title: 'My Shifts' }}
          />
          <Stack.Screen
            name="MyApplications"
            component={MyApplicationsScreen}
            options={{ title: 'My Applications' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen
            name="MyReports"
            component={MyReportsScreen}
            options={{ title: 'My Reports' }}
          />
          <Stack.Screen
            name="LogHours"
            component={LogHoursScreen}
            options={{ title: 'Log Hours' }}
          />
          <Stack.Screen
            name="HoursReport"
            component={HoursReportScreen}
            options={{ title: 'Hours Report' }}
          />
          <Stack.Screen
            name="Audit"
            component={AuditScreen}
            options={{ title: 'Shift Audit' }}
          />
          <Stack.Screen
            name="ShiftForm"
            component={ShiftFormScreen}
            options={{ title: 'Create Shift' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OTPVerify"
            component={OTPVerifyScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  )
}
