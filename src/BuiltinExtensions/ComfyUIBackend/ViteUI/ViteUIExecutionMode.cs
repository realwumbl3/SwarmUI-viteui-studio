using SwarmUI.Backends;
using SwarmUI.Text2Image;

namespace SwarmUI.Builtin_ComfyUIBackend.ViteUI;

public static class ViteUIExecutionMode
{
    public static bool ValidateBackend(T2IParamInput input, BackendHandler.T2IBackendData backend)
    {
        if (!input.TryGet(T2IParamTypes.ExecutionMode, out string mode) || string.IsNullOrWhiteSpace(mode) || mode == "any")
        {
            return true;
        }
        string handlerId = backend.Backend.HandlerTypeData.ID.ToLowerInvariant();
        bool isComfy = handlerId.StartsWith("comfyui_");
        if (mode == "internal" && isComfy)
        {
            input.RefusalReasons.Add("Execution mode requires a non-Comfy backend");
            return false;
        }
        if (mode == "comfy_controller" && !isComfy)
        {
            input.RefusalReasons.Add("Execution mode requires a Comfy backend");
            return false;
        }
        return true;
    }
}
