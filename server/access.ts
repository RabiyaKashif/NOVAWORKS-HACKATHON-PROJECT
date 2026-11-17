import { randomUUID } from 'node:crypto';
import type { PublicUser } from './auth.ts';
import { mapDbUserToPublic } from './auth.ts';
import { db, runInTransaction } from './db.ts';
import type { ExtractionResult } from '../src/types/project.ts';

export interface StoredTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  deadline: string;
  estimatedHours: number;
  createdAt: string;
}

export interface StoredProjectSummary {
  id: string;
  name: string;
  clientName: string;
  description: string;
  managerId: string;
  managerName: string;
  deadline: string;
  taskCount: number;
  totalHours: number;
  createdAt: string;
}

export interface StoredProjectDetail extends StoredProjectSummary {
  tasks: StoredTask[];
}

export interface AgentTaskItem extends StoredTask {
  projectName: string;
  clientName: string;
  managerId: string;
  managerName: string;
  projectDeadline: string;
}

export function getDirectoryUsers(): PublicUser[] {
  const rows = db
    .prepare(
      'SELECT id, name, email, password_hash, role, specialization, skills_json FROM users ORDER BY id ASC'
    )
    .all() as Array<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: 'ADMIN' | 'MANAGER' | 'AGENT';
    specialization: string;
    skills_json: string;
  }>;
  return rows.map(mapDbUserToPublic);
}

export function getProjectsForUser(currentUser: PublicUser): StoredProjectSummary[] {
  if (currentUser.role === 'ADMIN') {
    const rows = db
      .prepare(
        `
        SELECT
          p.id,
          p.name,
          p.client_name AS clientName,
          p.description,
          p.manager_id AS managerId,
          u.name AS managerName,
          p.deadline,
          p.created_at AS createdAt,
          COUNT(t.id) AS taskCount,
          COALESCE(SUM(t.estimated_hours), 0) AS totalHours
        FROM projects p
        JOIN users u ON u.id = p.manager_id
        LEFT JOIN tasks t ON t.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC, p.name ASC
      `
      )
      .all() as unknown as StoredProjectSummary[];
    return rows.map((r) => ({
      ...r,
      taskCount: Number(r.taskCount),
      totalHours: Number(r.totalHours),
    }));
  }

  if (currentUser.role === 'MANAGER') {
    const rows = db
      .prepare(
        `
        SELECT
          p.id,
          p.name,
          p.client_name AS clientName,
          p.description,
          p.manager_id AS managerId,
          u.name AS managerName,
          p.deadline,
          p.created_at AS createdAt,
          COUNT(t.id) AS taskCount,
          COALESCE(SUM(t.estimated_hours), 0) AS totalHours
        FROM projects p
        JOIN users u ON u.id = p.manager_id
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.manager_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC, p.name ASC
      `
      )
      .all(currentUser.id) as unknown as StoredProjectSummary[];
    return rows.map((r) => ({
      ...r,
      taskCount: Number(r.taskCount),
      totalHours: Number(r.totalHours),
    }));
  }

  // AGENT: distinct projects containing their assigned tasks, with counts scoped to their own tasks
  const rows = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.client_name AS clientName,
        p.description,
        p.manager_id AS managerId,
        u.name AS managerName,
        p.deadline,
        p.created_at AS createdAt,
        COUNT(t.id) AS taskCount,
        COALESCE(SUM(t.estimated_hours), 0) AS totalHours
      FROM projects p
      JOIN users u ON u.id = p.manager_id
      JOIN tasks t ON t.project_id = p.id AND t.assignee_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC, p.name ASC
    `
    )
    .all(currentUser.id) as unknown as StoredProjectSummary[];
  return rows.map((r) => ({
    ...r,
    taskCount: Number(r.taskCount),
    totalHours: Number(r.totalHours),
  }));
}

export function getProjectByIdForUser(
  currentUser: PublicUser,
  projectId: string
): { status: 200; project: StoredProjectDetail } | { status: 403 | 404; error: string } {
  const projectRow = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.client_name AS clientName,
        p.description,
        p.manager_id AS managerId,
        u.name AS managerName,
        p.deadline,
        p.created_at AS createdAt
      FROM projects p
      JOIN users u ON u.id = p.manager_id
      WHERE p.id = ?
    `
    )
    .get(projectId) as
    | {
        id: string;
        name: string;
        clientName: string;
        description: string;
        managerId: string;
        managerName: string;
        deadline: string;
        createdAt: string;
      }
    | undefined;

  if (!projectRow) {
    return { status: 404, error: 'Project not found.' };
  }

  if (currentUser.role === 'MANAGER' && projectRow.managerId !== currentUser.id) {
    return { status: 403, error: 'Access denied. You do not manage this project.' };
  }

  let tasks: StoredTask[];
  if (currentUser.role === 'AGENT') {
    tasks = db
      .prepare(
        `
        SELECT
          t.id,
          t.project_id AS projectId,
          t.title,
          t.description,
          t.assignee_id AS assigneeId,
          u.name AS assigneeName,
          t.deadline,
          t.estimated_hours AS estimatedHours,
          t.created_at AS createdAt
        FROM tasks t
        JOIN users u ON u.id = t.assignee_id
        WHERE t.project_id = ? AND t.assignee_id = ?
        ORDER BY t.deadline ASC, t.title ASC
      `
      )
      .all(projectId, currentUser.id) as unknown as StoredTask[];

    if (tasks.length === 0) {
      return {
        status: 403,
        error: 'Access denied. You have no assigned tasks in this project.',
      };
    }
  } else {
    tasks = db
      .prepare(
        `
        SELECT
          t.id,
          t.project_id AS projectId,
          t.title,
          t.description,
          t.assignee_id AS assigneeId,
          u.name AS assigneeName,
          t.deadline,
          t.estimated_hours AS estimatedHours,
          t.created_at AS createdAt
        FROM tasks t
        JOIN users u ON u.id = t.assignee_id
        WHERE t.project_id = ?
        ORDER BY t.deadline ASC, t.title ASC
      `
      )
      .all(projectId) as unknown as StoredTask[];
  }

  const normalizedTasks = tasks.map((t) => ({
    ...t,
    estimatedHours: Number(t.estimatedHours),
  }));

  const totalHours = normalizedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return {
    status: 200,
    project: {
      ...projectRow,
      taskCount: normalizedTasks.length,
      totalHours,
      tasks: normalizedTasks,
    },
  };
}

