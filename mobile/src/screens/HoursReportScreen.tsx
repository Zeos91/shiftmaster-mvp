// @ts-nocheck
import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert, Linking } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE } from '../api/client'

export default function HoursReportScreen() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [role, setRole] = useState('')
  const [siteId, setSiteId] = useState('')

  const onExport = async () => {
    if (!startDate || !endDate) return Alert.alert('Validation', 'Start and end dates required')
    try {
      const token = await AsyncStorage.getItem('token')
      // Open PDF in browser with token as query param (server accepts token param)
      const url = `${API_BASE}/api/reports/hours/pdf?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}${role ? `&role=${encodeURIComponent(role)}` : ''}${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ''}${token ? `&token=${encodeURIComponent(token)}` : ''}`
      Linking.openURL(url)
    } catch (err) {
      console.error(err)
      Alert.alert('Failed', err.message)
    }
  }

  return (
    <View style={{flex:1, padding:12}}>
      <Text>Hours Report</Text>
      <TextInput placeholder="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} style={{borderWidth:1, padding:8, marginTop:8}} />
      <TextInput placeholder="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} style={{borderWidth:1, padding:8, marginTop:8}} />
      <TextInput placeholder="Role (optional)" value={role} onChangeText={setRole} style={{borderWidth:1, padding:8, marginTop:8}} />
      <TextInput placeholder="SiteId (optional)" value={siteId} onChangeText={setSiteId} style={{borderWidth:1, padding:8, marginTop:8}} />
      <Button title="Export PDF" onPress={onExport} />
    </View>
  )
}
