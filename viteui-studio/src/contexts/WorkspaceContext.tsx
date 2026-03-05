import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useWorkspaceTabs } from "../hooks/useWorkspaceTabs";
import type { CanvasBounds, GenerationMode } from "../types/components";
import type { ModelInfo, SamplerInfo, ModuleInfo } from "../Api";
import type { PromptMode } from "../components/PromptComposer/types";

const STORAGE_KEY_WORKSPACE_STATE = "viteui-workspace-state";

export interface WorkspaceGenerationState {
    selectedModel: string;
    selectedVAE: string;
    selectedSampler: string;
    clipSkip: number;
    steps: number;
    cfgScale: number;
    width: number;
    height: number;
    batchSize: number;
    count: number;
    denoisingStrength: number;
    inputImage: string | null;
    saveImages: boolean;
    loading: boolean;
    currentTaskId: string | null;
    pendingRestart: boolean;
    composingPartial: boolean;
    seed?: number;
}

export interface WorkspaceModeState {
    generationMode: GenerationMode;
    inpaintMask: string | null;
    inpaintMaskSnapshot: string | null;
    generationBounds: CanvasBounds | null;
    maskBlur: number;
    inpaintingFill: number;
    inpaintFullRes: boolean;
    inpaintFullResPadding: number;
    inpaintingMaskInvert: boolean;
    forceInpaintEditMode: boolean;
    returnPartialCandidates: boolean;
}

export interface WorkspaceUiState {
    promptMode: PromptMode;
    sidebarCollapsed: boolean;
    propertiesCollapsed: boolean;
    pageLocked: boolean;
    tagSource: string;
    settingsSidebarOpen: boolean;
}

export interface WorkspaceCanvasState {
    currentImage: string | null;
    canvasRefreshKey: number;
    footerCollapsed: boolean;
    /** True when user is in "canvas mode" (mask/border visible); set by clicking sidebar canvas or timeline item. Persisted so state restoration shows mask on load. */
    maskCanvasFocused: boolean;
}

export interface WorkspaceTransientState {
    canvasElement: HTMLCanvasElement | null;
    canvasContext: CanvasRenderingContext2D | null;
    maskHistory: (ImageData | ImageBitmap)[];
    historyIndex: number;
    width: number;
    height: number;
}

export interface WorkspaceState {
    generation: WorkspaceGenerationState;
    mode: WorkspaceModeState;
    ui: WorkspaceUiState;
    canvas: WorkspaceCanvasState;
}

interface WorkspaceContextValue {
    openWorkspaces: string[];
    currentWorkspace: string | null;
    openWorkspace: (workspaceName: string) => void;
    closeWorkspace: (workspaceName: string) => void;
    switchWorkspace: (workspaceName: string) => void;
    closeAllWorkspaces: () => void;
    workspaceStates: Record<string, WorkspaceState>;
    updateWorkspaceState: (workspaceId: string, updater: (prev: WorkspaceState) => WorkspaceState) => void;
    removeWorkspaceState: (workspaceId: string) => void;
    ensureWorkspaceState: (workspaceId: string) => void;
    models: ModelInfo[];
    setModels: Dispatch<SetStateAction<ModelInfo[]>>;
    modules: ModuleInfo[];
    setModules: Dispatch<SetStateAction<ModuleInfo[]>>;
    samplers: SamplerInfo[];
    setSamplers: Dispatch<SetStateAction<SamplerInfo[]>>;
    workspaceBrowserOpen: boolean;
    setWorkspaceBrowserOpen: Dispatch<SetStateAction<boolean>>;
    modelBrowserOpen: boolean;
    setModelBrowserOpen: Dispatch<SetStateAction<boolean>>;
    ensureWorkspaceTransientState: (workspaceId: string) => WorkspaceTransientState | null;
    getWorkspaceTransientState: (workspaceId: string) => WorkspaceTransientState | null;
    removeWorkspaceTransientState: (workspaceId: string) => void;
    handleExternalCommit: (workspaceId: string, newCommitPath: string) => Promise<void>;
    appOptions: { editorAppName: string; editorPathOverride: string; disableRevealOnEdit: boolean };
    updateAppOptions: (updates: Partial<{ editorAppName: string; editorPathOverride: string; disableRevealOnEdit: boolean }>) => void;
}

