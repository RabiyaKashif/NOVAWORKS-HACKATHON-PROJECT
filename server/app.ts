import './env.ts';
import express, { type Express } from 'express';
import { randomUUID } from 'node:crypto';
import {
  deleteProjectById,
  getDirectoryUsers,
  getMyTasksForUser,
  getProjectByIdForUser,
  getProjectsForUser,
  saveProjectsAndTasksTransactionally,
} from './access.ts';
import { extractProjectsFromTranscript } from './ai.ts';
import {
  clearSessionCookie,
  findUserByEmailWithHash,
  getOptionalSessionUser,
  mapDbUserToPublic,
  requireAuth,
  requireRole,
  setSessionCookie,
  type AuthenticatedRequest,
  type UserRole,
} from './auth.ts';
import { db } from './db.ts';
import { hashPassword, seedDemoUsers, verifyPassword } from './seed.ts';
import { validateExtractionDraft } from './validation.ts';
import type { ExtractionResult } from '../src/types/project.ts';

export function createApiApp(): Express {
  // Idempotent seed on startup so the 10 supplied demo accounts always exist
  seedDemoUsers();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, serverless: Boolean(process.env.VERCEL) });
  });

  // --- Authentication ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const userRow = findUserByEmailWithHash(email);
    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = setSessionCookie(req, res, userRow.id);
    res.json({ user: mapDbUserToPublic(userRow), token });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role, specialization } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      specialization?: string;
    };

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';
    const cleanSpec =
      typeof specialization === 'string' && specialization.trim()
        ? specialization.trim()
        : 'Software Engineer';

    if (!cleanName || !cleanEmail || !cleanPassword) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid work email address.' });
      return;
    }

    if (cleanPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = findUserByEmailWithHash(cleanEmail);
    if (existing) {
      res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    const allowedRole: UserRole = role === 'MANAGER' ? 'MANAGER' : 'AGENT';
    const idPrefix = allowedRole === 'MANAGER' ? 'PM' : 'DEV';
    const userId = `${idPrefix}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const passwordHash = hashPassword(cleanPassword);
    const defaultSkills =
      allowedRole === 'MANAGER'
        ? ['Project delivery', 'Client coordination']
        : ['Full-stack development', 'Task execution'];

    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, specialization, skills_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      cleanName,
      cleanEmail,
      passwordHash,
      allowedRole,
      cleanSpec,
      JSON.stringify(defaultSkills),
      now
    );

    const createdRow = findUserByEmailWithHash(cleanEmail);
    if (!createdRow) {
      res.status(500).json({ error: 'Failed to load newly created account.' });
      return;
    }

    const token = setSessionCookie(req, res, createdRow.id);
    res.status(201).json({ user: mapDbUserToPublic(createdRow), token });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req, res) => {
    const user = getOptionalSessionUser(req);
    res.json({ authenticated: Boolean(user), user });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.currentUser });
  });

  // --- Read-Only Team Directory ---
  app.get('/api/users', requireAuth, (_req, res) => {
    res.json({ users: getDirectoryUsers() });
  });

  // --- Role-Based Projects & Tasks ---
  app.get('/api/projects', requireAuth, (req: AuthenticatedRequest, res) => {
    const projects = getProjectsForUser(req.currentUser!);
    res.json({ projects });
  });

  app.get('/api/projects/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const projectId = String(req.params.id ?? '');
    const outcome = getProjectByIdForUser(req.currentUser!, projectId);
    if (outcome.status !== 200) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.json({ project: outcome.project });
  });

  app.delete(
    '/api/projects/:id',
    requireAuth,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res) => {
      const projectId = String(req.params.id ?? '');
      const deleted = deleteProjectById(projectId);
      if (!deleted) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }
      res.json({ ok: true });
    }
  );

  app.get('/api/tasks/my', requireAuth, (req: AuthenticatedRequest, res) => {
    const tasks = getMyTasksForUser(req.currentUser!);
    res.json({ tasks });
  });

  type TranscriptJob = {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    httpStatus?: number;
    payload?: Record<string, unknown>;
    error?: string;
    createdAt: number;
  };
  const transcriptJobs = new Map<string, TranscriptJob>();

  async function runTranscriptExtractionAndSave(transcript: string): Promise<{
    httpStatus: number;
    payload: Record<string, unknown>;
  }> {
    const directory = getDirectoryUsers();
    const draft = await extractProjectsFromTranscript(transcript, directory);
    const issues = validateExtractionDraft(draft, directory);

    if (issues.length > 0) {
      return {
        httpStatus: 422,
        payload: {
          error:
            'Extraction contains unresolved or invalid fields. Nothing was saved.',
          issues,
          draft,
        },
      };
    }

    const saved = saveProjectsAndTasksTransactionally(draft);
    return {
      httpStatus: 201,
      payload: {
        ...saved,
        draft,
      },
    };
  }

  // --- Admin-Only Transcript Automation (AI -> Validate -> Atomic Transaction) ---
  app.post(
    '/api/projects/from-transcript',
    requireAuth,
    requireRole('ADMIN'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { transcript } = req.body as { transcript?: string };
        if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
          res.status(400).json({ error: 'Meeting transcript text is required.' });
          return;
        }

        const outcome = await runTranscriptExtractionAndSave(transcript);
        res.status(outcome.httpStatus).json(outcome.payload);
      } catch (err: unknown) {
        const errorObj = err as { status?: number; message?: string };
        console.error('Create from transcript error:', err);
        const status =
          typeof errorObj?.status === 'number' && errorObj.status >= 400
            ? errorObj.status
            : 500;
        res.status(status).json({
          error:
            errorObj?.message ||
            'Failed to create projects and tasks from transcript.',
        });
      }
    }
  );

  // Non-blocking job flow for long-running Node servers (AI Studio / local);
  // on Vercel serverless, execute inline in the same invocation so Lambda does not freeze background work.
  app.post(
    '/api/projects/from-transcript/async',
    requireAuth,
    requireRole('ADMIN'),
    async (req: AuthenticatedRequest, res) => {
      const { transcript } = req.body as { transcript?: string };
      if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
        res.status(400).json({ error: 'Meeting transcript text is required.' });
        return;
      }

      if (process.env.VERCEL) {
        try {
          const outcome = await runTranscriptExtractionAndSave(transcript);
          res.status(200).json({
            status: 'completed',
            httpStatus: outcome.httpStatus,
            payload: outcome.payload,
          });
        } catch (err: unknown) {
          const errorObj = err as { status?: number; message?: string };
          const status =
            typeof errorObj?.status === 'number' && errorObj.status >= 400
              ? errorObj.status
              : 500;
          res.status(status).json({
            error:
              errorObj?.message ||
              'Failed to create projects and tasks from transcript.',
          });
        }
        return;
      }

      const cutoff = Date.now() - 15 * 60 * 1000;
      for (const [id, entry] of transcriptJobs.entries()) {
        if (entry.createdAt < cutoff) {
          transcriptJobs.delete(id);
        }
      }

      const jobId = randomUUID();
      const job: TranscriptJob = {
        id: jobId,
        status: 'pending',
        createdAt: Date.now(),
      };
      transcriptJobs.set(jobId, job);

      void (async () => {
        try {
          const outcome = await runTranscriptExtractionAndSave(transcript);
          job.status = 'completed';
          job.httpStatus = outcome.httpStatus;
          job.payload = outcome.payload;
        } catch (err: unknown) {
          const errorObj = err as { status?: number; message?: string };
          console.error('Async transcript extraction error:', err);
          job.status = 'failed';
          job.httpStatus =
            typeof errorObj?.status === 'number' && errorObj.status >= 400
              ? errorObj.status
              : 500;
          job.error =
            errorObj?.message ||
            'Failed to create projects and tasks from transcript.';
        }
      })();

      res.status(202).json({ jobId, status: 'pending' });
    }
  );

  app.get(
    '/api/projects/jobs/:jobId',
    requireAuth,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res) => {
      const jobId = String(req.params.jobId ?? '');
      const job = transcriptJobs.get(jobId);
      if (!job) {
        res
          .status(404)
          .json({ error: 'Transcript extraction job not found or expired.' });
        return;
      }
      res.json({
        jobId: job.id,
        status: job.status,
        httpStatus: job.httpStatus,
        payload: job.payload,
        error: job.error,
      });
    }
  );

  // Admin correction & revalidation endpoint when a draft had 422 issues
  app.post(
    '/api/projects/save-draft',
    requireAuth,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res) => {
      try {
        const { draft } = req.body as { draft?: ExtractionResult };
        if (!draft) {
          res.status(400).json({ error: 'Draft payload is required.' });
          return;
        }

        const directory = getDirectoryUsers();
        const issues = validateExtractionDraft(draft, directory);
        if (issues.length > 0) {
          res.status(422).json({
            error:
              'Draft still contains unresolved validation issues. Nothing was saved.',
            issues,
            draft,
          });
          return;
        }

        const saved = saveProjectsAndTasksTransactionally(draft);
        res.status(201).json({
          ...saved,
          draft,
        });
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        console.error('Save draft error:', err);
        res.status(500).json({
          error: errorObj?.message || 'Failed to save validated draft.',
        });
      }
    }
  );

  // Preview-only extraction endpoint (Admin-only, does not write to DB)
  app.post(
    '/api/extract',
    requireAuth,
    requireRole('ADMIN'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { transcript } = req.body as { transcript?: string };
        if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
          res.status(400).json({ error: 'Meeting transcript text is required.' });
          return;
        }

        const directory = getDirectoryUsers();
        const result = await extractProjectsFromTranscript(transcript, directory);
        const issues = validateExtractionDraft(result, directory);
        res.json({ result, issues });
      } catch (err: unknown) {
        const errorObj = err as { status?: number; message?: string };
        console.error('Extraction API error:', err);
        const status =
          typeof errorObj?.status === 'number' && errorObj.status >= 400
            ? errorObj.status
            : 500;
        res.status(status).json({
          error:
            errorObj?.message ||
            'Failed to extract project and tasks from transcript.',
        });
      }
    }
  );

  // Ensure unmatched /api/* routes always return JSON 404 rather than SPA HTML 200
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return app;
}
