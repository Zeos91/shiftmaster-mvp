import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WidgetLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

interface WidgetState {
  layouts: WidgetLayout[]
  setLayouts: (layouts: WidgetLayout[]) => void
  resetLayouts: () => void
  enabledWidgets: string[]
  toggleWidget: (widgetId: string) => void
}

const defaultLayouts: WidgetLayout[] = [
  { i: 'summary-cards', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
  { i: 'shift-chart', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
  { i: 'worker-chart', x: 8, y: 2, w: 4, h: 4, minW: 4, minH: 3 },
  { i: 'activity-feed', x: 0, y: 6, w: 6, h: 5, minW: 4, minH: 4 },
  { i: 'recent-shifts', x: 6, y: 6, w: 6, h: 5, minW: 4, minH: 4 },
  { i: 'broadcast-metrics', x: 0, y: 11, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'performance-monitor', x: 6, y: 11, w: 6, h: 4, minW: 4, minH: 3 }
]

const defaultEnabledWidgets = defaultLayouts.map(l => l.i)

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set) => ({
      layouts: defaultLayouts,
      setLayouts: (layouts) => set({ layouts }),
      resetLayouts: () => set({ layouts: defaultLayouts }),
      enabledWidgets: defaultEnabledWidgets,
      toggleWidget: (widgetId) =>
        set((state) => ({
          enabledWidgets: state.enabledWidgets.includes(widgetId)
            ? state.enabledWidgets.filter((id) => id !== widgetId)
            : [...state.enabledWidgets, widgetId]
        }))
    }),
    {
      name: 'widget-layout-storage'
    }
  )
)
