import { useCallback } from 'react'
import { useStudioStore } from '../stores/studioStore'

export const useWorkspace = () => {
  const { setWorkspace, setControllerState, setStatus } = useStudioStore()

  const getCookie = (name) => {
    const parts = document.cookie.split(";")
    for (const part of parts) {
      const [key, value] = part.trim().split("=")
      if (key === name) {
        return decodeURIComponent(value)
      }
    }
    return null
  }

  const setCookie = (name, value, days) => {
    const date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    document.cookie = `${name}=encodeURIComponent(value)};expires=${date.toUTCString()};path=/`
  }

  const ensureSession = async () => {
    let session = getCookie("session_id")
    if (session) {
      return session
    }
    const resp = await fetch("/API/GetNewSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    })
    const data = await resp.json()
    if (data.session_id) {
      setCookie("session_id", data.session_id, 31)
      return data.session_id
    }
    throw new Error("Failed to obtain session id.")
  }

  const apiRequest = async (route, data = {}) => {
    const sessionId = await ensureSession()
    const payload = { ...data, session_id: sessionId }
    const resp = await fetch(`/API/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const result = await resp.json()
    if (result.error) {
      throw new Error(result.error)
    }
    return result
  }

  const initializeWorkspace = useCallback(async () => {
    try {
      setStatus("Loading workspace...")
      const urlParams = new URLSearchParams(window.location.search)
      const workspaceId = urlParams.get("workspace_id")

      const data = await apiRequest("ViteUIGetWorkspace", { workspace_id: workspaceId })

      setWorkspace({
        workspaceId: data.workspace_id,
        controllerState: data.controller_state ? JSON.parse(data.controller_state) : {},
        candidates: data.candidates || [],
        accepted: data.accepted || [],
        rejected: data.rejected || [],
        generations: data.generations || [],
        videos: data.videos || [],
        timelapses: data.timelapses || [],
        activeGenerationId: data.active_generation_id
      })

      setStatus(null)
    } catch (error) {
      setStatus(`Failed to load workspace: ${error.message}`)
    }
  }, [setWorkspace, setStatus])

  const saveControllerState = useCallback(async (controllerState) => {
    try {
      const { workspaceId } = useStudioStore.getState()
      await apiRequest("ViteUISaveControllerState", {
        workspace_id: workspaceId,
        controller_state: JSON.stringify(controllerState)
      })
      setControllerState(controllerState)
    } catch (error) {
      setStatus(`Failed to save controller state: ${error.message}`)
    }
  }, [setControllerState, setStatus])

  const generate = useCallback(async (executionMode) => {
    try {
      setStatus("Generating...")
      const { workspaceId, controllerState } = useStudioStore.getState()

      const result = await apiRequest("ViteUIGenerate", {
        workspace_id: workspaceId,
        execution_mode: executionMode,
        controller_state: JSON.stringify(controllerState)
      })

      // Refresh workspace to get updated candidates
      await initializeWorkspace()
      setStatus("Generation complete")
    } catch (error) {
      setStatus(`Generation failed: ${error.message}`)
    }
  }, [initializeWorkspace, setStatus])

  const acceptCandidate = useCallback(async (candidateId) => {
    try {
      const { workspaceId } = useStudioStore.getState()
      await apiRequest("ViteUIAcceptCandidate", {
        workspace_id: workspaceId,
        candidate_id: candidateId
      })
      await initializeWorkspace()
    } catch (error) {
      setStatus(`Failed to accept candidate: ${error.message}`)
    }
  }, [initializeWorkspace, setStatus])

  const rejectCandidate = useCallback(async (candidateId) => {
    try {
      const { workspaceId } = useStudioStore.getState()
      await apiRequest("ViteUIRejectCandidate", {
        workspace_id: workspaceId,
        candidate_id: candidateId
      })
      await initializeWorkspace()
    } catch (error) {
      setStatus(`Failed to reject candidate: ${error.message}`)
    }
  }, [initializeWorkspace, setStatus])

  return {
    initializeWorkspace,
    saveControllerState,
    generate,
    acceptCandidate,
    rejectCandidate
  }
}