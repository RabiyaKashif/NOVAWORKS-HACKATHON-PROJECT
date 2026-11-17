import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Layers,
  ListChecks,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  AgentTaskItem,
  DirectoryEmployee,
  StoredProjectDetail,
  StoredProjectSummary,
  StoredTask,
} from '../types/project.ts';
import { OrbitalBackground } from './OrbitalBackground.tsx';

interface TasksScreenProps {
  selectedProject: StoredProjectDetail | null;
  allProjects: StoredProjectSummary[];
  myTasks: AgentTaskItem[];
  directory: DirectoryEmployee[];
  currentUser: DirectoryEmployee;
  isLoading: boolean;
  detailError: string | null;
  onBackToProjects: () => void;
  onSelectProjectId: (id: string) => void;
  onClearSelectedProject: () => void;
  onDeleteProject?: (projectId: string) => Promise<void>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  selectedProject,
  allProjects,
  myTasks,
  directory,
  currentUser,
  isLoading,
  detailError,
  onBackToProjects,
  onSelectProjectId,
  onClearSelectedProject,
  onDeleteProject,
}) => {
  const [sortMode, setSortMode] = useState<'deadline' | 'hours'>('deadline');
  const [activeTask, setActiveTask] = useState<(StoredTask & { projectName?: string }) | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!activeTask) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTask(null);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [activeTask]);

  const employeeMap = useMemo(
    () => new Map(directory.map((u) => [u.id, u])),
    [directory]
  );

  const sortedProjectTasks = useMemo(() => {
    if (!selectedProject) return [];
    const copy = [...selectedProject.tasks];
    if (sortMode === 'hours') {
      return copy.sort((a, b) => b.estimatedHours - a.estimatedHours);
    }
    return copy.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [selectedProject, sortMode]);

  const sortedMyTasks = useMemo(() => {
    const copy = [...myTasks];
    if (sortMode === 'hours') {
      return copy.sort((a, b) => b.estimatedHours - a.estimatedHours);
    }
    return copy.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [myTasks, sortMode]);

  const cycleSort = () => {
    setSortMode((prev) => (prev === 'deadline' ? 'hours' : 'deadline'));
  };

  const handleExportManifest = () => {
    const payload = selectedProject
      ? {
          exportedAt: new Date().toISOString(),
          projectId: selectedProject.id,
          name: selectedProject.name,
          clientName: selectedProject.clientName,
          managerId: selectedProject.managerId,
          managerName: selectedProject.managerName,
          deadline: selectedProject.deadline,
          totalHours: selectedProject.totalHours,
          tasks: selectedProject.tasks,
        }
      : {
          exportedAt: new Date().toISOString(),
          user: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
          tasks: myTasks,
        };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedProject
      ? `${selectedProject.id.toLowerCase()}-manifest.json`
      : `novaworks-${currentUser.id.toLowerCase()}-tasks.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden">
        <OrbitalBackground variant="subpage" />
        <div className="relative z-10 mx-auto max-w-[1220px] px-5 pt-10 pb-12 sm:px-8">
          <div className="animate-pulse rounded-[1.75rem] border border-[#0d1b3e]/[0.07] bg-white p-8 space-y-4">
            <div className="h-7 w-1/3 rounded bg-[#efeeea]" />
            <div className="h-4 w-2/3 rounded bg-[#f5f4f0]" />
            <div className="h-24 w-full rounded bg-[#f5f4f0]" />
          </div>
        </div>
      </div>
    );
  }

  // Mode A: Project Detail & Scoped Tasks (from GET /api/projects/:id)
  if (selectedProject) {
    return (
      <div className="relative overflow-hidden">
        <OrbitalBackground variant="subpage" />

        <div className="relative z-10 mx-auto max-w-[1220px] px-5 pt-7 pb-12 sm:px-8">
          {/* Top Breadcrumb & Project Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#45464e]">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onBackToProjects();
                }}
                className="inline-flex items-center gap-1.5 font-medium text-[#0d1b3e] hover:text-[#5b3bdf] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Projects
              </button>
              <span className="text-[#c6c6cf]" aria-hidden="true">/</span>
              <select
                aria-label="Switch active client project"
                value={selectedProject.id}
                onChange={(e) => {
                  setConfirmDelete(false);
                  onSelectProjectId(e.target.value);
                }}
                className="cursor-pointer rounded-lg bg-transparent py-0.5 font-medium text-[#45464e] hover:text-[#0d1b3e] focus:outline-none"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
              <span className="text-[#c6c6cf]" aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onClearSelectedProject();
                }}
                className="font-medium text-[#5b3bdf] hover:underline"
              >
                {currentUser.role === 'AGENT' ? 'All My Tasks' : 'All Permitted Tasks'}
              </button>
            </div>

            {currentUser.role === 'ADMIN' && onDeleteProject && (
              <div>
                {confirmDelete ? (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await onDeleteProject(selectedProject.id);
                          setConfirmDelete(false);
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      className="rounded-full bg-[#ba1a1a] px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-full border border-[#0d1b3e]/12 bg-white px-3.5 py-1.5 text-xs font-medium text-[#45464e]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3.5 py-1.5 text-xs font-medium text-[#ba1a1a] hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Project
                  </button>
                )}
              </div>
            )}
          </div>

          {detailError && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
            >
              {detailError}
            </div>
          )}

          {/* Project Hero Header */}
          <section className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b3bdf]">
                PROJECT EXECUTION • {selectedProject.id}
              </p>
              <h1 className="mt-2 font-editorial text-[42px] leading-[1.06] tracking-[-0.02em] text-[#0d1b3e] sm:text-[54px] text-balance">
                {selectedProject.name}
              </h1>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#45464e]">
                {selectedProject.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleExportManifest}
                className="inline-flex items-center gap-3 rounded-full bg-[#0d1b3e] py-2 pl-5 pr-2 text-xs font-semibold text-white shadow-[0_12px_24px_-6px_rgba(13,27,62,0.25)] transition-colors hover:bg-[#162756] whitespace-nowrap shrink-0"
              >
                <span>Export Task Manifest</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6344e7] text-white">
                  <Download className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
          </section>

          {/* 4-Column KPI Metadata Strip */}
          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                <Users className="h-3.5 w-3.5 text-[#5b3bdf]" />
                <span>ASSIGNED MANAGER</span>
              </div>
              <p className="mt-2.5 text-[15px] font-semibold text-[#0d1b3e]">
                {selectedProject.managerName}
              </p>
              <p className="mt-0.5 text-xs font-mono text-[#45464e]">
                {selectedProject.managerId}
              </p>
            </div>

            <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                <Calendar className="h-3.5 w-3.5 text-[#5b3bdf]" />
                <span>PROJECT DEADLINE</span>
              </div>
              <p className="mt-2.5 text-[15px] font-semibold font-mono text-[#0d1b3e] tabular-nums">
                {selectedProject.deadline}
              </p>
              <p className="mt-0.5 text-xs text-[#45464e]">Agreed 2026 Delivery</p>
            </div>

            <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                <Building2 className="h-3.5 w-3.5 text-[#5b3bdf]" />
                <span>CLIENT</span>
              </div>
              <p className="mt-2.5 text-[15px] font-semibold text-[#0d1b3e]">
                {selectedProject.clientName}
              </p>
              <p className="mt-0.5 text-xs text-[#45464e]">External Engagement</p>
            </div>

            <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                <ListChecks className="h-3.5 w-3.5 text-[#5b3bdf]" />
                <span>DELIVERABLE SCOPE</span>
              </div>
              <p className="mt-2.5 text-[15px] font-semibold text-[#0d1b3e] tabular-nums">
                {selectedProject.tasks.length}{' '}
                {selectedProject.tasks.length === 1 ? 'Task' : 'Tasks'}
              </p>
              <p className="mt-0.5 text-xs font-mono text-[#45464e] tabular-nums">
                {selectedProject.totalHours} Estimated Hours
              </p>
            </div>
          </section>

          {/* Active Viewer Clearance Bar */}
          <div className="mt-6 flex flex-col justify-between gap-3 rounded-3xl border border-[#0d1b3e]/[0.07] bg-white px-5 py-3.5 shadow-[0_4px_18px_-10px_rgba(13,27,62,0.06)] sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6344e7] text-[11px] font-semibold text-white">
                {getInitials(currentUser.name)}
              </span>
              <span className="text-[#45464e]">
                Authenticated as{' '}
                <strong className="font-semibold text-[#0d1b3e]">
                  {currentUser.name} ({currentUser.role})
                </strong>
              </span>
              <span className="text-[#c6c6cf]" aria-hidden="true">•</span>
              <span className="font-medium text-[#5b3bdf]">
                {currentUser.role === 'AGENT'
                  ? 'RBAC active: showing only tasks assigned to your account'
                  : 'Showing all deliverables for this project'}
              </span>
            </div>
          </div>

          {/* Backlog & Execution Manifest Table Card */}
          <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-[#0d1b3e]/[0.07] bg-white shadow-[0_12px_36px_-16px_rgba(13,27,62,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0d1b3e]/[0.06] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0d1b3e]">
                  {currentUser.role === 'AGENT'
                    ? 'MY PROJECT TASKS'
                    : 'APPROVED DELIVERABLE MANIFEST'}
                </h2>
                <span className="text-[#c6c6cf]" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-[#76767f] tabular-nums">
                  {sortedProjectTasks.length} tasks
                </span>
              </div>

              <button
                type="button"
                onClick={cycleSort}
                className="text-xs font-medium text-[#76767f] hover:text-[#0d1b3e] transition-colors"
              >
                Sort:{' '}
                <span className="text-[#0d1b3e]">
                  {sortMode === 'deadline' ? 'By Deadline' : 'By Effort (Hours)'}
                </span>
              </button>
            </div>

            <div className="divide-y divide-[#0d1b3e]/[0.06]">
              {sortedProjectTasks.map((task) => {
                const emp = employeeMap.get(task.assigneeId);
                return (
                  <div
                    key={task.id}
                    onClick={() =>
                      setActiveTask({ ...task, projectName: selectedProject.name })
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveTask({ ...task, projectName: selectedProject.name });
                      }
                    }}
                    className="group flex cursor-pointer flex-col justify-between gap-4 px-6 py-5 transition-colors hover:bg-[#faf9f5]/80 lg:flex-row lg:items-center"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1edff]">
                        <Layers className="h-4 w-4 text-[#5b3bdf]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-[#76767f] tabular-nums">
                            {task.id}
                          </span>
                          <span className="text-[#c6c6cf]" aria-hidden="true">·</span>
                          <span className="text-[11px] font-semibold text-[#5b3bdf]">
                            {task.assigneeId}
                          </span>
                        </div>

                        <h3 className="mt-1.5 text-[16px] font-semibold tracking-[-0.01em] text-[#0d1b3e] group-hover:text-[#5b3bdf] transition-colors">
                          {task.title}
                        </h3>
                        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#45464e]">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-5 pl-13 lg:justify-end lg:pl-0 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d1b3e] text-[10px] font-semibold text-white">
                          {getInitials(task.assigneeName)}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-[#0d1b3e] leading-tight">
                            {task.assigneeName}
                          </p>
                          <p className="text-[11px] text-[#76767f] leading-tight">
                            {emp?.specialization ?? task.assigneeId}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#45464e] tabular-nums font-mono">
                        <Clock className="h-3.5 w-3.5 text-[#76767f]" />
                        {task.estimatedHours} hrs
                      </span>

                      <div className="text-right tabular-nums">
                        <p className="text-[10px] text-[#76767f]">Deadline</p>
                        <p className="text-xs font-semibold font-mono text-[#0d1b3e]">
                          {task.deadline}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-[#76767f] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0d1b3e]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Task Detail Drawer */}
        {activeTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-end bg-[#0d1b3e]/35 backdrop-blur-xs"
            onClick={() => setActiveTask(null)}
          >
            <div
              className="flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-[#0d1b3e]/[0.07] pb-4">
                  <span className="font-mono text-xs font-semibold tracking-widest text-[#5b3bdf]">
                    {activeTask.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTask(null)}
                    aria-label="Close task inspector"
                    className="rounded-full p-1.5 text-[#76767f] hover:bg-[#f5f4f0] hover:text-[#0d1b3e]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {activeTask.projectName && (
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b3bdf]">
                    {activeTask.projectName}
                  </p>
                )}
                <h3 className="mt-1.5 font-editorial text-2xl text-[#0d1b3e]">
                  {activeTask.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#45464e]">
                  {activeTask.description}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-xl bg-[#f5f4f0] p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#76767f]">
                      Assigned Developer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#0d1b3e]">
                      {activeTask.assigneeName}{' '}
                      <span className="font-mono text-xs font-normal text-[#5b3bdf]">
                        ({activeTask.assigneeId})
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#f5f4f0] p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#76767f]">
                        Estimated Effort
                      </p>
                      <p className="mt-1 text-sm font-semibold font-mono text-[#0d1b3e] tabular-nums">
                        {activeTask.estimatedHours} hrs
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f5f4f0] p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#76767f]">
                        Deadline
                      </p>
                      <p className="mt-1 text-sm font-semibold font-mono text-[#0d1b3e] tabular-nums">
                        {activeTask.deadline}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTask(null)}
                className="mt-8 w-full rounded-full bg-[#0d1b3e] py-2.5 text-xs font-semibold text-white hover:bg-[#162756]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode B: My Assigned Tasks / All Permitted Tasks (from GET /api/tasks/my)
  const totalMyHours = sortedMyTasks.reduce(
    (sum, t) => sum + (Number(t.estimatedHours) || 0),
    0
  );
  const distinctProjects = new Set(sortedMyTasks.map((t) => t.projectId)).size;

  return (
    <div className="relative overflow-hidden">
      <OrbitalBackground variant="subpage" />

      <div className="relative z-10 mx-auto max-w-[1220px] px-5 pt-10 pb-12 sm:px-8">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b3bdf]">
              {currentUser.role} WORKQUEUE • {currentUser.id}
            </p>
            <h1 className="mt-2 font-editorial text-[42px] leading-[1.06] tracking-[-0.02em] text-[#0d1b3e] sm:text-[54px] text-balance">
              {currentUser.role === 'AGENT' ? 'My Assigned Tasks' : 'Permitted Task Queue'}
            </h1>
            <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#45464e]">
              {currentUser.role === 'AGENT'
                ? 'Deliverables assigned directly to your account across active NovaWorks client engagements.'
                : 'All deliverables visible under your account clearance. Select any task to open its parent project.'}
            </p>
          </div>

          {sortedMyTasks.length > 0 && (
            <button
              type="button"
              onClick={handleExportManifest}
              className="inline-flex items-center gap-3 rounded-full bg-[#0d1b3e] py-2 pl-5 pr-2 text-xs font-semibold text-white shadow-[0_12px_24px_-6px_rgba(13,27,62,0.25)] transition-colors hover:bg-[#162756] whitespace-nowrap shrink-0"
            >
              <span>Export Task Manifest</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6344e7] text-white">
                <Download className="h-3.5 w-3.5" />
              </span>
            </button>
          )}
        </section>

        {detailError && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
          >
            {detailError}
          </div>
        )}

        {/* 4-Column Summary KPI Strip */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
              <Users className="h-3.5 w-3.5 text-[#5b3bdf]" />
              <span>OPERATOR</span>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold text-[#0d1b3e]">
              {currentUser.name}
            </p>
            <p className="mt-0.5 text-xs text-[#45464e]">{currentUser.specialization}</p>
          </div>

          <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
              <ListChecks className="h-3.5 w-3.5 text-[#5b3bdf]" />
              <span>ASSIGNED TASKS</span>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold text-[#0d1b3e] tabular-nums">
              {sortedMyTasks.length} Deliverables
            </p>
            <p className="mt-0.5 text-xs text-[#45464e]">Verified in SQLite</p>
          </div>

          <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
              <Clock className="h-3.5 w-3.5 text-[#5b3bdf]" />
              <span>EFFORT ALLOCATION</span>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold font-mono text-[#0d1b3e] tabular-nums">
              {totalMyHours} hrs
            </p>
            <p className="mt-0.5 text-xs text-[#45464e]">Total Estimated Effort</p>
          </div>

          <div className="rounded-2xl border border-[#0d1b3e]/[0.07] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(13,27,62,0.05)]">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
              <Building2 className="h-3.5 w-3.5 text-[#5b3bdf]" />
              <span>RELATED PROJECTS</span>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold text-[#0d1b3e] tabular-nums">
              {distinctProjects} {distinctProjects === 1 ? 'Project' : 'Projects'}
            </p>
            <p className="mt-0.5 text-xs text-[#45464e]">RBAC Enforced</p>
          </div>
        </section>

        {sortedMyTasks.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#0d1b3e]/[0.08] bg-white p-12 text-center">
            <p className="font-editorial text-xl text-[#0d1b3e]">No assigned tasks yet</p>
            <p className="mt-1.5 text-xs text-[#45464e] max-w-md mx-auto">
              Tasks assigned to your account from meeting transcripts will appear here automatically.
            </p>
            <button
              type="button"
              onClick={onBackToProjects}
              className="mt-5 rounded-full bg-[#0d1b3e] px-5 py-2 text-xs font-semibold text-white hover:bg-[#162756]"
            >
              View Projects
            </button>
          </div>
        ) : (
          <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#0d1b3e]/[0.07] bg-white shadow-[0_12px_36px_-16px_rgba(13,27,62,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0d1b3e]/[0.06] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0d1b3e]">
                  ASSIGNED EXECUTION MANIFEST
                </h2>
                <span className="text-[#c6c6cf]" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-[#76767f] tabular-nums">
                  {sortedMyTasks.length} tasks
                </span>
              </div>

              <button
                type="button"
                onClick={cycleSort}
                className="text-xs font-medium text-[#76767f] hover:text-[#0d1b3e] transition-colors"
              >
                Sort:{' '}
                <span className="text-[#0d1b3e]">
                  {sortMode === 'deadline' ? 'By Deadline' : 'By Effort (Hours)'}
                </span>
              </button>
            </div>

            <div className="divide-y divide-[#0d1b3e]/[0.06]">
              {sortedMyTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onSelectProjectId(task.projectId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProjectId(task.projectId);
                    }
                  }}
                  className="group flex cursor-pointer flex-col justify-between gap-4 px-6 py-5 transition-colors hover:bg-[#faf9f5]/80 lg:flex-row lg:items-center"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1edff]">
                      <Layers className="h-4 w-4 text-[#5b3bdf]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-[#76767f] tabular-nums">
                          {task.id}
                        </span>
                        <span className="text-[#c6c6cf]" aria-hidden="true">·</span>
                        <span className="text-[11px] font-semibold text-[#5b3bdf]">
                          {task.projectName} ({task.clientName})
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-[16px] font-semibold tracking-[-0.01em] text-[#0d1b3e] group-hover:text-[#5b3bdf] transition-colors">
                        {task.title}
                      </h3>
                      <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#45464e]">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-5 pl-13 lg:justify-end lg:pl-0 shrink-0">
                    <div>
                      <p className="text-[10px] text-[#76767f]">Manager</p>
                      <p className="text-xs font-semibold text-[#0d1b3e]">
                        {task.managerName}
                      </p>
                    </div>

                    {currentUser.role !== 'AGENT' && (
                      <div>
                        <p className="text-[10px] text-[#76767f]">Assignee</p>
                        <p className="text-xs font-semibold text-[#0d1b3e]">
                          {task.assigneeName}
                        </p>
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#45464e] tabular-nums font-mono">
                      <Clock className="h-3.5 w-3.5 text-[#76767f]" />
                      {task.estimatedHours} hrs
                    </span>

                    <div className="text-right tabular-nums">
                      <p className="text-[10px] text-[#76767f]">Deadline</p>
                      <p className="text-xs font-semibold font-mono text-[#0d1b3e]">
                        {task.deadline}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-[#76767f] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0d1b3e]" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