const createDefaultWorkspaceState = (): WorkspaceState => ({
    generation: {
        selectedModel: backendDefaults.model || "",
        selectedVAE: "Automatic",
        selectedSampler: backendDefaults.sampler,
        clipSkip: backendDefaults.clipSkip,
        steps: 20,
        cfgScale: backendDefaults.cfgScale,
        width: 512,
        height: 512,
        batchSize: 1,
        count: 1,
        denoisingStrength: 0.75,
        inputImage: null,
        saveImages: false,
        loading: false,
        currentTaskId: null,
        pendingRestart: false,
        composingPartial: false,
    },
    mode: {
        generationMode: "txt2img",
        inpaintMask: null,
        inpaintMaskSnapshot: null,
        generationBounds: null,
        maskBlur: 4,
        inpaintingFill: 0,
        inpaintFullRes: true,
        inpaintFullResPadding: 64,
        inpaintingMaskInvert: false,
        forceInpaintEditMode: false,
        returnPartialCandidates: false,
    },
    ui: {
        promptMode: "simple",
        sidebarCollapsed: false,
        propertiesCollapsed: true,
        pageLocked: false,
        tagSource: "Danbooru",
        settingsSidebarOpen: false,
    },
    canvas: {
        currentImage: null,
        canvasRefreshKey: 0,
        footerCollapsed: false,
        maskCanvasFocused: true,
    },
});

// We'll use a mutable object to store defaults loaded from backend
export const backendDefaults = {
    sampler: "Euler a",
    cfgScale: 7.0,
    model: "None",
    clipSkip: 1,
    editorAppName: "",
    editorPathOverride: "",
    disableRevealOnEdit: false,
}

export const updateBackendDefaults = (updates: Partial<typeof backendDefaults>) => {
    Object.assign(backendDefaults, updates);
};

const mergeWorkspaceState = (base: WorkspaceState, partial: Partial<WorkspaceState>): WorkspaceState => ({
    generation: { ...base.generation, ...partial.generation },
    mode: { ...base.mode, ...partial.mode },
    ui: { ...base.ui, ...partial.ui },
    canvas: { ...base.canvas, ...partial.canvas },
});

const loadWorkspaceStates = (): Record<string, WorkspaceState> => {
    if (typeof window === "undefined") {
        return {};
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY_WORKSPACE_STATE);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, Partial<WorkspaceState>>;
        return Object.entries(parsed).reduce<Record<string, WorkspaceState>>((acc, [workspaceId, state]) => {
            acc[workspaceId] = mergeWorkspaceState(createDefaultWorkspaceState(), state);
            return acc;
        }, {});
    } catch (error) {
        console.warn("Failed to load workspace state bundle:", error);
        return {};
    }
};

