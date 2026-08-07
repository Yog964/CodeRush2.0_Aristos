import { 
  LayoutDashboard, 
  FolderGit2, 
  CheckSquare, 
  PlaySquare, 
  Database, 
  Network, 
  Wrench, 
  Box, 
  BarChart2, 
  FileText, 
  Settings,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Brand / Logo */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Network size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Agentic Harness</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Unified Coding Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                width: '100%',
                borderRadius: '8px',
                background: isActive ? 'var(--color-primary-light)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f1f5f9'; // slate-100
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Status & Profile */}
      <div style={{ padding: '24px', borderTop: '1px solid var(--surface-border)' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            System Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-success-light)', padding: '6px 10px', borderRadius: '6px', color: '#047857', fontSize: '0.8rem', fontWeight: 500 }}>
            <ShieldCheck size={16} />
            All Systems Operational
          </div>
        </div>
      </div>
    </aside>
  );
}
