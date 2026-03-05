(() => {
    const overlayId = "swarm-viteui-overlay";
    const iframeId = "swarm-viteui-frame";

    function ensureOverlay() {
        let overlay = document.getElementById(overlayId);
        if (overlay) {
            return overlay;
        }
        overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.innerHTML = `
            <div class="swarm-viteui-header">
                <span class="swarm-viteui-title">ViteUI Studio</span>
                <button class="basic-button swarm-viteui-close" id="swarm_viteui_close">Close</button>
            </div>
            <iframe class="swarm-viteui-frame" id="${iframeId}" allow="clipboard-read; clipboard-write"></iframe>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector("#swarm_viteui_close").addEventListener("click", () => closeViteUI());
        return overlay;
    }

    function closeViteUI() {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.remove();
        }
    }

    function openViteUI(workspaceId, controller) {
        const overlay = ensureOverlay();
        const iframe = overlay.querySelector(`#${iframeId}`);
        const url = new URL(`/ViteUI/Studio?workspace_id=${encodeURIComponent(workspaceId ?? "")}`, window.location.origin).toString();
        iframe.src = url;
        iframe.onload = () => {
            iframe.contentWindow?.postMessage({
                type: "swarm_viteui_init",
                workspace_id: workspaceId ?? "",
                controller: controller ?? ""
            }, "*");
        };
    }

    window.swarmViteUIOpen = openViteUI;
    window.swarmViteUIClose = closeViteUI;

    window.addEventListener("message", (event) => {
        if (!event?.data) {
            return;
        }
        if (event.data.type === "swarm_viteui_open") {
            openViteUI(event.data.workspace_id, event.data.controller);
        }
        if (event.data.type === "swarm_viteui_close") {
            closeViteUI();
        }
    });
})();
