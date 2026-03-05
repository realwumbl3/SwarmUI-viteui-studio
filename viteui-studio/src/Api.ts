// API Types
import type { WorkspaceStructureNode } from './components/WorkspaceBrowser';
import type { PromptNode } from './components/PromptComposer/types';

export interface Txt2ImgParams {
  prompt: string;
  negative_prompt?: string;
  steps: number;
  width: number;
  height: number;
  cfg_scale: number;
  sampler_name: string;
  batch_size: number;
  n_iter: number;
  clip_skip?: number;
  save_images?: boolean;
  save_grids?: boolean;
  force_task_id?: string;
  workspace_name: string;
}

export interface Img2ImgParams extends Txt2ImgParams {
  genid: string;
  source_genid?: string;
  mask?: string;
  mask_blur?: number;
  inpainting_fill?: number;
  inpaint_full_res?: boolean;
  inpaint_full_res_padding?: number;
  inpainting_mask_invert?: number;
  denoising_strength: number;
  return_partial_candidates?: boolean;
}

export interface ModelInfo {
  title: string;
  model_name: string;
  hash: string;
  sha256: string;
  filename: string;
  config: string | null;
}

export interface ModelNode {
  type: "model";
  subtype: "file" | "folder";
  name: string;
  model_name: string; // Relative path for loading
  filename: string; // Absolute path
  image?: string;
  meta?: Record<string, any>;
}

export interface ModelGroup {
  type: "group";
  name: string;
  children: (ModelNode | ModelGroup)[];
}

export type ModelItem = ModelNode | ModelGroup;

export interface ModuleInfo {
  model_name: string;
  filename: string;
}

export interface SamplerInfo {
  name: string;
  aliases: string[];
  options: Record<string, unknown>;
}

export interface UpscalerInfo {
  name: string;
  model_name?: string;
  model_path?: string;
  model_url?: string;
  scale: number;
}

export interface Options {
  sd_model_checkpoint?: string;
  CLIP_stop_at_last_layers?: number;
  optimization_level?: string;
  cpu_offload?: boolean;
  live_previews_enable?: boolean;
  live_previews_every_n_steps?: number;
  live_previews_quality?: string;
  forge_additional_modules?: string[];
}

export interface ExtrasSingleImageParams {
  image?: string; // Base64 image (fallback if workspace_image_path not provided)
  workspace_image_path?: string; // Workspace-relative path (e.g., "commits/genid/full.webp")
  upscaler_1: string;
  upscaling_resize: number;
  resize_mode: number;
  force_task_id?: string;
  show_extras_results?: boolean;
  gfpgan_visibility?: number;
  codeformer_visibility?: number;
  codeformer_weight?: number;
  upscaling_resize_w?: number;
  upscaling_resize_h?: number;
  upscaling_crop?: boolean;
  upscaler_2?: string;
  extras_upscaler_2_visibility?: number;
  upscale_first?: boolean;
  workspace_name?: string;
}

export interface ProgressInfo {
  progress: number;
  eta_relative: number;
  state: {
    skipped: boolean;
    interrupted: boolean;
    job: string;
    job_count: number;
    job_timestamp: string;
    job_no: number;
    sampling_step: number;
    sampling_steps: number;
  };
  current_image?: string;
  textinfo?: string;
  current_batch?: number;
  total_batches?: number;
  eta?: number;
}

export interface WorkspaceInfo {
  name: string;
  created?: string | null;
  folders?: string[];
}

export interface WorkspacePrompt {
  nodes: PromptNode[];
}

/** Response when generation is queued (202). Client receives completion via WebSocket. */
export interface GenerationQueuedResponse {
  task_id: string;
  status: 'queued';
  taskId?: string; // Alias for task_id, set by Api for compatibility
}

/** Legacy response when generation completed inline (no longer used with async API). */
export interface GenerationResponse {
  images: string[];
  filesystem_paths?: string[];
  workspace_info?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  info?: string;
  taskId?: string;
}

export interface ExtrasResponse {
  images: string[];
  html_info: string;
  saved: string[];
}

export interface Generation {
  genid: string;
  status: 'candidate' | 'commit' | 'reject';
  timestamp: number;
  source: 'txt2img' | 'img2img' | 'inpaint' | 'upscale' | 'upload';
  prompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, unknown>;
  workspace: string;
  image?: string;
  partial_candidates_info?: Array<{
    paste_to: [number, number, number, number];
    mask_blur: number;
    mask?: string;
  }>;
}

