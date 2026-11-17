/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useState } from 'react';
import { Footer } from './components/Footer.tsx';
import { IntroOverlay } from './components/IntroOverlay.tsx';
import { ProjectsScreen } from './components/ProjectsScreen.tsx';
import { SignInScreen } from './components/SignInScreen.tsx';
import { TasksScreen } from './components/TasksScreen.tsx';
import { TeamDirectoryScreen } from './components/TeamDirectoryScreen.tsx';
import { TopNavBar } from './components/TopNavBar.tsx';
import {
  apiFetch,
  clearSessionToken,
  parseJsonSafe,
  parseJsonWithDiagnostics,
  setSessionToken,
} from './lib/api.ts';
import type {
  AgentTaskItem,
  AppScreen,
  DirectoryEmployee,
  ExtractionResult,
  StoredProjectDetail,
  StoredProjectSummary,
  ValidationIssue,
} from './types/project.ts';

function defaultScreenForRole(role: DirectoryEmployee['role']): AppScreen {
  if (role === 'AGENT') return 'tasks';
  return 'projects';
}

export default function App() {
  const [showIntro, setShowIntro] = useState(false);
  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

  const [currentUser, setCurrentUser] = useState<DirectoryEmployee | null>(null);
  const [authChecked] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const [activeScreen, setActiveScreen] = useState<AppScreen>('projects');
  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [projects, setProjects] = useState<StoredProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<StoredProjectDetail | null>(
    null
  );
  const [myTasks, setMyTasks] = useState<AgentTaskItem[]>([]);

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Admin AI Transcript Extraction State
  const [draft, setDraft] = useState<ExtractionResult | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    projectCount: number;
    taskCount: number;
    projects: StoredProjectDetail[];
  } | null>(null);
  const [unresolvedIssues, setUnresolvedIssues] = useState<ValidationIssue[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleUnauthorizedSession = useCallback((message?: string) => {
    clearSessionToken();
    setCurrentUser(null);
    setSessionNotice(
      message || 'Your session expired or could not be verified. Please sign in again.'
    );
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    setIsLoadingProjects(true);
    setIsLoadingTasks(true);
    setDetailError(null);
    try {
      const [dirRes, projRes, tasksRes] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/projects'),
        apiFetch('/api/tasks/my'),
      ]);

      if (
        dirRes.status === 401 ||
        projRes.status === 401 ||
        tasksRes.status === 401
      ) {
        handleUnauthorizedSession(
          'Unable to verify your active session with the server. Please sign in again.'
        );
        return;
      }

      if (dirRes.ok) {
        const dirData = await parseJsonSafe<{ users?: DirectoryEmployee[] }>(dirRes);
        setDirectory(dirData?.users ?? []);
      }

      if (projRes.ok) {
        const projData = await parseJsonSafe<{
          projects?: StoredProjectSummary[];
        }>(projRes);
        setProjects(projData?.projects ?? []);
      }

      if (tasksRes.ok) {
        const tasksData = await parseJsonSafe<{ tasks?: AgentTaskItem[] }>(tasksRes);
        setMyTasks(tasksData?.tasks ?? []);
      }
    } catch {
      setDetailError('Unable to sync workspace data with the server.');
    } finally {
      setIsLoadingProjects(false);
      setIsLoadingTasks(false);
    }
  }, [handleUnauthorizedSession]);

  useEffect(() => {
    clearSessionToken();
  }, []);

  const handleSignInSuccess = async (user: DirectoryEmployee) => {
    setShowIntro(true);
    setSessionNotice(null);
    setCurrentUser(user);
    setSelectedProject(null);
    setDraft(null);
    setCreatedSummary(null);
    setUnresolvedIssues([]);
    setExtractError(null);
    setActiveScreen(defaultScreenForRole(user.role));
    await loadWorkspaceData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchAccount = async (email: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Demo123!' }),
    });
    const payload = await parseJsonSafe<{
      user?: DirectoryEmployee;
      token?: string;
      error?: string;
    }>(res);
    if (!res.ok || !payload?.user) {
      throw new Error(payload?.error || 'Unable to switch account.');
    }
    if (payload.token) {
      setSessionToken(payload.token);
    }
    await handleSignInSuccess(payload.user);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearSessionToken();
      setSessionNotice(null);
      setCurrentUser(null);
      setDirectory([]);
      setProjects([]);
      setSelectedProject(null);
      setMyTasks([]);
      setDraft(null);
      setCreatedSummary(null);
      setUnresolvedIssues([]);
      setExtractError(null);
      setDetailError(null);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}`);
      if (res.status === 401) {
        handleUnauthorizedSession();
        return;
      }
      const payload = await parseJsonSafe<{
        project?: StoredProjectDetail;
        error?: string;
      }>(res);
      if (!res.ok || !payload?.project) {
        throw new Error(payload?.error || 'Unable to load project details.');
      }
      setSelectedProject(payload.project);
      setActiveScreen('tasks');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setDetailError(
        err instanceof Error ? err.message : 'Unable to load project details.'
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleNavigate = (screen: AppScreen) => {
    setDetailError(null);
    if (screen === 'projects') {
      setSelectedProject(null);
    }
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateFromTranscript = async (transcriptText: string) => {
    if (!transcriptText.trim() || !currentUser) return;
    setIsExtracting(true);
    setExtractError(null);
    setCreatedSummary(null);
    setUnresolvedIssues([]);

    type ExtractionOutcomePayload = {
      createdProjects?: StoredProjectDetail[];
      projectCount?: number;
      taskCount?: number;
      draft?: ExtractionResult;
      issues?: ValidationIssue[];
      error?: string;
    };

    try {
      const startRes = await apiFetch('/api/projects/from-transcript/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText }),
      });

      if (startRes.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      const startParsed = await parseJsonWithDiagnostics<{
        jobId?: string;
        status?: string;
        error?: string;
      }>(startRes);

      if (!startParsed.data) {
        const detail =
          startParsed.kind === 'html'
            ? 'an HTML page (proxy or SPA fallback)'
            : startParsed.kind === 'empty'
              ? 'an empty body'
              : `non-JSON text (${startParsed.contentType || 'unknown type'})`;
        throw new Error(
          `Received ${detail} with HTTP ${startRes.status} from /api/projects/from-transcript/async. Please refresh and verify the backend server is active.`
        );
      }

      if (!startRes.ok || !startParsed.data.jobId) {
        throw new Error(
          startParsed.data.error ||
            `Failed to start transcript extraction (HTTP ${startRes.status}).`
        );
      }

      const jobId = startParsed.data.jobId;
      let outcomeStatus = 500;
      let payload: ExtractionOutcomePayload | null = null;

      // Poll up to ~180s without holding any single HTTP request open past proxy limits
      for (let attempt = 0; attempt < 225; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const pollRes = await apiFetch(`/api/projects/jobs/${encodeURIComponent(jobId)}`);
        if (pollRes.status === 401) {
          handleUnauthorizedSession();
          return;
        }
        const pollParsed = await parseJsonWithDiagnostics<{
          status?: 'pending' | 'completed' | 'failed';
          httpStatus?: number;
          payload?: ExtractionOutcomePayload;
          error?: string;
        }>(pollRes);

        if (!pollRes.ok || !pollParsed.data) {
          throw new Error(
            pollParsed.data?.error ||
              `Lost connection while polling extraction job (HTTP ${pollRes.status}).`
          );
        }

        if (pollParsed.data.status === 'pending') {
          continue;
        }

        if (pollParsed.data.status === 'failed') {
          throw new Error(
            pollParsed.data.error || 'Transcript extraction failed on the server.'
          );
        }

        outcomeStatus = pollParsed.data.httpStatus ?? 200;
        payload = pollParsed.data.payload ?? null;
        break;
      }

      if (!payload) {
        throw new Error('Extraction timed out waiting for the AI response. Please try again.');
      }

      if (outcomeStatus === 422 && payload.draft) {
        setDraft(payload.draft);
        setUnresolvedIssues(payload.issues ?? []);
        return;
      }

      if (outcomeStatus >= 400) {
        throw new Error(payload.error || `Request failed with status ${outcomeStatus}.`);
      }

      const resolvedDraft: ExtractionResult = payload.draft ?? {
        projects: (payload.createdProjects ?? []).map((p) => ({
          name: p.name,
          clientName: p.clientName,
          description: p.description,
          managerId: p.managerId,
          deadline: p.deadline,
          tasks: p.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            assigneeId: t.assigneeId,
            deadline: t.deadline,
            estimatedHours: t.estimatedHours,
          })),
        })),
      };

      setDraft(resolvedDraft);
      setCreatedSummary({
        projectCount: payload.projectCount ?? (payload.createdProjects?.length ?? 0),
        taskCount: payload.taskCount ?? 0,
        projects: payload.createdProjects ?? [],
      });
      await loadWorkspaceData();
    } catch (err: unknown) {
      setExtractError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while creating projects from transcript.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveCorrectedDraft = async (nextDraft: ExtractionResult) => {
    if (!currentUser) return;
    setIsExtracting(true);
    setExtractError(null);
    setCreatedSummary(null);
    setUnresolvedIssues([]);

    try {
      const response = await apiFetch('/api/projects/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: nextDraft }),
      });

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      const payload = await parseJsonSafe<{
        createdProjects?: StoredProjectDetail[];
        projectCount?: number;
        taskCount?: number;
        draft?: ExtractionResult;
        issues?: ValidationIssue[];
        error?: string;
      }>(response);

      if (response.status === 422) {
        if (payload?.draft) setDraft(payload.draft);
        setUnresolvedIssues(payload?.issues ?? []);
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save corrected draft.');
      }

      if (payload?.draft) setDraft(payload.draft);
      setCreatedSummary({
        projectCount: payload?.projectCount ?? 0,
        taskCount: payload?.taskCount ?? 0,
        projects: payload?.createdProjects ?? [],
      });
      await loadWorkspaceData();
    } catch (err: unknown) {
      setExtractError(
        err instanceof Error ? err.message : 'Unable to save corrected draft.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    setDetailError(null);
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      });
      if (res.status === 401) {
        handleUnauthorizedSession();
        return;
      }
      if (!res.ok) {
        const payload = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(payload?.error || 'Failed to delete project.');
      }
      setSelectedProject(null);
      setActiveScreen('projects');
      await loadWorkspaceData();
    } catch (err: unknown) {
      setDetailError(
        err instanceof Error ? err.message : 'Failed to delete project.'
      );
    }
  };

  if (!authChecked) {
    return (
      <>
        {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
        <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center text-sm text-[#45464e]">
          Loading NovaWorks OS...
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
        <SignInScreen
          onSignInSuccess={handleSignInSuccess}
          sessionNotice={sessionNotice}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f5] text-[#1b1c1a]">
      {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
      <TopNavBar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        projectCount={projects.length}
        taskCount={myTasks.length}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
      />

      <main className="flex-1">
        {activeScreen === 'projects' && (
          <ProjectsScreen
            role={currentUser.role}
            projects={projects}
            directory={directory}
            isLoadingProjects={isLoadingProjects}
            isExtracting={isExtracting}
            extractError={extractError}
            detailError={detailError}
            unresolvedIssues={unresolvedIssues}
            draft={draft}
            createdSummary={createdSummary}
            onSelectProject={handleSelectProject}
            onCreateFromTranscript={handleCreateFromTranscript}
            onSaveCorrectedDraft={handleSaveCorrectedDraft}
            onChangeDraft={setDraft}
            onDismissBanner={() => setCreatedSummary(null)}
            onDismissDetailError={() => setDetailError(null)}
          />
        )}

        {activeScreen === 'tasks' && (
          <TasksScreen
            selectedProject={selectedProject}
            allProjects={projects}
            myTasks={myTasks}
            directory={directory}
            currentUser={currentUser}
            isLoading={isLoadingDetail || (selectedProject === null && isLoadingTasks)}
            detailError={detailError}
            onBackToProjects={() => handleNavigate('projects')}
            onSelectProjectId={handleSelectProject}
            onClearSelectedProject={() => setSelectedProject(null)}
            onDeleteProject={
              currentUser.role === 'ADMIN' ? handleDeleteProject : undefined
            }
          />
        )}

        {activeScreen === 'team' && (
          <TeamDirectoryScreen
            members={directory}
            projects={projects}
            tasks={myTasks}
            onNavigateToProject={handleSelectProject}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
