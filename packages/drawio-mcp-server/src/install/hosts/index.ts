import type { HostAdapter } from "../types.js";
import { codexAdapter } from "./codex.js";
import { zedAdapter } from "./zed.js";

export const HOST_ADAPTERS: Record<string, HostAdapter> = {
  [codexAdapter.id]: codexAdapter,
  [zedAdapter.id]: zedAdapter,
};

export function listHostIds(): string[] {
  return Object.keys(HOST_ADAPTERS);
}