import { API_BASE_URL as BASE_URL } from './lib/utils';


class StableDiffusionAPI {
  private sessionInitPromise: Promise<string | null> | null = null;

  private getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() ?? null;
    }
    return null;
  }

  private setCookie(name: string, value: string): void {
    if (typeof document === "undefined") return;
    const expires = new Date();
    expires.setDate(expires.getDate() + 31);
    document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}`;
  }

  private async ensureSessionId(): Promise<string | null> {
    const existing = this.getCookie('session_id');
    if (existing) return existing;
    if (this.sessionInitPromise) {
      return this.sessionInitPromise;
    }

    this.sessionInitPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/GetNewSession`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (!response.ok) return null;
        const data = await response.json();
        const sessionId = data?.session_id;
        if (typeof sessionId === 'string' && sessionId.length > 0) {
          this.setCookie('session_id', sessionId);
          return sessionId;
        }
      } catch {
      }
      return null;
    })();

    const sessionId = await this.sessionInitPromise;
    this.sessionInitPromise = null;
    return sessionId;
  }

  constructor(private baseUrl: string = `${BASE_URL || '/API'}`) { }

  async request<T = unknown>(endpoint: string, options: RequestInit = {}, retriedForSession = false): Promise<T> {
    const normalizedBase = this.baseUrl.replace(/\/+$/g, '');
    const endpointWithSlash = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const hasApiBase = normalizedBase.toLowerCase().endsWith('/api');

    let normalizedEndpoint = endpointWithSlash.replace(/\/+$/, '');
    if (hasApiBase) {
      normalizedEndpoint = normalizedEndpoint.replace(/^\/api\//i, '/');
      normalizedEndpoint = normalizedEndpoint.replace(/^\/+/, '/');
    }
    else {
      if (!/^\/api\//i.test(normalizedEndpoint)) {
        normalizedEndpoint = `/API${normalizedEndpoint}`;
      }
      normalizedEndpoint = normalizedEndpoint.replace(/^\/+api\//i, '/API/');
    }

    const url = `${normalizedBase || ''}${normalizedEndpoint || '/'}`;

    const sessionId = await this.ensureSessionId();

    // Prepare request body
    let requestBody = options.body;
    if (typeof requestBody === 'string') {
      try {
        const parsed = JSON.parse(requestBody);
        if (sessionId) {
          parsed.session_id = sessionId;
        }
        requestBody = JSON.stringify(parsed);
      } catch (e) {
        // If body is not valid JSON, leave it as is
      }
    } else if (!requestBody && sessionId) {
      // If no body provided but we have session_id, create one
      requestBody = JSON.stringify({ session_id: sessionId });
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
      body: requestBody,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let detail = '';
        let isSessionError = false;
        try {
          const parsedError = await response.json();
          if (typeof parsedError?.detail === 'string') {
            detail = parsedError.detail;
          }
          if (typeof parsedError?.error === 'string') {
            detail = detail || parsedError.error;
            isSessionError = /session/i.test(parsedError.error);
          }
          if (typeof parsedError?.error_id === 'string' && /session/i.test(parsedError.error_id)) {
            isSessionError = true;
          }
        } catch {
          // Keep fallback status text if body is not JSON.
        }

        if (!retriedForSession && isSessionError) {
          const refreshedSession = await this.ensureSessionId();
          if (refreshedSession) {
            return this.request(endpoint, options, true);
          }
        }

        const suffix = detail ? ` - ${detail}` : '';
        throw new Error(`API request failed: ${response.status} ${response.statusText}${suffix}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error);
      throw error;
    }
  }


  /** Get workspace data from SwarmUI ViteUI endpoint. */
  async viteuiGetWorkspace(workspaceId?: string): Promise<{
    workspace_id: string;
    controller_state: string;
    candidates: any[];
    accepted: any[];
    rejected: any[];
    generations: any[];
    videos: any[];
    timelapses: any[];
    active_generation_id: string | null;
  }> {
    return this.request('/API/ViteUIGetWorkspace', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId || null }),
    })
  }

  /** Save controller state to SwarmUI ViteUI endpoint. */
  async viteuiSaveControllerState(workspaceId: string, controllerState: string): Promise<{ success: boolean; workspace_id: string }> {
    return this.request('/API/ViteUISaveControllerState', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        controller_state: controllerState
      }),
    })
  }

  /** Generate using SwarmUI ViteUI endpoint. */
  async viteuiGenerate(workspaceId: string, controllerState: string, images: number = 1, executionMode: 'direct' | 'nodes' = 'direct'): Promise<{ workspace_id: string; generation_id: string; candidates: any[] }> {
    const execution_mode = executionMode === 'direct' ? 'internal' : 'comfy_controller';
    return this.request('/API/ViteUIGenerate', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        controller_state: controllerState,
        execution_mode: execution_mode,
        images: images
      }),
    })
  }

  // Get available models
  async getModels(): Promise<ModelInfo[]> {
    const response = await this.request<{ models: { checkpoints: Array<{ title: string; model_name: string; hash: string; sha256: string; filename: string; config: string | null }> } }>('/API/ListModels', {
      method: 'POST',
      body: JSON.stringify({ path: "", depth: 1, subtype: "checkpoints" }),
    });

    return response.models.checkpoints.map(model => ({
      title: model.title,
      model_name: model.model_name,
      hash: model.hash,
      sha256: model.sha256,
      filename: model.filename,
      config: model.config
    }));
  }

  // Get hierarchical models (SwarmUI format)
  async getViteModels(): Promise<ModelItem[]> {
    // For now, return empty array as SwarmUI has different model organization
    // This can be enhanced later to convert SwarmUI format to ViteUI format
    return [];
  }

  // Get available modules (VAE/Text Encoder) from SwarmUI
  async getModules(): Promise<ModuleInfo[]> {
    const vaeResponse = await this.request<{ models: { vae: Array<{ title: string; model_name: string; hash: string; sha256: string; filename: string }> } }>('/API/ListModels', {
      method: 'POST',
      body: JSON.stringify({ path: "", depth: 1, subtype: "vae" }),
    });

    return vaeResponse.models.vae.map(model => ({
      model_name: model.model_name,
      filename: model.filename
    }));
  }

  async getQueueStatus(): Promise<any> {
    try {
      const res = await this.request('/API/GetCurrentStatus', {
        method: 'POST',
        body: JSON.stringify({})
      })
      // Return queue status based on SwarmUI status
      return {
        queue: [],
        queue_running: res.status?.live_gens || 0,
        queue_pending: res.status?.waiting_gens || 0
      }
    } catch (error) {
      console.warn("Failed to get queue status, using defaults:", error);
      return {
        queue: [],
        queue_running: 0,
        queue_pending: 0
      }
    }
  }

  // Get current options
  async getOptions(): Promise<any> {
    try {
      const res = await this.request('/API/GetCurrentStatus', {
        method: 'POST',
        body: JSON.stringify({})
      })
      // Return minimal options structure for SwarmUI compatibility
      return {
        sd_model_checkpoint: "None",
        sd_default_sampler: "Euler a",
        live_previews_enable: true,
        cpu_offload: false,
        optimization_level: "none"
      }
    } catch (error) {
      console.warn("Failed to get options, using defaults:", error);
      // Return default options
      return {
        sd_model_checkpoint: "None",
        sd_default_sampler: "Euler a",
        live_previews_enable: true,
        cpu_offload: false,
        optimization_level: "none"
      }
    }
  }

  // Set current model
  async setModel(modelTitle: string): Promise<void> {
    return this.request<void>('/viteapi/options', {
      method: 'POST',
      body: JSON.stringify({
        sd_model_checkpoint: modelTitle,
      }),
    });
  }

  // Unload current model
  async unloadModel(): Promise<void> {
    return this.request<void>('/viteapi/model/unload', {
      method: 'POST',
    });
  }

  // Set modules (VAE/Text Encoder)
  async setModules(modules: string[]): Promise<void> {
    return this.request<void>('/viteapi/options', {
      method: 'POST',
      body: JSON.stringify({
        forge_additional_modules: modules,
      }),
    });
  }

  // Set options
  async setOptions(options: Record<string, unknown>): Promise<void> {
    return this.request<void>('/viteapi/options', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Get samplers from SwarmUI T2I params
  async getSamplers(): Promise<SamplerInfo[]> {
    const paramsData = await this.request<{ list: any[] }>('/API/ListT2IParams', {
      method: 'POST',
      body: JSON.stringify({})
    });

    // Find sampler parameter and extract its values
    const samplerParam = paramsData.list.find((param: any) => param.id === 'sampler');
    if (!samplerParam) {
      return [];
    }

    // Convert SwarmUI format to ViteUI format
    return samplerParam.values.map((value: any) => ({
      name: value,
      aliases: [value],
      options: {}
    }));
  }

  // Get upscalers from SwarmUI T2I params
  async getUpscalers(): Promise<UpscalerInfo[]> {
    const paramsData = await this.request<{ list: any[] }>('/API/ListT2IParams', {
      method: 'POST',
      body: JSON.stringify({})
    });

    // Find upscaler parameters and extract their values
    const upscaler1Param = paramsData.list.find((param: any) => param.id === 'upscaler1');
    const upscaler2Param = paramsData.list.find((param: any) => param.id === 'upscaler2');

    const upscalers: UpscalerInfo[] = [];

    // Extract from upscaler1
    if (upscaler1Param?.values) {
      upscaler1Param.values.forEach((value: string) => {
        if (value && value !== "None") {
          upscalers.push({
            name: value,
            scale: 2 // Default scale, could be enhanced to get actual scale
          });
        }
      });
    }

    // Extract from upscaler2
    if (upscaler2Param?.values) {
      upscaler2Param.values.forEach((value: string) => {
        if (value && value !== "None" && !upscalers.some(u => u.name === value)) {
          upscalers.push({
            name: value,
            scale: 2 // Default scale, could be enhanced to get actual scale
          });
        }
      });
    }

    return upscalers;
  }

  /** Queue extras (upscale). Returns immediately with task_id. Completion via WebSocket. */
  async extraSingleImage(params: ExtrasSingleImageParams): Promise<{ task_id: string; status: string }> {
    const taskId = params.force_task_id ?? `task(extra-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    const paramsWithTaskId = { ...params, force_task_id: taskId }

    const result = await this.request<{ task_id: string; status: string }>('/viteapi/extras', {
      method: 'POST',
      body: JSON.stringify(paramsWithTaskId),
    })
    return { task_id: result.task_id, status: result.status }
  }

  // Interrogate (analyze image)
  async interrogate(image: File | Blob, model: string = 'clip'): Promise<{ caption: string }> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('model', model);

    return this.request<{ caption: string }>('/viteapi/interrogate', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  }

  // PNG Info (get metadata from image)
  async getPngInfo(imageBase64: string): Promise<{ info: string; items: Record<string, unknown> }> {
    return this.request<{ info: string; items: Record<string, unknown> }>('/viteapi/png-info', {
      method: 'POST',
      body: JSON.stringify({
        image: imageBase64,
      }),
    });
  }

  // Skip current generation
  async skip(): Promise<void> {
    return this.request<void>('/viteapi/skip', {
      method: 'POST',
    });
  }

  // Interrupt/stop all generations
  async interrupt(): Promise<void> {
    return this.request<void>('/viteapi/interrupt', {
      method: 'POST',
    });
  }

  // Workspace APIs - using SwarmUI ViteUI endpoints
  async listWorkspaces(): Promise<{ workspaces: WorkspaceInfo[] }> {
    // Note: SwarmUI doesn't have a direct workspace listing endpoint
    // This could be implemented by scanning the viteui_workspaces directory
    // For now, return empty list
    return { workspaces: [] };
  }

  async createWorkspace(name: string): Promise<{ success: boolean; name: string; message?: string }> {
    // Create workspace by calling ViteUIGetWorkspace with a new workspace ID
    // The backend will create it if it doesn't exist
    const workspaceId = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const result = await this.request('/API/ViteUIGetWorkspace', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId }),
    });
    return { success: true, name: workspaceId };
  }

  async getWorkspaceStructure(): Promise<{ structure: WorkspaceStructureNode }> {
    // Note: This endpoint doesn't exist in SwarmUI ViteUI
    // Return minimal structure
    return {
      structure: {
        path: "workspaces",
        name: "workspaces",
        type: "folder",
        children: []
      }
    };
  }

  async createWorkspaceFolder(path: string): Promise<{ success: boolean; path: string; message?: string }> {
    // Note: SwarmUI ViteUI doesn't have folder management
    return { success: false, path, message: "Folder management not supported" };
  }

  async getWorkspacePrompt(workspaceName: string): Promise<WorkspacePrompt> {
    // Get workspace data and extract prompt if available
    const result = await this.request('/API/ViteUIGetWorkspace', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceName }),
    });

    // For now, return empty prompt structure
    // This could be enhanced to store prompts in controller_state
    return { nodes: [] };
  }

  async saveWorkspacePrompt(workspaceName: string, promptData: WorkspacePrompt): Promise<WorkspacePrompt> {
    // Note: SwarmUI ViteUI doesn't have separate prompt storage
    // Prompts are stored in controller state
    return promptData;
  }

  async importWorkspaceImage(workspaceName: string, imageBase64: string): Promise<{ success: boolean; image_path: string }> {
    // Note: This functionality would need to be implemented differently in SwarmUI
    return { success: false, image_path: "" };
  }

  async commitWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; commit_path: string }> {
    return this.request('/API/ViteUIAcceptCandidate', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceName, candidate_id: imagePath }),
    });
  }

  async rejectWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; reject_path: string }> {
    return this.request('/API/ViteUIRejectCandidate', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceName, candidate_id: imagePath }),
    });
  }

  async restoreWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; restore_path: string }> {
    // Note: Restore functionality not directly supported in SwarmUI ViteUI
    return { success: false, restore_path: "" };
  }

  async uncommitWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; uncommit_path: string }> {
    // Note: Uncommit functionality not directly supported in SwarmUI ViteUI
    return { success: false, uncommit_path: "" };
  }

  async deleteWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; delete_path: string }> {
    // Note: Delete functionality not directly supported in SwarmUI ViteUI
    return { success: false, delete_path: "" };
  }

  async openWorkspaceImageInMspaint(workspaceName: string, path: string): Promise<{ success: boolean; path: string }> {
    // Note: External editor functionality not supported in SwarmUI ViteUI
    return { success: false, path };
  }

  async revealWorkspacePath(workspaceName: string, path: string, createPng: boolean = false): Promise<{ success: boolean; path: string }> {
    // Note: File system reveal functionality not supported in SwarmUI ViteUI
    return { success: false, path };
  }

  async refreshGenerationFromSource(workspaceName: string, path: string): Promise<{ success: boolean; path: string }> {
    // Note: Refresh functionality not supported in SwarmUI ViteUI
    return { success: false, path };
  }

  // Get generation asset (meta.json, full.webp, 512.webp)
  async getGenerationAsset(workspaceName: string, category: string, genid: string, asset: string): Promise<unknown> {
    // Note: Asset fetching would need to be implemented differently
    // For now, return null
    return null;
  }

  // Get generations for a workspace
  async getGenerations(workspaceName: string): Promise<Generation[]> {
    const result = await this.request('/API/ViteUIGetWorkspace', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceName }),
    });

    // Convert SwarmUI format to ViteUI format
    const generations: Generation[] = [];

    // Add generations from workspace data
    if (result.generations) {
      result.generations.forEach((gen: any) => {
        generations.push({
          genid: gen.Id,
          status: 'commit', // Assume committed
          timestamp: gen.Created,
          source: gen.Mode || 'txt2img',
          prompt: gen.ControllerState ? JSON.parse(gen.ControllerState).prompt : undefined,
          negativePrompt: gen.ControllerState ? JSON.parse(gen.ControllerState).negative_prompt : undefined,
          workspace: workspaceName,
          parameters: gen.ControllerState ? JSON.parse(gen.ControllerState) : undefined
        });
      });
    }

    // Add candidates and accepted images
    if (result.candidates) {
      result.candidates.forEach((candidate: any) => {
        generations.push({
          genid: candidate.Id,
          status: 'candidate',
          timestamp: candidate.Created,
          source: candidate.Mode || 'txt2img',
          workspace: workspaceName,
          image: candidate.File
        });
      });
    }

    if (result.accepted) {
      result.accepted.forEach((accepted: any) => {
        generations.push({
          genid: accepted.Id,
          status: 'commit',
          timestamp: accepted.Created,
          source: accepted.Mode || 'txt2img',
          workspace: workspaceName,
          image: accepted.File
        });
      });
    }

    return generations;
  }

  // Move workspace or folder (not supported in SwarmUI ViteUI)
  async moveWorkspaceItem(sourcePath: string, destinationPath: string): Promise<{ success: boolean; source_path: string; destination_path: string }> {
    return { success: false, source_path: sourcePath, destination_path: destinationPath };
  }

  // Rename workspace or folder (not supported in SwarmUI ViteUI)
  async renameWorkspaceItem(itemPath: string, newName: string): Promise<{ success: boolean; old_path: string; new_path: string }> {
    return { success: false, old_path: itemPath, new_path: itemPath };
  }

}

// Create singleton instance
const api = new StableDiffusionAPI();

export default api;