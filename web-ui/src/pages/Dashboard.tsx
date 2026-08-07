import { useState, useEffect, useCallback } from 'react';
import {
  Code, CheckCircle, Percent, Database,
  ChevronRight, Cpu, Box, ShieldCheck, Network, Wrench,
  GitBranch, RefreshCw, AlertCircle, Clock
} from 'lucide-react';

interface RunEntry {
  run_id: string;
  status: string;
  issue: string;
  repo: string;
  is_baseline: boolean;
  comparison_group_id: string | null;
  started_at: string;
  duration: string;
  files_changed: number;
  tokens: number;
  confidence: number;
  verification: Array<{ check_name: string; passed: boolean; details: string }>;
}

interface DashboardData {
  stats: {
    total_runs: number;
    pass_rate: number;
    total_tokens: number;
    repos: number;
  };
  recent_runs: RunEntry[];
  active_run: { run_id: string; issue: string; repo: string } | null;
}

function timeAgo(isoStr: string): string {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function statusColor(status: string): string {
  if (status === 'Success') return 'var(--color-success)';
  if (status === 'Partial') return 'var(--color-warning)';
  if (status === 'Failed') return 'var(--color-error)';
  if (status === 'No Changes') return '#94a3b8';
  return 'var(--text-tertiary)';
}

const SYSTEM_COMPONENTS = [
  { label: 'Model Adapter', icon: Cpu },
  { label: 'Memory Engine', icon: Database },
  { label: 'Context Manager', icon: Network },
  { label: 'Tool Executor', icon: Wrench },
  { label: 'Sandbox', icon: Box },
  { label: 'Verifier', icon: ShieldCheck },
];

export function Dashboard({ onNavigateToRun }: { onNavigateToRun: (runId: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError('');
    } catch (e: any) {
      setError('Cannot reach backend. Is uvicorn running on port 8000?');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check Ollama health
  useEffect(() => {
    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      .then(r => r.ok ? setOllamaStatus('ok') : setOllamaStatus('error'))
      .catch(() => setOllamaStatus('error'));
  }, []);

  // Fetch on mount and poll every 5 seconds
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const stats = data?.stats;
  const recentRuns = data?.recent_runs || [];
  const activeRun = data?.active_run;
  const latestRun = recentRuns[0];

  const kpis = [
    {
      label: 'Repositories', value: stats ? String(stats.repos || recentRuns.length) : '—',
      sub: 'Scanned', icon: Code, color: '#2563eb'
    },
    {
      label: 'Tasks Completed', value: stats ? String(stats.total_runs) : '—',
      sub: 'All Time', icon: CheckCircle, color: '#10b981'
    },
    {
      label: 'Pass Rate', value: stats ? `${stats.pass_rate}%` : '—',
      sub: `${recentRuns.filter(r => r.status === 'Success').length} successful`, icon: Percent, color: '#10b981'
    },
    {
      label: 'Avg Confidence', value: recentRuns.length > 0
        ? `${Math.round(recentRuns.reduce((a, r) => a + r.confidence, 0) / recentRuns.length * 100)}%`
        : '—',
      sub: 'Across all runs', icon: ShieldCheck, color: '#f59e0b'
    },
    {
      label: 'Token Usage', value: stats ? fmtTokens(stats.total_tokens) : '—',
      sub: 'All Time', icon: Database, color: '#8b5cf6'
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.label}</div>
                <div style={{ fontSize: loading ? '1.1rem' : '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {loading ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} /> : kpi.value}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px' }}>

        {/* Recent Runs */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h3">Recent Runs</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {loading ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : `${recentRuns.length} total`}
            </span>
          </div>

          {recentRuns.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px 0', fontSize: '0.875rem' }}>
              No runs yet. Start a new task to see results here.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentRuns.slice(0, 6).map((run, i) => (
              <div
                key={i}
                onClick={() => onNavigateToRun(run.run_id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-color)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(run.status), flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                      {run.issue || run.run_id}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {run.repo || '—'} · {run.tokens > 0 ? fmtTokens(run.tokens) + ' tokens' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor(run.status) }}>{run.status}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 1 }}>{timeAgo(run.started_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Run / Latest Run */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 className="text-h3">{activeRun ? '🟢 Active Run' : 'Latest Run'}</h3>
            {(activeRun || latestRun) && (
              <button
                className="btn-outline"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => onNavigateToRun((activeRun || latestRun)!.run_id)}
              >
                View details →
              </button>
            )}
          </div>

          {!activeRun && !latestRun && !loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              No runs yet. Click "+ New Task" to start.
            </div>
          )}

          {(activeRun || latestRun) && (() => {
            const run = activeRun || latestRun!;
            const isActive = !!activeRun;
            const verifications = run?.verification || [];
            const confidence = run?.confidence || 0;

            return (
              <>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '12px', fontFamily: 'monospace' }}>{run.run_id}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', lineHeight: 1.3 }}>
                  {run.issue || '(No issue description)'}
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    <span>{isActive ? '⚡ Running...' : `Status: ${run?.status || '—'}`}</span>
                    <span>{confidence > 0 ? `${Math.round(confidence * 100)}% confidence` : ''}</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--surface-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: isActive ? '60%' : `${Math.round(confidence * 100)}%`,
                      height: '100%',
                      background: isActive ? 'var(--color-primary)' : confidence > 0.7 ? 'var(--color-success)' : 'var(--color-warning)',
                      transition: 'width 0.5s ease',
                      animation: isActive ? 'progress-pulse 1.5s ease-in-out infinite' : 'none'
                    }} />
                  </div>
                </div>

                {/* Verification Checks */}
                {verifications.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {verifications.filter(v => v.check_name !== 'diff').map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                        <div style={{ color: v.passed ? 'var(--color-success)' : 'var(--color-error)', flexShrink: 0 }}>
                          {v.passed ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        </div>
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{v.check_name}</span>
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: 'auto', fontSize: '0.7rem' }}>{v.details?.slice(0, 30)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--surface-border)' }}>
                  {[
                    { label: 'Repo', value: run.repo || '—' },
                    { label: 'Files', value: run?.files_changed != null ? String(run.files_changed) : '—' },
                    { label: 'Tokens', value: run?.tokens ? fmtTokens(run.tokens) : '—' },
                    { label: 'Duration', value: run?.duration || (isActive ? '...' : '—') },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{m.label}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Recent Evidence */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h3">Latest Checks</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {latestRun ? timeAgo(latestRun.started_at) : ''}
            </span>
          </div>

          {(!latestRun || latestRun.verification.length === 0) ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px 0', fontSize: '0.875rem' }}>
              Verification results will appear here after a run completes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {latestRun.verification.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: v.passed ? 'var(--color-success-light)' : 'var(--color-error-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: v.passed ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {v.passed ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize' }}>{v.check_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.details || (v.passed ? 'Passed' : 'Failed')}</div>
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: v.passed ? 'var(--color-success)' : 'var(--color-error)', flexShrink: 0 }}>
                    {v.passed ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '16px' }}>

        {/* Run Stats */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>Run Breakdown</h3>
          {recentRuns.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', padding: 16 }}>No data yet.</div>
          ) : (
            <>
              {[
                { label: 'Success', count: recentRuns.filter(r => r.status === 'Success').length, color: 'var(--color-success)' },
                { label: 'No Changes', count: recentRuns.filter(r => r.status === 'No Changes').length, color: '#94a3b8' },
                { label: 'Partial', count: recentRuns.filter(r => r.status === 'Partial').length, color: 'var(--color-warning)' },
                { label: 'Failed', count: recentRuns.filter(r => r.status === 'Failed').length, color: 'var(--color-error)' },
              ].map(b => (
                <div key={b.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
                    <span style={{ fontWeight: 600 }}>{b.count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-border)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${recentRuns.length > 0 ? (b.count / recentRuns.length) * 100 : 0}%`, background: b.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                <span>Total Tokens</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtTokens(stats?.total_tokens || 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* System Status */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h3">System Status</h3>
            <button onClick={fetchDashboard} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', flex: 1 }}>
            {SYSTEM_COMPONENTS.map((sys, i) => {
              const Icon = sys.icon;
              const isOllama = sys.label === 'Model Adapter';
              const status = isOllama ? ollamaStatus : error ? 'error' : 'ok';
              const statusLabel = isOllama
                ? (ollamaStatus === 'ok' ? 'Connected' : ollamaStatus === 'checking' ? 'Checking...' : 'Offline')
                : (error ? 'Offline' : 'Healthy');
              const statusColor2 = status === 'ok' ? 'var(--color-success)' : status === 'checking' ? 'var(--color-warning)' : 'var(--color-error)';

              return (
                <div key={i} style={{ padding: '16px 8px', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center' }}>
                  <Icon size={22} color="var(--text-secondary)" />
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sys.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: statusColor2, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor2, display: 'inline-block', animation: status === 'checking' ? 'breathe 1s ease-in-out infinite' : 'none' }} />
                    {statusLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
