import { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, Code, Database, Play, Square, Eye, Zap, Search, Layout, Terminal, GitBranch } from 'lucide-react'
import ArchitectureGraph from './ArchitectureGraph'
import { ARCHITECTURE_DATA } from './architecture-data'
import './index.css'

// Map a layer start message keyword → the first step id in that layer
const LAYER_STEP_MAP: Record<string, string[]> = {}
ARCHITECTURE_DATA.forEach(layer => {
  LAYER_STEP_MAP[layer.id] = layer.steps.map(s => s.id);
});

// Map event layer/component names to step IDs
const EVENT_TO_STEP: Record<string, string> = {
  'RepoIntelligence': 'step-repo-scan',
  'ASTIndex': 'step-ast-index',
  'ImportGraph': 'step-import-call-graph',
  'RepoDNA': 'step-repo-dna',
  'EKG': 'step-ekg-build',
  'ContextManager': 'step-context-build',
  'MemoryManager': 'step-memory-load',
  'ParliamentaryPlanner': 'step-plan',
  'AgentPool': 'step-agent-execute',
  'ToolEngine': 'step-tool-dispatch',
  'SandboxExecutor': 'step-sandbox-exec',
  'VerificationEngine': 'step-syntax-lint',
  'ConfidenceScorer': 'step-score',
  'EvidenceCollector': 'step-package',
  'OllamaAdapter': 'step-llm-generate',
};

interface EventLog {
  timestamp: string
  layer: string
  component: string
  event_type: string
  message: string
  data: any
}

type View = 'dashboard' | 'architecture';

