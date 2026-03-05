using Newtonsoft.Json.Linq;
using SwarmUI.Accounts;
using SwarmUI.Backends;
using SwarmUI.Core;
using SwarmUI.Media;
using SwarmUI.Text2Image;
using SwarmUI.Utils;
using SwarmUI.WebAPI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SwarmUI.Builtin_ComfyUIBackend.ViteUI;

public static class ViteUIWebAPI
{
    public static void Register()
    {
        API.RegisterAPICall(ViteUIGetWorkspace, false, Permissions.FundamentalGenerateTabAccess);
        API.RegisterAPICall(ViteUISaveControllerState, true, Permissions.FundamentalGenerateTabAccess);
        API.RegisterAPICall(ViteUIGenerate, true, Permissions.BasicImageGeneration);
        API.RegisterAPICall(ViteUIAcceptCandidate, true, Permissions.BasicImageGeneration);
        API.RegisterAPICall(ViteUIRejectCandidate, true, Permissions.BasicImageGeneration);
    }

    public static async Task<JObject> ViteUIGetWorkspace(Session session, string workspace_id = null)
    {
        ViteUIWorkspaceManager.ViteUIWorkspaceData workspace = ViteUIWorkspaceManager.GetOrCreate(session, workspace_id);
        return new JObject()
        {
            ["workspace_id"] = workspace.WorkspaceId,
            ["controller_state"] = workspace.ControllerState,
            ["candidates"] = JToken.FromObject(workspace.Candidates),
            ["accepted"] = JToken.FromObject(workspace.Accepted),
            ["rejected"] = JToken.FromObject(workspace.Rejected),
            ["generations"] = JToken.FromObject(workspace.Generations),
            ["videos"] = JToken.FromObject(workspace.Videos),
            ["timelapses"] = JToken.FromObject(workspace.Timelapses),
            ["active_generation_id"] = workspace.ActiveGenerationId
        };
    }

    public static async Task<JObject> ViteUISaveControllerState(Session session, string workspace_id, string controller_state)
    {
        ViteUIWorkspaceManager.ViteUIWorkspaceData workspace = ViteUIWorkspaceManager.UpdateControllerState(session, workspace_id, controller_state);
        return new JObject()
        {
            ["success"] = true,
            ["workspace_id"] = workspace.WorkspaceId
        };
    }

    public static async Task<JObject> ViteUIAcceptCandidate(Session session, string workspace_id, string candidate_id)
    {
        ViteUIWorkspaceManager.ViteUIWorkspaceData workspace = ViteUIWorkspaceManager.AcceptCandidate(session, workspace_id, candidate_id);
        return new JObject()
        {
            ["success"] = true,
            ["workspace_id"] = workspace.WorkspaceId,
            ["candidates"] = JToken.FromObject(workspace.Candidates)
        };
    }

    public static async Task<JObject> ViteUIRejectCandidate(Session session, string workspace_id, string candidate_id)
    {
        ViteUIWorkspaceManager.ViteUIWorkspaceData workspace = ViteUIWorkspaceManager.RejectCandidate(session, workspace_id, candidate_id);
        return new JObject()
        {
            ["success"] = true,
            ["workspace_id"] = workspace.WorkspaceId,
            ["candidates"] = JToken.FromObject(workspace.Candidates)
        };
    }

