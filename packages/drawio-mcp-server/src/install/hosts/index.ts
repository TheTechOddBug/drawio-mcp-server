import type { HostAdapter } from "../types.js";
import { claudeDesktopAdapter } from "./claude-desktop.js";
import { codexAdapter } from "./codex.js";
import { opencodeAdapter } from "./opencode.js";
import { zedAdapter } from "./zed.js";

export const HOST_ADAPTERS: Record<string, HostAdapter> = {
  [codexAdapter.id]: codexAdapter,
  [zedAdapter.id]: zedAdapter,
  [opencodeAdapter.id]: opencodeAdapter,
  [claudeDesktopAdapter.id]: claudeDesktopAdapter,
};

export function listHostIds(): string[] {
  return Object.keys(HOST_ADAPTERS);
}
