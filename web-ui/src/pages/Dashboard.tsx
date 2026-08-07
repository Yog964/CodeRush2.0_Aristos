import { Code, CheckCircle, Percent, DollarSign, Database, ChevronRight, Cpu, Box, ShieldCheck, Network, Wrench } from 'lucide-react';
import { RepoRadarChart } from '../components/RepoRadarChart';

export function Dashboard({ onNavigateToRun }: { onNavigateToRun: (runId: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {[
          { label: 'Repositories', value: '7', sub: 'Active Repos', icon: Code, color: '#2563eb' },
          { label: 'Tasks Completed', value: '24', sub: 'This Week', trend: '↑ 20% vs last week', icon: CheckCircle, color: '#10b981' },
          { label: 'Pass Rate', value: '87%', sub: 'Last 20 Tasks', trend: '↑ 9% vs last week', icon: Percent, color: '#10b981' },
          { label: 'Avg. Cost / Success', value: '$0.52', sub: 'Per Successful Task', trend: '↓ 8% vs last week', icon: DollarSign, color: '#f59e0b' },
          { label: 'Token Usage', value: '2.41M', sub: 'This Week', icon: Database, color: '#8b5cf6' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{kpi.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  {kpi.sub} {kpi.trend && <span style={{ color: kpi.trend.startsWith('↑') || kpi.trend.startsWith('↓ 8') ? 'var(--color-success)' : 'var(--text-tertiary)', marginLeft: 6 }}>{kpi.trend}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Recent Runs | Active Run | Recent Evidence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px' }}>
        
        {/* Recent Runs */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h3">Recent Runs</h3>
            <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { name: 'Fix user authentication bug', repo: 'acme-platform', status: 'Success', time: '2m ago' },
              { name: 'Add pagination to user list API', repo: 'acme-platform', status: 'Success', time: '15m ago' },
              { name: 'Refactor payment service', repo: 'payments-service', status: 'Partial', time: '42m ago' },
              { name: 'Update dependencies to latest', repo: 'web-dashboard', status: 'Failed', time: '1h ago' },
              { name: 'Implement caching layer', repo: 'infra-utils', status: 'Success', time: '2h ago' },
            ].map((run, i) => (
              <div key={i} onClick={() => onNavigateToRun('RUN-1287')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', border: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: run.status === 'Success' ? 'var(--color-success)' : run.status === 'Partial' ? 'var(--color-warning)' : 'var(--color-error)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{run.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{run.repo}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: run.status === 'Success' ? 'var(--color-success)' : run.status === 'Partial' ? 'var(--color-warning)' : 'var(--color-error)' }}>{run.status}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{run.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Run */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 className="text-h3">Active Run</h3>
            <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => onNavigateToRun('RUN-1287')}>View details →</button>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>#RUN-1287</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>Implement email verification flow</div>

          {/* Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginBottom: '32px' }}>
            <div style={{ position: 'absolute', top: 12, left: 20, right: 20, height: 2, background: 'var(--surface-border)', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 12, left: 20, width: '50%', height: 2, background: 'var(--color-primary)', zIndex: 0 }} />
            
            {['Planning', 'Context', 'Code', 'Verify', 'Review'].map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
                <div style={{ 
                  width: 24, height: 24, borderRadius: '50%', 
                  background: i <= 2 ? 'var(--color-primary)' : 'white',
                  border: `2px solid ${i <= 2 ? 'var(--color-primary)' : 'var(--surface-border)'}`,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {i < 2 ? <CheckCircle size={14} /> : i === 2 ? <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', animation: 'breathe 1.5s infinite' }} /> : null}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: i === 2 ? 600 : 500, color: i <= 2 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{step}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              <span>Current Step: <strong>Running Unit Tests</strong></span>
              <span>65%</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--surface-border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: 'var(--color-primary)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--surface-border)' }}>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Elapsed</div><div style={{ fontSize: '0.875rem', fontWeight: 600 }}>12m 34s</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Tests Passed</div><div style={{ fontSize: '0.875rem', fontWeight: 600 }}>156 / 203</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Files Changed</div><div style={{ fontSize: '0.875rem', fontWeight: 600 }}>8</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Tokens Used</div><div style={{ fontSize: '0.875rem', fontWeight: 600 }}>312K</div></div>
          </div>
        </div>

        {/* Recent Evidence */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h3">Recent Evidence</h3>
            <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Total Tests', sub: '156 passed, 0 failed', icon: CheckCircle, time: '2m ago' },
              { label: 'Lint & Static Analysis', sub: 'No issues found', icon: CheckCircle, time: '5m ago' },
              { label: 'Type Check', sub: 'Passed', icon: CheckCircle, time: '7m ago' },
              { label: 'Build', sub: 'Success', icon: CheckCircle, time: '8m ago' },
              { label: 'Security Scan', sub: 'No vulnerabilities', icon: ShieldCheck, time: '9m ago' },
            ].map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                  <ev.icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ev.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{ev.sub}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{ev.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '16px' }}>
        
        {/* Repo Intel */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="text-h3">Repository Intelligence</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>acme-platform</div>
            </div>
            <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <GitBranch size={12} /> main <ChevronRight size={12} />
            </button>
          </div>
          <RepoRadarChart />
        </div>

        {/* System Overview */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>System Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', flex: 1 }}>
            {[
              { label: 'Model Adapter', icon: Cpu, status: 'Connected' },
              { label: 'Memory Engine', icon: Database, status: 'Healthy' },
              { label: 'Context Manager', icon: Network, status: 'Healthy' },
              { label: 'Tool Executor', icon: Wrench, status: 'Healthy' },
              { label: 'Sandbox', icon: Box, status: 'Operational' },
              { label: 'Verifier', icon: ShieldCheck, status: 'Healthy' },
            ].map((sys, i) => (
              <div key={i} style={{ padding: '16px', background: '#f8fafc', border: '1px solid var(--surface-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
                <sys.icon size={24} color="var(--text-secondary)" />
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sys.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                  {sys.status}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Ensure GitBranch is imported for the radar chart area
import { GitBranch } from 'lucide-react';
