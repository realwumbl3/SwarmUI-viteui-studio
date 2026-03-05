import React from 'react'
import { Settings, Image, Play, Square, RotateCcw, Sliders } from 'lucide-react'
import { useStudioStore } from '../stores/studioStore'
import { useWorkspace } from '../hooks/useWorkspace'

const Header = ({
  onToggleController,
  onToggleGallery,
  controllerOpen,
  galleryOpen
}) => {
  const { workspaceId, status } = useStudioStore()
  const { generate, initializeWorkspace } = useWorkspace()

  const handleGenerate = () => {
    generate('comfy_controller')
  }

  const handleRefresh = () => {
    initializeWorkspace()
  }

  const handleClose = () => {
    window.parent?.postMessage({ type: "swarm_viteui_close" }, "*")
  }

  return (
    <header className="bg-studio-panel border-b border-studio-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-studio-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">ViteUI Studio</h1>
            <span className="text-xs text-gray-400">
              {workspaceId ? `Workspace: ${workspaceId}` : 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={handleRefresh}
          className="studio-button-secondary flex items-center space-x-2"
          title="Refresh Workspace"
        >
          <RotateCcw size={16} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          onClick={handleGenerate}
          className="studio-button flex items-center space-x-2"
          disabled={status?.includes('Generating')}
          title="Generate with ComfyUI"
        >
          <Play size={16} />
          <span>{status?.includes('Generating') ? 'Generating...' : 'Generate'}</span>
        </button>

        <div className="h-6 w-px bg-studio-border"></div>

        <button
          onClick={onToggleController}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${controllerOpen ? 'bg-gray-700' : ''}`}
          title="Toggle Controller Panel"
        >
          <Sliders size={20} />
        </button>

        <button
          onClick={onToggleGallery}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${galleryOpen ? 'bg-gray-700' : ''}`}
          title="Toggle Asset Gallery"
        >
          <Image size={20} />
        </button>

        <button
          onClick={handleClose}
          className="p-2 rounded hover:bg-red-700 hover:bg-red-600 transition-colors text-red-400 hover:text-white"
          title="Close Studio"
        >
          <Square size={20} />
        </button>
      </div>
    </header>
  )
}

export default Header