function App() {
  const [view, setView] = useState<View>('architecture');
  const [logs, setLogs] = useState<EventLog[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [repoPath, setRepoPath] = useState('D:\\\\VIT\\\\Project\\\\YCCE_CODERUSH\\\\test_repo')
  const [issue, setIssue] = useState('Add a hello world print statement to dummy.py')
  
  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/events')
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLogs(prev => [...prev, data])
        // Resolve active step from the component name
        const stepId = EVENT_TO_STEP[data.component]
        if (stepId) setActiveStepId(stepId)
      } catch (e) {
        console.error("Error parsing WS message:", e)
      }
    }
    ws.onclose = () => console.log('WebSocket disconnected')
    return () => ws.close()
  }, [])

  const handleRun = async () => {
    if (isRunning) return
    setIsRunning(true)
    setLogs([])
    try {
      await fetch('http://localhost:8000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path: repoPath, issue_statement: issue })
      })
    } catch (e) {
      console.error(e)
      setIsRunning(false)
    }
  }

  const getActivePhase = () => {
    const recent = [...logs].reverse()
    const lastStart = recent.find(l => l.event_type === 'LAYER_START')
    if (!lastStart) return null
    return lastStart.message.replace('Starting ', '')
  }
  
  const activePhase = getActivePhase()

  const getThoughts = () => {
    return logs.filter(l => l.event_type === 'TOOL_CALL' || l.event_type === 'LLM_CALL' || l.event_type === 'RECOVERY')
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Top Navigation Bar */}
      <nav
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 64,
          borderRadius: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h1 style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: 0,
          }}>
            <Zap size={22} color="#60a5fa" /> AE-01 Control Center
          </h1>

          {/* View Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            <button
              onClick={() => setView('dashboard')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: view === 'dashboard' ? 'var(--accent-color)' : 'transparent',
                color: view === 'dashboard' ? '#fff' : '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Terminal size={14} /> Dashboard
            </button>
            <button
              onClick={() => setView('architecture')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: view === 'architecture' ? 'var(--accent-color)' : 'transparent',
                color: view === 'architecture' ? '#fff' : '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <GitBranch size={14} /> Architecture
            </button>
          </div>
        </div>

        {view === 'dashboard' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input 
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: 'white', width: 220, fontSize: 12 }}
              value={repoPath}
              onChange={e => setRepoPath(e.target.value)}
              placeholder="Repository Path"
            />
            <input 
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: 'white', width: 300, fontSize: 12 }}
              value={issue}
              onChange={e => setIssue(e.target.value)}
              placeholder="Issue Statement"
            />
            <button className="btn" onClick={handleRun} disabled={isRunning} style={{ fontSize: 12, padding: '6px 14px' }}>
              {isRunning ? <Square size={14} /> : <Play size={14} />}
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        )}
      </nav>

      {/* Content Area */}
      {view === 'architecture' ? (
        <div style={{ flex: 1, position: 'relative' }}>
          <ArchitectureGraph activeStepId={activeStepId} />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '280px 1fr 360px',
            gap: 12,
            padding: 12,
            overflow: 'hidden',
          }}
        >
          {/* Left Sidebar - Phase Tracker */}
          <aside className="sidebar glass" style={{ padding: 16, gap: 14, overflow: 'auto' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} /> Timeline
            </h2>
            
            {[
              { phase: 'HARNESS INITIALIZATION', icon: <Play size={14} />, title: 'Init', desc: 'Bootstrap' },
              { phase: 'Layer A', icon: <Search size={14} />, title: 'Perception', desc: 'EKG & DNA' },
              { phase: 'Layer B', icon: <Database size={14} />, title: 'Cognition', desc: 'Task Graph' },
              { phase: 'Layer C', icon: <Code size={14} />, title: 'Action', desc: 'Agent Pool' },
              { phase: 'Layer D', icon: <Eye size={14} />, title: 'Validation', desc: 'Verification' },
              { phase: 'FINAL OUTPUT', icon: <Layout size={14} />, title: 'Output', desc: 'Patch & Score' },
            ].map(({ phase, icon, title, desc }) => (
              <div
                key={phase}
                className={`phase-item ${activePhase?.includes(phase) ? 'active' : ''}`}
                style={{ padding: 10 }}
              >
                <div className="phase-icon">{icon}</div>
                <div className="phase-content">
                  <h3 style={{ fontSize: '0.9rem' }}>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </aside>

          {/* Main Content - Live Terminal */}
          <main className="terminal-container glass">
            <div className="terminal-header">
              <Terminal size={14} /> Event Stream
            </div>
            <div className="terminal-body">
              {logs.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: 40, fontSize: 13 }}>
                  System idle. Click "Run" to start...
                </div>
              )}
              
              {logs.map((log, i) => (
                <div key={i} className="log-entry">
                  <div className="log-time">{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}</div>
                  <div className={`log-tag ${log.event_type}`}>{log.event_type}</div>
                  <div className="log-message">
                    <strong>[{log.layer} - {log.component}]</strong> {log.message}
                    {log.data && Object.keys(log.data).length > 0 && (
                      <div className="log-data">{JSON.stringify(log.data, null, 2)}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </main>

          {/* Right Sidebar - Agent Brain */}
          <aside className="agent-brain glass">
            <div className="brain-header" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <Zap size={14} color="var(--color-tool)" /> Agent Brain
            </div>
            <div className="brain-body">
              {getThoughts().length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No cognitive events yet.
                </div>
              )}
              
              {getThoughts().reverse().map((thought, i) => (
                <div key={i} className="thought-card">
                  <h4>
                    {thought.event_type === 'TOOL_CALL' ? <Code size={12} /> : <Database size={12} />}
                    {thought.message}
                  </h4>
                  <div className="thought-content">
                    {thought.data?.params && (
                      <div style={{ marginBottom: 6 }}>
                        <strong style={{color: 'var(--text-secondary)', fontSize: 10}}>Params:</strong>
                        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 4, marginTop: 2, whiteSpace: 'pre-wrap', fontSize: 10 }}>
                          {JSON.stringify(thought.data.params, null, 2)}
                        </pre>
                      </div>
                    )}
                    {thought.data?.result && (
                      <div>
                        <strong style={{color: 'var(--text-secondary)', fontSize: 10}}>Result:</strong>
                        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 4, marginTop: 2, whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto', fontSize: 10 }}>
                          {thought.data.result.substring(0, 300)}{thought.data.result.length > 300 ? '...' : ''}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
