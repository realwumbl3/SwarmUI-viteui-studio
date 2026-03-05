import React, { useCallback, useState } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'react-flow-renderer'
import { useStudioStore } from '../stores/studioStore'

import TextPromptNode from './nodes/TextPromptNode'
import ImageInputNode from './nodes/ImageInputNode'
import ModelNode from './nodes/ModelNode'
import SamplerNode from './nodes/SamplerNode'
import SchedulerNode from './nodes/SchedulerNode'
import DimensionsNode from './nodes/DimensionsNode'
import OutputNode from './nodes/OutputNode'

import 'react-flow-renderer/dist/style.css'

const nodeTypes = {
  textPrompt: TextPromptNode,
  imageInput: ImageInputNode,
  modelSelect: ModelNode,
  sampler: SamplerNode,
  scheduler: SchedulerNode,
  dimensions: DimensionsNode,
  output: OutputNode,
}

const Canvas = ({ className }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { setSelectedNode } = useStudioStore()

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node)
  }, [setSelectedNode])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const reactFlowBounds = event.target.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')

      // Check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return
      }

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [setNodes]
  )

  return (
    <div className={`${className} relative`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-900"
      >
        <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        <Controls />
        <Background color="#374151" gap={16} />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-semibold mb-2">Welcome to ViteUI Studio</h2>
            <p>Drag nodes from the sidebar to start building your workflow</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Canvas