import { Sandbox } from "@e2b/code-interpreter";

const SANDBOX_TIMEOUT_MS = 60_000;
const COMMAND_TIMEOUT_MS = 45_000;

const FORBIDDEN_ENV_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "MORPH_API_KEY",
  "STRIPE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
]);

export interface E2BTestResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function testInE2B(
  filePath: string,
  fileContent: string,
  testCommand: string
): Promise<E2BTestResult> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    return {
      stdout: "",
      stderr: "E2B_API_KEY not configured — test skipped",
      exitCode: -1,
    };
  }

  const safeEnv: Record<string, string> = { NODE_ENV: "test" };
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith("NEXT_PUBLIC_") && v && !FORBIDDEN_ENV_KEYS.has(k)) {
      safeEnv[k] = v;
    }
  }

  const sandbox = await Sandbox.create({
    timeoutMs: SANDBOX_TIMEOUT_MS,
    envs: safeEnv,
  });

  try {
    const targetPath = `/home/user/${filePath}`;
    const dir = targetPath.substring(0, targetPath.lastIndexOf("/"));

    await sandbox.commands.run(`mkdir -p ${dir}`, {
      timeoutMs: 5_000,
    });

    await sandbox.files.write(targetPath, fileContent);

    const result = await sandbox.commands.run(testCommand, {
      timeoutMs: COMMAND_TIMEOUT_MS,
      cwd: "/home/user",
    });

    return {
      stdout: (result.stdout ?? "").slice(0, 10_000),
      stderr: (result.stderr ?? "").slice(0, 10_000),
      exitCode: result.exitCode,
    };
  } finally {
    await sandbox.kill().catch((err: any) =>
      console.error("[e2bRunner] sandbox cleanup failed:", err)
    );
  }
}
