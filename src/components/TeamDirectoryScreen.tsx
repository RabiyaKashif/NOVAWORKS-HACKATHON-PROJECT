import React, { useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  Check,
  Copy,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import { copyToClipboard } from '../lib/api.ts';
import type {
  AgentTaskItem,
  DirectoryEmployee,
  StoredProjectSummary,
  UserRole,
} from '../types/project.ts';
import { OrbitalBackground } from './OrbitalBackground.tsx';

interface TeamDirectoryScreenProps {
  members: DirectoryEmployee[];
  projects: StoredProjectSummary[];
  tasks: AgentTaskItem[];
  onNavigateToProject: (projectId: string) => void;
}

type RoleFilter = 'ALL' | UserRole;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export const TeamDirectoryScreen: React.FC<TeamDirectoryScreenProps> = ({
  members,
  projects,
  tasks,
  onNavigateToProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<DirectoryEmployee | null>(null);

  useEffect(() => {
    if (!selectedMember) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedMember(null);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedMember]);

  const counts = useMemo(() => {
    return {
      ALL: members.length,
      ADMIN: members.filter((m) => m.role === 'ADMIN').length,
      MANAGER: members.filter((m) => m.role === 'MANAGER').length,
      AGENT: members.filter((m) => m.role === 'AGENT').length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
      const matchesQuery =
        !q ||
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.specialization.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.skills.some((cap) => cap.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }, [members, roleFilter, searchQuery]);

  const handleCopyEmail = async (e: React.MouseEvent, member: DirectoryEmployee) => {
    e.stopPropagation();
    const ok = await copyToClipboard(member.email);
    if (ok) {
      setCopiedId(member.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === member.id ? null : prev));
      }, 1500);
    }
  };

  const memberAssignments = useMemo(() => {
    if (!selectedMember) return [];
    const map = new Map<string, { project: StoredProjectSummary; taskCount: number }>();

    for (const p of projects) {
      if (p.managerId === selectedMember.id) {
        map.set(p.id, { project: p, taskCount: 0 });
      }
    }

    for (const t of tasks) {
      if (t.assigneeId === selectedMember.id) {
        const proj = projects.find((p) => p.id === t.projectId);
        if (proj) {
          const existing = map.get(proj.id);
          if (existing) {
            existing.taskCount += 1;
          } else {
            map.set(proj.id, { project: proj, taskCount: 1 });
          }
        }
      }
    }

    return Array.from(map.values());
  }, [selectedMember, projects, tasks]);

  const filterTabs: { id: RoleFilter; label: string }[] = [
    { id: 'ALL', label: `All (${counts.ALL})` },
    { id: 'ADMIN', label: `Admins (${counts.ADMIN})` },
    { id: 'MANAGER', label: `Managers (${counts.MANAGER})` },
    { id: 'AGENT', label: `Agents/Devs (${counts.AGENT})` },
  ];

  const getAvatarStyle = (role: UserRole) => {
    if (role === 'MANAGER') return 'bg-[#5b3bdf] text-white';
    return 'bg-[#0d1b3e] text-white';
  };

  return (
    <div className="relative overflow-hidden">
      <OrbitalBackground variant="subpage" />

      <div className="relative z-10 mx-auto max-w-[1220px] px-5 pt-10 pb-12 sm:px-8 sm:pt-14">
        {/* Hero Header */}
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="mt-2 font-editorial text-[44px] leading-[1.06] tracking-[-0.02em] text-[#0d1b3e] sm:text-[60px]">
            Team Directory
          </h1>

          <p className="mx-auto mt-3.5 max-w-[500px] text-[15px] leading-relaxed text-[#45464e]">
            Read-only directory of seeded NovaWorks employees, project managers, and developer agents.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-[#45464e]">
            <span className="tabular-nums">{members.length} Active Operators</span>
            <span className="text-[#c6c6cf]" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#5b3bdf]" />
              Directory ID Enforced
            </span>
            <span className="text-[#c6c6cf]" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-[#5b3bdf]" />
              SQLite Synced
            </span>
          </div>
        </section>

        {/* Search & Role Filter Bar */}
        <section className="mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 rounded-full border border-[#0d1b3e]/10 bg-white px-4 py-2.5 shadow-[0_2px_10px_-4px_rgba(13,27,62,0.06)] focus-within:border-[#6344e7]/40 focus-within:ring-2 focus-within:ring-[#6344e7]/15 sm:w-80">
            <Search className="h-4 w-4 text-[#76767f]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, specialization, or skill..."
              className="w-full bg-transparent text-xs text-[#0d1b3e] placeholder:text-[#76767f] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {filterTabs.map((tab) => {
              const isActive = roleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0d1b3e] text-white font-semibold shadow-[0_6px_16px_-6px_rgba(13,27,62,0.3)]'
                      : 'border border-[#0d1b3e]/10 bg-white text-[#45464e] hover:bg-[#f5f4f0] hover:text-[#0d1b3e]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3-Column Team Grid */}
        {filteredMembers.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#0d1b3e]/[0.08] bg-white p-12 text-center">
            <p className="font-editorial text-xl text-[#0d1b3e]">No operators matched</p>
            <p className="mt-1 text-xs text-[#45464e]">
              Try searching for a different skill, specialization, or role tier.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
              }}
              className="mt-4 rounded-full bg-[#0d1b3e] px-5 py-2 text-xs font-semibold text-white"
            >
              Show All Operators
            </button>
          </div>
        ) : (
          <section className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.map((member) => {
              const isCopied = copiedId === member.id;
              const initials = getInitials(member.name);
              return (
                <article
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMember(member);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="group flex cursor-pointer flex-col justify-between rounded-[1.5rem] border border-[#0d1b3e]/[0.07] bg-white p-6 shadow-[0_4px_20px_-8px_rgba(13,27,62,0.06)] transition-all duration-150 hover:border-[#0d1b3e]/20 hover:shadow-[0_14px_30px_-10px_rgba(13,27,62,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
                >
                  <div>
                    {/* Avatar & Role Label */}
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide ${getAvatarStyle(
                          member.role
                        )}`}
                      >
                        {initials}
                      </span>

                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          member.role === 'ADMIN'
                            ? 'text-[#0d1b3e]'
                            : member.role === 'MANAGER'
                              ? 'text-[#5b3bdf]'
                              : 'text-[#76767f]'
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>

                    {/* Name & Specialization */}
                    <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.01em] text-[#0d1b3e] group-hover:text-[#5b3bdf] transition-colors">
                      {member.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#45464e]">{member.specialization}</p>

                    {/* Email Copy Bar */}
                    <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#f5f4f0] px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0 text-xs text-[#45464e]">
                        <AtSign className="h-3.5 w-3.5 shrink-0 text-[#5b3bdf]" />
                        <span className="truncate font-mono text-[11px]">{member.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleCopyEmail(e, member)}
                        aria-label={`Copy email for ${member.name}`}
                        className="shrink-0 rounded-md p-1 text-[#76767f] hover:bg-white hover:text-[#0d1b3e] transition-colors"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-[#15803d]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Skills */}
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                        CAPABILITIES
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.skills.map((skill, idx) => (
                          <span
                            key={skill}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                              idx === 0
                                ? 'bg-[#f1edff] text-[#5b3bdf]'
                                : 'bg-[#f5f4f0] text-[#45464e]'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#0d1b3e]/[0.06] pt-3.5 text-[11px] text-[#76767f]">
                    <span>NovaWorks Directory</span>
                    <span className="font-mono text-[10px] tracking-wider uppercase shrink-0 text-[#0d1b3e]">
                      ID: {member.id}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Zero-Trust Directory Policy Banner */}
        <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#0d1b3e]/[0.07] bg-white px-5 py-4 shadow-[0_4px_18px_-10px_rgba(13,27,62,0.06)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1edff] text-[#5b3bdf]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#0d1b3e]">Zero-Trust Directory Policy</h3>
              <p className="mt-0.5 text-xs text-[#45464e]">
                AI transcript assignments must strictly match seeded employee IDs (`MANAGER` for projects, `AGENT` for tasks).
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold tracking-wide text-[#5b3bdf] whitespace-nowrap shrink-0">
            Read-Only Access
          </span>
        </section>
      </div>

      {/* Operator Assignment Dossier Modal */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1b3e]/35 p-4 backdrop-blur-xs"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-[#0d1b3e]/10 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${getAvatarStyle(
                    selectedMember.role
                  )}`}
                >
                  {getInitials(selectedMember.name)}
                </span>
                <div>
                  <h3 className="font-editorial text-2xl text-[#0d1b3e]">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-[#45464e]">
                    {selectedMember.id} · {selectedMember.specialization} · {selectedMember.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-full p-2 text-[#76767f] hover:bg-[#f5f4f0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                PERMITTED ENGAGEMENT ALLOCATIONS
              </p>
              {memberAssignments.length === 0 ? (
                <p className="mt-2 rounded-2xl bg-[#faf9f5] p-4 text-xs text-[#45464e]">
                  No permitted project or task allocations visible for your current session.
                </p>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {memberAssignments.map(({ project, taskCount }) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        onNavigateToProject(project.id);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#0d1b3e]/[0.07] bg-[#faf9f5] px-4 py-3 text-left transition-colors hover:border-[#6344e7]/35 hover:bg-[#f7f5ff]"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#0d1b3e]">
                          {project.name} — {project.clientName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#45464e]">
                          {taskCount > 0
                            ? `${taskCount} assigned task${taskCount > 1 ? 's' : ''}`
                            : 'Project Manager'}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5b3bdf]">
                        View Project
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-full bg-[#0d1b3e] px-5 py-2 text-xs font-semibold text-white hover:bg-[#162756]"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
