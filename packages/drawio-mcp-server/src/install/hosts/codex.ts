import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { stringify } from "smol-toml";
import type { HostAdapter, McpEntry } from "../types.js";

export const codexAdapter: HostAdapter = {
  id: "codex",
  displayName: "Codex CLI",
  defaultPaths(): string[] {
    return [join(homedir(), ".codex", "config.toml")];
  },
  async detect() {
    return existsSync(codexAdapter.defaultPaths()[0]) ? "installed" : "absent";
  },
  async read(path: string): Promise<string> {
    if (!existsSync(path)) return "";
    return fs.readFile(path, "utf8");
  },
  merge(source, entry, name, { uninstall }) {
    const key = `mcp_servers.${name}`;
    return mergeTomlBlock(source, key, uninstall ? null : blockBody(entry));
  },
  diffLabel() {
    return codexAdapter.defaultPaths()[0];
  },
};

function blockBody(entry: McpEntry): string {
  const table: Record<string, unknown> = {
    command: entry.command,
    args: entry.args,
  };
  // `smol-toml` renders arrays/inline-tables with padding spaces
  // (`[ "a", "b" ]`); normalize to the compact style used elsewhere in this
  // project's generated configs (`["a", "b"]`).
  const base = stringify(table)
    .trim()
    .replace(/\[ /g, "[")
    .replace(/ \]/g, "]");
  const envKeys = Object.keys(entry.env);
  if (envKeys.length === 0) return base;
  // `smol-toml`'s `stringify` renders a nested object as a `[env]` sub-table
  // header on its own line, which `removeBlock` (below) mistakes for a
  // sibling top-level table -- corrupting idempotent merges and leaking
  // secrets on uninstall (the header + its keys survive as an orphan
  // block). Render `env` as a single-line inline table instead, which stays
  // inside this block and cannot be mistaken for a new `[table]` header.
  const envLine = `env = { ${envKeys
    .map((k) => `${tomlKey(k)} = ${tomlString(entry.env[k])}`)
    .join(", ")} }`;
  return `${base}\n${envLine}`;
}

const BARE_KEY = /^[A-Za-z0-9_-]+$/;

function tomlKey(key: string): string {
  return BARE_KEY.test(key) ? key : tomlString(key);
}

function tomlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Insert, replace, or remove a single TOML table (identified by its dotted
 * `key`, e.g. `mcp_servers.drawio`) in `source`, leaving every other byte of
 * the file untouched.
 *
 * `smol-toml`'s `parse` -> `stringify` round-trip (as sketched in the task
 * brief) discards *all* comments and reformats the entire document -- not
 * just the table being edited. That fails round-trip expectations for any
 * config a human may have hand-edited. Splicing the target table's text
 * directly avoids touching unrelated tables, comments, or blank-line layout.
 */
function mergeTomlBlock(
  source: string,
  key: string,
  body: string | null,
): string {
  const header = `[${key}]`;
  const lines = removeBlock(
    source.length > 0 ? source.split("\n") : [],
    header,
  );
  if (body === null) return lines.join("\n");
  return appendBlock(lines, header, body).join("\n");
}

function removeBlock(lines: string[], header: string): string[] {
  const startIdx = lines.findIndex((line) => line.trim() === header);
  if (startIdx === -1) return lines;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  // Drop trailing blank lines that belong to the removed block.
  while (endIdx > startIdx + 1 && lines[endIdx - 1].trim() === "") {
    endIdx--;
  }

  const before = lines.slice(0, startIdx);
  // Drop the single blank separator line preceding the block, if any, so
  // removal doesn't leave a double blank line behind.
  if (before.length > 0 && before[before.length - 1].trim() === "") {
    before.pop();
  }
  const after = lines.slice(endIdx);
  return [...before, ...after];
}

function appendBlock(lines: string[], header: string, body: string): string[] {
  const bodyLines = body.split("\n");
  // Drop the single trailing empty element representing the file's final
  // newline, so we don't accumulate blank lines across repeated merges.
  const trimmed =
    lines.length > 0 && lines[lines.length - 1] === ""
      ? lines.slice(0, -1)
      : lines;
  if (trimmed.length === 0) return [header, ...bodyLines, ""];
  return [...trimmed, "", header, ...bodyLines, ""];
}
