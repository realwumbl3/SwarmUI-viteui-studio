import { create } from 'zustand'

export const useStudioStore = create((set, get) => ({
  // Workspace state
  workspaceId: null,
  controllerState: {},
  candidates: [],
  accepted: [],
  rejected: [],
  generations: [],
  videos: [],
  timelapses: [],
  activeGenerationId: null,

  // UI state
  selectedNode: null,
  status: null,

  // Actions
  setWorkspace: (workspace) => set(workspace),

  setControllerState: (state) => set({ controllerState: state }),

  addCandidate: (candidate) => set((state) => ({
    candidates: [...state.candidates, candidate]
  })),

  setSelectedNode: (node) => set({ selectedNode: node }),

  setStatus: (status) => set({ status }),

  clearStatus: () => set({ status: null }),
}))