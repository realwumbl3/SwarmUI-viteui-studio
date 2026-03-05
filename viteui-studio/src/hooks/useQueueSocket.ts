import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../lib/utils'
import { WebSocketMessage } from './useWebSocketProgress'

export interface QueueStatus {
    active: {
        id: string
        type: string
        description: string
    } | null
    pending: Array<{
        id: string
        type: string
        description: string
        created_at: number
    }>
    queue_len: number
}

// We use the system channel for global status updates
const SYSTEM_CHANNEL_ID = "system"

export const useQueueSocket = () => {
    const [status, setStatus] = useState<QueueStatus | null>({
        active: null,
        pending: [],
        queue_len: 0
    })
    const [isConnected, setIsConnected] = useState(false)

    // TODO: Implement WebSocket connection for SwarmUI
    // For now, return default status to prevent errors
    useEffect(() => {
        // WebSocket connection disabled for SwarmUI integration
        // The ViteUI studio expects a different WebSocket API than SwarmUI provides
        console.log("QueueSocket: WebSocket connection disabled for SwarmUI compatibility")
        setIsConnected(false)
    }, [])

    return { status, isConnected }
}
