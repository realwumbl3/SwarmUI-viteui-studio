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

    // For SwarmUI integration, we don't use WebSocket for queue status
    // Instead, we could poll GetCurrentStatus periodically if needed
    useEffect(() => {
        // WebSocket connection disabled for SwarmUI integration
        // Queue status could be polled from /API/GetCurrentStatus if needed
        console.log("QueueSocket: WebSocket connection disabled for SwarmUI compatibility")
        setIsConnected(false)

        // Optional: Poll queue status periodically
        // const pollQueueStatus = async () => {
        //     try {
        //         const response = await api.getQueueStatus()
        //         setStatus(response)
        //     } catch (error) {
        //         console.warn("Failed to poll queue status:", error)
        //     }
        // }
        // const interval = setInterval(pollQueueStatus, 5000)
        // return () => clearInterval(interval)
    }, [])

    return { status, isConnected }
}
