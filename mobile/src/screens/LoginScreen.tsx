// @ts-nocheck
import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native'
import { useAuth } from '../context/AuthContext'
import styles from '../styles'

export default function LoginScreen({ navigation }) {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('') // email or phone
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setLoading(true)
    try {
      const creds = identifier.includes('@') ? { email: identifier, password } : { phone: identifier, password }
      await login(creds)
    } catch (err) {
      console.error(err)
      Alert.alert('Login failed', err?.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <TextInput placeholder="Email or Phone" value={identifier} onChangeText={setIdentifier} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      {loading ? <ActivityIndicator /> : <Button title="Sign In" onPress={onSubmit} />}
      <View style={{ marginTop: 12 }}>
        <Button title="Register" onPress={() => navigation.navigate('Register')} />
      </View>
    </View>
  )
}
