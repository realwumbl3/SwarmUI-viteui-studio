import { useEffect, useState, useMemo, useRef } from "react";
import { Folder, Search, Image as ImageIcon, X, ChevronRight, ChevronDown, Check } from "lucide-react";
import api, { ModelItem, ModelNode, ModelGroup } from "../Api";
import { cn } from "../lib/utils";

interface ModelBrowserProps {
    currentModel: string;
    onSelectModel: (model: string) => void;
    onClose: () => void;
}

const ModelBrowser = ({ currentModel, onSelectModel, onClose }: ModelBrowserProps) => {
    const [structure, setStructure] = useState<ModelItem[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>(() => {
        return localStorage.getItem("viteui_last_model_folder") || "root";
    });
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        const saved = localStorage.getItem("viteui_model_browser_expanded");
        return saved ? new Set(JSON.parse(saved)) : new Set(["root"]);
    });
    const [loading, setLoading] = useState(true);

    const activeModelRef = useRef<HTMLDivElement>(null);
    const hasAutoNavigated = useRef(false);

    const STORAGE_KEYS = {
        LAST_MODEL: "viteui_last_model_selection",
        LAST_FOLDER: "viteui_last_model_folder",
        EXPANDED_FOLDERS: "viteui_model_browser_expanded"
    };

    // Get content for current view
    const visibleContent = useMemo(() => {
        if (searchQuery) {
            // Flatten everything for search
            const allModels: ModelNode[] = [];
            const traverse = (items: ModelItem[]) => {
                items.forEach(item => {
                    if (item.type === "model") {
                        if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                            allModels.push(item);
                        }
                    } else if (item.type === "group") {
                        traverse(item.children);
                    }
                });
            };
            traverse(structure);
            return allModels;
        }

        // Folder view
        if (selectedFolder === "root") {
            // Show all models flattened
            const allModels: ModelNode[] = [];
            const traverse = (items: ModelItem[]) => {
                items.forEach(item => {
                    if (item.type === "model") {
                        allModels.push(item);
                    } else if (item.type === "group") {
                        traverse(item.children);
                    }
                });
            };
            traverse(structure);
            return allModels;
        }

        // Find specific folder
        // We stored paths like "folder/subfolder"
        // We need to traverse to find the node
        const findNode = (items: ModelItem[], pathParts: string[]): ModelGroup | null => {
            const currentPart = pathParts[0];
            const found = items.find(i => i.type === "group" && i.name === currentPart) as ModelGroup | undefined;

            if (!found) return null;
            if (pathParts.length === 1) return found;
            return findNode(found.children, pathParts.slice(1));
        };

        const node = findNode(structure, selectedFolder.split("/"));
        if (node) {
            // Return only models in this folder
            return node.children.filter(c => c.type === "model") as ModelNode[];
        }
        return [];

    }, [structure, selectedFolder, searchQuery]);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const models = await api.getViteModels();
                setStructure(models);
            } catch (error) {
                console.error("Failed to load models:", error);
            } finally {
                setLoading(false);
            }
        };
        loadModels();
    }, []);

    // Persist folder and expanded state
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.LAST_FOLDER, selectedFolder);
    }, [selectedFolder]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.EXPANDED_FOLDERS, JSON.stringify(Array.from(expandedFolders)));
    }, [expandedFolders]);

    // Auto-navigate to current model's folder on load
    useEffect(() => {
        if (!loading && structure.length > 0 && !hasAutoNavigated.current) {
            const targetModel = (currentModel && currentModel !== "None")
                ? currentModel
                : localStorage.getItem(STORAGE_KEYS.LAST_MODEL);

            if (!targetModel) {
                hasAutoNavigated.current = true;
                return;
            }

            // Helper to find path to model
            const findModelPath = (items: ModelItem[], targetModel: string, currentPath: string = ""): string | null => {
                for (const item of items) {
                    if (item.type === "model") {
                        if (item.model_name === targetModel) {
                            return currentPath || "root";
                        }
                    } else if (item.type === "group") {
                        const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                        const found = findModelPath(item.children, targetModel, newPath);
                        if (found) return found;
                    }
                }
                return null;
            };

            const path = findModelPath(structure, targetModel);
            if (path) {
                setSelectedFolder(path);

                // Expand all parents
                const parts = path.split("/");
                const newExpanded = new Set(expandedFolders);
                let currentBuildPath = "";
                parts.forEach(part => {
                    currentBuildPath = currentBuildPath ? `${currentBuildPath}/${part}` : part;
                    newExpanded.add(currentBuildPath);
                });
                setExpandedFolders(newExpanded);
            }
            hasAutoNavigated.current = true;
        }
    }, [loading, structure, currentModel]);

    // Scroll active model into view
    useEffect(() => {
        if (!loading && activeModelRef.current) {
            activeModelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [loading, visibleContent, currentModel]);

    const lastSelectedModel = useMemo(() => localStorage.getItem(STORAGE_KEYS.LAST_MODEL), []);
    const effectiveHighlightModel = (currentModel && currentModel !== "None") ? currentModel : lastSelectedModel;

    const toggleExpanded = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8" onClick={onClose}>
            <div
                className="bg-studio-panel border border-studio-border rounded-lg w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-studio-border flex items-center justify-between bg-studio-surface">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-studio-accent" />
                        Model Browser
                    </h2>

                    <div className="flex-1 max-w-md mx-4 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-studio-textSecondary" />
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-studio-bg border border-studio-border rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-studio-accent"
                            autoFocus
                        />
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-studio-bg rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-studio-border bg-studio-surface overflow-y-auto p-2">
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm mb-1",
                                selectedFolder === "root" ? "bg-studio-accent/20 text-studio-accent" : "hover:bg-studio-bg text-studio-text"
                            )}
                            onClick={() => setSelectedFolder("root")}
                        >
                            <Folder className="w-4 h-4" />
                            All Models
                        </div>

                        <FolderTree
                            items={structure}
                            selectedFolder={selectedFolder}
                            onSelect={setSelectedFolder}
                            expanded={expandedFolders}
                            onToggle={toggleExpanded}
                        />

                    </div>

                    {/* Main Grid */}
                    <div className="flex-1 overflow-y-auto p-4 bg-studio-bg">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-studio-textSecondary">Loading...</div>
                        ) : visibleContent.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-studio-textSecondary">No models found.</div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                {visibleContent.map((model) => (
                                    <div
                                        key={model.filename}
                                        className={cn(
                                            "group cursor-pointer rounded-lg overflow-hidden border border-studio-border bg-studio-surface hover:border-studio-accent transition-all relative",
                                            effectiveHighlightModel === model.model_name && "ring-2 ring-studio-accent border-transparent"
                                        )}
                                        ref={effectiveHighlightModel === model.model_name ? activeModelRef : null}
                                        onClick={() => {
                                            localStorage.setItem(STORAGE_KEYS.LAST_MODEL, model.model_name);
                                            onSelectModel(model.model_name);
                                            onClose();
                                        }}
                                    >
                                        <div className="aspect-[1] bg-studio-checkerboard relative overflow-hidden">
                                            {model.image ? (
                                                <img
                                                    src={`/api/images/get?path=${encodeURIComponent(model.image)}`}
                                                    alt={model.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-studio-textSecondary bg-studio-surface/50">
                                                    <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                                                    <span className="text-xs opacity-50">No Preview</span>
                                                </div>
                                            )}

                                            {currentModel === model.model_name && (
                                                <div className="absolute top-2 right-2 bg-studio-accent text-white rounded-full p-1 shadow-md">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            )}

                                            {model.meta && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                                                    {Object.entries(model.meta).slice(0, 2).map(([k, v]) => (
                                                        <div key={k} className="text-[10px] text-white/80 truncate">
                                                            <span className="font-semibold opacity-70">{k}:</span> {String(v)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-medium text-sm truncate" title={model.name}>
                                                {model.name}
                                            </h3>
                                            <p className="text-xs text-studio-textSecondary truncate mt-0.5">
                                                {model.subtype === "folder" ? "Folder Model" : "File Model"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple recursive tree component
const FolderTree = ({ items, selectedFolder, onSelect, expanded, onToggle, pathPrefix = "" }: any) => {
    return (
        <div className="pl-2">
            {items.map((item: ModelItem) => {
                if (item.type !== "group") return null;

                const currentPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name;
                const isExpanded = expanded.has(currentPath);
                const isSelected = selectedFolder === currentPath;

                return (
                    <div key={currentPath}>
                        <div
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer text-sm mb-0.5 select-none",
                                isSelected ? "bg-studio-accent/20 text-studio-accent" : "hover:bg-studio-bg text-studio-text"
                            )}
                            onClick={() => onSelect(currentPath)}
                        >
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(currentPath);
                                }}
                                className="hover:bg-studio-border/50 rounded p-0.5"
                            >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </span>
                            <Folder className={cn("w-3.5 h-3.5", isSelected ? "fill-current" : "")} />
                            <span className="truncate">{item.name}</span>
                        </div>

                        {isExpanded && (
                            <FolderTree
                                items={item.children}
                                selectedFolder={selectedFolder}
                                onSelect={onSelect}
                                expanded={expanded}
                                onToggle={onToggle}
                                pathPrefix={currentPath}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ModelBrowser;
