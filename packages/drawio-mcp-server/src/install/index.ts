import { InstallOptions } from "./types.js";

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

export async function runInstall(_argv: string[]): Promise<number> {
  return 0;
}
