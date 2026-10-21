import { resolve } from 'node:path';

export function loadConfig() {
  const port = Number(process.env['PORT'] ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const host = process.env['HOST'] || '127.0.0.1';
  const timeZone = process.env['APP_TIME_ZONE'] || 'Asia/Tashkent';
  new Intl.DateTimeFormat('en', { timeZone }).format();
  return { port, host, timeZone,
    databasePath: resolve(process.env['DATABASE_PATH'] || './data/payments.sqlite'),
    staticDirectory: resolve('dist/public'),
  };
}
