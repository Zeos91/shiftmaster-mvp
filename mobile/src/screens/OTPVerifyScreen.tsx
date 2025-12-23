// @ts-nocheck
import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert } from 'react-native'
import client from '../api/client'
import styles from '../styles'

export default function OTPVerifyScreen({ route, navigation }) {
  const phoneFromRoute = route.params?.phone
  const [phone, setPhone] = useState(phoneFromRoute || '')
  const [code, setCode] = useState('')

  const onVerify = async () => {
    try {
      const res = await client.post('/auth/verify-otp', { phone, code })
      Alert.alert('Verified', 'Phone verified and logged in')
      // token saved by AuthContext on login; but verify returns token — store manually
      // navigate back to login or main screen
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
    } catch (err) {
      console.error(err)
      Alert.alert('Verification failed', err?.response?.data?.error || err.message)
    }
  }

  const onResend = async () => {
    try {
      await client.post('/auth/resend-otp', { phone })
      Alert.alert('Sent', 'OTP resent')
    } catch (err) {
      console.error(err)
      Alert.alert('Failed', err?.response?.data?.error || err.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Phone</Text>
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput placeholder="OTP Code" value={code} onChangeText={setCode} style={styles.input} />
      <Button title="Verify" onPress={onVerify} />
      <View style={{ marginTop: 8 }}>
        <Button title="Resend OTP" onPress={onResend} />
      </View>
    </View>
  )
}
