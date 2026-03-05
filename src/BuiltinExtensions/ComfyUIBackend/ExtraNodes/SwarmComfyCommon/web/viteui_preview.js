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
    const getInitImage = (value) => {
        if (value == null) {
            return "";
        }
        if (typeof value === "string") {
            return value;
        }
        if (typeof value === "object") {
            if (typeof value.image === "string") {
                return value.image;
            }
            if (typeof value.url === "string") {
                return value.url;
            }
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
                return value[0];
            }
        }
        return "";
    };
    const buildControllerPayload = () => {
        const mode = getWidget(node, "mode")?.value ?? "txt2img";
        const prompt = getWidget(node, "prompt")?.value ?? "";
        const negativePrompt = getWidget(node, "negative_prompt")?.value ?? "";
        const model = getWidget(node, "model")?.value ?? "";
        const sampler = getWidget(node, "sampler")?.value ?? "";
        const scheduler = getWidget(node, "scheduler")?.value ?? "";
        const seed = Number(getWidget(node, "seed")?.value ?? -1);
        const steps = Number(getWidget(node, "steps")?.value ?? 20);
        const cfg = Number(getWidget(node, "cfg")?.value ?? 7.0);
        const width = Number(getWidget(node, "width")?.value ?? 1024);
        const height = Number(getWidget(node, "height")?.value ?? 1024);
        const initStrength = Number(getWidget(node, "init_strength")?.value ?? 0.6);
        const videoModel = getWidget(node, "video_model")?.value ?? "";
        const videoSwapModel = getWidget(node, "video_swap_model")?.value ?? "";
        const videoSwapPercent = Number(getWidget(node, "video_swap_percent")?.value ?? 0.5);
        const videoFrames = Number(getWidget(node, "video_frames")?.value ?? 81);
        const videoFps = Number(getWidget(node, "video_fps")?.value ?? 24);
        const videoSteps = Number(getWidget(node, "video_steps")?.value ?? 20);
        const videoFormat = getWidget(node, "video_format")?.value ?? "h264-mp4";

        return JSON.stringify({
            mode,
            prompt,
            negative_prompt: negativePrompt,
            model,
            sampler,
            scheduler,
            seed,
            steps,
            cfg,
            width,
            height,
            init_strength: initStrength,
            init_image: getInitImage(getWidget(node, "init_image")?.value),
            mask_image: getInitImage(getWidget(node, "mask_image")?.value),
            video: {
                model: videoModel,
                swap_model: videoSwapModel,
                swap_percent: videoSwapPercent,
                frames: videoFrames,
                fps: videoFps,
                steps: videoSteps,
                format: videoFormat
            }
        });
    };
    const controller = buildControllerPayload();
    let origin = window.location.origin;
    try {
        if (window.top?.location?.origin) {
            origin = window.top.location.origin;
        }
    }
    catch (e) {
        origin = window.location.origin;
    }
    const studioUrlObj = new URL(`/ViteUI/Studio?workspace_id=${encodeURIComponent(workspaceId ?? "")}`, origin);
    if (typeof controller === "string" && controller.length < 2000) {
        studioUrlObj.searchParams.set("controller", controller);
    }
    const studioUrl = studioUrlObj.toString();
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
