import { useEffect, useCallback } from "react"
import ModelBrowser from './ModelBrowser'
import WorkspaceTabs from './WorkspaceTabs'
import { cn } from '../lib/utils'
import { Lock, Unlock, LogOut, Settings } from 'lucide-react'
import OptionPicker from './OptionPicker'
import NumberSelector from './NumberSelector'
import { useWorkspaceContext, useWorkspaceState, updateBackendDefaults } from '../contexts/WorkspaceContext'
import api, { ModuleInfo } from '../Api'

import QueueStatus from './QueueStatus'

const Header = () => {
  const {
    openWorkspaces,
    currentWorkspace,
    openWorkspace,
    closeWorkspace,
    switchWorkspace,
    removeWorkspaceState,
    setWorkspaceBrowserOpen,
    modules,
    samplers,
    models,
    modelBrowserOpen,
    setModelBrowserOpen,
  } = useWorkspaceContext()

  const { workspaceState, updateWorkspaceState } = useWorkspaceState(currentWorkspace)
  const { generation, ui } = workspaceState
  const { selectedModel, selectedVAE, selectedSampler, cfgScale, clipSkip } = generation
  const { pageLocked, settingsSidebarOpen } = ui

  const handleWorkspaceChange = useCallback((workspaceName: string) => {
    if (!workspaceName) return
    if (!openWorkspaces.includes(workspaceName)) {
      openWorkspace(workspaceName)
    } else {
      switchWorkspace(workspaceName)
    }
  }, [openWorkspaces, openWorkspace, switchWorkspace])

  const handleWorkspaceClose = useCallback((workspaceName: string) => {
    closeWorkspace(workspaceName)
    removeWorkspaceState(workspaceName)
  }, [closeWorkspace, removeWorkspaceState])

  const handleCreateWorkspace = useCallback(async (name: string) => {
    try {
      const result = await api.createWorkspace(name)
      if (result?.name) {
        openWorkspace(result.name)
      }
    } catch (error) {
      console.error("Failed to create workspace:", error)
    }
  }, [openWorkspace])

  const handleModelChange = useCallback(async (modelTitle: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedModel: modelTitle }
    }))
    updateBackendDefaults({ model: modelTitle });
    try {
      // Send both model and current clip skip to avoid desync
      await api.setOptions({
        sd_model_checkpoint: modelTitle,
        CLIP_stop_at_last_layers: clipSkip
      })
    } catch (error) {
      console.error("Error setting model:", error)
    }
  }, [updateWorkspaceState, clipSkip])

  const handleUnloadModel = useCallback(async () => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedModel: "None" }
    }))
    updateBackendDefaults({ model: "None" });
    try {
      await api.unloadModel()
    } catch (error) {
      console.error("Error unloading model:", error)
    }
  }, [updateWorkspaceState])

  const handleVAEChange = useCallback(async (vae: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedVAE: vae }
    }))
    try {
      const modules = vae === "Automatic" ? [] : [vae];
      await api.setModules(modules)
    } catch (error) {
      console.error("Error setting VAE:", error)
    }
  }, [updateWorkspaceState])

  const setSelectedSampler = useCallback((sampler: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, selectedSampler: sampler }
    }))
    updateBackendDefaults({ sampler });
  }, [updateWorkspaceState])

  const setClipSkip = useCallback((skip: number) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, clipSkip: skip }
    }))
    updateBackendDefaults({ clipSkip: skip });
  }, [updateWorkspaceState])

  const setCfgScale = useCallback((scale: number) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      generation: { ...prev.generation, cfgScale: scale }
    }))
    updateBackendDefaults({ cfgScale: scale });
  }, [updateWorkspaceState])

  // Debounce clipSkip updates to backend
  useEffect(() => {
    if (!currentWorkspace || clipSkip === undefined) return;
    const timer = setTimeout(() => {
      api.setOptions({ CLIP_stop_at_last_layers: clipSkip }).catch(err => {
        console.error("Failed to sync clipSkip to backend:", err);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [clipSkip, currentWorkspace]);

  // Debounce sampler and CFG updates for default persistence
  useEffect(() => {
    // We only sync these if they are likely defaults we want to save
    // Logic: If user changes it, save it as new default.
    if (!currentWorkspace) return;

    const timer = setTimeout(() => {
      const updates: any = {};
      if (selectedSampler) updates["sd_default_sampler"] = selectedSampler;
      if (cfgScale) updates["sd_default_cfg_scale"] = cfgScale;

      if (Object.keys(updates).length > 0) {
        console.log("Syncing default generation params:", updates);
        api.setOptions(updates).catch(console.error);
      }
    }, 2000); // 2s debounce to avoid spamming while dragging slider
    return () => clearTimeout(timer);
  }, [selectedSampler, cfgScale, currentWorkspace])

  const toggleLock = useCallback(() => {
    updateWorkspaceState((prev) => ({
      ...prev,
      ui: { ...prev.ui, pageLocked: !prev.ui.pageLocked }
    }))
  }, [updateWorkspaceState])

  const toggleSettingsSidebar = useCallback(() => {
    updateWorkspaceState((prev) => ({
      ...prev,
      ui: { ...prev.ui, settingsSidebarOpen: !prev.ui.settingsSidebarOpen }
    }))
  }, [updateWorkspaceState])

  return (
    <header className="studio-toolbar border-b-studio-border h-[38px] flex items-center justify-between gap-2 px-2">
      <div className="flex-1 min-w-0">
        <WorkspaceTabs
          openWorkspaces={openWorkspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={handleWorkspaceChange}
          onWorkspaceClose={handleWorkspaceClose}
          onCreateWorkspace={handleCreateWorkspace}
          onOpenWorkspaceBrowser={() => setWorkspaceBrowserOpen(true)}
        />
      </div>

      <div className="flex items-center gap-2">

        <QueueStatus />

        <div className="flex flex-row gap-0.5 items-center mr-2">
          <button
            onClick={handleUnloadModel}
            className="studio-btn-ghost p-1.5 rounded-md text-studio-text hover:text-studio-accent-hover transition-colors"
            title="Eject Model (Unload from VRAM)"
            type="button"
          >
            <LogOut size={14} className="rotate-180" />
          </button>

          {/* Model Selector Button */}
          <button
            onClick={() => setModelBrowserOpen(true)}
            className="flex flex-col items-start justify-center px-3 h-[28px] bg-studio-surface border border-studio-border rounded hover:bg-studio-surface/80 transition-colors text-left min-w-[150px] max-w-[300px]"
            title="Click to browse models"
            type="button"
          >
            <span className="text-[8px] leading-none text-studio-textSecondary font-medium uppercase mb-0.5">Model</span>
            <span className="text-xs leading-none font-medium truncate w-full">
              {(selectedModel && selectedModel !== "None") ? (models.find(m => m.model_name === selectedModel || m.title === selectedModel)?.title || selectedModel) : "none"}
            </span>
          </button>
        </div>

        <OptionPicker
          options={[
            { value: "Automatic", label: "Automatic" },
            ...modules.map((module: ModuleInfo) => ({
              value: module.model_name,
              label: module.model_name.split(".safetensors")[0] || module.model_name
            }))
          ]}
          value={selectedVAE || "Automatic"}
          onChange={handleVAEChange}
          title="VAE"
        />
        <NumberSelector
          value={clipSkip}
          onChange={setClipSkip}
          min={1}
          max={12}
          step={1}
          label="Clip Skip"
          disable_scroll={true}
        />
        <OptionPicker
          options={samplers.map((sampler) => ({
            value: sampler.name,
            label: sampler.name
          }))}
          value={selectedSampler}
          onChange={setSelectedSampler}
          title="Sampler"
        />
        <NumberSelector
          value={cfgScale}
          onChange={setCfgScale}
          min={1}
          max={33}
          step={0.1}
          label="CFG"
        />

        <div className="w-px h-6 bg-studio-border mx-1" />

        <button
          onClick={toggleLock}
          className={cn(
            "studio-btn-ghost p-1.5 rounded-md text-studio-text",
            pageLocked && "text-studio-accent bg-studio-accent/10"
          )}
          title={pageLocked ? "Unlock page" : "Lock page"}
          type="button"
        >
          {pageLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <button
          onClick={toggleSettingsSidebar}
          className={cn(
            "studio-btn-ghost p-1.5 rounded-md text-studio-text hover:text-studio-accent-hover transition-colors",
            settingsSidebarOpen && "text-studio-accent bg-studio-accent/10"
          )}
          title={settingsSidebarOpen ? "Close settings" : "Settings"}
          type="button"
        >
          <Settings size={14} />
        </button>
      </div>

      {modelBrowserOpen && (
        <ModelBrowser
          currentModel={selectedModel}
          onSelectModel={handleModelChange}
          onClose={() => setModelBrowserOpen(false)}
        />
      )}
    </header>
  )
}

export default Header
