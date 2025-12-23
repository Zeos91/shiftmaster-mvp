// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Button, Alert } from 'react-native'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import styles from '../styles'

export default function ShiftFormScreen({ route, navigation }) {
  const { worker } = useAuth()
  const shift = route.params?.shift || null
  const managerToggle = route.params?.managerToggle

  const [workerId, setWorkerId] = useState(shift?.workerId || worker?.id)
  const [siteId, setSiteId] = useState(shift?.siteId || '')
  const [roleRequired, setRoleRequired] = useState(shift?.roleRequired || 'crane_operator')
  const [equipmentId, setEquipmentId] = useState(shift?.equipmentId || '')
  const [state, setState] = useState(shift?.state || 'assigned')
  const [startTime, setStartTime] = useState(shift?.startTime || '')
  const [endTime, setEndTime] = useState(shift?.endTime || '')
  const [date, setDate] = useState(shift?.date || '')
  const [hours, setHours] = useState(shift?.hours?.toString() || '')
  const [overrideEdit, setOverrideEdit] = useState(shift?.overrideEdit || false)

  useEffect(() => {
    if (!shift) return
  }, [shift])

  const onSubmit = async () => {
    // basic validation
    if (!workerId || !siteId || !roleRequired || !startTime || !endTime) {
      return Alert.alert('Validation', 'Please fill required fields')
    }

    try {
      const payload = {
        workerId,
        siteId,
        roleRequired,
        equipmentId: equipmentId || undefined,
        state,
        startTime,
        endTime,
        date: date || undefined,
        hours: parseFloat(hours || '0')
      }

      if (shift) {
        await client.patch(`/shifts/${shift.id}`, payload)
      } else {
        await client.post('/shifts', payload)
      }

      // If manager toggling overrideEdit, call special endpoint
      if (managerToggle && shift) {
        await client.patch(`/shifts/${shift.id}/override-edit`, { overrideEdit })
      }

      navigation.goBack()
    } catch (err) {
      console.error(err)
      Alert.alert('Save failed', err?.response?.data?.error || err.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{shift ? 'Edit Shift' : 'New Shift'}</Text>
      <TextInput placeholder="WorkerId" value={workerId} onChangeText={setWorkerId} style={styles.input} />
      <TextInput placeholder="SiteId" value={siteId} onChangeText={setSiteId} style={styles.input} />
      <TextInput placeholder="Role Required" value={roleRequired} onChangeText={setRoleRequired} style={styles.input} />
      <TextInput placeholder="Equipment ID (optional)" value={equipmentId} onChangeText={setEquipmentId} style={styles.input} />
      <TextInput placeholder="Shift State" value={state} onChangeText={setState} style={styles.input} />
      <TextInput placeholder="StartTime (ISO)" value={startTime} onChangeText={setStartTime} style={styles.input} />
      <TextInput placeholder="EndTime (ISO)" value={endTime} onChangeText={setEndTime} style={styles.input} />
      <TextInput placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} style={styles.input} />
      <TextInput placeholder="Hours" value={hours} onChangeText={setHours} keyboardType="numeric" style={styles.input} />

      {managerToggle && (
        <View style={{ marginVertical: 8 }}>
          <Text>Allow worker edits after approval</Text>
          <Button title={overrideEdit ? 'Disable overrideEdit' : 'Enable overrideEdit'} onPress={() => setOverrideEdit(!overrideEdit)} />
        </View>
      )}

      <Button title="Save" onPress={onSubmit} />
    </View>
  )
}
