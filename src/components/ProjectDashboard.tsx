import { useState, useEffect } from 'react';
import type { Project, ProjectListResponse, IndexStats } from '../types';
import { projectDbStore } from '../utils/projectDb';
import {
  FolderKanban,
  Clock,
  Zap,
  HardDrive,
  Database,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface ProjectDashboardProps {
  onSelectProject?: (project: Project) => void;
  addToast?: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function ProjectDashboard({ onSelectProject, addToast }: ProjectDashboardProps) {
  const [accountId, setAccountId] = useState<string>('acc_main');
  const [projects, setProjects] = useState<Project[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [indexStats, setIndexStats] = useState<IndexStats | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial active project batch
  const fetchInitialProjects = (accId: string = accountId) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response: ProjectListResponse = projectDbStore.query({
        account_id: accId,
        limit: 12,
      });

      setProjects(response.projects);
      setNextCursor(response.next_cursor);
      setHasMore(response.has_more);
      setLastLatencyMs(response.meta.execution_time_ms);
      setIndexStats(projectDbStore.calculateIndexStats());

      if (addToast) {
        addToast('success', `Loaded ${response.projects.length} active projects in ${response.meta.execution_time_ms}ms`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialProjects(accountId);
  }, [accountId]);

  // Load next batch using cursor pagination token
  const handleLoadMore = () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setErrorMsg(null);

    try {
      const response: ProjectListResponse = projectDbStore.query({
        account_id: accountId,
        limit: 12,
        cursor: nextCursor,
      });

      setProjects((prev) => [...prev, ...response.projects]);
      setNextCursor(response.next_cursor);
      setHasMore(response.has_more);
      setLastLatencyMs(response.meta.execution_time_ms);

      if (addToast) {
        addToast('info', `Appended ${response.projects.length} projects via cursor token`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch next page');
      if (addToast) addToast('error', err?.message || 'Cursor fetch failed');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Test invalid cursor handling
  const handleTestCorruptedCursor = () => {
    try {
      projectDbStore.query({
        account_id: accountId,
        limit: 10,
        cursor: 'invalid_corrupted_base64_payload_xyz',
      });
    } catch (err: any) {
      setErrorMsg(`Validation Caught: ${err.message}`);
      if (addToast) addToast('error', `Rejected: ${err.message}`);
    }
  };

  // Test offset pagination rejection guardrail
  const handleTestForbiddenOffset = () => {
    try {
      projectDbStore.query({
        account_id: accountId,
        limit: 10,
        page: 2, // forbidden
      });
    } catch (err: any) {
      setErrorMsg(`Validation Guardrail Caught: ${err.message}`);
      if (addToast) addToast('error', `Guardrail: Offset pagination forbidden`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Telemetry & Partial Index Statistics Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                Active Projects Dashboard
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                Partial Composite Index
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Index Predicate: <code className="text-emerald-300">WHERE status = 'active'</code> • Keyset Cursor Pagination
            </p>
          </div>

          {/* Key Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="text-zinc-400 text-[10px] flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Query Latency
              </div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">
                {lastLatencyMs !== null ? `${lastLatencyMs} ms` : '--'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="text-zinc-400 text-[10px] flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" /> Memory Saved
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {indexStats ? `-${indexStats.memory_reduction_percentage}%` : '>-40%'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 col-span-2 sm:col-span-1">
              <div className="text-zinc-400 text-[10px] flex items-center gap-1">
                <Database className="w-3 h-3 text-sky-400" /> Active Dataset
              </div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">
                {indexStats ? indexStats.active_records.toLocaleString() : '50,000'} / {indexStats ? indexStats.total_records.toLocaleString() : '100,000'}
              </div>
            </div>
          </div>
        </div>

        {/* Account Selector & Guardrail Test Actions */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Account:</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="bg-zinc-950 text-xs font-mono text-zinc-200 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="acc_main">acc_main (Engineering)</option>
              <option value="acc_marketing">acc_marketing</option>
              <option value="acc_design">acc_design</option>
              <option value="acc_engineering">acc_engineering</option>
            </select>
            <button
              onClick={() => fetchInitialProjects(accountId)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Refresh Dashboard"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestCorruptedCursor}
              className="px-2.5 py-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3" /> Test Bad Cursor
            </button>
            <button
              onClick={handleTestForbiddenOffset}
              className="px-2.5 py-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3" /> Test Offset Block
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-zinc-400">
          Loading active project list using partial composite index...
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center text-xs font-mono text-zinc-400 border border-dashed border-zinc-800 rounded-2xl">
          No active projects found for account {accountId}.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {projects.map((project, idx) => (
              <div
                key={`${project.id}-${idx}`}
                onClick={() => onSelectProject?.(project)}
                className="group p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-400 truncate">
                    {project.id}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    {project.status}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                  {project.name}
                </h3>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/50">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {new Date(project.updated_at).toLocaleTimeString()}
                  </span>
                  <span className="text-zinc-400">{project.account_id}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cursor Pagination Control & Token Info */}
          <div className="pt-4 flex flex-col items-center justify-center gap-3">
            {hasMore ? (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  'Fetching via Cursor...'
                ) : (
                  <>
                    <span>Load More Projects</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>All active records loaded for this account dataset.</span>
              </div>
            )}

            {nextCursor && (
              <div className="max-w-md truncate text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                Next Cursor Token: <span className="text-emerald-400">{nextCursor}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
