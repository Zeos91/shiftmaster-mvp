// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import client from '../api/client'

export default function MyShiftsScreen() {
  const [data, setData] = useState({ assigned: [], pending_approval: [], completed: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming'|'pending'|'completed'>('upcoming')

  const load = async () => {
    setLoading(true)
    try {
      const res = await client.get('/shifts/my')
      setData(res.data)
    } catch (err) {
      console.error('Failed to load my shifts', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const listForTab = () => {
    if (tab === 'upcoming') return data.assigned
    if (tab === 'pending') return data.pending_approval
    return data.completed
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.site}>{item.site?.name || 'Site'}</Text>
      <Text>{item.roleRequired} · {item.hours}h</Text>
      {item.equipmentId ? <Text>Equipment: {item.equipmentId}</Text> : null}
      {item.state === 'pending_approval' ? <Text style={{color:'#b59'}}>[Pending approval]</Text> : null}
    </View>
  )

  if (loading) return <ActivityIndicator style={{flex:1}} />

  return (
    <View style={{flex:1, padding:12}}>
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('upcoming')} style={[styles.tab, tab==='upcoming' && styles.tabActive]}>
          <Text>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('pending')} style={[styles.tab, tab==='pending' && styles.tabActive]}>
          <Text>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('completed')} style={[styles.tab, tab==='completed' && styles.tabActive]}>
          <Text>Completed</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listForTab()}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={() => <Text style={{padding:12}}>No shifts</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginBottom: 12 },
  tab: { padding: 8, borderRadius: 6, marginRight: 8, borderWidth:1, borderColor:'#ddd' },
  tabActive: { backgroundColor:'#eef' },
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  date: { fontWeight: '600' },
  site: { fontSize: 16, marginBottom: 4 }
})
