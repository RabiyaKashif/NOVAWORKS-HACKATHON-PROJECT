import React, { useEffect, useRef, useState } from 'react';
import { LogOut, ShieldCheck, User, Users } from 'lucide-react';
import { DEFAULT_DIRECTORY } from '../data/defaults.ts';
import type { AppScreen, DirectoryEmployee } from '../types/project.ts';
import { NovaWorksLogo } from './NovaWorksLogo.tsx';

interface TopNavBarProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  currentUser: DirectoryEmployee;
  projectCount: number;
  taskCount: number;
  onLogout: () => void;
  onSwitchAccount: (email: string) => Promise<void>;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeScreen,
  onNavigate,
  currentUser,
  projectCount,
  taskCount,
  onLogout,
  onSwitchAccount,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const navItems: { id: AppScreen; label: string; count?: number }[] = [
    {
      id: 'projects',
      label: currentUser.role === 'ADMIN' ? 'Projects' : 'My Projects',
      count: projectCount,
    },
    {
      id: 'tasks',
      label: currentUser.role === 'AGENT' ? 'My Tasks' : 'Tasks',
      count: currentUser.role === 'AGENT' ? taskCount : undefined,
    },
    { id: 'team', label: 'Team Directory' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#0d1b3e]/[0.07] bg-[#faf9f5]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1340px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        {/* Left Zone: Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate(currentUser.role === 'AGENT' ? 'tasks' : 'projects')}
            className="flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
          >
            <NovaWorksLogo size="sm" />
          </button>
        </div>

        {/* Center Zone: Floating Pill Segmented Navigation */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-1 rounded-full border border-[#0d1b3e]/[0.08] bg-[#f5f4f0]/90 p-1 shadow-[0_2px_10px_-4px_rgba(13,27,62,0.06)]"
        >
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7] ${
                  isActive
                    ? 'bg-white text-[#0d1b3e] font-semibold shadow-[0_1px_4px_rgba(13,27,62,0.08)]'
                    : 'text-[#45464e] hover:text-[#0d1b3e]'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-mono text-[11px] text-[#5b3bdf] tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Zone: Verified Role Clearance + Profile Menu */}
        <div className="relative flex items-center shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setSwitchError(null);
              setMenuOpen((prev) => !prev);
            }}
            aria-expanded={menuOpen}
            aria-label="Account and role menu"
            className="inline-flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
          >
            <span
              className={`hidden sm:inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 ${
                currentUser.role === 'ADMIN'
                  ? 'bg-[#0d1b3e] text-white shadow-[0_4px_12px_-3px_rgba(13,27,62,0.28)]'
                  : currentUser.role === 'MANAGER'
                    ? 'border border-[#6344e7]/25 bg-[#f1edff] text-[#5b3bdf]'
                    : 'border border-[#0d1b3e]/15 bg-white text-[#0d1b3e]'
              }`}
            >
              <span>{currentUser.name}</span>
              <span className="opacity-60">·</span>
              <span className="font-mono text-[10px] tracking-wider">{currentUser.role}</span>
            </span>

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d1b3e] text-white transition-transform duration-150 hover:scale-105">
              <User className="h-4 w-4" />
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-76 rounded-2xl border border-[#0d1b3e]/10 bg-white p-2 shadow-[0_18px_40px_-12px_rgba(13,27,62,0.18)]">
              <div className="border-b border-[#0d1b3e]/[0.07] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0d1b3e] truncate">
                    {currentUser.name}
                  </p>
                  <span className="text-[10px] font-semibold tracking-wider text-[#5b3bdf]">
                    {currentUser.role}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#45464e] truncate">{currentUser.email}</p>
                <p className="mt-0.5 text-[11px] text-[#76767f] truncate">
                  {currentUser.id} · {currentUser.specialization}
                </p>
              </div>

              {switchError && (
                <p
                  role="alert"
                  className="mx-2 mt-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-700"
                >
                  {switchError}
                </p>
              )}

              <div className="py-1.5">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#76767f]">
                  Switch Authenticated Demo Account
                </p>
                <div className="max-h-56 overflow-y-auto">
                  {DEFAULT_DIRECTORY.map((user) => {
                    const selected = user.id === currentUser.id;
                    const isSwitching = switchingEmail === user.email;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={selected || switchingEmail !== null}
                        onClick={async () => {
                          setSwitchError(null);
                          setSwitchingEmail(user.email);
                          try {
                            await onSwitchAccount(user.email);
                            setMenuOpen(false);
                          } catch (err: unknown) {
                            setSwitchError(
                              err instanceof Error
                                ? err.message
                                : 'Unable to switch account.'
                            );
                          } finally {
                            setSwitchingEmail(null);
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-xs transition-colors ${
                          selected
                            ? 'bg-[#f5f4f0] font-semibold text-[#0d1b3e]'
                            : 'text-[#45464e] hover:bg-[#faf9f5] hover:text-[#0d1b3e]'
                        } disabled:opacity-60`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Users className="h-3.5 w-3.5 text-[#5b3bdf] shrink-0" />
                          <span className="truncate">
                            {isSwitching ? 'Signing in...' : user.name}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-[#76767f] shrink-0">
                          {user.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#0d1b3e]/[0.07] pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-[#0d1b3e] hover:bg-[#f5f4f0] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-3.5 w-3.5 text-[#5b3bdf]" />
                    Sign Out of Session
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-[#76767f]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
