export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

export type AppScreen = 'projects' | 'tasks' | 'team';

export type WorkspaceTab =
  | 'extractor'
  | 'projects'
  | 'mytasks'
  | 'directory'
  | 'rules';

export interface DirectoryEmployee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialization: string;
  skills: string[];
}

export interface ExtractedTask {
  title: string;
  description: string;
  assigneeId: string;
  deadline: string;
  estimatedHours: number;
}

export interface ExtractedProject {
  name: string;
  clientName: string;
  description: string;
  managerId: string;
  deadline: string;
  tasks: ExtractedTask[];
}

export interface ExtractionResult {
  projects: ExtractedProject[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

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

export interface RuleCheckItem {
  id: string;
  ruleNumber: number;
  label: string;
  passed: boolean;
  detail: string;
}

export interface SampleTranscript {
  id: string;
  title: string;
  client: string;
  date: string;
  summary: string;
  transcript: string;
}
