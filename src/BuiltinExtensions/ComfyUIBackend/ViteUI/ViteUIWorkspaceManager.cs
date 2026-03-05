using FreneticUtilities.FreneticToolkit;
using Newtonsoft.Json;
using SwarmUI.Accounts;
using SwarmUI.Core;
using SwarmUI.Media;
using SwarmUI.Text2Image;
using SwarmUI.Utils;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace SwarmUI.Builtin_ComfyUIBackend.ViteUI;

public static class ViteUIWorkspaceManager
{
    public class ViteUICandidate
    {
        public string Id { get; set; }
        public string File { get; set; }
        public string FilePath { get; set; }
        public string MediaType { get; set; }
        public string Metadata { get; set; }
        public string Mode { get; set; }
        public string ExecutionMode { get; set; }
        public string GenerationId { get; set; }
        public bool IsVideo { get; set; }
        public long Created { get; set; }
    }

    public class ViteUIGeneration
    {
        public string Id { get; set; }
        public long Created { get; set; }
        public string Mode { get; set; }
        public string ExecutionMode { get; set; }
        public string ControllerState { get; set; }
        public List<string> CandidateIds { get; set; } = [];
        public long RequestId { get; set; }
    }

    public class ViteUIWorkspaceData
    {
        public string WorkspaceId { get; set; }
        public long Created { get; set; }
        public long Updated { get; set; }
        public string ControllerState { get; set; }
        public string LastExecutionMode { get; set; }
        public string ActiveGenerationId { get; set; }
        public List<ViteUICandidate> Candidates { get; set; } = [];
        public List<ViteUICandidate> Accepted { get; set; } = [];
        public List<ViteUICandidate> Rejected { get; set; } = [];
        public List<ViteUIGeneration> Generations { get; set; } = [];
        public List<ViteUICandidate> Videos { get; set; } = [];
        public List<ViteUICandidate> Timelapses { get; set; } = [];
    }

    public static ConcurrentDictionary<string, LockObject> WorkspaceLocks = new();

    public static string WorkspaceRoot => $"{Program.DataDir}/viteui_workspaces";

    public static string GetWorkspaceFolder(User user) => $"{WorkspaceRoot}/{user.UserID}";

    public static string GetWorkspacePath(User user, string workspaceId) => $"{GetWorkspaceFolder(user)}/{workspaceId}.json";

    public static LockObject GetLock(User user, string workspaceId) => WorkspaceLocks.GetOrAdd($"{user.UserID}/{workspaceId}", _ => new LockObject());

    public static ViteUIWorkspaceData GetOrCreate(Session session, string workspaceId, string controllerState = null)
    {
        if (string.IsNullOrWhiteSpace(workspaceId))
        {
            workspaceId = Guid.NewGuid().ToString("N");
        }
        workspaceId = Utilities.StrictFilenameClean(workspaceId);
        if (string.IsNullOrWhiteSpace(workspaceId))
        {
            workspaceId = Guid.NewGuid().ToString("N");
        }
        LockObject locker = GetLock(session.User, workspaceId);
        lock (locker)
        {
            string path = GetWorkspacePath(session.User, workspaceId);
            if (File.Exists(path))
            {
                ViteUIWorkspaceData existing = JsonConvert.DeserializeObject<ViteUIWorkspaceData>(File.ReadAllText(path));
                if (existing is not null)
                {
                    existing.WorkspaceId = workspaceId;
                    if (!string.IsNullOrWhiteSpace(controllerState))
                    {
                        existing.ControllerState = controllerState;
                    }
                    existing.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                    SaveWorkspace(session, existing);
                    return existing;
                }
            }
            ViteUIWorkspaceData created = new()
            {
                WorkspaceId = workspaceId,
                Created = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                ControllerState = controllerState ?? "{}",
                LastExecutionMode = "internal"
            };
            SaveWorkspace(session, created);
            return created;
        }
    }