export function getMyTasksForUser(currentUser: PublicUser): AgentTaskItem[] {
  const baseQuery = `
    SELECT
      t.id,
      t.project_id AS projectId,
      t.title,
      t.description,
      t.assignee_id AS assigneeId,
      au.name AS assigneeName,
      t.deadline,
      t.estimated_hours AS estimatedHours,
      t.created_at AS createdAt,
      p.name AS projectName,
      p.client_name AS clientName,
      p.manager_id AS managerId,
      mu.name AS managerName,
      p.deadline AS projectDeadline
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN users au ON au.id = t.assignee_id
    JOIN users mu ON mu.id = p.manager_id
  `;

  let rows: AgentTaskItem[];
  if (currentUser.role === 'ADMIN') {
    rows = db
      .prepare(`${baseQuery} ORDER BY t.deadline ASC, p.name ASC`)
      .all() as unknown as AgentTaskItem[];
  } else if (currentUser.role === 'MANAGER') {
    rows = db
      .prepare(`${baseQuery} WHERE p.manager_id = ? ORDER BY t.deadline ASC, p.name ASC`)
      .all(currentUser.id) as unknown as AgentTaskItem[];
  } else {
    rows = db
      .prepare(`${baseQuery} WHERE t.assignee_id = ? ORDER BY t.deadline ASC, p.name ASC`)
      .all(currentUser.id) as unknown as AgentTaskItem[];
  }

  return rows.map((r) => ({
    ...r,
    estimatedHours: Number(r.estimatedHours),
  }));
}

export function saveProjectsAndTasksTransactionally(
  draft: ExtractionResult
): { createdProjects: StoredProjectDetail[]; projectCount: number; taskCount: number } {
  const now = new Date().toISOString();

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, client_name, description, manager_id, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, assignee_id, deadline, estimated_hours, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const findUserName = db.prepare('SELECT name FROM users WHERE id = ?');

  return runInTransaction(() => {
    const createdProjects: StoredProjectDetail[] = [];
    let taskCount = 0;

    for (const proj of draft.projects) {
      const projectId = `PRJ-${randomUUID().slice(0, 8).toUpperCase()}`;
      insertProject.run(
        projectId,
        proj.name.trim(),
        proj.clientName.trim(),
        proj.description.trim(),
        proj.managerId.trim(),
        proj.deadline.trim(),
        now
      );

      const managerRow = findUserName.get(proj.managerId.trim()) as
        | { name: string }
        | undefined;

      const createdTasks: StoredTask[] = [];
      for (const task of proj.tasks) {
        const taskId = `TSK-${randomUUID().slice(0, 8).toUpperCase()}`;
        const hours = Number(task.estimatedHours);
        insertTask.run(
          taskId,
          projectId,
          task.title.trim(),
          task.description.trim(),
          task.assigneeId.trim(),
          task.deadline.trim(),
          hours,
          now
        );

        const assigneeRow = findUserName.get(task.assigneeId.trim()) as
          | { name: string }
          | undefined;

        createdTasks.push({
          id: taskId,
          projectId,
          title: task.title.trim(),
          description: task.description.trim(),
          assigneeId: task.assigneeId.trim(),
          assigneeName: assigneeRow?.name ?? task.assigneeId.trim(),
          deadline: task.deadline.trim(),
          estimatedHours: hours,
          createdAt: now,
        });
        taskCount += 1;
      }

      const totalHours = createdTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      createdProjects.push({
        id: projectId,
        name: proj.name.trim(),
        clientName: proj.clientName.trim(),
        description: proj.description.trim(),
        managerId: proj.managerId.trim(),
        managerName: managerRow?.name ?? proj.managerId.trim(),
        deadline: proj.deadline.trim(),
        taskCount: createdTasks.length,
        totalHours,
        createdAt: now,
        tasks: createdTasks,
      });
    }

    return {
      createdProjects,
      projectCount: createdProjects.length,
      taskCount,
    };
  });
}

export function deleteProjectById(projectId: string): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  return Number(result.changes) > 0;
}
