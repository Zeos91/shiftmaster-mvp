// @ts-nocheck
import React from 'react'
import { View, Text, Button, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'
import styles from '../styles'

export default function ProfileScreen() {
  const { worker, logout, refreshProfile } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text>Name: {worker?.name}</Text>
      <Text>Email: {worker?.email}</Text>
      <Text>Phone: {worker?.phone}</Text>
      <Text>Role: {worker?.role}</Text>
      <Text>Job Roles: {worker?.roles?.join(', ')}</Text>
      <Text>Certifications: {worker?.certifications?.join(', ') || 'None'}</Text>
      <Text>Available: {worker?.availabilityStatus ? 'Yes' : 'No'}</Text>
      <View style={{ marginTop: 12 }}>
        <Button title="Refresh" onPress={refreshProfile} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Button title="Sign Out" color="red" onPress={() => logout()} />
      </View>
    </View>
  )
}
