import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "./Api";
import Header from "./components/Header";
import Workspace from "./components/Workspace";
import WorkspaceBrowser from "./components/WorkspaceBrowser";
import { useTitleIconAnimation } from "./hooks/useTitleIconAnimation";
import { useWorkspaceContext, useWorkspaceState } from "./contexts/WorkspaceContext";
import PasteImageDialog from "./components/PasteImageDialog";

const CONTROLLER_BOOTSTRAP_PREFIX = "viteui-controller-bootstrap";

const storeControllerBootstrap = (workspaceId: string, controller: unknown): boolean => {
    if (!workspaceId || controller == null) {
        return false;
    }
    try {
        const payload = typeof controller === "string" ? controller : JSON.stringify(controller);
        if (!payload) {
            return false;
        }
        sessionStorage.setItem(`${CONTROLLER_BOOTSTRAP_PREFIX}-${workspaceId}`, payload);
        return true;
    } catch (error) {
        console.warn("Failed to store ViteUI bootstrap controller:", error);
        return false;
    }
};

function App() {
    const {
        openWorkspaces,
        currentWorkspace,
        openWorkspace,
        switchWorkspace,
        workspaceBrowserOpen,
        setWorkspaceBrowserOpen,
    } = useWorkspaceContext();
    const { workspaceState: activeWorkspaceState } = useWorkspaceState(currentWorkspace);
    const [recentWorkspaceIds, setRecentWorkspaceIds] = useState<string[]>([]);
    const [revealHotkeys, setRevealHotkeys] = useState(true);
    const [pastedImage, setPastedImage] = useState<string | null>(null);
    const initialLoadRef = useRef(false);

    useTitleIconAnimation(activeWorkspaceState.generation.loading);


    useEffect(() => {
        if (!currentWorkspace) return;
        setRecentWorkspaceIds((prev) => {
            const next = [currentWorkspace, ...prev.filter((id) => id !== currentWorkspace)];
            return next.slice(0, 2);
        });
    }, [currentWorkspace]);

    useEffect(() => {
        setRecentWorkspaceIds((prev) => prev.filter((id) => openWorkspaces.includes(id)));
    }, [openWorkspaces]);

    // Global app hotkeys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === '?') {
                console.log("Revealing hotkeys");
                e.preventDefault();
                setRevealHotkeys((prev) => !prev);
            } else if (key === 'escape' && workspaceBrowserOpen) {
                setWorkspaceBrowserOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [workspaceBrowserOpen, setWorkspaceBrowserOpen]);

    // Global paste handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Don't handle paste if it's in an input/textarea (let default behavior happen)
            const activeElement = document.activeElement;
            if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
                return;
            }

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            if (typeof event.target?.result === "string") {
                                setPastedImage(event.target.result);
                            }
                        };
                        reader.readAsDataURL(blob);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const { handleExternalCommit } = useWorkspaceContext();

    const initializeWorkspace = useCallback(async (): Promise<void> => {
        try {
            // Just check that workspaces can be loaded, but don't open any automatically
            await api.listWorkspaces();
            // No automatic workspace opening
        } catch (error) {
            console.error("Failed to initialize workspace:", error);
        }
    }, []);

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        if (!currentWorkspace && openWorkspaces.length === 0) {
            void initializeWorkspace();
        }
    }, [currentWorkspace, initializeWorkspace, openWorkspaces.length]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const workspaceId = params.get("workspace_id");
        if (!workspaceId) return;

        openWorkspace(workspaceId);

        const controller = params.get("controller");
        if (controller) {
            storeControllerBootstrap(workspaceId, controller);
        }
    }, [openWorkspace]);

    useEffect(() => {
        const onMessage = (event: MessageEvent): void => {
            const data = event.data;
            if (!data || typeof data !== "object") return;

            const messageType = data.type === "swarm_viteui_open" || data.type === "swarm_viteui_init" ? data.type : null;
            if (!messageType) return;

            const workspaceId = data.workspace_id ?? data.workspace;
            if (!workspaceId || typeof workspaceId !== "string") return;

            if (data.controller) {
                storeControllerBootstrap(workspaceId, data.controller);
            }
            openWorkspace(workspaceId);
        };

        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [openWorkspace]);

    const cachedWorkspaceIds = useMemo(() => {
        return recentWorkspaceIds.filter((id) => openWorkspaces.includes(id));
    }, [openWorkspaces, recentWorkspaceIds]);

    const handleWorkspaceChange = useCallback((workspaceName: string) => {
        if (!workspaceName) return;
        if (!openWorkspaces.includes(workspaceName)) {
            openWorkspace(workspaceName);
        } else {
            switchWorkspace(workspaceName);
        }
    }, []);


    return (
        <div className={`h-screen flex flex-col bg-studio-bg ${revealHotkeys ? 'reveal-hotkeys' : ''}`}>
            <Header />

            <div className="flex-1 flex overflow-hidden">
                {cachedWorkspaceIds.map((workspaceId) => (
                    <Workspace
                        key={workspaceId}
                        workspaceId={workspaceId}
                        isActive={workspaceId === currentWorkspace}
                    />
                ))}
                {!workspaceBrowserOpen && cachedWorkspaceIds.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-studio-text-muted text-sm">
                        No workspace open.
                    </div>
                )}
                {workspaceBrowserOpen && (
                    <WorkspaceBrowser
                        currentWorkspace={currentWorkspace}
                        onSelectWorkspace={handleWorkspaceChange}
                        onClose={() => setWorkspaceBrowserOpen(false)}
                    />
                )}
            </div>

            {pastedImage && currentWorkspace && (
                <PasteImageDialog
                    imageSrc={pastedImage}
                    workspaceId={currentWorkspace}
                    onClose={() => setPastedImage(null)}
                    onCommit={(newPath) => handleExternalCommit(currentWorkspace, newPath)}
                />
            )}
        </div>
    );
}

export default App;
