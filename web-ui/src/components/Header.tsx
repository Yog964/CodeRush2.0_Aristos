import { Plus, Bell, Sun } from 'lucide-react';

export function Header({ onNewTask }: { onNewTask: () => void }) {
  return (
    <header className="header">
      <div>
        <h1 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Welcome back, Dev Team <span role="img" aria-label="wave">👋</span>
        </h1>
        <p className="text-body" style={{ marginTop: '4px' }}>
          Here's an overview of your coding harness
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn btn-primary" onClick={onNewTask}>
          <Plus size={16} /> New Task
        </button>
        
        <button className="btn-outline" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} />
        </button>
        
        <button className="btn-outline" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sun size={18} />
        </button>

        <div style={{ width: '36px', height: '36px', background: 'var(--surface-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
          DT
        </div>
      </div>
    </header>
  );
}
