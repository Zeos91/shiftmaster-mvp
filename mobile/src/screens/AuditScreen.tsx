// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, ActivityIndicator } from 'react-native'
import client from '../api/client'

export default function AuditScreen({ route }) {
  const { shiftId } = route.params
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await client.get(`/shifts/${shiftId}/audit`)
        setLogs(res.data.logs || [])
      } catch (err) {
        console.error('Failed to load audit', err)
      } finally { setLoading(false) }
    })()
  }, [shiftId])

  if (loading) return <ActivityIndicator style={{flex:1}} />

  return (
    <View style={{flex:1, padding:12}}>
      <FlatList
        data={logs}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '600' }}>{item.action}</Text>
            <Text>By: {item.actor?.name || item.actor?.email || item.actorId}</Text>
            <Text>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text>{JSON.stringify(item.payload)}</Text>
          </View>
        )}
        ListEmptyComponent={() => <Text>No audit logs</Text>}
      />
    </View>
  )
}
