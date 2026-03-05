import React from 'react'
import { useStudioStore } from '../stores/studioStore'

const PropertiesPanel = ({ className }) => {
  const { selectedNode } = useStudioStore()

  if (!selectedNode) {
    return (
      <div className={`${className} bg-studio-panel p-4`}>
        <h2 className="text-lg font-semibold mb-4">Properties</h2>
        <div className="text-gray-400 text-sm">
          Select a node to view its properties
        </div>
      </div>
    )
  }

  const renderNodeProperties = (node) => {
    switch (node.type) {
      case 'textPrompt':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prompt</label>
              <textarea
                value={node.data.prompt || ''}
                onChange={(e) => node.data.onChange?.({ ...node.data, prompt: e.target.value })}
                className="studio-input w-full resize-none"
                rows={6}
                placeholder="Enter your prompt..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Negative Prompt</label>
              <textarea
                value={node.data.negativePrompt || ''}
                onChange={(e) => node.data.onChange?.({ ...node.data, negativePrompt: e.target.value })}
                className="studio-input w-full resize-none"
                rows={3}
                placeholder="Enter negative prompt..."
              />
            </div>
          </div>
        )

      case 'modelSelect':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <select
                value={node.data.model || ''}
                onChange={(e) => node.data.onChange?.({ ...node.data, model: e.target.value })}
                className="studio-input w-full"
              >
                <option value="">Select a model...</option>
                <option value="flux-dev">Flux Dev</option>
                <option value="flux-schnell">Flux Schnell</option>
                <option value="sdxl-1.0">SDXL 1.0</option>
              </select>
            </div>
          </div>
        )

      case 'dimensions':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Width</label>
                <input
                  type="number"
                  value={node.data.width || 1024}
                  onChange={(e) => node.data.onChange?.({ ...node.data, width: parseInt(e.target.value) })}
                  className="studio-input w-full"
                  min="64"
                  max="4096"
                  step="64"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Height</label>
                <input
                  type="number"
                  value={node.data.height || 1024}
                  onChange={(e) => node.data.onChange?.({ ...node.data, height: parseInt(e.target.value) })}
                  className="studio-input w-full"
                  min="64"
                  max="4096"
                  step="64"
                />
              </div>
            </div>
          </div>
        )

      case 'sampler':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sampler</label>
              <select
                value={node.data.sampler || 'euler'}
                onChange={(e) => node.data.onChange?.({ ...node.data, sampler: e.target.value })}
                className="studio-input w-full"
              >
                <option value="euler">Euler</option>
                <option value="euler_a">Euler A</option>
                <option value="dpm++_2m">DPM++ 2M</option>
                <option value="ddim">DDIM</option>
              </select>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-gray-400 text-sm">
            No properties available for this node type
          </div>
        )
    }
  }

  return (
    <div className={`${className} bg-studio-panel p-4 overflow-y-auto`}>
      <h2 className="text-lg font-semibold mb-4">Properties</h2>

      <div className="mb-4">
        <h3 className="text-md font-medium mb-2 capitalize">
          {selectedNode.type.replace(/([A-Z])/g, ' $1').trim()}
        </h3>
        <div className="text-xs text-gray-400">
          Node ID: {selectedNode.id}
        </div>
      </div>

      {renderNodeProperties(selectedNode)}
    </div>
  )
}

export default PropertiesPanel