// @ts-nocheck
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'

import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import OTPVerifyScreen from '../screens/OTPVerifyScreen'
import ShiftListScreen from '../screens/ShiftListScreen'
import FeedScreen from '../screens/FeedScreen'
import MyShiftsScreen from '../screens/MyShiftsScreen'
import MyApplicationsScreen from '../screens/MyApplicationsScreen'
import LogHoursScreen from '../screens/LogHoursScreen'
import HoursReportScreen from '../screens/HoursReportScreen'
import MyReportsScreen from '../screens/MyReportsScreen'
import AuditScreen from '../screens/AuditScreen'
import ShiftFormScreen from '../screens/ShiftFormScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator initialRouteName="Feed">
          <Stack.Screen name="Feed" component={FeedScreen} />
          <Stack.Screen name="MyShifts" component={MyShiftsScreen} />
          <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
          <Stack.Screen name="MyReports" component={MyReportsScreen} />
}