    public static async Task<JObject> ViteUIGenerate(Session session, string workspace_id, string controller_state, string execution_mode, int images = 1)
    {
        if (string.IsNullOrWhiteSpace(execution_mode))
        {
            execution_mode = "internal";
        }
        execution_mode = execution_mode.ToLowerInvariant();
        if (execution_mode != "internal" && execution_mode != "comfy_controller")
        {
            return new JObject() { ["error"] = $"Unknown execution mode '{execution_mode}'." };
        }
        ViteUIWorkspaceManager.ViteUIWorkspaceData workspace = ViteUIWorkspaceManager.GetOrCreate(session, workspace_id, controller_state);
        if (!string.IsNullOrWhiteSpace(workspace.ActiveGenerationId) && workspace.LastExecutionMode != execution_mode)
        {
            return new JObject() { ["error"] = "Cannot switch execution mode while a generation is running." };
        }
        controller_state = string.IsNullOrWhiteSpace(controller_state) ? workspace.ControllerState : controller_state;
        ViteUIControllerState state = ViteUIControllerState.FromJson(controller_state, out string parseError);
        if (state is null)
        {
            return new JObject() { ["error"] = parseError };
        }
        string validationError = state.Validate();
        if (!string.IsNullOrWhiteSpace(validationError))
        {
            return new JObject() { ["error"] = validationError };
        }
        bool hasComfyBackend = Program.Backends.EnumerateT2IBackends.Any(b => b.Backend.HandlerTypeData.ID.StartsWith("comfyui_") && b.Backend.Status == BackendStatus.RUNNING);
        if (execution_mode == "comfy_controller" && !hasComfyBackend)
        {
            return new JObject() { ["error"] = "No ComfyUI backend is running for comfy_controller mode." };
        }
        if (execution_mode == "internal" && state.Mode == "video")
        {
            bool hasInternalVideo = Program.Backends.EnumerateT2IBackends.Any(b => !b.Backend.HandlerTypeData.ID.StartsWith("comfyui_") && b.Backend.SupportedFeatures.Contains("video"));
            if (!hasInternalVideo)
            {
                return new JObject() { ["error"] = "No internal backend supports video generation." };
            }
        }
        using Session.GenClaim claim = session.Claim(gens: images);
        T2IParamInput input = new(session);
        try
        {
            state.ApplyToInput(input);
        }
        catch (SwarmReadableErrorException ex)
        {
            return new JObject() { ["error"] = ex.Message };
        }
        catch (Exception ex)
        {
            return new JObject() { ["error"] = $"Failed to apply controller inputs: {ex.Message}" };
        }
        input.Set(T2IParamTypes.ExecutionMode, execution_mode);
        input.Set(T2IParamTypes.Images, images);
        input.ExtraMeta["viteui_workspace_id"] = workspace.WorkspaceId;
        input.ExtraMeta["viteui_execution_mode"] = execution_mode;
        input.ExtraMeta["viteui_mode"] = state.Mode;
        input.ExtraMeta["viteui_controller_state"] = controller_state;
        input.ApplySpecialLogic();
        input.ApplyLateSpecialLogic();

        List<ViteUIWorkspaceManager.ViteUICandidate> candidates = [];
        ViteUIWorkspaceManager.ViteUIGeneration generation = ViteUIWorkspaceManager.StartGeneration(session, workspace, execution_mode, state.Mode, controller_state);
        generation.RequestId = input.UserRequestId;
        input.ExtraMeta["viteui_generation_id"] = generation.Id;
        input.ExtraMeta["viteui_request_id"] = input.UserRequestId;
        ViteUIWorkspaceManager.SaveWorkspace(session, workspace);

        List<Task> tasks = [];
        int maxDegrees = session.User.CalcMaxT2ISimultaneous;
        int batchSizeExpected = input.Get(T2IParamTypes.BatchSize, 1);
        void removeDoneTasks()
        {
            for (int i = 0; i < tasks.Count; i++)
            {
                if (tasks[i].IsCompleted)
                {
                    tasks.RemoveAt(i--);
                }
            }
        }

        void saveImage(T2IEngine.ImageOutput image, int actualIndex, T2IParamInput thisParams, string metadata)
        {
            bool noSave = thisParams.Get(T2IParamTypes.DoNotSave, false);
            if (!image.IsReal && thisParams.Get(T2IParamTypes.DoNotSaveIntermediates, false))
            {
                noSave = true;
            }
            string url;
            string filePath = null;
            if (noSave)
            {
                MediaFile file = image.File;
                if (session.User.Settings.FileFormat.ReformatTransientImages && image.ActualFileTask is not null)
                {
                    file = image.ActualFileTask.Result;
                }
                url = file.AsDataString();
            }
            else
            {
                (url, filePath) = session.SaveImage(image, actualIndex, thisParams, metadata);
            }
            if (url == "ERROR")
            {
                return;
            }
            lock (ViteUIWorkspaceManager.GetLock(session.User, workspace.WorkspaceId))
            {
                ViteUIWorkspaceManager.ViteUICandidate candidate = ViteUIWorkspaceManager.AddCandidate(session, workspace, generation, url, filePath, image.File, metadata);
                candidates.Add(candidate);
                ViteUIWorkspaceManager.SaveWorkspace(session, workspace);
            }
        }

        try
        {
            for (int i = 0; i < images && !claim.ShouldCancel; i++)
            {
                removeDoneTasks();
                while (tasks.Count > maxDegrees)
                {
                    await Task.WhenAny(tasks);
                    removeDoneTasks();
                }
                if (claim.ShouldCancel)
                {
                    break;
                }
                int localIndex = i * batchSizeExpected;
                int imageIndex = localIndex;
                T2IParamInput thisParams = input.Clone();
                if (!thisParams.Get(T2IParamTypes.NoSeedIncrement, false))
                {
                    if (thisParams.TryGet(T2IParamTypes.VariationSeed, out long varSeed) && thisParams.Get(T2IParamTypes.VariationSeedStrength) > 0)
                    {
                        thisParams.Set(T2IParamTypes.VariationSeed, varSeed + localIndex);
                    }
                    else
                    {
                        thisParams.Set(T2IParamTypes.Seed, thisParams.Get(T2IParamTypes.Seed) + localIndex);
                    }
                }
                int numCalls = 0;
                tasks.Add(Task.Run(() => T2IEngine.CreateImageTask(thisParams, $"{imageIndex}", claim, _ => { }, _ => { }, false,
                    (image, metadata) =>
                    {
                        int actualIndex = imageIndex + numCalls;
                        if (image.IsReal)
                        {
                            numCalls++;
                            if (numCalls > batchSizeExpected)
                            {
                                actualIndex = images * batchSizeExpected + numCalls;
                            }
                        }
                        else
                        {
                            actualIndex = -10 - numCalls;
                        }
                        saveImage(image, actualIndex, thisParams, metadata);
                    })));
            }
            while (tasks.Any())
            {
                await Task.WhenAny(tasks);
                removeDoneTasks();
            }
        }
        finally
        {
            ViteUIWorkspaceManager.FinishGeneration(session, workspace, generation);
        }
        return new JObject()
        {
            ["workspace_id"] = workspace.WorkspaceId,
            ["generation_id"] = generation.Id,
            ["candidates"] = JToken.FromObject(candidates)
        };
    }
}
