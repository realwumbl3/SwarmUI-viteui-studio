import React, { useState, useEffect } from 'react'
import Header from './Header'
import ControllerPanel from './ControllerPanel'
import AssetGallery from './AssetGallery'
import { useStudioStore } from '../stores/studioStore'
import { useWorkspace } from '../hooks/useWorkspace'

const Studio = () => {
  const [controllerOpen, setControllerOpen] = useState(true)
  const [galleryOpen, setGalleryOpen] = useState(true)

  const { initializeWorkspace } = useWorkspace()
  const { workspaceId, status } = useStudioStore()

  useEffect(() => {
    initializeWorkspace()
  }, [initializeWorkspace])

  return (
    <div className="h-screen bg-studio-bg text-studio-text flex flex-col">
      <Header
        onToggleController={() => setControllerOpen(!controllerOpen)}
        onToggleGallery={() => setGalleryOpen(!galleryOpen)}
        controllerOpen={controllerOpen}
        galleryOpen={galleryOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {controllerOpen && (
          <ControllerPanel className="w-96 border-r border-studio-border" />
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-8xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold mb-2">ViteUI Studio</h2>
              <p className="text-lg">Configure your generation parameters and create amazing AI art</p>
              <div className="mt-6 text-sm">
                <p>Workspace: {workspaceId || 'Loading...'}</p>
              </div>
            </div>
          </div>

          {galleryOpen && (
            <AssetGallery className="h-80 border-t border-studio-border" />
          )}
        </div>
      </div>

      {status && (
        <div className="fixed bottom-4 right-4 bg-studio-panel border border-studio-border rounded-lg p-4 shadow-lg max-w-sm">
          <div className="text-sm">{status}</div>
        </div>
      )}
    </div>
  )
}

export default Studio