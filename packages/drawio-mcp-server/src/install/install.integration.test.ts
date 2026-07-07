import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "..", "build", "index.js");

function run(args: string[]) {
  return spawnSync("node", [BIN, "install", ...args], { encoding: "utf8" });
}

describe("install subcommand — end to end", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "drawio-e2e-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("codex --print emits TOML on stdout, no file written", () => {
    const target = join(dir, "codex.toml");
    const r = run(["codex", "--print", "--config-path", target]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("[mcp_servers.drawio]");
    expect(existsSync(target)).toBe(false);
  });

  it("zed --print emits JSON", () => {
    const target = join(dir, "zed.json");
    const r = run(["zed", "--print", "--config-path", target]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"context_servers"');
  });

  it("codex writes to target when --yes passed", () => {
    const target = join(dir, "codex.toml");
    const r = run(["codex", "--yes", "--config-path", target]);
    expect(r.status).toBe(0);
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toContain("[mcp_servers.drawio]");
  });

  it("codex refuses to overwrite non-empty target without --yes and returns exit 4", () => {
    const target = join(dir, "codex.toml");
    const first = run(["codex", "--yes", "--config-path", target]);
    expect(first.status).toBe(0);
    const modified = readFileSync(target, "utf8").replace(
      "drawio-mcp-server",
      "drawio-mcp-server-old",
    );
    writeFileSync(target, modified);
    const second = run(["codex", "--config-path", target]);
    expect(second.status).toBe(4);
    expect(second.stderr).toContain("Re-run with --yes");
  });

  it("all with per-host config paths writes to each", () => {
    const codexPath = join(dir, "codex.toml");
    const zedPath = join(dir, "zed.json");
    const r = run([
      "all",
      "--yes",
      "--config-path",
      `codex=${codexPath}`,
      "--config-path",
      `zed=${zedPath}`,
    ]);
    expect(r.status).toBe(0);
    expect(existsSync(codexPath)).toBe(true);
    expect(existsSync(zedPath)).toBe(true);
  });

  it("returns exit 1 on unknown host", () => {
    const r = run(["bogus"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("unknown host");
  });
});