    public static ViteUIWorkspaceData UpdateControllerState(Session session, string workspaceId, string controllerState)
    {
        ViteUIWorkspaceData workspace = GetOrCreate(session, workspaceId);
        LockObject locker = GetLock(session.User, workspaceId);
        lock (locker)
        {
            workspace.ControllerState = controllerState ?? workspace.ControllerState;
            workspace.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            SaveWorkspace(session, workspace);
        }
        return workspace;
    }

    public static ViteUIGeneration StartGeneration(Session session, ViteUIWorkspaceData workspace, string executionMode, string mode, string controllerState)
    {
        ViteUIGeneration generation = new()
        {
            Id = Guid.NewGuid().ToString("N"),
            Created = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ExecutionMode = executionMode,
            Mode = mode,
            ControllerState = controllerState ?? workspace.ControllerState,
            RequestId = 0
        };
        workspace.ActiveGenerationId = generation.Id;
        workspace.LastExecutionMode = executionMode;
        workspace.Generations.Add(generation);
        workspace.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return generation;
    }

    public static ViteUICandidate AddCandidate(Session session, ViteUIWorkspaceData workspace, ViteUIGeneration generation, string file, string filePath, MediaFile media, string metadata)
    {
        bool isAnimation = media.Type.MetaType == MediaMetaType.Animation;
        bool isVideo = media.Type.MetaType == MediaMetaType.Video || isAnimation;
        ViteUICandidate candidate = new()
        {
            Id = Guid.NewGuid().ToString("N"),
            File = file,
            FilePath = filePath,
            MediaType = media.Type.MimeType,
            Metadata = metadata,
            Mode = generation.Mode,
            ExecutionMode = generation.ExecutionMode,
            GenerationId = generation.Id,
            IsVideo = isVideo,
            Created = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };
        workspace.Candidates.Add(candidate);
        if (isVideo)
        {
            workspace.Videos.Add(candidate);
        }
        if (isAnimation)
        {
            workspace.Timelapses.Add(candidate);
        }
        generation.CandidateIds.Add(candidate.Id);
        workspace.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return candidate;
    }

    public static ViteUIWorkspaceData FinishGeneration(Session session, ViteUIWorkspaceData workspace, ViteUIGeneration generation)
    {
        workspace.ActiveGenerationId = null;
        workspace.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        SaveWorkspace(session, workspace);
        return workspace;
    }

    public static ViteUIWorkspaceData AcceptCandidate(Session session, string workspaceId, string candidateId)
    {
        ViteUIWorkspaceData workspace = GetOrCreate(session, workspaceId);
        LockObject locker = GetLock(session.User, workspaceId);
        lock (locker)
        {
            ViteUICandidate candidate = workspace.Candidates.FirstOrDefault(c => c.Id == candidateId);
            if (candidate is not null)
            {
                workspace.Candidates.Remove(candidate);
                workspace.Accepted.Add(candidate);
            }
            workspace.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            SaveWorkspace(session, workspace);
        }
        return workspace;
    }

    public static ViteUIWorkspaceData RejectCandidate(Session session, string workspaceId, string candidateId)
    {
        ViteUIWorkspaceData workspace = GetOrCreate(session, workspaceId);
        LockObject locker = GetLock(session.User, workspaceId);
        lock (locker)
        {
            ViteUICandidate candidate = workspace.Candidates.FirstOrDefault(c => c.Id == candidateId);
            if (candidate is not null)
            {
                workspace.Candidates.Remove(candidate);
                workspace.Rejected.Add(candidate);
            }
            workspace.Updated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            SaveWorkspace(session, workspace);
        }
        return workspace;
    }

    public static void SaveWorkspace(Session session, ViteUIWorkspaceData workspace)
    {
        string folder = GetWorkspaceFolder(session.User);
        Directory.CreateDirectory(folder);
        string path = GetWorkspacePath(session.User, workspace.WorkspaceId);
        string json = JsonConvert.SerializeObject(workspace, Formatting.Indented);
        File.WriteAllText(path, json);
    }
}
