import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../lib/utils";
import api from "../Api";
import { useWorkspaceContext } from "../contexts/WorkspaceContext";
import OptionPicker from "./OptionPicker";
import NumberSelector from "./NumberSelector";

interface SettingsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const OPTIMIZATION_OPTIONS = [
    { value: "none", label: "None" },
    { value: "compile", label: "Compile" },
    { value: "tensorrt", label: "TensorRT" },
    { value: "onnx", label: "ONNX" },
];

const PREVIEW_QUALITY_OPTIONS = [
    { value: "fast", label: "Fast (Cheap)" },
    { value: "approx_nn", label: "Approx NN (Small)" },
    { value: "medium", label: "Medium (TAESD)" },
    { value: "high", label: "High (Full VAE)" },
];

export default function SettingsSidebar({ isOpen, onClose }: SettingsSidebarProps) {
    const [cpuOffload, setCpuOffload] = useState(false);
    const [optimizationLevel, setOptimizationLevel] = useState("none");
    const [livePreviewsEnable, setLivePreviewsEnable] = useState(true);
    const [livePreviewsEveryNSteps, setLivePreviewsEveryNSteps] = useState(1);
    const [livePreviewsQuality, setLivePreviewsQuality] = useState("fast");
    const { updateAppOptions } = useWorkspaceContext();
    const [editorPathOverride, setEditorPathOverride] = useState("");
    const [editorAppName, setEditorAppName] = useState("");
    const [disableRevealOnEdit, setDisableRevealOnEdit] = useState(false);
    const [inFlight, setInFlight] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchOptions = useCallback(async () => {
        try {
            const opts = await api.getOptions();
            setCpuOffload(!!opts.cpu_offload);
            setOptimizationLevel(opts.optimization_level ?? "none");
            setLivePreviewsEnable(opts.live_previews_enable !== false);
            setLivePreviewsEveryNSteps(
                typeof opts.live_previews_every_n_steps === "number"
                    ? opts.live_previews_every_n_steps
                    : 1
            );
            setLivePreviewsQuality(opts.live_previews_quality ?? "fast");
            setEditorPathOverride(opts.editor_path_override ?? "");
            setEditorAppName(opts.editor_app_name ?? "");
            setDisableRevealOnEdit(opts.disable_reveal_on_edit ?? false);
            setError(null);
        } catch (e) {
            console.error("Failed to fetch options:", e);
            setError("Failed to load settings");
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            void fetchOptions();
        }
    }, [isOpen, fetchOptions]);

    const handleCpuOffloadToggle = useCallback(async () => {
        if (inFlight) return;
        const nextValue = !cpuOffload;
        setInFlight(true);
        setError(null);
        setCpuOffload(nextValue);
        try {
            await api.setOptions({ cpu_offload: nextValue });
        } catch (e) {
            console.error("Failed to set CPU offload:", e);
            setCpuOffload(!nextValue);
            setError("Failed to apply. Model will reload on next change.");
        } finally {
            setInFlight(false);
        }
    }, [cpuOffload, inFlight]);

    const handleOptimizationChange = useCallback(
        async (value: string) => {
            if (inFlight) return;
            setInFlight(true);
            setError(null);
            const prev = optimizationLevel;
            setOptimizationLevel(value);
            try {
                await api.setOptions({ optimization_level: value });
            } catch (e) {
                console.error("Failed to set optimization level:", e);
                setOptimizationLevel(prev);
                setError("Failed to apply. Model will reload on next change.");
            } finally {
                setInFlight(false);
            }
        },
        [optimizationLevel, inFlight]
    );

    const handleLivePreviewsEnableToggle = useCallback(async () => {
        if (inFlight) return;
        const nextValue = !livePreviewsEnable;
        setInFlight(true);
        setError(null);
        setLivePreviewsEnable(nextValue);
        try {
            await api.setOptions({ live_previews_enable: nextValue });
        } catch (e) {
            console.error("Failed to set live previews:", e);
            setLivePreviewsEnable(!nextValue);
        } finally {
            setInFlight(false);
        }
    }, [livePreviewsEnable, inFlight]);

    const handleLivePreviewsEveryNStepsChange = useCallback(
        async (value: number) => {
            if (inFlight) return;
            setLivePreviewsEveryNSteps(value);
            setInFlight(true);
            setError(null);
            try {
                await api.setOptions({ live_previews_every_n_steps: value });
            } catch (e) {
                console.error("Failed to set live preview interval:", e);
            } finally {
                setInFlight(false);
            }
        },
        [inFlight]
    );

    const handleLivePreviewsQualityChange = useCallback(
        async (value: string) => {
            if (inFlight) return;
            setLivePreviewsQuality(value);
            setInFlight(true);
            setError(null);
            try {
                await api.setOptions({ live_previews_quality: value });
            } catch (e) {
                console.error("Failed to set live preview quality:", e);
                setError("Failed to set live preview quality");
            } finally {
                setInFlight(false);
            }
        },
        [inFlight]
    );

    const handleEditorPathOverrideChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setEditorPathOverride(value);
            updateAppOptions({ editorPathOverride: value });

            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(async () => {
                setInFlight(true);
                try {
                    await api.setOptions({ editor_path_override: value });
                } catch (e) {
                    console.error("Failed to set editor path override:", e);
                } finally {
                    setInFlight(false);
                }
            }, 500);
        },
        [updateAppOptions]
    );

    const handleEditorAppNameChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setEditorAppName(value);
            updateAppOptions({ editorAppName: value });

            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(async () => {
                setInFlight(true);
                try {
                    await api.setOptions({ editor_app_name: value });
                } catch (e) {
                    console.error("Failed to set editor app name:", e);
                } finally {
                    setInFlight(false);
                }
            }, 500);
        },
        [updateAppOptions]
    );

    const handleDisableRevealOnEditChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.checked;
            setDisableRevealOnEdit(value);
            updateAppOptions({ disableRevealOnEdit: value });
            if (inFlight) return;
            setInFlight(true);
            try {
                await api.setOptions({ disable_reveal_on_edit: value });
            } catch (e) {
                console.error("Failed to set disable reveal on edit:", e);
            } finally {
                setInFlight(false);
            }
        },
        [inFlight]
    );

    if (!isOpen) return null;

    return (
        <aside
            className={cn(
                "studio-properties-panel relative overflow-hidden flex flex-col",
                "w-80 border-l border-studio-border bg-studio-panel",
                "transition-all duration-300 ease-in-out"
            )}
        >
            <div className="studio-sidebar-header p-4 flex items-center justify-between border-b border-studio-border">
                <h3 className="text-studio-text font-semibold text-sm flex items-center gap-2">
                    <SettingsIcon size={16} />
                    Settings
                </h3>
                <button
                    onClick={onClose}
                    className="studio-btn-ghost p-1.5 rounded-md text-studio-text hover:text-studio-accent-hover transition-colors"
                    title="Close settings"
                    type="button"
                >
                    <ChevronLeft size={14} className="rotate-180" />
                </button>
            </div>

            <div className="studio-sidebar-content flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <label
                                htmlFor="cpu-offload-toggle"
                                className="text-sm font-medium text-studio-text cursor-pointer"
                            >
                                CPU offload
                            </label>
                            <div className="flex items-center gap-2">
                                {inFlight && (
                                    <span className="text-xs text-studio-textSecondary animate-pulse">
                                        Applying…
                                    </span>
                                )}
                                <input
                                    id="cpu-offload-toggle"
                                    type="checkbox"
                                    checked={cpuOffload}
                                    onChange={handleCpuOffloadToggle}
                                    disabled={inFlight}
                                    className={cn(
                                        "w-4 h-4 rounded border-studio-border",
                                        "text-studio-accent bg-studio-bg",
                                        "focus:ring-studio-accent focus:ring-2",
                                        inFlight && "cursor-not-allowed opacity-60"
                                    )}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-studio-text-muted mt-1">
                            Move model layers to CPU when idle to reduce VRAM. Slower generations but works on low-VRAM GPUs.
                        </p>
                        {error && (
                            <p className="text-xs text-red-500 mt-1">{error}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-studio-text block mb-1">
                            Optimization level
                        </label>
                        <OptionPicker
                            options={OPTIMIZATION_OPTIONS}
                            value={optimizationLevel}
                            onChange={handleOptimizationChange}
                            placeholder="None"
                            disabled={inFlight}
                        />
                        <p className="text-xs text-studio-text-muted mt-1">
                            Applies on next model load. Compile/TensorRT can speed up inference.
                        </p>
                    </div>

                    <div className="border-t border-studio-border pt-4">
                        <h4 className="text-sm font-medium text-studio-text mb-3">Live preview</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <label
                                    htmlFor="live-previews-toggle"
                                    className="text-sm text-studio-text cursor-pointer"
                                >
                                    Enable live previews
                                </label>
                                <input
                                    id="live-previews-toggle"
                                    type="checkbox"
                                    checked={livePreviewsEnable}
                                    onChange={handleLivePreviewsEnableToggle}
                                    disabled={inFlight}
                                    className={cn(
                                        "w-4 h-4 rounded border-studio-border",
                                        "text-studio-accent bg-studio-bg",
                                        "focus:ring-studio-accent focus:ring-2"
                                    )}
                                />
                            </div>
                            <div className="flex justify-between w-full gap-2 items-center">
                                <label className="text-sm text-studio-text block mb-1">
                                    Preview every N steps
                                </label>
                                <NumberSelector
                                    value={livePreviewsEveryNSteps}
                                    onChange={handleLivePreviewsEveryNStepsChange}
                                    min={1}
                                    max={50}
                                    step={1}
                                    label=""
                                    disable_scroll={true}
                                />
                            </div>
                            <div className="flex justify-between w-full gap-2">
                                <label className="text-sm text-studio-text block mb-1">
                                    Preview quality
                                </label>
                                <OptionPicker
                                    options={PREVIEW_QUALITY_OPTIONS}
                                    value={livePreviewsQuality}
                                    onChange={handleLivePreviewsQualityChange}
                                    placeholder="Fast (Approx)"
                                    disabled={inFlight}
                                />
                            </div>
                            <p className="text-[9px] text-studio-text-muted">
                                TAESD is high quality and very fast. VAE is slow but accurate.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-studio-border pt-4">
                        <h4 className="text-sm font-medium text-studio-text mb-3">External Editor</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-studio-textSecondary block mb-1">
                                    Executable Path
                                </label>
                                <input
                                    type="text"
                                    value={editorPathOverride}
                                    onChange={handleEditorPathOverrideChange}
                                    placeholder="e.g. C:\Program Files\Adobe\Adobe Photoshop\Photoshop.exe"
                                    className="w-full bg-studio-bg border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text focus:ring-1 focus:ring-studio-accent outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-studio-textSecondary block mb-1">
                                    Application Name
                                </label>
                                <input
                                    type="text"
                                    value={editorAppName}
                                    onChange={handleEditorAppNameChange}
                                    placeholder="e.g. Photoshop"
                                    className="w-full bg-studio-bg border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text focus:ring-1 focus:ring-studio-accent outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="disable_reveal_on_edit"
                                    checked={disableRevealOnEdit}
                                    onChange={handleDisableRevealOnEditChange}
                                    className="w-3 h-3 rounded bg-studio-bg border-studio-border text-studio-accent focus:ring-0 outline-none"
                                />
                                <label
                                    htmlFor="disable_reveal_on_edit"
                                    className="text-xs text-studio-textSecondary cursor-pointer"
                                >
                                    Disable Explorer Reveal on Edit
                                </label>
                            </div>
                            <p className="text-[9px] text-studio-text-muted">
                                Override default MS Paint. Used for timeline and canvas edits.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
