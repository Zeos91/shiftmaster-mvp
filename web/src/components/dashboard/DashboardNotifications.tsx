'use client'

import { useEffect, useRef } from 'react'
import { toast, ToastContainer } from 'react-toastify'
import { useDashboardStream } from '@/hooks/useDashboardStream'
import { useAuth } from '@/context/AuthContext'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import 'react-toastify/dist/ReactToastify.css'

export default function DashboardNotifications() {
  const { user } = useAuth()
  const { status, isLive } = useDashboardStream({ enabled: true })
  const processedEvents = useRef(new Set<string>())

  // For now, we'll show a connection status notification
  useEffect(() => {
    if (isLive && status === 'connected') {
      toast.success('Real-time updates connected', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      })
    } else if (status === 'disconnected') {
      toast.warning('Real-time updates disconnected', {
        position: 'top-right',
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      })
    }
  }, [status, isLive])

  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  )
}
