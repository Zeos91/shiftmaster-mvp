import React from 'react'
import { SafeAreaView } from 'react-native'
import { AuthProvider } from './src/context/AuthContext'
import { NotificationProvider } from './src/context/NotificationContext'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <AppNavigator />
        </SafeAreaView>
      </NotificationProvider>
    </AuthProvider>
  )
}
