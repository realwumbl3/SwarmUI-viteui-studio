import React, { useState } from 'react'
import { Check, X, Play, Image as ImageIcon, Grid, List } from 'lucide-react'
import { useStudioStore } from '../stores/studioStore'
import { useWorkspace } from '../hooks/useWorkspace'

const AssetGallery = ({ className }) => {
  const { candidates, accepted, rejected } = useStudioStore()
  const { acceptCandidate, rejectCandidate } = useWorkspace()
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [filter, setFilter] = useState('all') // 'all', 'candidates', 'accepted', 'rejected'

  const getFilteredAssets = () => {
    switch (filter) {
      case 'candidates':
        return candidates
      case 'accepted':
        return accepted || []
      case 'rejected':
        return rejected || []
      default:
        return [...(candidates || []), ...(accepted || []), ...(rejected || [])]
    }
  }

  const renderAsset = (asset, type = 'candidate') => {
    const isVideo = asset.is_video ?? asset.IsVideo
    const file = asset.file ?? asset.File
    const mode = asset.mode ?? asset.Mode
    const executionMode = asset.execution_mode ?? asset.ExecutionMode

    const getStatusColor = () => {
      if (type === 'accepted') return 'border-green-500 bg-green-500/10'
      if (type === 'rejected') return 'border-red-500 bg-red-500/10'
      return 'border-studio-border'
    }

    const getStatusBadge = () => {
      if (type === 'accepted') return <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Accepted</span>
      if (type === 'rejected') return <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">Rejected</span>
      return null
    }

    if (viewMode === 'list') {
      return (
        <div key={asset.id ?? asset.Id} className={`studio-panel p-3 mb-2 ${getStatusColor()}`}>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 flex-shrink-0">
              {isVideo ? (
                <video
                  src={file}
                  className="w-full h-full object-cover rounded border border-studio-border"
                  muted
                />
              ) : (
                <img
                  src={file}
                  alt="Generated"
                  className="w-full h-full object-cover rounded border border-studio-border"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {getStatusBadge()}
                <span className="text-sm text-gray-400">
                  {mode} • {executionMode}
                </span>
              </div>
              <div className="text-sm truncate">
                {asset.prompt || 'Generated image'}
              </div>
            </div>

            {type === 'candidate' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => acceptCandidate(asset.id ?? asset.Id)}
                  className="p-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  title="Accept"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => rejectCandidate(asset.id ?? asset.Id)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded text-white"
                  title="Reject"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div key={asset.id ?? asset.Id} className={`studio-panel p-3 ${getStatusColor()}`}>
        <div className="mb-2 relative group">
          {isVideo ? (
            <video
              src={file}
              className="w-full h-32 object-cover rounded border border-studio-border"
              controls
            />
          ) : (
            <img
              src={file}
              alt="Generated"
              className="w-full h-32 object-cover rounded border border-studio-border"
            />
          )}

          {type === 'candidate' && (
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => acceptCandidate(asset.id ?? asset.Id)}
                className="p-1 bg-green-600 hover:bg-green-700 rounded text-white"
                title="Accept"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => rejectCandidate(asset.id ?? asset.Id)}
                className="p-1 bg-red-600 hover:bg-red-700 rounded text-white"
                title="Reject"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400 mb-1">
          {mode} • {executionMode}
        </div>

        {getStatusBadge()}
      </div>
    )
  }

  const filteredAssets = getFilteredAssets()

  return (
    <div className={`${className} bg-studio-panel p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <ImageIcon size={20} />
          <span>Generated Assets</span>
        </h2>

        <div className="flex items-center space-x-2">
          {/* Filter buttons */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'candidates', label: 'Pending' },
              { key: 'accepted', label: 'Accepted' },
              { key: 'rejected', label: 'Rejected' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === key
                    ? 'bg-studio-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-studio-accent' : 'hover:bg-gray-700'
              }`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' ? 'bg-studio-accent' : 'hover:bg-gray-700'
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No assets found</p>
          <p className="text-sm">
            {filter === 'all' ? 'Generate something to see results here' : `No ${filter} assets`}
          </p>
        </div>
      ) : (
        <div className={`overflow-y-auto max-h-full ${
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4'
            : 'space-y-2'
        }`}>
          {filteredAssets.map(asset => {
            const type = candidates.some(c => (c.id ?? c.Id) === (asset.id ?? asset.Id)) ? 'candidate' :
                        accepted?.some(a => (a.id ?? a.Id) === (asset.id ?? asset.Id)) ? 'accepted' : 'rejected'
            return renderAsset(asset, type)
          })}
        </div>
      )}
    </div>
  )
}

export default AssetGallery