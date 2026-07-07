import { describe, it, expect } from "@jest/globals";
import { codexAdapter } from "./codex.js";

const ENTRY = {
  command: "npx",
  args: ["-y", "drawio-mcp-server", "--editor"],
  env: {},
  transport: "stdio" as const,
};

describe("codexAdapter.merge", () => {
  it("inserts [mcp_servers.drawio] into empty file", () => {
    const out = codexAdapter.merge("", ENTRY, "drawio", { uninstall: false });
    expect(out).toContain("[mcp_servers.drawio]");
    expect(out).toContain('command = "npx"');
    expect(out).toContain('args = ["-y", "drawio-mcp-server", "--editor"]');
  });

  it("preserves existing entries and comments", () => {
    const source = [
      "# my codex config",
      "[mcp_servers.other]",
      'command = "other-server"',
      "",
    ].join("\n");
    const out = codexAdapter.merge(source, ENTRY, "drawio", {
      uninstall: false,
    });
    expect(out).toContain("# my codex config");
    expect(out).toContain("[mcp_servers.other]");
    expect(out).toContain('command = "other-server"');
    expect(out).toContain("[mcp_servers.drawio]");
  });

  it("updates existing drawio entry idempotently", () => {
    const source = ["[mcp_servers.drawio]", 'command = "old"', ""].join("\n");
    const out1 = codexAdapter.merge(source, ENTRY, "drawio", {
      uninstall: false,
    });
    const out2 = codexAdapter.merge(out1, ENTRY, "drawio", {
      uninstall: false,
    });
    expect(out2).toBe(out1);
    expect(out1).toContain('command = "npx"');
    expect(out1).not.toContain('command = "old"');
  });

  it("removes entry on uninstall and leaves other blocks intact", () => {
    const source = [
      "[mcp_servers.other]",
      'command = "other"',
      "",
      "[mcp_servers.drawio]",
      'command = "npx"',
      "",
    ].join("\n");
    const out = codexAdapter.merge(source, ENTRY, "drawio", {
      uninstall: true,
    });
    expect(out).toContain("[mcp_servers.other]");
    expect(out).not.toContain("[mcp_servers.drawio]");
  });
});

describe("codexAdapter.defaultPaths", () => {
  it("points at ~/.codex/config.toml", () => {
    const paths = codexAdapter.defaultPaths();
    expect(paths[0]).toMatch(/\.codex\/config\.toml$/);
  });
});
