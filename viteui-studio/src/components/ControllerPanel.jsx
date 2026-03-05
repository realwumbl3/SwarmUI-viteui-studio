import React, { useState, useEffect } from 'react'
import { Camera, Video, Upload, Trash2 } from 'lucide-react'
import { useStudioStore } from '../stores/studioStore'
import { useWorkspace } from '../hooks/useWorkspace'

const ControllerPanel = ({ className }) => {
  const { controllerState, setControllerState } = useStudioStore()
  const { saveControllerState } = useWorkspace()

  const [localState, setLocalState] = useState({
    mode: 'txt2img',
    execution_mode: 'comfy_controller',
    prompt: '',
    negative_prompt: '',
    model: '',
    sampler: 'euler',
    scheduler: 'normal',
    seed: -1,
    steps: 20,
    cfg: 7.0,
    width: 1024,
    height: 1024,
    init_strength: 0.8,
    video_model: '',
    video_swap_model: '',
    video_swap_percent: 0.5,
    video_frames: 81,
    video_fps: 24,
    video_steps: 20,
    video_format: 'h264-mp4',
    ...controllerState
  })

  const [initImageFile, setInitImageFile] = useState(null)
  const [maskImageFile, setMaskImageFile] = useState(null)

  useEffect(() => {
    setLocalState(prev => ({ ...prev, ...controllerState }))
  }, [controllerState])

  const updateField = (field, value) => {
    const newState = { ...localState, [field]: value }
    setLocalState(newState)
    setControllerState(newState)
    saveControllerState(newState)
  }

  const handleImageUpload = (field, file) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        updateField(field, e.target.result)
        if (field === 'init_image') setInitImageFile(file)
        if (field === 'mask_image') setMaskImageFile(file)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = (field) => {
    updateField(field, null)
    if (field === 'init_image') setInitImageFile(null)
    if (field === 'mask_image') setMaskImageFile(null)
  }

  const modes = [
    { value: 'txt2img', label: 'Text to Image', icon: '🎨' },
    { value: 'img2img', label: 'Image to Image', icon: '🖼️' },
    { value: 'inpaint', label: 'Inpaint', icon: '🖌️' },
    { value: 'video', label: 'Video Generation', icon: '🎬' }
  ]

  const models = [
    'flux-dev',
    'flux-schnell',
    'sdxl-1.0',
    'sd-1.5',
    'stable-diffusion-3'
  ]

  const samplers = [
    'euler', 'euler_a', 'heun', 'dpm_2', 'dpm_2_a',
    'dpm++_2s_a', 'dpm++_2m', 'dpm++_sde', 'dpm_fast'
  ]

  const schedulers = [
    'normal', 'karras', 'exponential', 'sgm_uniform'
  ]

  const videoFormats = [
    { value: 'h264-mp4', label: 'MP4 (H.264)' },
    { value: 'webm', label: 'WebM' },
    { value: 'gif', label: 'GIF' },
    { value: 'webp', label: 'WebP' }
  ]

  return (
    <div className={`${className} bg-studio-panel p-6 overflow-y-auto`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Camera size={20} />
          <span>Controller</span>
        </h2>

        {/* Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Generation Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {modes.map(mode => (
              <button
                key={mode.value}
                onClick={() => updateField('mode', mode.value)}
                className={`p-3 rounded-lg border transition-colors ${
                  localState.mode === mode.value
                    ? 'bg-studio-accent border-studio-accent text-white'
                    : 'border-studio-border hover:border-gray-500'
                }`}
              >
                <div className="text-lg mb-1">{mode.icon}</div>
                <div className="text-sm font-medium">{mode.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Execution Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Execution Mode</label>
          <select
            value={localState.execution_mode}
            onChange={(e) => updateField('execution_mode', e.target.value)}
            className="studio-input w-full"
          >
            <option value="internal">Internal Backend</option>
            <option value="comfy_controller">ComfyUI Controller</option>
          </select>
        </div>

        {/* Prompts */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <textarea
              value={localState.prompt}
              onChange={(e) => updateField('prompt', e.target.value)}
              placeholder="Describe what you want to generate..."
              className="studio-input w-full resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Negative Prompt</label>
            <textarea
              value={localState.negative_prompt}
              onChange={(e) => updateField('negative_prompt', e.target.value)}
              placeholder="Describe what you don't want..."
              className="studio-input w-full resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            value={localState.model}
            onChange={(e) => updateField('model', e.target.value)}
            className="studio-input w-full"
          >
            <option value="">Select a model...</option>
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Generation Parameters */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sampler</label>
            <select
              value={localState.sampler}
              onChange={(e) => updateField('sampler', e.target.value)}
              className="studio-input w-full"
            >
              {samplers.map(sampler => (
                <option key={sampler} value={sampler}>{sampler}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Scheduler</label>
            <select
              value={localState.scheduler}
              onChange={(e) => updateField('scheduler', e.target.value)}
              className="studio-input w-full"
            >
              {schedulers.map(scheduler => (
                <option key={scheduler} value={scheduler}>{scheduler}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Seed</label>
            <input
              type="number"
              value={localState.seed}
              onChange={(e) => updateField('seed', parseInt(e.target.value) || -1)}
              className="studio-input w-full"
              placeholder="-1 for random"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Steps</label>
            <input
              type="number"
              value={localState.steps}
              onChange={(e) => updateField('steps', parseInt(e.target.value) || 20)}
              className="studio-input w-full"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">CFG Scale</label>
            <input
              type="number"
              value={localState.cfg}
              onChange={(e) => updateField('cfg', parseFloat(e.target.value) || 7.0)}
              className="studio-input w-full"
              min="1"
              max="30"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Init Strength</label>
            <input
              type="number"
              value={localState.init_strength}
              onChange={(e) => updateField('init_strength', parseFloat(e.target.value) || 0.8)}
              className="studio-input w-full"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
        </div>

        {/* Dimensions */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Width</label>
            <input
              type="number"
              value={localState.width}
              onChange={(e) => updateField('width', parseInt(e.target.value) || 1024)}
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
              value={localState.height}
              onChange={(e) => updateField('height', parseInt(e.target.value) || 1024)}
              className="studio-input w-full"
              min="64"
              max="4096"
              step="64"
            />
          </div>
        </div>

        {/* Image Inputs */}
        {(localState.mode === 'img2img' || localState.mode === 'inpaint') && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Init Image</label>
              {!localState.init_image ? (
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                  <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('init_image', e.target.files[0])}
                    className="hidden"
                    id="init-image-upload"
                  />
                  <label
                    htmlFor="init-image-upload"
                    className="cursor-pointer text-studio-accent hover:underline"
                  >
                    Choose init image
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={localState.init_image}
                    alt="Init"
                    className="w-full h-32 object-cover rounded border border-studio-border"
                  />
                  <button
                    onClick={() => clearImage('init_image')}
                    className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {localState.mode === 'inpaint' && (
              <div>
                <label className="block text-sm font-medium mb-2">Mask Image</label>
                {!localState.mask_image ? (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                    <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('mask_image', e.target.files[0])}
                      className="hidden"
                      id="mask-image-upload"
                    />
                    <label
                      htmlFor="mask-image-upload"
                      className="cursor-pointer text-studio-accent hover:underline"
                    >
                      Choose mask image
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={localState.mask_image}
                      alt="Mask"
                      className="w-full h-32 object-cover rounded border border-studio-border"
                    />
                    <button
                      onClick={() => clearImage('mask_image')}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Video Settings */}
        {localState.mode === 'video' && (
          <div className="mb-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Video size={18} />
              <span>Video Settings</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Video Model</label>
                <input
                  type="text"
                  value={localState.video_model}
                  onChange={(e) => updateField('video_model', e.target.value)}
                  className="studio-input w-full"
                  placeholder="wan2.2-t2v-1.3B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Swap Model</label>
                <input
                  type="text"
                  value={localState.video_swap_model}
                  onChange={(e) => updateField('video_swap_model', e.target.value)}
                  className="studio-input w-full"
                  placeholder="Optional swap model"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Swap %</label>
                <input
                  type="number"
                  value={localState.video_swap_percent}
                  onChange={(e) => updateField('video_swap_percent', parseFloat(e.target.value) || 0.5)}
                  className="studio-input w-full"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Frames</label>
                <input
                  type="number"
                  value={localState.video_frames}
                  onChange={(e) => updateField('video_frames', parseInt(e.target.value) || 81)}
                  className="studio-input w-full"
                  min="1"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">FPS</label>
                <input
                  type="number"
                  value={localState.video_fps}
                  onChange={(e) => updateField('video_fps', parseInt(e.target.value) || 24)}
                  className="studio-input w-full"
                  min="1"
                  max="60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video Steps</label>
                <input
                  type="number"
                  value={localState.video_steps}
                  onChange={(e) => updateField('video_steps', parseInt(e.target.value) || 20)}
                  className="studio-input w-full"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={localState.video_format}
                onChange={(e) => updateField('video_format', e.target.value)}
                className="studio-input w-full"
              >
                {videoFormats.map(format => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ControllerPanel