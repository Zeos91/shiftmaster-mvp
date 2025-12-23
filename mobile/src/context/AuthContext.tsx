// @ts-nocheck
import React, { createContext, useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import client from '../api/client'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const t = await AsyncStorage.getItem('token')
      const w = await AsyncStorage.getItem('worker')
      if (t) setToken(t)
      if (w) setWorker(JSON.parse(w))
      setLoading(false)
    })()
  }, [])

  const saveSession = async (t, w) => {
    setToken(t)
    setWorker(w)
    await AsyncStorage.setItem('token', t)
    await AsyncStorage.setItem('worker', JSON.stringify(w))
  }

  const login = async (credentials) => {
    const res = await client.post('/auth/login', credentials)
    const { token: t, worker: w } = res.data
    await saveSession(t, w)
    return res.data
  }

  const logout = async () => {
    setToken(null)
    setWorker(null)
    await AsyncStorage.removeItem('token')
    await AsyncStorage.removeItem('worker')
  }

  const refreshProfile = async () => {
    const res = await client.get('/auth/profile')
    setWorker(res.data)
    await AsyncStorage.setItem('worker', JSON.stringify(res.data))
    return res.data
  }

  return (
    <AuthContext.Provider value={{ worker, token, loading, login, logout, saveSession, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
