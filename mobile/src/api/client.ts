import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Adjust API_BASE to point at your backend (no trailing /api)
export const API_BASE = 'https://upgraded-space-telegram-9j6wvxxxp42xvpj-3000.app.github.dev'

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' }
})

// Attach token automatically
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
