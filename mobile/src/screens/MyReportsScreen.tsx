// @ts-nocheck
import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert, FlatList, Share, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import client, { API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MyReportsScreen() {
  const { token } = useAuth()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [siteId, setSiteId] = useState('')
  const [includePending, setIncludePending] = useState(false)
  const [shifts, setShifts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadReport = async () => {
    if (!startDate || !endDate) return Alert.alert('Validation', 'Please provide start and end dates (YYYY-MM-DD)')
    setLoading(true)
    try {
      const res = await client.get('/reports/my-shifts', {
        params: { startDate, endDate, siteId: siteId || undefined, includePending }
      })
      setShifts(res.data.shifts || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      Alert.alert('Load failed', err?.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  const exportPdf = async () => {
    if (!startDate || !endDate) return Alert.alert('Validation', 'Please load a report first')
    try {
      const pdfUrl = `${API_BASE}/api/reports/export/pdf?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ''}${includePending ? '&includePending=true' : ''}${token ? `&token=${encodeURIComponent(token)}` : ''}`
      // Open URL to trigger download
      await Share.share({
        url: pdfUrl,
        title: 'Shift Report',
        message: `My shift report from ${startDate} to ${endDate}`
      })
    } catch (err) {
      console.error(err)
    }
  }

  const shareViaWhatsApp = async () => {
    if (!startDate || !endDate) return Alert.alert('Validation', 'Please load a report first')
    try {
      const msg = `I'm sharing my shift report for ${startDate} to ${endDate}. Total hours: ${total.toFixed(2)}. Download: ${API_BASE}/api/reports/export/pdf?startDate=${startDate}&endDate=${endDate}${token ? `&token=${token}` : ''}`
      await Share.share({
        message: msg,
        title: 'Shift Report'
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: '600', marginBottom: 12 }}>My Shift Reports</Text>

      <TextInput
        placeholder="Start date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="End date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Site ID (optional)"
        value={siteId}
        onChangeText={setSiteId}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />

      <Button title={loading ? 'Loading...' : 'Load Report'} onPress={loadReport} disabled={loading} />

      {shifts.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text>Total hours: {total.toFixed(2)}</Text>
          <Button title="Export PDF" onPress={exportPdf} />
          <View style={{ marginTop: 8 }}>
            <Button title="Share via WhatsApp" onPress={shareViaWhatsApp} />
          </View>

          <FlatList
            data={shifts}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <View style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee', marginTop: 8 }}>
                <Text style={{ fontWeight: '600' }}>{item.date}</Text>
                <Text>{item.site?.name || 'Site'} - {item.roleRequired}</Text>
                <Text>{item.totalHours ? Number(item.totalHours).toFixed(2) : Number(item.hours).toFixed(2)}h</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  )
}
