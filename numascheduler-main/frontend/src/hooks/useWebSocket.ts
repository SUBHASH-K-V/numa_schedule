import { useEffect, useState, useCallback } from 'react'
import { wsService } from '../services/websocket'
import type { WebSocketMessage } from '../types'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  useEffect(() => {
    const unsubConnection = wsService.on('connection', (data: any) => {
      setConnected(data.status === 'connected')
    })
    const unsubMessage = wsService.on('metrics_update', (data: WebSocketMessage) => {
      setLastMessage(data)
    })

    wsService.connect()

    return () => {
      unsubConnection()
      unsubMessage()
      wsService.disconnect()
    }
  }, [])

  const send = useCallback((data: string) => {
    wsService['ws']?.send(data)
  }, [])

  return { connected, lastMessage, send }
}
