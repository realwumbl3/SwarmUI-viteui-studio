import json, time

INT_MAX = 0xffffffffffffffff
INT_MIN = -INT_MAX


class SwarmViteUIController:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "mode": (["txt2img", "img2img", "inpaint", "video"], {"default": "txt2img", "tooltip": "Generation mode for ViteUI."}),
                "prompt": ("STRING", {"default": "", "multiline": True}),
                "negative_prompt": ("STRING", {"default": "", "multiline": True}),
                "model": ("STRING", {"default": "", "multiline": False, "tooltip": "Base image model (checkpoint name)."}),
                "sampler": ("STRING", {"default": "", "multiline": False}),
                "scheduler": ("STRING", {"default": "", "multiline": False}),
                "seed": ("INT", {"default": -1, "min": INT_MIN, "max": INT_MAX, "step": 1}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000, "step": 1}),
                "cfg": ("FLOAT", {"default": 7.0, "min": 0, "max": 100, "step": 0.1, "round": 0.0000001}),
                "width": ("INT", {"default": 1024, "min": 64, "max": 16384, "step": 64}),
                "height": ("INT", {"default": 1024, "min": 64, "max": 16384, "step": 64}),
                "init_strength": ("FLOAT", {"default": 0.6, "min": 0, "max": 1, "step": 0.01, "round": 0.0000001}),
                "video_model": ("STRING", {"default": "", "multiline": False, "tooltip": "Video model name (eg Wan 2.2)."}),
                "video_swap_model": ("STRING", {"default": "", "multiline": False, "tooltip": "Swap model for video (Wan 2.2)."}),
                "video_swap_percent": ("FLOAT", {"default": 0.5, "min": 0, "max": 1, "step": 0.01, "round": 0.0000001}),
                "video_frames": ("INT", {"default": 81, "min": 1, "max": 10000, "step": 1}),
                "video_fps": ("INT", {"default": 24, "min": 1, "max": 240, "step": 1}),
                "video_steps": ("INT", {"default": 20, "min": 1, "max": 10000, "step": 1}),
                "video_format": (["h264-mp4", "webm", "gif", "webp"], {"default": "h264-mp4"}),
            },
            "optional": {
                "init_image": ("IMAGE", ),
                "mask_image": ("IMAGE", ),
            }
        }

    CATEGORY = "SwarmUI/viteui"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("controller_json",)
    FUNCTION = "build_state"
    DESCRIPTION = "Builds a ViteUI controller JSON payload for use with the ViteUI studio node."

    def build_state(self, mode, prompt, negative_prompt, model, sampler, scheduler, seed, steps, cfg, width, height,
                    init_strength, video_model, video_swap_model, video_swap_percent, video_frames, video_fps, video_steps, video_format,
                    init_image=None, mask_image=None):
        def image_to_payload(image):
            if image is None:
                return None
            try:
                import numpy as np
                from PIL import Image
                i = 255.0 * image.cpu().numpy()
                img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
                import io, base64
                out = io.BytesIO()
                img.save(out, format='PNG')
                b64 = base64.b64encode(out.getvalue()).decode('utf-8')
                return f"data:image/png;base64,{b64}"
            except Exception:
                return None

        state = {
            "mode": mode,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "model": model,
            "sampler": sampler,
            "scheduler": scheduler,
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "width": width,
            "height": height,
            "init_strength": init_strength,
            "init_image": image_to_payload(init_image),
            "mask_image": image_to_payload(mask_image),
            "video": {
                "model": video_model,
                "swap_model": video_swap_model,
                "swap_percent": video_swap_percent,
                "frames": video_frames,
                "fps": video_fps,
                "steps": video_steps,
                "format": video_format
            }
        }
        return (json.dumps(state), )

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return time.time()


class SwarmViteUIStudio:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "workspace_id": ("STRING", {"default": "", "multiline": False, "tooltip": "Workspace ID to open in ViteUI Studio."}),
                "controller": ("STRING", {"default": "{}", "multiline": True, "tooltip": "Optional controller JSON from SwarmViteUIController."}),
            }
        }

    CATEGORY = "SwarmUI/viteui"
    RETURN_TYPES = ()
    FUNCTION = "studio"
    OUTPUT_NODE = True
    DESCRIPTION = "Opens the ViteUI Studio editor for the given workspace."

    def studio(self, workspace_id, controller):
        return {}

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return time.time()


NODE_CLASS_MAPPINGS = {
    "SwarmViteUIController": SwarmViteUIController,
    "SwarmViteUIStudio": SwarmViteUIStudio,
}
