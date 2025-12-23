// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import client from '../api/client'

export default function MyApplicationsScreen() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await client.get('/shifts/applications/my')
      setApps(res.data)
    } catch (err) {
      console.error('Failed to load applications', err)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const renderItem = ({ item }) => {
    const status = item.status
    const shift = item.shift
    return (
      <View style={styles.card}>
        <Text style={styles.date}>{shift.date}</Text>
        <Text style={styles.site}>{shift.site?.name || 'Site'}</Text>
        <Text>{shift.roleRequired} · {shift.hours}h</Text>
        <Text>Status: {status}</Text>
      </View>
    )
  }

  if (loading) return <ActivityIndicator style={{flex:1}} />

  return (
    <View style={{flex:1, padding:12}}>
      <FlatList data={apps} keyExtractor={(i) => i.id} renderItem={renderItem} ListEmptyComponent={() => <Text>No applications</Text>} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  date: { fontWeight: '600' },
  site: { fontSize: 16, marginBottom: 4 }
})
