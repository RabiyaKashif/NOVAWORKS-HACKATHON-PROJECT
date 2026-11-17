import 'dotenv/config';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { db } from './db.ts';

export interface SeedAccount {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT';
  specialization: string;
  skills: string[];
}

export const DEMO_PASSWORD = 'Demo123!';

export const SUPPLIED_TEN_ACCOUNTS: SeedAccount[] = [
  {
    id: 'ADMIN',
    name: 'Admin',
    email: 'admin@novaworks.example',
    role: 'ADMIN',
    specialization: 'Administrator',
    skills: ['Company overview', 'transcript creation'],
  },
  {
    id: 'PM01',
    name: 'Ayesha Khan',
    email: 'ayesha@novaworks.example',
    role: 'MANAGER',
    specialization: 'Web PM',
    skills: ['Web projects', 'client coordination'],
  },
  {
    id: 'PM02',
    name: 'Bilal Ahmed',
    email: 'bilal@novaworks.example',
    role: 'MANAGER',
    specialization: 'Mobile PM',
    skills: ['Mobile projects', 'delivery planning'],
  },
  {
    id: 'PM03',
    name: 'Hina Malik',
    email: 'hina@novaworks.example',
    role: 'MANAGER',
    specialization: 'AI PM',
    skills: ['AI projects', 'requirement review'],
  },
  {
    id: 'DEV01',
    name: 'Ali Raza',
    email: 'ali@novaworks.example',
    role: 'AGENT',
    specialization: 'Full-Stack',
    skills: ['React', 'frontend integration'],
  },
  {
    id: 'DEV02',
    name: 'Hamza Shah',
    email: 'hamza@novaworks.example',
    role: 'AGENT',
    specialization: 'Full-Stack',
    skills: ['Node.js', 'databases', 'APIs'],
  },
  {
    id: 'DEV03',
    name: 'Sara Noor',
    email: 'sara@novaworks.example',
    role: 'AGENT',
    specialization: 'App Developer',
    skills: ['Flutter', 'mobile UI'],
  },
  {
    id: 'DEV04',
    name: 'Usman Tariq',
    email: 'usman@novaworks.example',
    role: 'AGENT',
    specialization: 'App Developer',
    skills: ['Flutter', 'integration', 'testing'],
  },
  {
    id: 'DEV05',
    name: 'Zain Abbas',
    email: 'zain@novaworks.example',
    role: 'AGENT',
    specialization: 'AI Developer',
    skills: ['LLMs', 'extraction', 'prompts'],
  },
  {
    id: 'DEV06',
    name: 'Maryam Asif',
    email: 'maryam@novaworks.example',
    role: 'AGENT',
    specialization: 'AI Developer',
    skills: ['Retrieval', 'document processing'],
  },
];

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function seedDemoUsers(): { inserted: number; updated: number } {
  const findByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
  const insertStmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, specialization, skills_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE users
    SET name = ?, role = ?, specialization = ?, skills_json = ?
    WHERE email = ?
  `);

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  for (const account of SUPPLIED_TEN_ACCOUNTS) {
    const existing = findByEmail.get(account.email) as { id: string } | undefined;
    if (!existing) {
      insertStmt.run(
        account.id,
        account.name,
        account.email,
        hashPassword(DEMO_PASSWORD),
        account.role,
        account.specialization,
        JSON.stringify(account.skills),
        now
      );
      inserted += 1;
    } else {
      updateStmt.run(
        account.name,
        account.role,
        account.specialization,
        JSON.stringify(account.skills),
        account.email
      );
      updated += 1;
    }
  }

  return { inserted, updated };
}

// Allow standalone execution via `tsx server/seed.ts`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = seedDemoUsers();
  console.log(
    `seedDemoUsers complete: ${summary.inserted} inserted, ${summary.updated} updated.`
  );
}
