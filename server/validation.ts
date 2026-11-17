import type { PublicUser } from './auth.ts';
import type { ExtractionResult } from '../src/types/project.ts';

export interface ValidationIssue {
  path: string;
  message: string;
}

const FORBIDDEN_PATTERNS: ReadonlyArray<{ label: string; regex: RegExp }> = [
  {
    label: 'payments / payment gateways',
    regex: /\b(payment|payments|payment\s+gateway|payment\s+gateways|stripe|paypal|checkout\s+billing)\b/i,
  },
  {
    label: 'inventory integration',
    regex: /\b(inventory\s+integration|inventory\s+sync|warehouse\s+inventory)\b/i,
  },
  {
    label: 'maps',
    regex: /\b(map|maps|google\s+maps|mapbox|leaflet\s+map|geospatial\s+map)\b/i,
  },
  {
    label: 'driver tracking',
    regex: /\b(driver\s+tracking|gps\s+tracking|live\s+driver|fleet\s+tracking)\b/i,
  },
  {
    label: 'real-email sending',
    regex: /\b(real[- ]email\s+sending|send\s+real\s+emails|smtp\s+email\s+dispatch|transactional\s+email\s+sending)\b/i,
  },
];

export function isValid2026Date(dateStr: string): boolean {
  if (!/^2026-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === 2026 &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

const EXCLUDED_TERM =
  '(?:(?:any|real|live|automated|external|third[- ]party|full)\\s+)*(?:payment\\s+gateways?|payment\\s+processing|payments?|stripe|paypal|checkout\\s+billing|inventory\\s+integration|inventory\\s+sync|warehouse\\s+inventory|stock\\s+integration|google\\s+maps?|mapbox|leaflet\\s+maps?|geospatial\\s+maps?|maps?|driver\\s+tracking|gps\\s+tracking|live\\s+driver|fleet\\s+tracking|real[- ]email\\s+sending|send\\s+real\\s+emails|smtp\\s+email\\s+dispatch|transactional\\s+email\\s+sending)';

function stripNegationClauses(raw: string): string {
  // Leading negations: "without payments, maps, or driver tracking"
  const withoutLeading = raw.replace(
    new RegExp(
      `\\b(?:no|not|without|excluding|excludes|exclude|skip|skipped|skips|drop|dropped|drops|ignore|ignored|ignores|reject|rejected|omits?|omitted|free\\s+of)\\s+${EXCLUDED_TERM}(?:(?:\\s*,\\s*(?:or|and)?|\\s+(?:or|and))\\s+${EXCLUDED_TERM})*`,
      'gi'
    ),
    ''
  );
  // Trailing negations: "payments and inventory integration are not included / excluded"
  return withoutLeading.replace(
    new RegExp(
      `${EXCLUDED_TERM}(?:(?:\\s*,\\s*(?:or|and)?|\\s+(?:or|and))\\s+${EXCLUDED_TERM})*\\s+(?:is|are)?\\s*(?:not\\s+included|not\\s+required|excluded|out\\s+of\\s+scope|rejected|omitted|dropped|skipped)`,
      'gi'
    ),
    ''
  );
}

export function validateExtractionDraft(
  draft: ExtractionResult,
  directory: PublicUser[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const userMap = new Map(directory.map((u) => [u.id, u]));

  if (!draft || !Array.isArray(draft.projects) || draft.projects.length === 0) {
    issues.push({
      path: 'projects',
      message: 'At least one valid project must be extracted from the transcript.',
    });
    return issues;
  }

  draft.projects.forEach((project, pIdx) => {
    const pPrefix = `projects[${pIdx}]`;
    if (!project.name?.trim()) {
      issues.push({ path: `${pPrefix}.name`, message: 'Project name is required.' });
    }
    if (!project.clientName?.trim()) {
      issues.push({
        path: `${pPrefix}.clientName`,
        message: 'Project clientName is required.',
      });
    }
    if (!project.description?.trim()) {
      issues.push({
        path: `${pPrefix}.description`,
        message: 'Project description is required.',
      });
    }

    const projectCombined = stripNegationClauses(
      `${project.name ?? ''} ${project.description ?? ''}`
    );
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(projectCombined)) {
        issues.push({
          path: `${pPrefix}.description`,
          message: `Project "${project.name || pIdx + 1}" references excluded scope (${pattern.label}).`,
        });
      }
    }

    const manager = userMap.get(project.managerId?.trim() ?? '');
    if (!manager) {
      issues.push({
        path: `${pPrefix}.managerId`,
        message: `Manager ID "${project.managerId}" does not exist in the Active Directory.`,
      });
    } else if (manager.role !== 'MANAGER') {
      issues.push({
        path: `${pPrefix}.managerId`,
        message: `User "${manager.name}" (${manager.id}) has role ${manager.role}, but managerId must reference a MANAGER.`,
      });
    }

    const projectDateValid = isValid2026Date(project.deadline?.trim() ?? '');
    if (!projectDateValid) {
      issues.push({
        path: `${pPrefix}.deadline`,
        message: `Project deadline "${project.deadline}" must be a valid 2026 YYYY-MM-DD date.`,
      });
    }

    if (!Array.isArray(project.tasks) || project.tasks.length === 0) {
      issues.push({
        path: `${pPrefix}.tasks`,
        message: `Project "${project.name || pIdx + 1}" must contain at least one approved task.`,
      });
      return;
    }

    project.tasks.forEach((task, tIdx) => {
      const tPrefix = `${pPrefix}.tasks[${tIdx}]`;
      if (!task.title?.trim()) {
        issues.push({ path: `${tPrefix}.title`, message: 'Task title is required.' });
      }
      if (!task.description?.trim()) {
        issues.push({
          path: `${tPrefix}.description`,
          message: 'Task description is required.',
        });
      }

      const assignee = userMap.get(task.assigneeId?.trim() ?? '');
      if (!assignee) {
        issues.push({
          path: `${tPrefix}.assigneeId`,
          message: `Assignee ID "${task.assigneeId}" does not exist in the Active Directory.`,
        });
      } else if (assignee.role !== 'AGENT') {
        issues.push({
          path: `${tPrefix}.assigneeId`,
          message: `User "${assignee.name}" (${assignee.id}) has role ${assignee.role}, but assigneeId must reference an AGENT.`,
        });
      }

      const taskDateValid = isValid2026Date(task.deadline?.trim() ?? '');
      if (!taskDateValid) {
        issues.push({
          path: `${tPrefix}.deadline`,
          message: `Task "${task.title || tIdx + 1}" deadline "${task.deadline}" must be a valid 2026 YYYY-MM-DD date.`,
        });
      } else if (projectDateValid && task.deadline.trim() > project.deadline.trim()) {
        issues.push({
          path: `${tPrefix}.deadline`,
          message: `Task "${task.title}" deadline (${task.deadline}) exceeds project deadline (${project.deadline}).`,
        });
      }

      if (
        typeof task.estimatedHours !== 'number' ||
        !Number.isFinite(task.estimatedHours) ||
        task.estimatedHours <= 0
      ) {
        issues.push({
          path: `${tPrefix}.estimatedHours`,
          message: `Task "${task.title || tIdx + 1}" estimatedHours must be a positive number.`,
        });
      }

      const combined = stripNegationClauses(
        `${task.title ?? ''} ${task.description ?? ''}`
      );
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.regex.test(combined)) {
          issues.push({
            path: `${tPrefix}.title`,
            message: `Task "${task.title}" references excluded scope (${pattern.label}).`,
          });
        }
      }
    });
  });

  return issues;
}
