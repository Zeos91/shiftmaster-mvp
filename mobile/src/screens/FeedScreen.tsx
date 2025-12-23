// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import client from '../api/client'

export default function FeedScreen({ navigation }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [appliedIds, setAppliedIds] = useState(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const res = await client.get('/shifts/feed')
      setShifts(res.data)
    } catch (err) {
      console.error('Failed to load feed', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const apply = async (shiftId) => {
    try {
      await client.post(`/shifts/${shiftId}/apply`)
      const next = new Set(appliedIds)
      next.add(shiftId)
      setAppliedIds(next)
    } catch (err) {
      console.error('Apply failed', err)
    }
  }

  const renderItem = ({ item }) => {
    const date = item.date
    const role = item.roleRequired
    const site = item.site?.name || 'Unknown site'
    const hours = item.hours
    const equipment = item.equipmentId
    const applied = appliedIds.has(item.id)

    return (
      <View style={styles.card}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.site}>{site}</Text>
        <Text>{role} · {hours}h</Text>
        {equipment ? <Text>Equipment: {equipment}</Text> : null}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, applied ? styles.buttonDisabled : styles.buttonPrimary]}
            onPress={() => apply(item.id)}
            disabled={applied}
          >
            <Text style={styles.buttonText}>{applied ? 'Applied' : 'Apply'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => navigation.navigate('ShiftForm', { shiftId: item.id })}>
            <Text style={styles.smallButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) return <ActivityIndicator style={{flex:1}} />

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={shifts}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={() => <Text>No shifts in feed</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  date: { fontWeight: '600' },
  site: { fontSize: 16, marginBottom: 4 },
  row: { flexDirection: 'row', marginTop: 8 },
  button: { padding: 8, borderRadius: 6 },
  buttonPrimary: { backgroundColor: '#0a84ff' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white' },
  smallButton: { marginLeft: 8, padding: 8 },
  smallButtonText: { color: '#0a84ff' }
})
