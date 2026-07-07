import type { HostAdapter } from "../types.js";
import { codexAdapter } from "./codex.js";

export const HOST_ADAPTERS: Record<string, HostAdapter> = {
  [codexAdapter.id]: codexAdapter,
};

export function listHostIds(): string[] {
  return Object.keys(HOST_ADAPTERS);
}
