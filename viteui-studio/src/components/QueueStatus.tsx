import { useQueueSocket } from "../hooks/useQueueSocket"
import { cn } from "../lib/utils"

export const QueueStatus = () => {
    const { status } = useQueueSocket()

    if (!status) return null
    if (!status.active && status.queue_len === 0) return null

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
            status.active ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-zinc-800 text-zinc-400"
        )}>
            {status.active && (
                <div className="flex items-center gap-1.5 max-w-[200px]">
                    <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="truncate" title={status.active.description}>
                        {status.active.description}
                    </span>
                </div>
            )}

            {status.queue_len > 0 && (
                <span className={cn(
                    "whitespace-nowrap",
                    status.active && "pl-1.5 border-l border-blue-500/20"
                )}>
                    Queue: {status.queue_len}
                </span>
            )}

            {/* Debug connection dot */}
            {/* <div className={cn("w-1 h-1 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} /> */}
        </div>
    )
}

export default QueueStatus
