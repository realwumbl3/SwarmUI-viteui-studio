import { X, Check } from 'lucide-react'
import { useState } from 'react'
import api from '../Api'
import { withAuthTokenQuery } from '../lib/auth'
import { API_BASE_URL } from '../lib/utils'

interface PasteImageDialogProps {
  imageSrc: string
  workspaceId: string
  onClose: () => void
  onCommit: (newCommitPath: string) => void
}

const PasteImageDialog = ({
  imageSrc,
  workspaceId,
  onClose,
  onCommit
}: PasteImageDialogProps) => {
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCommit = async () => {
    setIsCommitting(true)
    setError(null)
    try {
      // 1. Import the image to the workspace candidates
      const importResult = await api.importWorkspaceImage(workspaceId, imageSrc)
      if (!importResult.success) {
        throw new Error('Failed to import image')
      }

      // Extract genid from the image path (e.g., "candidates/genid/full.webp")
      const pathParts = importResult.image_path.split('/')
      const genid = pathParts.length >= 2 ? pathParts[1] : null
      
      if (!genid) {
        throw new Error('Could not determine generation ID')
      }

      // 2. Commit the imported image
      const commitResult = await api.commitWorkspaceImage(workspaceId, `candidates/${genid}/full.webp`)
      if (!commitResult.success) {
        throw new Error('Failed to commit image')
      }

      // 3. Callback with the new commit path
      onCommit(`commits/${genid}/full.webp`)
      onClose()
    } catch (err) {
      console.error('Error committing pasted image:', err)
      setError(err instanceof Error ? err.message : 'Failed to create commit from pasted image')
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-panel border border-studio-border rounded-lg shadow-studio-lg w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-studio-border">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-studio-text">Paste New Image</h2>
          </div>
          <button
            onClick={onClose}
            className="text-studio-textSecondary hover:text-studio-text p-1 rounded transition-colors"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4 overflow-hidden">
          <div className="relative aspect-auto max-h-[60vh] flex items-center justify-center bg-black/20 rounded border border-studio-border overflow-hidden">
            <img 
              src={imageSrc} 
              alt="Pasted content" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded">
              {error}
            </div>
          )}

          <div className="text-studio-textSecondary text-sm">
            Create a new commit from the pasted image in workspace <strong>{workspaceId}</strong>.
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 p-4 border-t border-studio-border bg-black/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-studio-textSecondary hover:text-studio-text border border-studio-border rounded-md hover:bg-studio-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={isCommitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-studio-accent text-white rounded-md hover:bg-studio-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCommitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <Check size={16} />
                Create Commit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasteImageDialog
