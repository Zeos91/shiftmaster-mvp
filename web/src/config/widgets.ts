export const WIDGET_REGISTRY = {
  'summary-cards': {
    id: 'summary-cards',
    title: 'Summary Cards',
    description: 'Overview metrics for shifts, workers, and activity',
    category: 'overview',
    defaultSize: { w: 12, h: 2 }
  },
  'shift-chart': {
    id: 'shift-chart',
    title: 'Shift Trends',
    description: 'Historical shift data and trends',
    category: 'analytics',
    defaultSize: { w: 8, h: 4 }
  },
  'worker-chart': {
    id: 'worker-chart',
    title: 'Worker Activity',
    description: 'Worker distribution and utilization',
    category: 'analytics',
    defaultSize: { w: 4, h: 4 }
  },
  'activity-feed': {
    id: 'activity-feed',
    title: 'Activity Feed',
    description: 'Recent system events and actions',
    category: 'monitoring',
    defaultSize: { w: 6, h: 5 }
  },
  'recent-shifts': {
    id: 'recent-shifts',
    title: 'Recent Shifts',
    description: 'Latest shift operations',
    category: 'operations',
    defaultSize: { w: 6, h: 5 }
  },
  'broadcast-metrics': {
    id: 'broadcast-metrics',
    title: 'Broadcast Metrics',
    description: 'Broadcast performance and application stats',
    category: 'analytics',
    defaultSize: { w: 6, h: 4 }
  },
  'performance-monitor': {
    id: 'performance-monitor',
    title: 'System Performance',
    description: 'SSE connections and performance metrics',
    category: 'monitoring',
    defaultSize: { w: 6, h: 3 }
  }
} as const

export type WidgetId = keyof typeof WIDGET_REGISTRY

export const WIDGET_CATEGORIES = {
  overview: 'Overview',
  analytics: 'Analytics',
  operations: 'Operations',
  monitoring: 'Monitoring'
} as const
