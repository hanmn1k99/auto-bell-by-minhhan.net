"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableWAL = enableWAL;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
function enableWAL() {
    return new Promise((resolve, reject) => {
        const dbPath = path_1.default.resolve(__dirname, '../prisma/dev.db');
        const db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                console.error('[DB] Error opening database for WAL check:', err.message);
                return resolve();
            }
        });
        db.serialize(() => {
            db.run('PRAGMA journal_mode = WAL;', (err) => {
                if (err)
                    console.error('[DB] Failed to set WAL:', err.message);
            });
            db.run('PRAGMA synchronous = NORMAL;', (err) => {
                if (err)
                    console.error('[DB] Failed to set synchronous:', err.message);
            });
        });
        db.close((err) => {
            if (err) {
                console.error('[DB] Error closing database after WAL check:', err.message);
            }
            else {
                console.log('[DB] WAL mode enforced via sqlite3 driver');
            }
            resolve();
        });
    });
}
