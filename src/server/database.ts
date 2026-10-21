import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, { timeout: 5000 });
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = Number(db.prepare('PRAGMA user_version').get()!['user_version']);
    if (version > 1) throw new Error('This database schema is newer than this application.');
    if (version === 0) {
      db.exec('BEGIN IMMEDIATE');
      try {
        // Re-check after the write lock: two processes may start together.
        if (Number(db.prepare('PRAGMA user_version').get()!['user_version']) === 0) {
          db.exec(readFileSync(new URL('../../migrations/001_initial.sql', import.meta.url), 'utf8'));
          db.exec('PRAGMA user_version = 1');
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
