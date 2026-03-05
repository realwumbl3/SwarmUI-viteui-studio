import React from 'react'
import { Palette, Image, Video, Settings, Zap } from 'lucide-react'

const Sidebar = ({ className }) => {
  const nodeTypes = [
    { id: 'textPrompt', label: 'Text Prompt', icon: '📝', category: 'input' },
    { id: 'imageInput', label: 'Image Input', icon: '🖼️', category: 'input' },
    { id: 'modelSelect', label: 'Model', icon: '🤖', category: 'model' },
    { id: 'sampler', label: 'Sampler', icon: '🎯', category: 'generation' },
    { id: 'scheduler', label: 'Scheduler', icon: '⏰', category: 'generation' },
    { id: 'dimensions', label: 'Dimensions', icon: '📐', category: 'output' },
    { id: 'output', label: 'Output', icon: '📤', category: 'output' },
  ]

  const categories = [
    { id: 'input', label: 'Input', icon: '📥' },
    { id: 'model', label: 'Model', icon: '🤖' },
    { id: 'generation', label: 'Generation', icon: '⚡' },
    { id: 'output', label: 'Output', icon: '📤' },
  ]

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className={`${className} bg-studio-panel p-4 overflow-y-auto`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Palette size={20} />
          <span>Node Palette</span>
        </h2>

        <div className="space-y-4">
          {categories.map(category => (
            <div key={category.id}>
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center space-x-2">
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </h3>
              <div className="space-y-1">
                {nodeTypes
                  .filter(node => node.category === category.id)
                  .map(node => (
                    <div
                      key={node.id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700 cursor-move border border-transparent hover:border-studio-accent transition-colors"
                      draggable
                      onDragStart={(event) => onDragStart(event, node.id)}
                    >
                      <span className="text-lg">{node.icon}</span>
                      <span className="text-sm">{node.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-studio-border pt-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Zap size={20} />
          <span>Quick Actions</span>
        </h2>

        <div className="space-y-2">
          <button className="w-full studio-button-secondary text-left">
            Load Template
          </button>
          <button className="w-full studio-button-secondary text-left">
            Save Workflow
          </button>
          <button className="w-full studio-button-secondary text-left">
            Clear Canvas
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar