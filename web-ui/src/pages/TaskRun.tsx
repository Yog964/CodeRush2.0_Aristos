import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, PlayCircle, Code, RefreshCw, Download, RotateCcw } from 'lucide-react';
import type { EventLog } from '../App';

interface TaskRunProps {
  onBack: () => void;
  runId: string;
  liveEvents?: EventLog[];
  repoPath?: string;
  issue?: string;
}

export function TaskRun({ onBack, runId, liveEvents = [], repoPath = '', issue = '' }: TaskRunProps) {
  const [activeTab, setActiveTab] = useState('Trace');
  const [diffView, setDiffView] = useState<'Diff' | 'File'>('Diff');
  const traceBottomRef = useRef<HTMLDivElement>(null);

  const tabs = ['Trace', 'Plan', 'Files Changed', 'Tests', 'Logs', 'Metrics', 'Evidence'];

  // --- Derive everything from liveEvents ---

  // Meta
  const startedAt = liveEvents.length > 0 ? new Date(liveEvents[0].timestamp).toLocaleString() : '—';
  const lastEventTime = liveEvents.length > 0 ? new Date(liveEvents[liveEvents.length - 1].timestamp).getTime() : 0;
  const firstEventTime = liveEvents.length > 0 ? new Date(liveEvents[0].timestamp).getTime() : 0;
  const durationSec = liveEvents.length > 0 ? ((lastEventTime - firstEventTime) / 1000).toFixed(1) : null;
  const duration = durationSec ? `${durationSec}s` : 'Running...';

  // Tool call events
  const toolCallEvents = liveEvents.filter(e => e.event_type === 'TOOL_CALL');
  const totalToolCalls = toolCallEvents.length;

  // Token count from Summary events
  const summaryEvents = liveEvents.filter(e => e.layer === 'Summary');
  let totalTokens = 0;
  summaryEvents.forEach(e => {
    const match = e.message.match(/Total tokens: (\d+)/);
    if (match) totalTokens = parseInt(match[1]);
  });

  // Ollama model from Init events  
  const modelEvent = liveEvents.find(e => e.message.includes('Model:'));
  const modelName = modelEvent ? modelEvent.message.replace('Model:', '').trim() : 'Ollama';

  // Repo name from init
  const repoEvent = liveEvents.find(e => e.message.includes('Repository:'));
  const repoDisplay = repoEvent
    ? repoEvent.message.replace('Repository:', '').trim().split(/[\\/]/).pop() || repoPath
    : repoPath || '—';

  // Issue title from init
  const issueEvent = liveEvents.find(e => e.message.includes('Issue:'));
  const issueTitle = issueEvent
    ? issueEvent.message.replace('Issue:', '').trim()
    : issue || 'Running task...';

  // Diff / Files Changed
  const diffEvent = liveEvents.find(e => e.event_type === 'DIFF');
  const diffText = diffEvent?.data?.diff || '';

  // Parse changed files from diff
  const changedFiles: string[] = [];
  if (diffText) {
    diffText.split('\n').forEach((line: string) => {
      if (line.startsWith('diff --git')) {
        const m = line.match(/b\/(.+)$/);
        if (m) changedFiles.push(m[1]);
      }
    });
  }

  // Tests from verification events
  const verifyEvents = liveEvents.filter(e => e.event_type === 'VERIFICATION_RESULT');
  let testsPassed = 0, testsFailed = 0, testsSkipped = 0;
  let testTotal = 0;
  verifyEvents.forEach(e => {
    const m = e.message.match(/tests?: (PASS|FAIL)/i);
    if (m) {
      const detailMatch = e.message.match(/(\d+) passed/);
      const failMatch = e.message.match(/(\d+) failed/);
      if (detailMatch) testsPassed = parseInt(detailMatch[1]);
      if (failMatch) testsFailed = parseInt(failMatch[1]);
      testTotal = testsPassed + testsFailed;
    }
  });
  const testsRan = testTotal > 0;

  // Confidence score
  const confidenceEvent = liveEvents.find(e => e.message.includes('Overall Confidence:'));
  const confidence = confidenceEvent
    ? parseFloat(confidenceEvent.message.match(/[\d.]+/)?.[0] || '0')
    : null;

  // Metrics timeline: one point per layer completion event
  const metricsData = liveEvents
    .filter(e => e.event_type === 'LAYER_END' || e.message.includes('Completed'))
    .map((e, i) => ({ label: `${i + 1}m`, tokens: Math.round((totalTokens / (liveEvents.length || 1)) * (i + 1)) }));

  // Avg latency per tool call (rough)
  const avgLatency = totalToolCalls > 0 && durationSec
    ? (parseFloat(durationSec) / totalToolCalls).toFixed(2) + 's'
    : '—';

  // Stepper
  const layersSeen = new Set(liveEvents.map(e => e.layer));
  let currentStep = 0;
  if (layersSeen.has('Init') || layersSeen.has('Layer A')) currentStep = 1;
  if (layersSeen.has('Layer B')) currentStep = 2;
  if (layersSeen.has('Layer C')) currentStep = 3;
  if (layersSeen.has('Layer D')) currentStep = 4;
  if (layersSeen.has('Summary')) currentStep = 5;
  const isCompleted = currentStep >= 5;

  const steps = [
    { label: 'Initialization', layer: 'Init' },
    { label: 'Perception', layer: 'Layer A' },
    { label: 'Cognition', layer: 'Layer B' },
    { label: 'Action', layer: 'Layer C' },
    { label: 'Validation', layer: 'Layer D' },
  ];

  // Step durations
  const stepDurations: Record<string, string> = {};
  liveEvents.forEach(e => {
    const m = e.message.match(/Completed (.+) in ([\d.]+)s/);
    if (m) stepDurations[m[1]] = m[2] + 's';
  });

  // Plan tasks from Layer B
  const planNodes: { id: string; persona: string; desc: string }[] = [];
  liveEvents.filter(e => e.layer === 'Layer B' && e.message.startsWith('  ->')).forEach(e => {
    const m = e.message.match(/\[(.+?)\] (.+?): (.+)/);
    if (m) planNodes.push({ persona: m[1], id: m[2], desc: m[3] });
  });

  // Auto-scroll trace
  useEffect(() => {
    if (traceBottomRef.current) {
      traceBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Back to Runs
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{runId}</h2>
              <span className={`badge ${isCompleted ? 'badge-success' : 'badge-info'}`}>
                {isCompleted ? 'Completed' : 'Running'}
              </span>
            </div>
            <h1 className="text-h1" style={{ maxWidth: 700, wordBreak: 'break-word' }}>{issueTitle}</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn-outline" style={{ padding: '8px' }}><RefreshCw size={16} /></button>
            <button className="btn-outline" style={{ padding: '8px' }}><Download size={16} /></button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--surface-border)' }}>
          {[
            { label: 'Repository', value: repoDisplay },
            { label: 'Started', value: startedAt },
            { label: 'Duration', value: duration },
            { label: 'Model', value: modelName },
            { label: 'Tool Calls', value: String(totalToolCalls) },
            { label: 'Tokens', value: totalTokens > 0 ? totalTokens.toLocaleString() : '—' },
            { label: 'Files Changed', value: changedFiles.length > 0 ? String(changedFiles.length) : '—' },
            { label: 'Confidence', value: confidence !== null ? `${(confidence * 100).toFixed(0)}%` : '—' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', marginBottom: '24px', padding: '0 40px', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 12, left: 60, right: 60, height: 2, background: 'var(--surface-border)', zIndex: 0 }}>
          <div style={{ height: '100%', width: `${Math.min((currentStep / steps.length) * 100, 100)}%`, background: 'var(--color-success)', transition: 'width 0.5s ease' }} />
        </div>

        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const layerKey = step.label;
          const dur = Object.entries(stepDurations).find(([k]) => k.includes(step.layer))?.[1];
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--surface-color)',
                border: `2px solid ${done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--surface-border)'}`,
                color: (done || active) ? 'white' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {done ? <CheckCircle size={14} /> : active ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? 'var(--color-primary)' : done ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{step.label}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                {done ? (dur || 'Done') : active ? 'Running...' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--surface-border)', marginBottom: '16px', flexShrink: 0, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 4px', fontSize: '0.875rem', fontWeight: activeTab === tab ? 600 : 500,
            color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            {tab}
            {tab === 'Files Changed' && changedFiles.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--color-primary)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: '0.65rem' }}>{changedFiles.length}</span>
            )}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* TRACE TAB */}
        {activeTab === 'Trace' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', height: '100%' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--surface-border)', fontWeight: 600, fontSize: '0.875rem' }}>
                Execution Trace <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '0.75rem' }}>({liveEvents.length} events)</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, bottom: 10, left: 10, width: 2, background: 'var(--surface-border)' }} />
                  {liveEvents.length === 0 && (
                    <div style={{ padding: '24px', color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '0.875rem' }}>
                      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
                      Waiting for events...
                    </div>
                  )}
                  {liveEvents.map((event, i) => {
                    const isError = event.event_type === 'ERROR';
                    const isLayerStart = event.event_type === 'LAYER_START';
                    const timeStr = new Date(event.timestamp).toLocaleTimeString();
                    if (event.event_type === 'DIFF') return null; // skip raw diff events
                    return (
                      <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: isError ? 'var(--color-error)' : isLayerStart ? 'var(--color-success)' : 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginTop: 2
                        }}>
                          {isError ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>[{event.layer}] {event.component}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8 }}>{timeStr}</div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{event.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={traceBottomRef} />
                </div>
              </div>
            </div>

            {/* Files Changed right panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e293b', color: '#f8fafc' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Files Changed {changedFiles.length > 0 ? `(${changedFiles.length})` : ''}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['Diff', 'File'] as const).map(v => (
                    <button key={v} onClick={() => setDiffView(v)} style={{ padding: '4px 12px', fontSize: '0.75rem', background: diffView === v ? 'var(--color-primary)' : 'transparent', color: diffView === v ? 'white' : '#94a3b8', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                {changedFiles.length > 0 && (
                  <div style={{ width: 200, borderRight: '1px solid #334155', overflowY: 'auto', flexShrink: 0 }}>
                    {changedFiles.map((f, i) => (
                      <div key={i} style={{ padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'monospace', color: i === 0 ? '#38bdf8' : '#94a3b8', background: i === 0 ? '#0f172a' : 'transparent', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}>
                        {f.split('/').pop()}
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>{f}</div>
                      </div>
                    ))}
                  </div>
                )}
                {diffText ? (
                  <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: '0.78rem', lineHeight: 1.6 }}>
                    {diffText.split('\n').map((line: string, i: number) => {
                      let bgColor = 'transparent';
                      let color = '#cbd5e1';
                      if (line.startsWith('+') && !line.startsWith('+++')) { bgColor = 'rgba(16,185,129,0.12)'; color = '#34d399'; }
                      else if (line.startsWith('-') && !line.startsWith('---')) { bgColor = 'rgba(239,68,68,0.12)'; color = '#f87171'; }
                      else if (line.startsWith('@@')) color = '#94a3b8';
                      else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('+++') || line.startsWith('---')) color = '#64748b';
                      return (
                        <div key={i} style={{ display: 'flex', background: bgColor }}>
                          <div style={{ color, whiteSpace: 'pre', overflowX: 'auto' }}>{line}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 8 }}>
                    <RefreshCw size={20} style={{ animation: liveEvents.length > 0 ? 'spin 1s linear infinite' : 'none' }} />
                    <span style={{ fontSize: '0.875rem' }}>{liveEvents.length > 0 ? 'Waiting for code changes...' : 'No run started yet'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PLAN TAB */}
        {activeTab === 'Plan' && (
          <div className="card" style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Task Plan</h3>
            {planNodes.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px' }}>Plan will appear once Layer B (Cognition) runs.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {planNodes.map((node, i) => (
                  <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{node.id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{node.desc}</div>
                      <span style={{ marginTop: 6, display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: 'var(--surface-color)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{node.persona}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FILES CHANGED TAB */}
        {activeTab === 'Files Changed' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', background: '#1e293b', color: '#f8fafc' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', background: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Files Changed {changedFiles.length > 0 ? `(${changedFiles.length})` : ''}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontFamily: "'Fira Code', monospace", fontSize: '0.78rem', lineHeight: 1.6 }}>
              {diffText ? diffText.split('\n').map((line: string, i: number) => {
                let bgColor = 'transparent', color = '#cbd5e1';
                if (line.startsWith('+') && !line.startsWith('+++')) { bgColor = 'rgba(16,185,129,0.12)'; color = '#34d399'; }
                else if (line.startsWith('-') && !line.startsWith('---')) { bgColor = 'rgba(239,68,68,0.12)'; color = '#f87171'; }
                else if (line.startsWith('@@')) color = '#94a3b8';
                else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('+++') || line.startsWith('---')) color = '#64748b';
                return <div key={i} style={{ background: bgColor, color, whiteSpace: 'pre' }}>{line}</div>;
              }) : <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No file changes yet.</div>}
            </div>
          </div>
        )}

        {/* TESTS TAB */}
        {activeTab === 'Tests' && (
          <div className="card" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 600 }}>Test Results</h3>
            {!testsRan ? (
              <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px' }}>
                {verifyEvents.length > 0 ? 'No tests found in this repository.' : 'Waiting for verification to complete...'}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 120, height: 120 }}>
                  <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-border)" strokeWidth="2" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2"
                      strokeDasharray={`${(testsPassed / testTotal) * 100} 100`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{testTotal}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>total tests</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Passed', count: testsPassed, color: '#10b981' },
                    { label: 'Failed', count: testsFailed, color: '#ef4444' },
                    { label: 'Skipped', count: testsSkipped, color: '#f59e0b' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
                      <span style={{ fontSize: '0.875rem', width: 60 }}>{r.label}</span>
                      <span style={{ fontWeight: 700 }}>{r.count}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({testTotal > 0 ? ((r.count / testTotal) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              {verifyEvents.map((e, i) => (
                <div key={i} style={{ padding: '10px 14px', marginBottom: 8, borderRadius: 8, background: e.message.includes('PASS') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${e.message.includes('PASS') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <span style={{ fontSize: '0.85rem' }}>{e.message.split(':')[0]}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: e.message.includes('PASS') ? '#10b981' : '#ef4444' }}>{e.message.includes('PASS') ? 'PASS' : 'FAIL'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'Logs' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', background: '#0f172a', color: '#e2e8f0' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', fontWeight: 600, fontSize: '0.875rem' }}>Full Log</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontFamily: "'Fira Code', monospace", fontSize: '0.78rem', lineHeight: 1.7 }}>
              {liveEvents.map((e, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  <span style={{ color: '#64748b' }}>{new Date(e.timestamp).toISOString().slice(11, 19)}</span>
                  <span style={{ color: '#38bdf8', marginLeft: 8 }}>[{e.layer}]</span>
                  <span style={{ color: e.event_type === 'ERROR' ? '#f87171' : '#94a3b8', marginLeft: 8 }}>[{e.component}]</span>
                  <span style={{ color: e.event_type === 'ERROR' ? '#fca5a5' : '#e2e8f0', marginLeft: 8 }}>{e.message}</span>
                </div>
              ))}
              {liveEvents.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>No logs yet.</div>}
            </div>
          </div>
        )}

        {/* METRICS TAB */}
        {activeTab === 'Metrics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 600 }}>Run Metrics</h3>
              {[
                { label: 'Total Tokens Used', value: totalTokens > 0 ? totalTokens.toLocaleString() : '—' },
                { label: 'Tool Calls', value: String(totalToolCalls) },
                { label: 'Files Changed', value: changedFiles.length > 0 ? String(changedFiles.length) : '—' },
                { label: 'Avg. Latency / Call', value: avgLatency },
                { label: 'Duration', value: duration },
                { label: 'Events', value: String(liveEvents.length) },
                { label: 'Model', value: modelName },
                { label: 'Confidence', value: confidence !== null ? `${(confidence * 100).toFixed(0)}%` : '—' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{m.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{m.value}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 600 }}>Layer Timings</h3>
              {Object.keys(stepDurations).length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}>Timings will appear as layers complete.</div>
              ) : (
                Object.entries(stepDurations).map(([layer, dur]) => {
                  const secs = parseFloat(dur);
                  const maxSec = Math.max(...Object.values(stepDurations).map(d => parseFloat(d)));
                  return (
                    <div key={layer} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{layer}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dur}</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-border)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${(secs / maxSec) * 100}%`, background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* EVIDENCE TAB */}
        {activeTab === 'Evidence' && (
          <div className="card" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 600 }}>Evidence Package</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Run ID', value: runId },
                { label: 'Issue', value: issueTitle },
                { label: 'Repository', value: repoDisplay },
                { label: 'Model', value: modelName },
                { label: 'Duration', value: duration },
                { label: 'Total Events', value: String(liveEvents.length) },
                { label: 'Tool Calls', value: String(totalToolCalls) },
                { label: 'Tokens Used', value: totalTokens > 0 ? totalTokens.toLocaleString() : '—' },
                { label: 'Files Changed', value: changedFiles.join(', ') || '—' },
                { label: 'Confidence Score', value: confidence !== null ? `${(confidence * 100).toFixed(0)}%` : '—' },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px 16px', border: '1px solid var(--surface-border)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, wordBreak: 'break-all' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {verifyEvents.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12, fontWeight: 600, fontSize: '0.9rem' }}>Verification Checks</h4>
                {verifyEvents.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--surface-border)', fontSize: '0.875rem' }}>
                    <span>{e.message.split(':')[0]}</span>
                    <span style={{ color: e.message.includes('PASS') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{e.message.includes('PASS') ? '✓ PASS' : '✗ FAIL'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--surface-border)', flexShrink: 0 }}>
        <button className="btn btn-primary"><PlayCircle size={16} /> Re-run</button>
        <button className="btn-outline"><Code size={16} /> Open in IDE</button>
        <button className="btn-outline" style={{ color: '#10b981', borderColor: '#10b981' }}><GitPullRequestIcon size={16} /> Create PR</button>
        {diffText && (
          <button className="btn-outline" onClick={() => {
            const blob = new Blob([diffText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${runId}.patch`; a.click();
          }}><Download size={16} /> Download Patch</button>
        )}
        <button className="btn-outline" style={{ marginLeft: 'auto', color: '#ef4444', borderColor: '#ef4444' }}><RotateCcw size={16} /> Rollback</button>
      </div>
    </div>
  );
}

function GitPullRequestIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg>;
}
