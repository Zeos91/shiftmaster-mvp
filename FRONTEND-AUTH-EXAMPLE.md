# ShiftMaster Frontend Authentication (React Native/Expo)

Complete example for implementing authentication flow in React Native with Expo.

## 1. Install Required Dependencies

```bash
cd mobile
npm install axios @react-native-async-storage/async-storage expo-secure-store
```

## 2. Create Auth Context (AuthContext.tsx)

```typescript
import React, { createContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'OPERATOR' | 'SITE_MANAGER' | 'PROJECT_MANAGER' | 'COMPANY_ADMIN'
  phoneVerified: boolean
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  register: (name: string, email: string, phone: string, password: string) => Promise<void>
  verifyOTP: (phone: string, code: string) => Promise<void>
  login: (email: string, phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resendOTP: (phone: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL = 'https://upgraded-space-telegram-9j6wvxxxp42xvpj-3000.app.github.dev' // Update for your backend

  // Initialize from secure storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync('auth_token')
        if (savedToken) {
          setToken(savedToken)
          // Optionally fetch user profile to validate token
        }
      } catch (err) {
        console.error('Failed to restore token', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        phone,
        password
      })

      // User created, now needs OTP verification
      // Frontend should navigate to OTP screen
      console.log('Registration successful. Please verify OTP.')
    } catch (error: any) {
      throw error.response?.data?.error || 'Registration failed'
    }
  }

  const verifyOTP = async (phone: string, code: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        phone,
        code
      })

      const { token: newToken, user: userData } = response.data

      // Store token securely
      await SecureStore.setItemAsync('auth_token', newToken)
      setToken(newToken)
      setUser(userData)
    } catch (error: any) {
      throw error.response?.data?.error || 'OTP verification failed'
    }
  }

  const login = async (email: string, phone: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: email || undefined,
        phone: phone || undefined,
        password
      })

      const { token: newToken, user: userData } = response.data

      // Store token securely
      await SecureStore.setItemAsync('auth_token', newToken)
      setToken(newToken)
      setUser(userData)
    } catch (error: any) {
      throw error.response?.data?.error || 'Login failed'
    }
  }

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token')
      setToken(null)
      setUser(null)
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  const resendOTP = async (phone: string) => {
    try {
      await axios.post(`${API_URL}/api/auth/resend-otp`, {
        phone
      })
      console.log('OTP resent successfully')
    } catch (error: any) {
      throw error.response?.data?.error || 'Failed to resend OTP'
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, register, verifyOTP, login, logout, resendOTP }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

## 3. API Client with Token Injection (api.ts)

```typescript
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_URL = 'https://upgraded-space-telegram-9j6wvxxxp42xvpj-3000.app.github.dev'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000
})

// Inject token into all requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default apiClient
```

## 4. Register Screen Component

```typescript
import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'

export const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }

    setLoading(true)
    try {
      await register(name, email, phone, password)
      Alert.alert('Success', 'User registered. Please verify your phone.')
      // Navigate to OTP verification screen
      navigation.navigate('VerifyOTP', { phone })
    } catch (error: any) {
      Alert.alert('Registration Error', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Phone (+1234567890)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 5 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'Registering...' : 'Register'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

## 5. OTP Verification Screen

```typescript
import React, { useState, useEffect } from 'react'
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'

export const VerifyOTPScreen = ({ route, navigation }: any) => {
  const { phone } = route.params
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const { verifyOTP, resendOTP } = useAuth()

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      await verifyOTP(phone, otp)
      Alert.alert('Success', 'Phone verified successfully!')
      navigation.navigate('Shifts') // Navigate to main app
    } catch (error: any) {
      Alert.alert('Verification Error', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      await resendOTP(phone)
      Alert.alert('Success', 'OTP resent to your phone')
      setResendTimer(60) // 60 second cooldown
    } catch (error: any) {
      Alert.alert('Error', error)
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        Enter the 6-digit code sent to {phone}
      </Text>
      <TextInput
        placeholder="000000"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, fontSize: 24, textAlign: 'center' }}
      />
      <TouchableOpacity
        onPress={handleVerifyOTP}
        disabled={loading}
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 5, marginBottom: 10 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleResendOTP}
        disabled={resendTimer > 0}
        style={{ opacity: resendTimer > 0 ? 0.5 : 1 }}
      >
        <Text style={{ textAlign: 'center', color: '#007AFF' }}>
          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

## 6. Login Screen Component

```typescript
import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async () => {
    if ((!email && !phone) || !password) {
      Alert.alert('Error', 'Please enter email/phone and password')
      return
    }

    setLoading(true)
    try {
      await login(email, phone, password)
      navigation.navigate('Shifts')
    } catch (error: any) {
      Alert.alert('Login Error', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Or Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 5, marginBottom: 10 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={{ textAlign: 'center', color: '#007AFF' }}>
          Don't have an account? Register here
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

## 7. Shift API Example with Auth

```typescript
import apiClient from '../api/api'

export const getShifts = async () => {
  const response = await apiClient.get('/api/shifts')
  return response.data
}

export const createShift = async (shiftData: {
  operatorId: string
  siteId: string
  craneId: string
  startTime: string
  endTime: string
  operatorRate: number
  siteRate: number
}) => {
  const response = await apiClient.post('/api/shifts', shiftData)
  return response.data
}

export const approveShift = async (shiftId: string) => {
  const response = await apiClient.patch(`/api/shifts/${shiftId}/approve`, {})
  return response.data
}

export const deleteShift = async (shiftId: string) => {
  const response = await apiClient.delete(`/api/shifts/${shiftId}`)
  return response.data
}
```

## 8. Updated App.tsx with Auth Navigation

```typescript
import React from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'

import RegisterScreen from './screens/RegisterScreen'
import LoginScreen from './screens/LoginScreen'
import VerifyOTPScreen from './screens/VerifyOTPScreen'
import ShiftsScreen from './screens/ShiftsScreen'

const Stack = createNativeStackNavigator()

const AuthNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
  </Stack.Navigator>
)

const AppNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Shifts" component={ShiftsScreen} />
  </Stack.Navigator>
)

const RootNavigator = () => {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <NavigationContainer>{token ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
```

## Key Points

1. **Secure Token Storage**: Use `expo-secure-store` for storing JWT tokens (not AsyncStorage)
2. **Token Injection**: Always add `Authorization: Bearer <token>` header to requests
3. **OTP Flow**: User registers → receives OTP via SMS → verifies OTP → gets JWT token
4. **Phone Verification Required**: Login only works after phone is verified
5. **Error Handling**: Show user-friendly error messages for all auth failures
6. **Token Refresh**: Consider implementing token refresh logic for 7-day expiry (future enhancement)
