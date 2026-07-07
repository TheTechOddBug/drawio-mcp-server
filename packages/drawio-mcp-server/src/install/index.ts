import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import type { HostAdapter, InstallOptions, McpEntry } from "./types.js";
import { HOST_ADAPTERS } from "./hosts/index.js";
import { atomicWrite, ensureBackup, unifiedDiff } from "./config-io.js";

const SUPPORTED_HOSTS = new Set([
  "claude-code",
  "claude-desktop",
  "codex",
  "zed",
  "opencode",
  "all",
]);

export function parseArgs(argv: string[]): InstallOptions {
  if (argv.length === 0) {
    throw new Error(
      "host required — usage: drawio-mcp-server install <host> [options]",
    );
  }
  const host = argv[0];
  if (!SUPPORTED_HOSTS.has(host)) {
    throw new Error(
      `unknown host: ${host} (supported: ${[...SUPPORTED_HOSTS].join(", ")})`,
    );
  }

  const opts: InstallOptions = {
    host,
    name: "drawio",
    editor: true,
    httpPort: 3000,
    extraArgs: [],
    env: {},
    configPath: undefined,
    print: false,
    dryRun: false,
    uninstall: false,
    yes: false,
  };

  let i = 1;
  while (i < argv.length) {
    const flag = argv[i];
    switch (flag) {
      case "--name":
        opts.name = argv[++i];
        break;
      case "--editor":
        opts.editor = true;
        break;
      case "--no-editor":
        opts.editor = false;
        break;
      case "--http-port":
        opts.httpPort = Number.parseInt(argv[++i], 10);
        break;
      case "--extra-arg":
        opts.extraArgs.push(argv[++i]);
        break;
      case "--env": {
        const kv = argv[++i];
        const eq = kv.indexOf("=");
        if (eq <= 0)
          throw new Error(`invalid --env: expected KEY=VALUE, got ${kv}`);
        opts.env[kv.slice(0, eq)] = kv.slice(eq + 1);
        break;
      }
      case "--config-path":
        opts.configPath = argv[++i];
        break;
      case "--print":
        opts.print = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--uninstall":
        opts.uninstall = true;
        break;
      case "--yes":
        opts.yes = true;
        break;
      default:
        throw new Error(`unknown option: ${flag}`);
    }
    i++;
  }
  return opts;
}

export function buildEntry(opts: InstallOptions): McpEntry {
  const args = ["-y", "drawio-mcp-server"];
  if (opts.editor) args.push("--editor");
  if (opts.httpPort !== 3000) args.push("--http-port", String(opts.httpPort));
  for (const a of opts.extraArgs) args.push(a);
  return { command: "npx", args, env: opts.env, transport: "stdio" };
}

export async function runInstall(argv: string[]): Promise<number> {
  let opts: InstallOptions;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    return 1;
  }
  if (opts.host === "all") {
    process.stderr.write("`install all` will be wired in a later task\n");
    return 1;
  }
  const adapter = HOST_ADAPTERS[opts.host];
  if (!adapter) {
    process.stderr.write(`unsupported host: ${opts.host}\n`);
    return 1;
  }
  return applySingle(adapter, opts);
}

async function applySingle(
  adapter: HostAdapter,
  opts: InstallOptions,
): Promise<number> {
  const target = opts.configPath ?? adapter.defaultPaths()[0];
  const source = existsSync(target) ? await fs.readFile(target, "utf8") : "";
  const entry = buildEntry(opts);
  const next = adapter.merge(source, entry, opts.name, {
    uninstall: opts.uninstall,
  });

  if (opts.print) {
    process.stdout.write(next.endsWith("\n") ? next : `${next}\n`);
    return 0;
  }
  if (source === next) {
    process.stderr.write(`no change: ${target}\n`);
    return 0;
  }
  const diff = unifiedDiff(source, next, target);
  if (opts.dryRun) {
    process.stderr.write(diff);
    return 0;
  }
  if (existsSync(target) && !opts.yes) {
    process.stderr.write(diff);
    process.stderr.write(`\nRe-run with --yes to apply changes.\n`);
    return 4;
  }
  await ensureBackup(target);
  await atomicWrite(target, next);
  process.stderr.write(`updated: ${target}\n`);
  return 0;
}