const stripTransientState = (state: WorkspaceState): WorkspaceState => ({
    ...state,
    generation: {
        ...state.generation,
        loading: false,
        pendingRestart: false,
        currentTaskId: null,
        composingPartial: false,
    },
    mode: {
        ...state.mode,
        inpaintMask: null,
        inpaintMaskSnapshot: null,
        generationBounds: null,
    },
    ui: {
        ...state.ui,
    },
    canvas: {
        ...state.canvas,
        // Timeline is handled by the /workspaces/<workspaceName>/generations endpoint
        // ComposerNodes are handled by the workspace prompt endpoint
    },
});

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces,
    } = useWorkspaceTabs();
    const [workspaceStates, setWorkspaceStates] = useState<Record<string, WorkspaceState>>(loadWorkspaceStates);
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [modules, setModules] = useState<ModuleInfo[]>([]);
    const [samplers, setSamplers] = useState<SamplerInfo[]>([]);
    const [workspaceBrowserOpen, setWorkspaceBrowserOpen] = useState(false);
    const [modelBrowserOpen, setModelBrowserOpen] = useState(false);
    const [appOptions, setAppOptions] = useState({ editorAppName: "", editorPathOverride: "", disableRevealOnEdit: false });

    const transientStateRef = useRef(new Map<string, WorkspaceTransientState>());

    const ensureWorkspaceTransientState = useCallback((workspaceId: string) => {
        if (transientStateRef.current.has(workspaceId)) {
            return transientStateRef.current.get(workspaceId) ?? null;
        }

        let canvasElement: HTMLCanvasElement | null = null;
        let canvasContext: CanvasRenderingContext2D | null = null;
        if (typeof document !== "undefined") {
            canvasElement = document.createElement("canvas");
            canvasContext = canvasElement.getContext("2d");
            canvasElement.width = 1;
            canvasElement.height = 1;
        }

        const next: WorkspaceTransientState = {
            canvasElement,
            canvasContext,
            maskHistory: [],
            historyIndex: -1,
            width: canvasElement?.width ?? 0,
            height: canvasElement?.height ?? 0,
        };

        transientStateRef.current.set(workspaceId, next);
        return next;
    }, []);

    const getWorkspaceTransientState = useCallback((workspaceId: string) => {
        return transientStateRef.current.get(workspaceId) ?? null;
    }, []);

    const removeWorkspaceTransientState = useCallback((workspaceId: string) => {
        transientStateRef.current.delete(workspaceId);
    }, []);

    const ensureWorkspaceState = useCallback((workspaceId: string) => {
        setWorkspaceStates((prev) => {
            if (prev[workspaceId]) return prev;
            return {
                ...prev,
                [workspaceId]: createDefaultWorkspaceState(),
            };
        });
        ensureWorkspaceTransientState(workspaceId);
    }, [ensureWorkspaceTransientState]);

    const updateWorkspaceState = useCallback((workspaceId: string, updater: (prev: WorkspaceState) => WorkspaceState) => {
        setWorkspaceStates((prev) => {
            const current = prev[workspaceId] ?? createDefaultWorkspaceState();
            const next = updater(current);
            return { ...prev, [workspaceId]: next };
        });
    }, []);

    const removeWorkspaceState = useCallback((workspaceId: string) => {
        setWorkspaceStates((prev) => {
            if (!prev[workspaceId]) return prev;
            const next = { ...prev };
            delete next[workspaceId];
            return next;
        });
        removeWorkspaceTransientState(workspaceId);
    }, [removeWorkspaceTransientState]);

    useEffect(() => {
        if (openWorkspaces.length === 0) return;
        setWorkspaceStates((prev) => {
            const next = { ...prev };
            for (const workspaceId of openWorkspaces) {
                if (!next[workspaceId]) {
                    next[workspaceId] = createDefaultWorkspaceState();
                }
            }
            return next;
        });
    }, [openWorkspaces]);

    useEffect(() => {
        if (openWorkspaces.length === 0) {
            transientStateRef.current.clear();
            return;
        }

        for (const workspaceId of transientStateRef.current.keys()) {
            if (!openWorkspaces.includes(workspaceId)) {
                transientStateRef.current.delete(workspaceId);
            }
        }
    }, [openWorkspaces]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const persistable = Object.entries(workspaceStates).reduce<Record<string, WorkspaceState>>((acc, [id, state]) => {
                acc[id] = stripTransientState(state);
                return acc;
            }, {});
            localStorage.setItem(STORAGE_KEY_WORKSPACE_STATE, JSON.stringify(persistable));
        } catch (error) {
            console.warn("Failed to persist workspace state bundle:", error);
        }
    }, [workspaceStates]);

    // Load defaults from backend on mount
    useEffect(() => {
        import("../Api").then(({ default: api }) => {
            api.getOptions().then((opts) => {
                if (opts) {
                    console.log("Loaded defaults from backend:", opts);
                    backendDefaults.sampler = opts.sd_default_sampler || backendDefaults.sampler;
                    backendDefaults.cfgScale = opts.sd_default_cfg_scale || backendDefaults.cfgScale;
                    backendDefaults.model = (opts.sd_model_checkpoint && opts.sd_model_checkpoint !== "None") ? opts.sd_model_checkpoint : backendDefaults.model;
                    backendDefaults.clipSkip = opts.CLIP_stop_at_last_layers || backendDefaults.clipSkip;
                    backendDefaults.editorAppName = opts.editor_app_name || "";
                    backendDefaults.editorPathOverride = opts.editor_path_override || "";
                    backendDefaults.disableRevealOnEdit = opts.disable_reveal_on_edit || false;
                    setAppOptions({
                        editorAppName: opts.editor_app_name || "",
                        editorPathOverride: opts.editor_path_override || "",
                        disableRevealOnEdit: opts.disable_reveal_on_edit || false,
                    });

                    // Update any workspaces that are still using initial empty defaults
                    setWorkspaceStates(prev => {
                        const next = { ...prev };
                        let changed = false;
                        for (const id in next) {
                            const state = next[id];
                            if ((!state.generation.selectedModel || state.generation.selectedModel === "") && backendDefaults.model) {
                                state.generation.selectedModel = backendDefaults.model;
                                changed = true;
                            }
                            if (state.generation.clipSkip === 1 && backendDefaults.clipSkip !== 1) {
                                state.generation.clipSkip = backendDefaults.clipSkip;
                                changed = true;
                            }
                        }
                        return changed ? next : prev;
                    });
                }
            }).catch(e => console.error("Failed to load defaults:", e));
        });
    }, []);

    const value = useMemo<WorkspaceContextValue>(() => ({
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces,
        workspaceStates,
        updateWorkspaceState,
        removeWorkspaceState,
        ensureWorkspaceState,
        models,
        setModels,
        modules,
        setModules,
        samplers,
        setSamplers,
        workspaceBrowserOpen,
        setWorkspaceBrowserOpen,
        modelBrowserOpen,
        setModelBrowserOpen,
        ensureWorkspaceTransientState,
        getWorkspaceTransientState,
        removeWorkspaceTransientState,
        handleExternalCommit: async (workspaceId, newCommitPath) => {
            // This is a stub that will be filled by the Workspace component or we can implement refresh logic here if we have access to the right state
            // Actually, individual Workspace components handle their own timeline state.
            // We can emit a custom event that the Workspace component listens to.
            window.dispatchEvent(new CustomEvent(`workspace-commit-${workspaceId}`, {
                detail: { newCommitPath }
            }));
        },
        appOptions,
        updateAppOptions: (updates) => {
            setAppOptions((prev) => {
                const next = { ...prev, ...updates };
                if (updates.editorAppName !== undefined) backendDefaults.editorAppName = updates.editorAppName;
                if (updates.editorPathOverride !== undefined) backendDefaults.editorPathOverride = updates.editorPathOverride;
                if (updates.disableRevealOnEdit !== undefined) backendDefaults.disableRevealOnEdit = updates.disableRevealOnEdit;
                return next;
            });
        },
    }), [
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        closeWorkspace,
        switchWorkspace,
        closeAllWorkspaces,
        workspaceStates,
        updateWorkspaceState,
        removeWorkspaceState,
        ensureWorkspaceState,
        models,
        samplers,
        modules,
        workspaceBrowserOpen,
        modelBrowserOpen,
        ensureWorkspaceTransientState,
        getWorkspaceTransientState,
        removeWorkspaceTransientState,
        appOptions,
    ]);

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspaceContext = (): WorkspaceContextValue => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
    }
    return context;
};

export const useWorkspaceState = (workspaceId: string | null) => {
    const { workspaceStates, updateWorkspaceState } = useWorkspaceContext();
    const workspaceState = useMemo(() => {
        if (!workspaceId) {
            return createDefaultWorkspaceState();
        }
        return workspaceStates[workspaceId] ?? createDefaultWorkspaceState();
    }, [workspaceId, workspaceStates]);

    const update = useCallback((updater: (prev: WorkspaceState) => WorkspaceState) => {
        if (!workspaceId) return;
        updateWorkspaceState(workspaceId, updater);
    }, [updateWorkspaceState, workspaceId]);

    return {
        workspaceState,
        updateWorkspaceState: update,
    };
};
