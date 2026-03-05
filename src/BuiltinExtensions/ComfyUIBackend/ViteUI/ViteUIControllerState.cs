using Newtonsoft.Json.Linq;
using SwarmUI.Text2Image;
using SwarmUI.Utils;
using System;
using System.Globalization;
using System.Linq;

namespace SwarmUI.Builtin_ComfyUIBackend.ViteUI;

public class ViteUIControllerState
{
    public string Mode { get; set; } = "txt2img";
    public string Prompt { get; set; } = "";
    public string NegativePrompt { get; set; } = "";
    public string Model { get; set; } = "";
    public string Sampler { get; set; } = "";
    public string Scheduler { get; set; } = "";
    public long? Seed { get; set; }
    public int? Steps { get; set; }
    public double? Cfg { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public double? InitStrength { get; set; }
    public string InitImage { get; set; }
    public string MaskImage { get; set; }
    public ViteUIVideoState Video { get; set; } = new();

    public class ViteUIVideoState
    {
        public string Model { get; set; } = "";
        public string SwapModel { get; set; } = "";
        public double? SwapPercent { get; set; }
        public int? Frames { get; set; }
        public int? Fps { get; set; }
        public int? Steps { get; set; }
        public string Format { get; set; } = "";
    }

    public static ViteUIControllerState FromJson(string json, out string error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(json))
        {
            return new ViteUIControllerState();
        }
        try
        {
            JObject data = Utilities.ParseToJson(json);
            ViteUIControllerState state = new()
            {
                Mode = data.Value<string>("mode") ?? "txt2img",
                Prompt = data.Value<string>("prompt") ?? "",
                NegativePrompt = data.Value<string>("negative_prompt") ?? "",
                Model = data.Value<string>("model") ?? "",
                Sampler = data.Value<string>("sampler") ?? "",
                Scheduler = data.Value<string>("scheduler") ?? "",
                Seed = data.TryGetValue("seed", out JToken seedTok) ? seedTok.Value<long>() : null,
                Steps = data.TryGetValue("steps", out JToken stepsTok) ? stepsTok.Value<int>() : null,
                Cfg = data.TryGetValue("cfg", out JToken cfgTok) ? cfgTok.Value<double>() : null,
                Width = data.TryGetValue("width", out JToken widthTok) ? widthTok.Value<int>() : null,
                Height = data.TryGetValue("height", out JToken heightTok) ? heightTok.Value<int>() : null,
                InitStrength = data.TryGetValue("init_strength", out JToken initStrengthTok) ? initStrengthTok.Value<double>() : null,
                InitImage = data.Value<string>("init_image"),
                MaskImage = data.Value<string>("mask_image"),
                Video = new ViteUIVideoState()
            };
            if (data.TryGetValue("video", out JToken videoTok) && videoTok is JObject videoObj)
            {
                state.Video.Model = videoObj.Value<string>("model") ?? "";
                state.Video.SwapModel = videoObj.Value<string>("swap_model") ?? "";
                state.Video.SwapPercent = videoObj.TryGetValue("swap_percent", out JToken swapTok) ? swapTok.Value<double>() : null;
                state.Video.Frames = videoObj.TryGetValue("frames", out JToken framesTok) ? framesTok.Value<int>() : null;
                state.Video.Fps = videoObj.TryGetValue("fps", out JToken fpsTok) ? fpsTok.Value<int>() : null;
                state.Video.Steps = videoObj.TryGetValue("steps", out JToken vstepsTok) ? vstepsTok.Value<int>() : null;
                state.Video.Format = videoObj.Value<string>("format") ?? "";
            }
            return state;
        }
        catch (Exception ex)
        {
            error = $"Invalid controller JSON: {ex.Message}";
            return null;
        }
    }

    public string Validate()
    {
        string mode = (Mode ?? "txt2img").ToLowerInvariant();
        if (!new[] { "txt2img", "img2img", "inpaint", "video" }.Contains(mode))
        {
            return $"Unknown mode '{Mode}'.";
        }
        if ((mode == "img2img" || mode == "inpaint") && string.IsNullOrWhiteSpace(InitImage))
        {
            return "Init image is required for img2img/inpaint.";
        }
        if (mode == "inpaint" && string.IsNullOrWhiteSpace(MaskImage))
        {
            return "Mask image is required for inpaint.";
        }
        if (mode == "video" && string.IsNullOrWhiteSpace(Video?.Model))
        {
            return "Video model is required for video mode.";
        }
        return null;
    }

    public void ApplyToInput(T2IParamInput input)
    {
        string mode = (Mode ?? "txt2img").ToLowerInvariant();
        void applyIf(string id, string val)
        {
            if (!string.IsNullOrWhiteSpace(val))
            {
                T2IParamTypes.ApplyParameter(id, val, input);
            }
        }

        void applyIfNum(string id, double? val)
        {
            if (val.HasValue)
            {
                T2IParamTypes.ApplyParameter(id, val.Value.ToString(CultureInfo.InvariantCulture), input);
            }
        }

        applyIf(T2IParamTypes.Prompt.Type.ID, Prompt);
        applyIf(T2IParamTypes.NegativePrompt.Type.ID, NegativePrompt);
        applyIf(T2IParamTypes.Model.Type.ID, Model);
        applyIfNum(T2IParamTypes.Seed.Type.ID, Seed);
        applyIfNum(T2IParamTypes.Steps.Type.ID, Steps);
        applyIfNum(T2IParamTypes.CFGScale.Type.ID, Cfg);
        applyIfNum(T2IParamTypes.Width.Type.ID, Width);
        applyIfNum(T2IParamTypes.Height.Type.ID, Height);
        if (mode == "img2img" || mode == "inpaint")
        {
            applyIfNum(T2IParamTypes.InitImageCreativity.Type.ID, InitStrength);
        }

        if (!string.IsNullOrWhiteSpace(InitImage))
        {
            T2IParamTypes.ApplyParameter(T2IParamTypes.InitImage.Type.ID, InitImage, input);
        }
        if (!string.IsNullOrWhiteSpace(MaskImage))
        {
            T2IParamTypes.ApplyParameter(T2IParamTypes.MaskImage.Type.ID, MaskImage, input);
        }

        if (!string.IsNullOrWhiteSpace(Video?.Model))
        {
            applyIf(T2IParamTypes.VideoModel.Type.ID, Video.Model);
            applyIf(T2IParamTypes.VideoSwapModel.Type.ID, Video.SwapModel);
            applyIfNum(T2IParamTypes.VideoSwapPercent.Type.ID, Video.SwapPercent);
            applyIfNum(T2IParamTypes.VideoFrames.Type.ID, Video.Frames);
            applyIfNum(T2IParamTypes.VideoFPS.Type.ID, Video.Fps);
            applyIfNum(T2IParamTypes.VideoSteps.Type.ID, Video.Steps);
            applyIf(T2IParamTypes.VideoFormat.Type.ID, Video.Format);
        }

        if (!string.IsNullOrWhiteSpace(Sampler))
        {
            if (T2IParamTypes.TryGetType("sampler", out _, input))
            {
                T2IParamTypes.ApplyParameter("sampler", Sampler, input);
            }
        }
        if (!string.IsNullOrWhiteSpace(Scheduler))
        {
            if (T2IParamTypes.TryGetType("scheduler", out _, input))
            {
                T2IParamTypes.ApplyParameter("scheduler", Scheduler, input);
            }
        }
    }
}
