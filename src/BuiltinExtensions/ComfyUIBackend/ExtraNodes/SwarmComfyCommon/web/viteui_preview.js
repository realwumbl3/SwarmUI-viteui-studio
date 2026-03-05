import { app } from "../../scripts/app.js";

function getWidget(node, name) {
    if (!node?.widgets) {
        return null;
    }
    return node.widgets.find(w => w.name === name) || null;
}

function ensureWorkspaceId(node) {
    const widget = getWidget(node, "workspace_id");
    if (!widget) {
        return "";
    }
    if (!widget.value || `${widget.value}`.trim() === "") {
        widget.value = `viteui_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }
    return widget.value;
}

function openViteUI(node) {
    const workspaceId = ensureWorkspaceId(node);
    const controllerWidget = getWidget(node, "controller");
    const controller = controllerWidget?.value ?? "";
    let origin = window.location.origin;
    try {
        if (window.top?.location?.origin) {
            origin = window.top.location.origin;
        }
    }
    catch (e) {
        origin = window.location.origin;
    }
    const studioUrl = new URL(`/ViteUI/Studio?workspace_id=${encodeURIComponent(workspaceId ?? "")}`, origin).toString();
    const payload = {
        type: "swarm_viteui_open",
        workspace_id: workspaceId,
        controller: controller
    };
    if (window.top?.swarmViteUIOpen) {
        window.top.swarmViteUIOpen(workspaceId, controller);
        return;
    }
    if (window.parent?.swarmViteUIOpen) {
        window.parent.swarmViteUIOpen(workspaceId, controller);
        return;
    }
    if (window.top && window.top !== window) {
        window.top.postMessage(payload, "*");
    }
    if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, "*");
    }
    // Fallback: open studio in a new window if overlay hook is unavailable.
    const win = window.open(studioUrl, "_blank");
    if (!win) {
        alert("ViteUI Studio could not open. Please allow popups for this site.");
    }
}

app.registerExtension({
    name: "SwarmUI.ViteUI.Studio",
    nodeCreated(node) {
        if (node?.comfyClass !== "SwarmViteUIStudio" && node?.comfyClass !== "SwarmViteUIPreview") {
            return;
        }
        ensureWorkspaceId(node);
        const button = node.addWidget("button", "Open ViteUI Studio", null, () => openViteUI(node));
        if (button) {
            button.serialize = false;
        }
    }
});
