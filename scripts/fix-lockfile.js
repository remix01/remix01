import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

console.log('[v0] Regenerating pnpm-lock.yaml...');

try {
  // Run pnpm install to regenerate the lockfile
  execSync('pnpm install', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('[v0] Successfully regenerated pnpm-lock.yaml');
} catch (error) {
  console.error('[v0] Error regenerating lockfile:', error.message);
  process.exit(1);
}
