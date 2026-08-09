import sqlite3 from 'sqlite3';
import path from 'path';

export function enableWAL() {
  return new Promise<void>((resolve, reject) => {
    const dbPath = path.resolve(__dirname, '../../dev.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[DB] Error opening database for WAL check:', err.message);
        return resolve();
      }
    });

    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL;', (err) => {
        if (err) console.error('[DB] Failed to set WAL:', err.message);
      });
      db.run('PRAGMA synchronous = NORMAL;', (err) => {
        if (err) console.error('[DB] Failed to set synchronous:', err.message);
      });
    });

    db.close((err) => {
      if (err) {
        console.error('[DB] Error closing database after WAL check:', err.message);
      } else {
        console.log('[DB] WAL mode enforced via sqlite3 driver');
      }
      resolve();
    });
  });
}
