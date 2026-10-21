import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/public', { recursive: true });
cpSync('public', 'dist/public', { recursive: true });
for (const project of ['tsconfig.server.json', 'tsconfig.client.json']) {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', project], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Built server and browser assets in dist/.');
