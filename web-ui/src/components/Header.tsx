import { Plus, Sun, Moon, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header({ onNewTask, onToggleSidebar }: { onNewTask: () => void, onToggleSidebar: () => void }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.body.classList.add('dark');
    } else {
      setIsDark(false);
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.body.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="btn-outline" 
          onClick={onToggleSidebar}
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-h2">Dashboard</h1>
          <p className="text-body" style={{ marginTop: '4px' }}>
            Overview of recent runs and metrics
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="btn-outline" 
          onClick={toggleTheme} 
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="btn btn-primary" onClick={onNewTask}>
          <Plus size={16} /> New Task
        </button>
      </div>
    </header>
  );
}
