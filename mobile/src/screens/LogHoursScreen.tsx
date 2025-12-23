// @ts-nocheck
import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert } from 'react-native'
import client from '../api/client'

export default function LogHoursScreen({ route, navigation }) {
  const shiftId = route.params?.shiftId
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [loading, setLoading] = useState(false)

  const onSave = async () => {
    if (!start || !end) return Alert.alert('Validation', 'Please provide start and end times')
    setLoading(true)
    try {
      await client.post(`/shifts/${shiftId}/log-hours`, {
        actualStartTime: start,
        actualEndTime: end,
        breakMinutes: parseInt(breakMinutes || '0', 10)
      })
      navigation.goBack()
    } catch (err) {
      console.error(err)
      Alert.alert('Save failed', err?.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  return (
    <View style={{flex:1, padding:12}}>
      <Text>Log hours for shift</Text>
      <TextInput placeholder="Actual start (ISO)" value={start} onChangeText={setStart} style={{borderWidth:1, padding:8, marginTop:8}} />
      <TextInput placeholder="Actual end (ISO)" value={end} onChangeText={setEnd} style={{borderWidth:1, padding:8, marginTop:8}} />
      <TextInput placeholder="Break minutes" value={breakMinutes} onChangeText={setBreakMinutes} keyboardType="numeric" style={{borderWidth:1, padding:8, marginTop:8}} />
      <Button title={loading ? 'Saving...' : 'Save'} onPress={onSave} disabled={loading} />
    </View>
  )
}
