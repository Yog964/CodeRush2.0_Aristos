import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Dashboard } from './pages/Dashboard'
import { TaskRun } from './pages/TaskRun'
import { NewTaskModal } from './components/NewTaskModal'
import ArchitectureGraph from './ArchitectureGraph'
import { EVENT_TO_STEP } from './architecture-data'
import './index.css'

export type ViewState = 'dashboard' | 'task_run' | 'architecture' | string;

export interface EventLog {
  timestamp: string
  layer: string
  component: string
  event_type: string
  message: string
  data?: any
}

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Live State
  const [liveEvents, setLiveEvents] = useState<EventLog[]>([]);
  
  // Connect WebSocket to track live run
  useEffect(() => {
    if (!activeRunId) return;

    console.log("Connecting WebSocket for run:", activeRunId);
    const ws = new WebSocket(`ws://localhost:8000/ws/events/${activeRunId}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS Event:", data);
        
        // Append to trace
        setLiveEvents(prev => [...prev, data]);

        // Map backend component to frontend Architecture graph step
        const stepId = EVENT_TO_STEP[data.component];
        if (stepId) setActiveStepId(stepId);
        
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    };
    
    ws.onclose = () => console.log('WebSocket disconnected for', activeRunId);
    
    return () => {
      ws.close();
    };
  }, [activeRunId]);

  const handleNavigateToRun = (runId: string) => {
    setActiveRunId(runId);
    setCurrentView('task_run');
  };

  const handleStartTask = async (repoPath: string, issue: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path: repoPath, issue: issue })
      });
      const data = await res.json();
      setIsModalOpen(false);
      setLiveEvents([]); // Clear old events
      setActiveStepId(null); // Clear old architecture highlighting
      setActiveRunId(data.run_id);
      setCurrentView('task_run');
    } catch (e) {
      console.error("Failed to start task:", e);
      alert("Failed to connect to backend. Is the FastAPI server running?");
      setIsModalOpen(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        activeView={currentView} 
        onNavigate={(view) => setCurrentView(view)} 
      />
      
      <div className="main-content">
        <Header onNewTask={() => setIsModalOpen(true)} />
        
        <main className="page-content">
          {currentView === 'dashboard' && (
            <Dashboard onNavigateToRun={handleNavigateToRun} />
          )}
          
          {currentView === 'task_run' && activeRunId && (
            <TaskRun runId={activeRunId} liveEvents={liveEvents} onBack={() => setCurrentView('dashboard')} />
          )}

          {currentView === 'architecture' && (
            <div style={{ width: '100%', height: 'calc(100vh - 112px)', border: '1px solid var(--surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <ArchitectureGraph activeStepId={activeStepId} />
            </div>
          )}

          {/* Fallback for un-implemented tabs */}
          {currentView !== 'dashboard' && currentView !== 'task_run' && currentView !== 'architecture' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              This view ({currentView}) is not yet implemented.
            </div>
          )}
        </main>
      </div>

      <NewTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleStartTask} 
      />
    </div>
  )
}

export default App
