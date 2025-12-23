// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MyShiftsScreen({ navigation }) {
  const { worker } = useAuth()
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

  const onApprove = async (shiftId) => {
    try {
      await client.post(`/shifts/${shiftId}/approve`)
      load()
    } catch (err) {
      Alert.alert('Approve failed', err?.response?.data?.error || err.message)
    }
  }

  const renderItem = ({ item }) => {
    const isManager = worker?.role === 'SITE_MANAGER' || worker?.roles?.includes('safety_officer')
    const canLog = item.workerId === worker?.id && !item.locked
    const statusText = item.locked ? 'Approved (locked)' : item.state === 'pending_approval' ? 'Pending Approval' : item.actualStartTime ? 'Logged (editable)' : 'Assigned'

    return (
      <View style={styles.card}>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.site}>{item.site?.name || 'Site'}</Text>
        <Text>{item.roleRequired} · {item.hours}h</Text>
        {item.equipmentId ? <Text>Equipment: {item.equipmentId}</Text> : null}
        <Text style={{ marginTop: 6 }}>{statusText}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {canLog && (
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('LogHours', { shiftId: item.id })}>
              <Text style={{ color: 'white' }}>Log Hours</Text>
            </TouchableOpacity>
          )}
          {isManager && !item.locked && (
            <TouchableOpacity style={[styles.button, { marginLeft: 8 }]} onPress={() => onApprove(item.id)}>
              <Text style={{ color: 'white' }}>Approve</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.smallButton, { marginLeft: 8 }]} onPress={() => navigation.navigate('Audit', { shiftId: item.id })}>
            <Text style={styles.smallButtonText}>Audit</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

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
