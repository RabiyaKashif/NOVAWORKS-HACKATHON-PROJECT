import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  FileText,
  Pencil,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  auditExtraction,
  FORBIDDEN_PATTERNS,
  SAMPLE_TRANSCRIPTS,
} from '../data/defaults.ts';
import { copyToClipboard } from '../lib/api.ts';
import type {
  DirectoryEmployee,
  ExtractedProject,
  ExtractedTask,
  ExtractionResult,
  StoredProjectDetail,
  StoredProjectSummary,
  UserRole,
  ValidationIssue,
} from '../types/project.ts';
import { OrbitalBackground } from './OrbitalBackground.tsx';

interface ProjectsScreenProps {
  role: UserRole;
  projects: StoredProjectSummary[];
  directory: DirectoryEmployee[];
  isLoadingProjects: boolean;
  isExtracting: boolean;
  extractError: string | null;
  detailError?: string | null;
  unresolvedIssues: ValidationIssue[];
  draft: ExtractionResult | null;
  createdSummary: {
    projectCount: number;
    taskCount: number;
    projects: StoredProjectDetail[];
  } | null;
  onSelectProject: (projectId: string) => void;
  onCreateFromTranscript: (transcript: string) => Promise<void>;
  onSaveCorrectedDraft: (nextDraft: ExtractionResult) => Promise<void>;
  onChangeDraft: (nextDraft: ExtractionResult | null) => void;
  onDismissBanner: () => void;
  onDismissDetailError?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  role,
  projects,
  directory,
  isLoadingProjects,
  isExtracting,
  extractError,
  detailError = null,
  unresolvedIssues,
  draft,
  createdSummary,
  onSelectProject,
  onCreateFromTranscript,
  onSaveCorrectedDraft,
  onChangeDraft,
  onDismissBanner,
  onDismissDetailError,
}) => {
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPTS[0].transcript);
  const [demoIndex, setDemoIndex] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressDetail, setProgressDetail] = useState(
    'Ready to parse meeting transcript against NovaWorks Active Directory.'
  );

  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'summary' | 'json' | 'audit'>('summary');
  const [copiedJson, setCopiedJson] = useState(false);

  // Inline correction state (used when backend returns 422)
  const [editingProjIdx, setEditingProjIdx] = useState<number | null>(null);
  const [projEdit, setProjEdit] = useState<Omit<ExtractedProject, 'tasks'> | null>(null);
  const [editingTaskKey, setEditingTaskKey] = useState<{
    projIdx: number;
    taskIdx: number;
  } | null>(null);
  const [taskEdit, setTaskEdit] = useState<ExtractedTask | null>(null);

  // Active engagements filters
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState<string>('ALL');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [filterMenuOpen]);

  const managers = useMemo(
    () => directory.filter((u) => u.role === 'MANAGER'),
    [directory]
  );
  const agents = useMemo(
    () => directory.filter((u) => u.role === 'AGENT'),
    [directory]
  );
  const employeeMap = useMemo(
    () => new Map(directory.map((u) => [u.id, u])),
    [directory]
  );

  useEffect(() => {
    if (isExtracting) {
      setProgressPercent(45);
      setProgressDetail('Extracting project scope, owners, deadlines, and effort hours with Gemini...');
      const timer1 = setTimeout(() => {
        setProgressPercent(75);
        setProgressDetail('Validating directory IDs, 2026 deadlines, and excluded feature rules...');
      }, 2000);
      const timer2 = setTimeout(() => {
        setProgressPercent(88);
        setProgressDetail('Still extracting and validating with Gemini AI (large transcripts may take 30–90s)...');
      }, 10000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
    if (createdSummary) {
      setProgressPercent(100);
      setProgressDetail(
        `Committed ${createdSummary.projectCount} project(s) and ${createdSummary.taskCount} task(s) to SQLite.`
      );
      setShowInspector(true);
      setInspectorTab('summary');
    } else if (unresolvedIssues.length > 0) {
      setProgressPercent(70);
      setProgressDetail(
        `Validation paused with ${unresolvedIssues.length} unresolved field(s). Correct below and save.`
      );
    } else if (extractError) {
      setProgressPercent(0);
      setProgressDetail('Extraction stopped. Review the error above and retry.');
    }
  }, [isExtracting, createdSummary, unresolvedIssues.length, extractError]);

  const availableManagers = useMemo(() => {
    const unique = Array.from(new Set(projects.map((p) => p.managerName)));
    return ['ALL', ...unique];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        project.clientName.toLowerCase().includes(q) ||
        project.name.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.managerName.toLowerCase().includes(q) ||
        project.managerId.toLowerCase().includes(q);
      const matchesManager =
        managerFilter === 'ALL' || project.managerName === managerFilter;
      return matchesQuery && matchesManager;
    });
  }, [projects, searchQuery, managerFilter]);

  const auditItems = useMemo(
    () => (draft ? auditExtraction(draft, directory) : []),
    [draft, directory]
  );
  const passedCount = auditItems.filter((a) => a.passed).length;

  const handleCycleDemoTranscript = () => {
    const nextIdx = (demoIndex + 1) % SAMPLE_TRANSCRIPTS.length;
    const sample = SAMPLE_TRANSCRIPTS[nextIdx];
    setTranscript(sample.transcript);
    setDemoIndex(nextIdx);
    setLocalError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTranscript(reader.result);
        setLocalError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSynthesize = async () => {
    if (!transcript.trim()) {
      setLocalError('Paste meeting notes or click "Insert Demo Transcript" to run extraction.');
      return;
    }
    setLocalError(null);
    setEditingProjIdx(null);
    setEditingTaskKey(null);
    await onCreateFromTranscript(transcript);
  };

  const handleCopyJson = async () => {
    if (!draft) return;
    const ok = await copyToClipboard(JSON.stringify(draft, null, 2));
    if (ok) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    }
  };

  const activeSegments =
    progressPercent >= 95 ? 4 : progressPercent >= 70 ? 3 : progressPercent >= 40 ? 2 : progressPercent > 0 ? 1 : 0;

  const displayedError = localError || extractError;

  return (
    <div className="relative overflow-hidden">
      <OrbitalBackground variant="hero" />

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 pt-10 pb-12 sm:px-8 sm:pt-14">
        {/* Hero Header */}
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="mt-2 font-editorial text-[44px] leading-[1.05] tracking-[-0.02em] text-[#0d1b3e] sm:text-[62px] text-balance">
            {role === 'ADMIN'
              ? 'Dashboard & Operations'
              : role === 'MANAGER'
                ? 'Managed Engagements'
                : 'Assigned Engagements'}
          </h1>

          <p className="mx-auto mt-4 max-w-[540px] text-[15px] leading-relaxed text-[#45464e]">
            {role === 'ADMIN'
              ? 'Autonomous meeting-to-execution pipeline coordinating NovaWorks project architecture and developer assignments.'
              : role === 'MANAGER'
                ? 'Client engagements assigned to your management queue with verified scope, deadlines, and effort estimates.'
                : 'Client engagements containing tasks assigned directly to your account.'}
          </p>
        </section>

        {/* Admin-Only AI Meeting-to-Project Generator Card */}
        {role === 'ADMIN' && (
          <section
            className="mx-auto mt-10 max-w-[940px]"
            aria-label="AI Meeting-to-Project Generator"
          >
            <div className="rounded-[1.75rem] border border-[#0d1b3e]/[0.07] bg-white p-6 shadow-[0_14px_40px_-16px_rgba(13,27,62,0.09)] sm:p-8">
              {/* Generator Header */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1edff] text-[#5b3bdf]">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-editorial text-[24px] leading-tight text-[#0d1b3e]">
                        AI Meeting-to-Project Generator
                      </h2>
                      <span className="text-xs font-medium text-[#76767f]">
                        · Gemini Engine
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#45464e]">
                      Parse meeting transcripts against your seeded directory, validate 2026 deadlines &amp; excluded scope, and save atomically.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCycleDemoTranscript}
                    className="inline-flex items-center gap-2 rounded-full border border-[#0d1b3e]/12 bg-white px-4 py-2 text-xs font-medium text-[#0d1b3e] transition-colors hover:bg-[#f5f4f0] whitespace-nowrap shrink-0"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#5b3bdf]" />
                    Switch Sample ({SAMPLE_TRANSCRIPTS[(demoIndex + 1) % SAMPLE_TRANSCRIPTS.length].title.split(' ')[0]})
                  </button>
                </div>
              </div>

              {/* Saved Success Banner */}
              {createdSummary && (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#6344e7]/15 bg-[#f7f5ff] px-4 py-3 text-xs text-[#23005c]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5b3bdf]" />
                    <p className="leading-snug">
                      Saved <strong>{createdSummary.projectCount}</strong> project(s) and{' '}
                      <strong>{createdSummary.taskCount}</strong> task(s) to the database:{' '}
                      {createdSummary.projects.map((p) => p.name).join(', ')}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDismissBanner}
                    aria-label="Dismiss notification"
                    className="shrink-0 rounded-full p-1 text-[#5b3bdf]/70 hover:bg-[#e5deff] hover:text-[#23005c]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* 422 Unresolved Validation Issues Banner */}
              {unresolvedIssues.length > 0 && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-2"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        Unresolved fields detected — nothing was saved to the database
                      </p>
                      <p className="mt-0.5 text-amber-900">
                        Fix the flagged project or task fields in the correction panel below, then click Revalidate &amp; Save.
                      </p>
                    </div>
                  </div>
                  <ul className="list-disc pl-7 space-y-1 text-amber-900">
                    {unresolvedIssues.map((issue, idx) => (
                      <li key={idx}>
                        <span className="font-mono font-semibold">{issue.path}</span>: {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transcript Input Box */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#0d1b3e]/[0.09] bg-[#faf9f5]/75 transition-shadow focus-within:border-[#6344e7]/40 focus-within:ring-3 focus-within:ring-[#6344e7]/12">
                <textarea
                  rows={6}
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="Paste meeting transcript here (attendees, 2026 deadlines, effort hours, and excluded features)..."
                  className="w-full resize-y bg-transparent px-4 pt-4 pb-3 text-[13px] leading-relaxed text-[#0d1b3e] placeholder:text-[#76767f]/80 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#0d1b3e]/[0.06] bg-white/60 px-4 py-2 text-[11px] text-[#76767f]">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[#45464e] hover:text-[#5b3bdf] transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload .txt / .vtt / .md</span>
                      <input
                        type="file"
                        accept=".txt,.vtt,.md"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    <span aria-hidden="true">•</span>
                    <span>
                      Directory: {managers.length} Managers · {agents.length} Agents
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {transcript.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTranscript('');
                          setLocalError(null);
                        }}
                        className="text-[#45464e] hover:text-[#0d1b3e]"
                      >
                        Clear
                      </button>
                    )}
                    <span className="tabular-nums font-medium text-[#76767f]">
                      {transcript.length} characters
                    </span>
                  </div>
                </div>
              </div>

              {displayedError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{displayedError}</span>
                </div>
              )}

              {/* Processing Bar */}
              <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl bg-[#f5f4f0] px-4 py-3.5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5b3bdf] ${
                      isExtracting ? 'animate-pulse' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#0d1b3e] tabular-nums">
                      {isExtracting
                        ? `${progressPercent}% Processing`
                        : progressPercent > 0
                          ? `${progressPercent}% Complete`
                          : 'Ready'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#45464e]">{progressDetail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                  {[1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={`h-1.5 w-6 rounded-full transition-colors duration-200 ${
                        step <= activeSegments ? 'bg-[#5b3bdf]' : 'bg-[#dcd6f7]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Generator Footer CTA */}
              <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-xs text-[#45464e]">
                  <ShieldCheck className="h-4 w-4 text-[#5b3bdf]" />
                  <span>
                    Enforces directory IDs, 2026 dates, positive effort hours, and excluded scope rules
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {draft && (
                    <button
                      type="button"
                      onClick={() => setShowInspector((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#0d1b3e]/12 bg-white px-4 py-2 text-xs font-medium text-[#0d1b3e] hover:bg-[#f5f4f0]"
                    >
                      <Code2 className="h-3.5 w-3.5 text-[#5b3bdf]" />
                      <span>{showInspector ? 'Hide Output' : 'View Output & JSON'}</span>
                      {showInspector ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isExtracting || !transcript.trim()}
                    onClick={handleSynthesize}
                    className="inline-flex items-center gap-3 rounded-full bg-[#0d1b3e] py-2 pl-5 pr-2 text-xs font-semibold text-white shadow-[0_12px_24px_-6px_rgba(13,27,62,0.28)] transition-all duration-150 hover:bg-[#162756] disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
                  >
                    <span>
                      {isExtracting ? 'Processing Transcript...' : 'Create from Transcript'}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6344e7] text-white">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              </div>

              {/* 422 Draft Correction Panel */}
              {draft && unresolvedIssues.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-[#faf9f5] p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0d1b3e]/[0.07] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0d1b3e]">
                        Draft Correction Workspace
                      </h3>
                      <p className="text-xs text-[#45464e]">
                        Edit unresolved fields below, then revalidate and save atomically.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isExtracting}
                      onClick={() => onSaveCorrectedDraft(draft)}
                      className="rounded-full bg-[#0d1b3e] px-5 py-2 text-xs font-semibold text-white hover:bg-[#162756] disabled:opacity-50"
                    >
                      Revalidate &amp; Save
                    </button>
                  </div>

                  {draft.projects.map((proj, pIdx) => {
                    const isEditingProj = editingProjIdx === pIdx;
                    return (
                      <div
                        key={pIdx}
                        className="rounded-2xl border border-[#0d1b3e]/10 bg-white p-4 space-y-3"
                      >
                        {isEditingProj && projEdit ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <input
                              type="text"
                              value={projEdit.name}
                              onChange={(e) => setProjEdit({ ...projEdit, name: e.target.value })}
                              placeholder="Project name"
                              className="rounded-xl border border-[#0d1b3e]/15 px-3 py-2"
                            />
                            <input
                              type="text"
                              value={projEdit.clientName}
                              onChange={(e) =>
                                setProjEdit({ ...projEdit, clientName: e.target.value })
                              }
                              placeholder="Client name"
                              className="rounded-xl border border-[#0d1b3e]/15 px-3 py-2"
                            />
                            <select
                              value={projEdit.managerId}
                              onChange={(e) =>
                                setProjEdit({ ...projEdit, managerId: e.target.value })
                              }
                              className="rounded-xl border border-[#0d1b3e]/15 bg-white px-3 py-2"
                            >
                              {!managers.some((m) => m.id === projEdit.managerId) && (
                                <option value={projEdit.managerId}>
                                  {projEdit.managerId} (Invalid Manager)
                                </option>
                              )}
                              {managers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.id} — {m.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={projEdit.deadline}
                              onChange={(e) =>
                                setProjEdit({ ...projEdit, deadline: e.target.value })
                              }
                              placeholder="2026-MM-DD"
                              className="rounded-xl border border-[#0d1b3e]/15 px-3 py-2 font-mono"
                            />
                            <textarea
                              rows={2}
                              value={projEdit.description}
                              onChange={(e) =>
                                setProjEdit({ ...projEdit, description: e.target.value })
                              }
                              placeholder="Brief approved project scope"
                              className="sm:col-span-2 rounded-xl border border-[#0d1b3e]/15 px-3 py-2"
                            />
                            <div className="sm:col-span-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingProjIdx(null)}
                                className="px-3 py-1.5 text-xs text-[#45464e]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextProjects = draft.projects.map((p, idx) =>
                                    idx === pIdx ? { ...p, ...projEdit } : p
                                  );
                                  onChangeDraft({ projects: nextProjects });
                                  setEditingProjIdx(null);
                                }}
                                className="rounded-full bg-[#0d1b3e] px-4 py-1.5 text-xs font-semibold text-white"
                              >
                                Apply Project Fix
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0d1b3e]">
                                {proj.name} ·{' '}
                                <span className="font-normal text-[#45464e]">{proj.clientName}</span>
                              </p>
                              <p className="text-xs text-[#45464e]">
                                Manager:{' '}
                                <span className="font-mono font-semibold">{proj.managerId}</span> ·
                                Deadline: <span className="font-mono">{proj.deadline}</span>
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#76767f]">
                                {proj.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setProjEdit({
                                    name: proj.name,
                                    clientName: proj.clientName,
                                    description: proj.description,
                                    managerId: proj.managerId,
                                    deadline: proj.deadline,
                                  });
                                  setEditingProjIdx(pIdx);
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-[#0d1b3e]/12 px-3 py-1 text-xs font-medium text-[#0d1b3e] hover:bg-[#f5f4f0]"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit Project
                              </button>
                              {draft.projects.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onChangeDraft({
                                      projects: draft.projects.filter((_, idx) => idx !== pIdx),
                                    });
                                    setEditingProjIdx(null);
                                    setEditingTaskKey(null);
                                  }}
                                  className="rounded-full p-1.5 text-[#76767f] hover:bg-red-50 hover:text-red-700"
                                  aria-label={`Remove ${proj.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="divide-y divide-[#0d1b3e]/[0.06] border-t border-[#0d1b3e]/[0.06] pt-2">
                          {proj.tasks.map((task, tIdx) => {
                            const isEditingTask =
                              editingTaskKey?.projIdx === pIdx &&
                              editingTaskKey?.taskIdx === tIdx;
                            const assignee = employeeMap.get(task.assigneeId);
                            const badAssignee = !assignee || assignee.role !== 'AGENT';
                            const strippedTaskText = `${task.title} ${task.description}`.replace(
                              /\b(no|not|without|excluding|excludes|exclude|skip|skipped|drop|dropped|ignore|ignored)\s+(?:any\s+|real\s+|live\s+)?(payment\s+gateways?|payments?|inventory\s+integration|maps?|driver\s+tracking|real[- ]email\s+sending)(?:\s+(?:or|and)\s+(?:payment\s+gateways?|payments?|inventory\s+integration|maps?|driver\s+tracking|real[- ]email\s+sending))*/gi,
                              ''
                            );
                            const forbidden = FORBIDDEN_PATTERNS.find((pat) =>
                              pat.regex.test(strippedTaskText)
                            );

                            if (isEditingTask && taskEdit) {
                              return (
                                <div key={tIdx} className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                                  <input
                                    type="text"
                                    value={taskEdit.title}
                                    onChange={(e) =>
                                      setTaskEdit({ ...taskEdit, title: e.target.value })
                                    }
                                    placeholder="Task title"
                                    className="sm:col-span-5 rounded-lg border border-[#0d1b3e]/15 px-2.5 py-1.5"
                                  />
                                  <select
                                    value={taskEdit.assigneeId}
                                    onChange={(e) =>
                                      setTaskEdit({ ...taskEdit, assigneeId: e.target.value })
                                    }
                                    className="sm:col-span-3 rounded-lg border border-[#0d1b3e]/15 bg-white px-2.5 py-1.5"
                                  >
                                    {!agents.some((a) => a.id === taskEdit.assigneeId) && (
                                      <option value={taskEdit.assigneeId}>
                                        {taskEdit.assigneeId} (Invalid)
                                      </option>
                                    )}
                                    {agents.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.id} — {a.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={taskEdit.deadline}
                                    onChange={(e) =>
                                      setTaskEdit({ ...taskEdit, deadline: e.target.value })
                                    }
                                    placeholder="2026-MM-DD"
                                    className="sm:col-span-2 rounded-lg border border-[#0d1b3e]/15 px-2.5 py-1.5 font-mono"
                                  />
                                  <input
                                    type="number"
                                    min={1}
                                    value={taskEdit.estimatedHours}
                                    onChange={(e) =>
                                      setTaskEdit({
                                        ...taskEdit,
                                        estimatedHours: Number(e.target.value),
                                      })
                                    }
                                    placeholder="Hours"
                                    className="sm:col-span-2 rounded-lg border border-[#0d1b3e]/15 px-2 py-1.5 font-mono"
                                  />
                                  <input
                                    type="text"
                                    value={taskEdit.description}
                                    onChange={(e) =>
                                      setTaskEdit({ ...taskEdit, description: e.target.value })
                                    }
                                    placeholder="Task description"
                                    className="sm:col-span-9 rounded-lg border border-[#0d1b3e]/15 px-2.5 py-1.5"
                                  />
                                  <div className="sm:col-span-3 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingTaskKey(null)}
                                      className="px-2.5 py-1 text-xs text-[#45464e]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextProjects = draft.projects.map((p, idx) =>
                                          idx !== pIdx
                                            ? p
                                            : {
                                                ...p,
                                                tasks: p.tasks.map((t, k) =>
                                                  k === tIdx ? taskEdit : t
                                                ),
                                              }
                                        );
                                        onChangeDraft({ projects: nextProjects });
                                        setEditingTaskKey(null);
                                      }}
                                      className="rounded-full bg-[#0d1b3e] px-3 py-1 text-white font-semibold"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={tIdx}
                                className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-[#0d1b3e]">
                                    {task.title}{' '}
                                    {forbidden && (
                                      <span className="text-red-700 font-semibold">
                                        (Excluded: {forbidden.label})
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[#45464e]">
                                    Assignee:{' '}
                                    <span
                                      className={`font-mono ${
                                        badAssignee ? 'text-red-700 font-semibold' : ''
                                      }`}
                                    >
                                      {task.assigneeId}
                                    </span>{' '}
                                    · {task.deadline} · {task.estimatedHours} hrs
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTaskEdit({ ...task });
                                      setEditingTaskKey({ projIdx: pIdx, taskIdx: tIdx });
                                    }}
                                    className="rounded-full p-1.5 text-[#45464e] hover:bg-[#f5f4f0]"
                                    aria-label={`Edit ${task.title}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextProjects = draft.projects.map((p, idx) =>
                                        idx !== pIdx
                                          ? p
                                          : {
                                              ...p,
                                              tasks: p.tasks.filter((_, k) => k !== tIdx),
                                            }
                                      );
                                      onChangeDraft({ projects: nextProjects });
                                    }}
                                    className="rounded-full p-1.5 text-[#76767f] hover:bg-red-50 hover:text-red-700"
                                    aria-label={`Remove ${task.title}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Created Output, Strict JSON & Rule Audit Drawer */}
              {showInspector && draft && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-[#0d1b3e]/10 bg-[#faf9f5]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0d1b3e]/[0.07] bg-white px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1 rounded-full bg-[#f5f4f0] p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setInspectorTab('summary')}
                        className={`rounded-full px-3 py-1 font-medium ${
                          inspectorTab === 'summary'
                            ? 'bg-white text-[#0d1b3e] shadow-xs'
                            : 'text-[#45464e]'
                        }`}
                      >
                        Created Output ({draft.projects.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('json')}
                        className={`rounded-full px-3 py-1 font-medium ${
                          inspectorTab === 'json'
                            ? 'bg-white text-[#0d1b3e] shadow-xs'
                            : 'text-[#45464e]'
                        }`}
                      >
                        Strict JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('audit')}
                        className={`rounded-full px-3 py-1 font-medium ${
                          inspectorTab === 'audit'
                            ? 'bg-white text-[#0d1b3e] shadow-xs'
                            : 'text-[#45464e]'
                        }`}
                      >
                        Rule Audit ({passedCount}/{auditItems.length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#0d1b3e]/10 bg-white px-3 py-1 text-xs font-medium text-[#0d1b3e] hover:bg-[#f5f4f0]"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#15803d]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#5b3bdf]" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  {inspectorTab === 'summary' ? (
                    <div className="max-h-[34rem] space-y-4 overflow-y-auto p-4">
                      {(createdSummary?.projects?.length
                        ? createdSummary.projects.map((savedProj) => ({
                            id: savedProj.id,
                            name: savedProj.name,
                            clientName: savedProj.clientName,
                            description: savedProj.description,
                            managerId: savedProj.managerId,
                            managerName: savedProj.managerName,
                            deadline: savedProj.deadline,
                            tasks: savedProj.tasks.map((t) => ({
                              id: t.id,
                              title: t.title,
                              description: t.description,
                              assigneeId: t.assigneeId,
                              assigneeName: t.assigneeName,
                              deadline: t.deadline,
                              estimatedHours: t.estimatedHours,
                            })),
                          }))
                        : draft.projects.map((p, idx) => ({
                            id: `DRAFT-${idx + 1}`,
                            name: p.name,
                            clientName: p.clientName,
                            description: p.description,
                            managerId: p.managerId,
                            managerName: employeeMap.get(p.managerId)?.name ?? p.managerId,
                            deadline: p.deadline,
                            tasks: p.tasks.map((t, tIdx) => ({
                              id: `TASK-${tIdx + 1}`,
                              title: t.title,
                              description: t.description,
                              assigneeId: t.assigneeId,
                              assigneeName:
                                employeeMap.get(t.assigneeId)?.name ?? t.assigneeId,
                              deadline: t.deadline,
                              estimatedHours: t.estimatedHours,
                            })),
                          }))
                      ).map((proj, pIdx) => (
                        <div
                          key={`${proj.id}-${pIdx}`}
                          className="rounded-2xl border border-[#0d1b3e]/[0.08] bg-white p-4 shadow-xs"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-semibold uppercase tracking-[0.12em] text-[#5b3bdf]">
                                  {proj.clientName}
                                </span>
                                {createdSummary?.projects?.length ? (
                                  <span className="font-mono text-[#76767f]">{proj.id}</span>
                                ) : null}
                              </div>
                              <h3 className="mt-1 text-base font-semibold text-[#0d1b3e]">
                                {proj.name}
                              </h3>
                              <p className="mt-1 text-xs leading-relaxed text-[#45464e]">
                                {proj.description}
                              </p>
                              <p className="mt-2 text-xs text-[#45464e]">
                                Manager:{' '}
                                <strong className="font-semibold text-[#0d1b3e]">
                                  {proj.managerName}
                                </strong>{' '}
                                <span className="font-mono text-[11px] text-[#5b3bdf]">
                                  ({proj.managerId})
                                </span>{' '}
                                · Deadline:{' '}
                                <span className="font-mono font-medium text-[#0d1b3e]">
                                  {proj.deadline}
                                </span>{' '}
                                · {proj.tasks.length} tasks (
                                {proj.tasks.reduce(
                                  (sum, t) => sum + (Number(t.estimatedHours) || 0),
                                  0
                                )}{' '}
                                hrs)
                              </p>
                            </div>

                            {createdSummary?.projects?.length ? (
                              <button
                                type="button"
                                onClick={() => onSelectProject(proj.id)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0d1b3e] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#162756] transition-colors"
                              >
                                <span>Open Project</span>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-3 divide-y divide-[#0d1b3e]/[0.06] border-t border-[#0d1b3e]/[0.06]">
                            {proj.tasks.map((task, tIdx) => (
                              <div
                                key={`${task.id}-${tIdx}`}
                                className="flex flex-col justify-between gap-2 py-2.5 text-xs sm:flex-row sm:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#0d1b3e]">{task.title}</p>
                                  <p className="mt-0.5 text-[11px] text-[#45464e]">
                                    {task.description}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-3 text-[11px] text-[#45464e] font-mono tabular-nums">
                                  <span className="rounded-md bg-[#f1edff] px-2 py-0.5 font-sans font-semibold text-[#5b3bdf]">
                                    {task.assigneeName} ({task.assigneeId})
                                  </span>
                                  <span>{task.estimatedHours} hrs</span>
                                  <span className="text-[#0d1b3e] font-semibold">
                                    {task.deadline}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : inspectorTab === 'json' ? (
                    <pre className="max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed text-[#0d1b3e]">
                      {JSON.stringify(draft, null, 2)}
                    </pre>
                  ) : (
                    <div className="divide-y divide-[#0d1b3e]/[0.06] p-2">
                      {auditItems.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-start justify-between gap-3 px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#0d1b3e]">
                              0{rule.ruleNumber}. {rule.label}
                            </p>
                            <p className="mt-0.5 text-[#45464e]">{rule.detail}</p>
                          </div>
                          <span
                            className={`shrink-0 font-semibold ${
                              rule.passed ? 'text-[#15803d]' : 'text-[#ba1a1a]'
                            }`}
                          >
                            {rule.passed ? 'Passed' : 'Violation'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Active Client Engagements Section */}
        <section className={role === 'ADMIN' ? 'mt-16' : 'mt-10'} aria-label="Active Client Engagements">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="font-editorial text-[28px] leading-tight text-[#0d1b3e]">
                  Active Client Engagements
                </h2>
                <span className="text-xs font-medium text-[#76767f] tabular-nums">
                  · {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#45464e]">
                Persisted SQLite engagements scoped to your account clearance.
              </p>
            </div>

            {/* Search & Manager Filter */}
            <div className="relative flex items-center gap-2" ref={filterMenuRef}>
              <div className="flex items-center gap-2 rounded-full border border-[#0d1b3e]/10 bg-white px-4 py-2 shadow-[0_2px_10px_-4px_rgba(13,27,62,0.06)] focus-within:border-[#6344e7]/40 focus-within:ring-2 focus-within:ring-[#6344e7]/15">
                <Search className="h-3.5 w-3.5 text-[#76767f]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter projects, clients, or PM..."
                  className="w-44 bg-transparent text-xs text-[#0d1b3e] placeholder:text-[#76767f] focus:outline-none sm:w-52"
                />
              </div>

              {availableManagers.length > 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setFilterMenuOpen((prev) => !prev)}
                    aria-label="Filter by project manager"
                    aria-expanded={filterMenuOpen}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                      managerFilter !== 'ALL'
                        ? 'border-[#6344e7]/40 bg-[#f1edff] text-[#5b3bdf]'
                        : 'border-[#0d1b3e]/10 bg-white text-[#45464e] hover:bg-[#f5f4f0]'
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {filterMenuOpen && (
                    <div className="absolute right-0 top-11 z-20 w-52 rounded-2xl border border-[#0d1b3e]/10 bg-white p-1.5 shadow-xl">
                      {availableManagers.map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => {
                            setManagerFilter(pm);
                            setFilterMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-xs transition-colors ${
                            managerFilter === pm
                              ? 'bg-[#f1edff] font-semibold text-[#5b3bdf]'
                              : 'text-[#45464e] hover:bg-[#faf9f5]'
                          }`}
                        >
                          <span>{pm === 'ALL' ? 'All Project Managers' : pm}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {detailError && (
            <div
              role="alert"
              className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
            >
              <span>{detailError}</span>
              {onDismissDetailError && (
                <button
                  type="button"
                  onClick={onDismissDetailError}
                  aria-label="Dismiss error"
                  className="rounded-full p-1 text-red-700 hover:bg-red-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* 3-Column Project Cards Grid */}
          {isLoadingProjects ? (
            <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-60 animate-pulse rounded-[1.5rem] border border-[#0d1b3e]/[0.07] bg-white p-6"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-[#0d1b3e]/[0.08] bg-white p-12 text-center">
              <p className="font-editorial text-xl text-[#0d1b3e]">No saved projects yet</p>
              <p className="mt-1.5 text-xs text-[#45464e] max-w-md mx-auto">
                {role === 'ADMIN'
                  ? 'Click "Create from Transcript" above to extract, validate, and save projects from the meeting transcript.'
                  : 'Projects assigned to your account will appear here once created by an administrator.'}
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-[#0d1b3e]/[0.08] bg-white p-12 text-center">
              <p className="font-editorial text-xl text-[#0d1b3e]">No matching engagements</p>
              <p className="mt-1 text-xs text-[#45464e]">
                Clear your search or manager filter to view all permitted projects.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setManagerFilter('ALL');
                }}
                className="mt-4 rounded-full bg-[#0d1b3e] px-5 py-2 text-xs font-semibold text-white hover:bg-[#162756]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project, idx) => {
                const isHighlight = idx === 0;
                return (
                  <article
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectProject(project.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    className={`group flex cursor-pointer flex-col justify-between rounded-[1.5rem] bg-white p-6 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7] ${
                      isHighlight
                        ? 'border border-[#6344e7]/40 shadow-[0_12px_32px_-12px_rgba(99,68,231,0.16)] hover:border-[#6344e7]/70'
                        : 'border border-[#0d1b3e]/[0.07] shadow-[0_4px_20px_-8px_rgba(13,27,62,0.06)] hover:border-[#0d1b3e]/20 hover:shadow-[0_14px_30px_-10px_rgba(13,27,62,0.11)]'
                    }`}
                  >
                    <div>
                      {/* Card Eyebrow & ID */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap ${
                            isHighlight ? 'text-[#5b3bdf]' : 'text-[#76767f]'
                          }`}
                        >
                          {project.clientName}
                        </span>

                        <span className="font-mono text-[11px] font-medium text-[#76767f] whitespace-nowrap">
                          {project.id}
                        </span>
                      </div>

                      {/* Project Title & Description */}
                      <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.01em] text-[#0d1b3e] group-hover:text-[#5b3bdf] transition-colors">
                        {project.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[#45464e]">
                        {project.description}
                      </p>
                    </div>

                    <div>
                      {/* Manager + Deadline */}
                      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#0d1b3e]/[0.06] pt-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d1b3e] text-[10px] font-semibold text-white">
                            {getInitials(project.managerName)}
                          </span>
                          <span className="truncate text-xs font-medium text-[#0d1b3e]">
                            {project.managerName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-[#76767f] tabular-nums shrink-0 font-mono">
                          <Calendar className="h-3 w-3" />
                          <span>{project.deadline}</span>
                        </div>
                      </div>

                      {/* Task Count + Effort Hours + Arrow */}
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg bg-[#f1edff] px-2.5 py-1 text-[11px] font-medium text-[#5b3bdf] tabular-nums">
                            {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
                          </span>
                          <span className="rounded-lg bg-[#f5f4f0] px-2.5 py-1 text-[11px] font-medium text-[#45464e] tabular-nums font-mono">
                            {project.totalHours} hrs
                          </span>
                        </div>

                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                            isHighlight
                              ? 'bg-[#f1edff] text-[#5b3bdf]'
                              : 'bg-[#f5f4f0] text-[#45464e] group-hover:bg-[#0d1b3e] group-hover:text-white'
                          }`}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
