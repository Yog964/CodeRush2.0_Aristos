import { useState } from 'react';
import { X, PlayCircle, FolderGit2, Terminal } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (repoPath: string, issue: string) => void;
}

export function NewTaskModal({ isOpen, onClose, onSubmit }: NewTaskModalProps) {
  // Defaulting to the active repo to speed up testing
  const [repoPath, setRepoPath] = useState('d:/VIT/Project/YCCE_CODERUSH');
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath || !issue) return;
    setIsSubmitting(true);
    onSubmit(repoPath, issue);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
    }}>
      <div className="card" style={{ width: '500px', display: 'flex', flexDirection: 'column', animation: 'breathe 0.2s ease-out forwards', transform: 'scale(0.95)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 className="text-h2">New Harness Run</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Repository Path</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '8px 12px', background: '#f8fafc' }}>
              <FolderGit2 size={16} color="var(--text-tertiary)" />
              <input 
                type="text" 
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="/path/to/local/repo"
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Issue / Feature Request</label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '12px', background: '#f8fafc' }}>
              <Terminal size={16} color="var(--text-tertiary)" style={{ marginTop: '2px' }} />
              <textarea 
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the bug or feature you want the harness to solve..."
                rows={4}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', resize: 'vertical' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Starting...' : <><PlayCircle size={16} /> Start Run</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
