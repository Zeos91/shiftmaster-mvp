// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import styles from '../styles'

export default function ShiftListScreen({ navigation }) {
  const { worker, refreshProfile } = useAuth()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const res = await client.get('/shifts')
      setShifts(res.data)
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShifts() }, [])

  const canEdit = (shift) => {
    if (!shift) return false
    if (worker.role !== 'OPERATOR') return true
    if (!shift.approved) return true
    return !!shift.overrideEdit
  }

  const canApprove = () => ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'].includes(worker.role)

  const onDelete = async (shiftId) => {
    try {
      await client.delete(`/shifts/${shiftId}`)
      await fetchShifts()
    } catch (err) {
      console.error(err)
      Alert.alert('Delete failed', err?.response?.data?.error || err.message)
    }
  }

  const onApprove = async (shiftId) => {
    try {
      await client.patch(`/shifts/${shiftId}/approve`)
      await fetchShifts()
    } catch (err) {
      console.error(err)
      Alert.alert('Approve failed', err?.response?.data?.error || err.message)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.site?.name} — {item.crane?.craneNumber}</Text>
      <Text>Operator: {item.operator?.name}</Text>
      <Text>Start: {new Date(item.startTime).toLocaleString()}</Text>
      <Text>End: {new Date(item.endTime).toLocaleString()}</Text>
      <Text>Hours: {item.hours}</Text>
      <Text>Approved: {item.approved ? `Yes by ${item.approvedBy?.name || item.approvedById}` : 'No'}</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {canEdit(item) && (
          <Button title="Edit" onPress={() => navigation.navigate('ShiftForm', { shift: item })} />
        )}
        <View style={{ width: 8 }} />
        {canEdit(item) && (
          <Button title="Delete" color="red" onPress={() => {
            Alert.alert('Confirm', 'Delete this shift?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) }
            ])
          }} />
        )}
        <View style={{ width: 8 }} />
        {canApprove() && !item.approved && (
          <Button title="Approve" onPress={() => onApprove(item.id)} />
        )}
        {user.role !== 'OPERATOR' && (
          <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => navigation.navigate('ShiftForm', { shift: item, managerToggle: true })}>
            <Text style={{ color: '#0066cc', padding: 8 }}>Manager Actions</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <Button title="New Shift" onPress={() => navigation.navigate('ShiftForm')} />
        <Button title="Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
      <FlatList data={shifts} keyExtractor={(i) => i.id} renderItem={renderItem} style={{ width: '100%', marginTop: 12 }} />
    </View>
  )
}
