import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

mkdirSync('data', { recursive: true });
if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('.env created. Defaults are ready for local use.');
} else {
  console.log('.env already exists; your settings were preserved.');
}
