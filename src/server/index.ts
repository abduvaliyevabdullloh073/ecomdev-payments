import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './database.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
const app = createApp({ db, staticDirectory: config.staticDirectory, timeZone: config.timeZone });
const server = app.listen(config.port, config.host, () => {
  console.log(`Ecomdev: http://${config.host}:${config.port}`);
});
server.on('error', error => { console.error(error.message); db.close(); process.exitCode = 1; });
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => { db.close(); process.exitCode = 0; });
  setTimeout(() => { console.error('Shutdown timed out.'); process.exit(1); }, 10_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
