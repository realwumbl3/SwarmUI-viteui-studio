# ViteUI Workspace Focus Rule

## Purpose

This workspace is focused on building and integrating `viteui-studio` as a studio app that runs inside the SwarmUI environment.

## Scope

This rule applies to all agent work in this repository.

## Ownership Boundaries

- Primary product work belongs in `viteui-studio`.
- Keep changes to the original SwarmUI fork minimal and targeted.
- Prefer additive extension code over modifying core behavior.
- Place new custom integration code in clearly owned areas and names:
  - `viteui-studio`
  - `viteui_studio`
  - `ViteUI`-named modules/files

## Where Our Special Code Is (Current Placement)

- Frontend studio app: `viteui-studio`
- Embedded studio assets served by SwarmUI:
  - `src/BuiltinExtensions/ComfyUIBackend/Assets/viteui_studio.html`
  - `src/BuiltinExtensions/ComfyUIBackend/Assets/viteui_studio.js`
  - `src/BuiltinExtensions/ComfyUIBackend/Assets/viteui_studio.css`
- Comfy node definitions:
  - `src/BuiltinExtensions/ComfyUIBackend/ExtraNodes/SwarmComfyCommon/SwarmViteUI.py`
- Swarm-side ViteUI bridge/API/state handling:
  - `src/BuiltinExtensions/ComfyUIBackend/ViteUI`
- Workflow wiring reference:
  - `DaSiWa_ViteUI.json`

## Node Integration Contract

- `SwarmViteUIStudio` is the studio entry/output node.
- If `SwarmViteUIStudio` is used by itself, normal SwarmUI Generate behavior must still work from outside Studio using the Studio-configured state.
- Studio supports an optional node source/controller path:
  - via `SwarmViteUIController` connected into `SwarmViteUIStudio`, or
  - via a future integrated controller path inside `SwarmViteUIStudio`.
- Maintain compatibility with workflow wiring patterns like `DaSiWa_ViteUI.json`.

## Do / Don't

- Do extend in owned ViteUI areas first.
- Do keep integrations modular, organized, and clearly named.
- Do annotate unavoidable fork-core edits with short rationale.
- Don't refactor unrelated SwarmUI subsystems for ViteUI work.
- Don't move custom logic into generic upstream areas when a ViteUI-owned location is available.

## Per-Task Checklist

Before finishing any ViteUI task, verify:

1. Can this be implemented in `viteui-studio` first?
2. Are SwarmUI fork changes minimal and strictly necessary?
3. Is new code placed in a clearly owned ViteUI location/name?
4. Does standalone `SwarmViteUIStudio` behavior still preserve normal SwarmUI Generate compatibility?
5. If workflow-node integration is touched, does optional controller wiring still work with patterns like `DaSiWa_ViteUI.json`?
