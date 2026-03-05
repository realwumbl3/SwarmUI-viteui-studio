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
  constructor(private baseUrl: string = `${BASE_URL}/api`) { }

  async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let detail = '';
        try {
          const errorPayload = await response.json();
          if (typeof errorPayload?.detail === 'string') {
            detail = errorPayload.detail;
          }
        } catch {
          // Keep fallback status text if body is not JSON.
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


  /** Queue txt2img. Returns immediately with task_id. Completion via WebSocket. */
  async txt2img(params: Txt2ImgParams): Promise<GenerationQueuedResponse> {
    const taskId = params.force_task_id ?? `task(txt2img-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    const paramsWithTaskId = { ...params, force_task_id: taskId }

    const result = await this.request<{ task_id: string; status: string }>('/viteapi/txt2img', {
      method: 'POST',
      body: JSON.stringify(paramsWithTaskId),
    })

    return { task_id: result.task_id, status: 'queued', taskId }
  }

  /** Queue img2img. Returns immediately with task_id. Completion via WebSocket. */
  async img2img(params: Img2ImgParams): Promise<GenerationQueuedResponse> {
    const taskId = params.force_task_id ?? `task(img2img-${Date.now()}-${Math.random().toString(36).substr(2, 9)})`
    const paramsWithTaskId = { ...params, force_task_id: taskId }

    const result = await this.request<{ task_id: string; status: string }>('/viteapi/img2img', {
      method: 'POST',
      body: JSON.stringify(paramsWithTaskId),
    })

    return { task_id: result.task_id, status: 'queued', taskId }
  }

  // Get available models
  async getModels(): Promise<ModelInfo[]> {
    return this.request<ModelInfo[]>('/viteapi/sd-models');
  }

  // Get hierarchical models
  async getViteModels(): Promise<ModelItem[]> {
    try {
      return this.request<ModelItem[]>('/viteapi/models');
    } catch (e) {
      console.warn("Vite models endpoint failed, falling back to legacy.", e);
      return [];
    }
  }

  // Get available modules (VAE/Text Encoder)
  async getModules(): Promise<ModuleInfo[]> {
    return this.request<ModuleInfo[]>('/viteapi/sd-modules');
  }

  async getQueueStatus(): Promise<any> {
    try {
      const res = await this.request('/API/GetCurrentStatus')
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
      const res = await this.request('/API/GetCurrentStatus')
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

  // Get samplers
  async getSamplers(): Promise<SamplerInfo[]> {
    return this.request<SamplerInfo[]>('/viteapi/samplers');
  }

  // Get upscalers
  async getUpscalers(): Promise<UpscalerInfo[]> {
    return this.request<UpscalerInfo[]>('/viteapi/upscalers');
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

  // Workspace APIs
  async listWorkspaces(): Promise<{ workspaces: WorkspaceInfo[] }> {
    return this.request<{ workspaces: WorkspaceInfo[] }>('/workspaces');
  }

  async createWorkspace(name: string): Promise<{ success: boolean; name: string; message?: string }> {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getWorkspaceStructure(): Promise<{ structure: WorkspaceStructureNode }> {
    return this.request<{ structure: WorkspaceStructureNode }>('/workspaces/structure');
  }

  async createWorkspaceFolder(path: string): Promise<{ success: boolean; path: string; message?: string }> {
    return this.request('/workspaces/folders', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async getWorkspacePrompt(workspaceName: string): Promise<WorkspacePrompt> {
    return this.request<WorkspacePrompt>(`/workspaces/${encodeURIComponent(workspaceName)}/prompt`);
  }

  async saveWorkspacePrompt(workspaceName: string, promptData: WorkspacePrompt): Promise<WorkspacePrompt> {
    return this.request<WorkspacePrompt>(`/workspaces/${encodeURIComponent(workspaceName)}/prompt`, {
      method: 'POST',
      body: JSON.stringify(promptData),
    });
  }

  async importWorkspaceImage(workspaceName: string, imageBase64: string): Promise<{ success: boolean; image_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/import`, {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
  }

  async commitWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; commit_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/commit`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async rejectWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; reject_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async restoreWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; restore_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async uncommitWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; uncommit_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/uncommit`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async deleteWorkspaceImage(workspaceName: string, imagePath: string): Promise<{ success: boolean; delete_path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/delete`, {
      method: 'POST',
      body: JSON.stringify({ image_path: imagePath }),
    });
  }

  async openWorkspaceImageInMspaint(workspaceName: string, path: string): Promise<{ success: boolean; path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/open-mspaint`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async revealWorkspacePath(workspaceName: string, path: string, createPng: boolean = false): Promise<{ success: boolean; path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/reveal`, {
      method: 'POST',
      body: JSON.stringify({ path, create_png: createPng }),
    });
  }

  async refreshGenerationFromSource(workspaceName: string, path: string): Promise<{ success: boolean; path: string }> {
    return this.request(`/workspaces/${encodeURIComponent(workspaceName)}/refresh-from-source`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  // Get generation asset (meta.json, full.webp, 512.webp)
  async getGenerationAsset(workspaceName: string, category: string, genid: string, asset: string): Promise<unknown> {
    const url = `/workspaces/${encodeURIComponent(workspaceName)}/${category}/${genid}/${asset}`;
    if (asset.endsWith('.json')) {
      return this.request(url);
    } else {
      // For binary assets like images, return the raw response
      const token = getAuthToken();
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
      }
      return response;
    }
  }

  // Get generations for a workspace
  async getGenerations(workspaceName: string): Promise<Generation[]> {
    return this.request<Generation[]>(`/workspaces/${encodeURIComponent(workspaceName)}/generations`);
  }

  // Move workspace or folder
  async moveWorkspaceItem(sourcePath: string, destinationPath: string): Promise<{ success: boolean; source_path: string; destination_path: string }> {
    return this.request(`/workspaces/move`, {
      method: 'POST',
      body: JSON.stringify({ source_path: sourcePath, destination_path: destinationPath }),
    });
  }

  // Rename workspace or folder
  async renameWorkspaceItem(itemPath: string, newName: string): Promise<{ success: boolean; old_path: string; new_path: string }> {
    return this.request(`/workspaces/rename`, {
      method: 'POST',
      body: JSON.stringify({ item_path: itemPath, new_name: newName }),
    });
  }

}

// Create singleton instance
const api = new StableDiffusionAPI();

export default api;