#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('[resend-mcp] Missing RESEND_API_KEY environment variable.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['-y', 'resend-mcp'];

const child = spawn(cmd, args, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[resend-mcp] Failed to start MCP server via npx resend-mcp:', error.message);
  process.exit(1);
});
