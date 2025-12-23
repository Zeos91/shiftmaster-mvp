// @ts-nocheck
import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert } from 'react-native'
import client from '../api/client'
import styles from '../styles'

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async () => {
    try {
      await client.post('/auth/register', { name, email, phone, password })
      Alert.alert('Registered', 'Please verify OTP sent to your phone')
      navigation.navigate('OTPVerify', { phone })
    } catch (err) {
      console.error(err)
      Alert.alert('Registration failed', err?.response?.data?.error || err.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <Button title="Register" onPress={onSubmit} />
    </View>
  )
}
