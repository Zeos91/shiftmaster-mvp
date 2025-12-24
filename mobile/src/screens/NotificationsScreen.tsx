// @ts-nocheck
import React, { useContext, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch
} from 'react-native'
import { NotificationContext } from '../context/NotificationContext'

// Helper function to format time ago
const formatTimeAgo = (date): string => {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const NotificationsScreen = () => {
  const context = useContext(NotificationContext)
  const {
    notifications = [],
    unreadCount = 0,
    loading = false,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = context || {}

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications?.(unreadOnly)
    setRefreshing(false)
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead?.(id)
  }

  const filteredNotifications = unreadOnly
    ? notifications.filter(n => !n.isRead)
    : notifications

  const getNotificationColor = (type): string => {
    switch (type) {
      case 'shift_broadcast':
        return '#3B82F6' // blue
      case 'application_received':
        return '#8B5CF6' // purple
      case 'application_selected':
        return '#10B981' // green
      case 'application_rejected':
        return '#EF4444' // red
      case 'hours_submitted':
        return '#F59E0B' // amber
      case 'hours_approved':
        return '#10B981' // green
      case 'shift_reminder':
        return '#6366F1' // indigo
      default:
        return '#6B7280' // gray
    }
  }

  const getNotificationIcon = (type): string => {
    switch (type) {
      case 'shift_broadcast':
        return '📢'
      case 'application_received':
        return '📝'
      case 'application_selected':
        return '✅'
      case 'application_rejected':
        return '❌'
      case 'hours_submitted':
        return '⏱️'
      case 'hours_approved':
        return '✔️'
      case 'shift_reminder':
        return '⏰'
      default:
        return '📩'
    }
  }

  const renderNotificationCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        !item.isRead && { backgroundColor: '#F0F9FF' }
      ]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                !item.isRead && styles.titleUnread
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: getNotificationColor(item.type) }
                ]}
              />
            )}
          </View>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header with mark all as read */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadLabel}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={() => markAllAsRead?.()}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter toggle */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Unread only</Text>
        <Switch
          value={unreadOnly}
          onValueChange={setUnreadOnly}
          trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
          thumbColor={unreadOnly ? '#3B82F6' : '#F3F4F6'}
        />
      </View>

      {/* Notifications list */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3B82F6"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            You'll see notifications when shifts are broadcast, you apply, and more
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937'
  },
  unreadLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6'
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151'
  },
  listContent: {
    padding: 8
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardContent: {
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  icon: {
    fontSize: 20,
    marginRight: 10
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1
  },
  titleUnread: {
    fontWeight: '700',
    color: '#1F2937'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 6
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18
  }
})

export default NotificationsScreen
