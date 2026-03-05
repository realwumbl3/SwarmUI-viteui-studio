import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const WORKSPACE_PREFIX = "workspace://"

// API base URL for constructing absolute URLs
// Default to empty string to use relative paths (and Vite proxy)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function isWorkspaceImage(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(WORKSPACE_PREFIX)
}

export function parseWorkspaceImage(value?: string | null): { workspace: string; path: string } | null {
  if (!value) return null

  // Strip query parameters (e.g. auth tokens)
  const urlWithoutQuery = value.split('?')[0]

  // Handle workspace:// URI
  if (isWorkspaceImage(urlWithoutQuery)) {
    const trimmed = urlWithoutQuery.slice(WORKSPACE_PREFIX.length)
    const [encodedWorkspace, ...pathParts] = trimmed.split("/")
    if (!encodedWorkspace || pathParts.length === 0) return null
    return { workspace: decodeURIComponent(encodedWorkspace), path: pathParts.join("/") }
  }

  // Handle HTTP URL (e.g. http://localhost:7861/api/workspaces/wsname/commits/123/full.webp)
  if (urlWithoutQuery.startsWith("http") || urlWithoutQuery.startsWith("/")) {
    const marker = "/api/workspaces/"
    const index = urlWithoutQuery.indexOf(marker)
    if (index !== -1) {
      const remaining = urlWithoutQuery.slice(index + marker.length)
      const parts = remaining.split("/")
      if (parts.length >= 2) {
        // First part is workspace, rest is path
        const workspaceEncoded = parts[0]
        const pathParts = parts.slice(1)
        return {
          workspace: decodeURIComponent(workspaceEncoded),
          path: pathParts.join("/")
        }
      }
    }
  }

  return null
}

function buildWorkspaceUrl(workspace: string, path: string): string {
  const encodedWorkspace = encodeURIComponent(workspace)
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${API_BASE_URL}/api/workspaces/${encodedWorkspace}/${encodedPath}`
}

// Resolve image source for full-size or preview images
export function resolveImageSrc(value?: string | null, kind: "full" | "preview" = "full"): string | null {
  if (!value) return null

  // Handle data URLs and HTTP URLs directly (including SwarmUI image URLs)
  if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("/")) return value

  // For SwarmUI integration, the File property contains direct URLs
  // But we still need to handle workspace:// URIs for backward compatibility
  const workspaceInfo = parseWorkspaceImage(value)
  if (!workspaceInfo) return value

  // For SwarmUI integration, we don't have the workspace-organized file structure
  // The ViteUI candidates contain direct SwarmUI image URLs in the File property
  // So we return the value as-is, assuming it's already a valid URL
  return value
}

// Get metadata for a generation
export function resolveMetaSrc(value?: string | null): string | null {
  if (!value) return null

  // For SwarmUI integration, metadata handling may be different
  // For now, return null as we don't have metadata URLs in the same format
  return null
}