import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'novaworks.db');
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : DEFAULT_DB_PATH;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'AGENT')),
    specialization TEXT NOT NULL,
    skills_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    manager_id TEXT NOT NULL REFERENCES users(id),
    deadline TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    assignee_id TEXT NOT NULL REFERENCES users(id),
    deadline TEXT NOT NULL,
    estimated_hours REAL NOT NULL CHECK(estimated_hours > 0),
    created_at TEXT NOT NULL
  );
`);

export function runInTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback error if transaction already closed
    }
    throw err;
  }
}

export function getDatabasePath(): string {
  return dbPath;
}
