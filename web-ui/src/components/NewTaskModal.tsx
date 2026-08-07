import { useState, useEffect } from 'react';
import { X, PlayCircle, FolderGit2, Terminal } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (repoPath: string, issue: string, isBaseline: boolean, comparisonGroupId?: string) => Promise<void>;
}

export function NewTaskModal({ isOpen, onClose, onSubmit }: NewTaskModalProps) {
  const [repoPath, setRepoPath] = useState('');
  const [issue, setIssue] = useState('');
  const [isComparison, setIsComparison] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError('');
      setIssue('');
      setIsComparison(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim() || !issue.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      if (isComparison) {
        // Generate a shared group ID
        const groupId = `CMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        // Submit Baseline
        await onSubmit(repoPath.trim(), issue.trim(), true, groupId);
        // Submit Normal
        await onSubmit(repoPath.trim(), issue.trim(), false, groupId);
      } else {
        await onSubmit(repoPath.trim(), issue.trim(), false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start run. Is the backend running?');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // don't close while starting
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="card" style={{ width: '520px', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 className="text-h2">New Harness Run</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: isSubmitting ? 0.4 : 1 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Repository Path or GitHub URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '8px 12px', background: 'var(--bg-color)' }}>
              <FolderGit2 size={16} color="var(--text-tertiary)" />
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="https://github.com/user/repo  or  D:\path\to\repo"
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: 'var(--text-primary)' }}
                required
                disabled={isSubmitting}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              GitHub URL will be cloned automatically to <code>D:\CodeRush\cloned repos\</code>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Issue / Feature Request</label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '12px', background: 'var(--bg-color)' }}>
              <Terminal size={16} color="var(--text-tertiary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the bug or feature you want the harness to solve..."
                rows={4}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              background: 'var(--surface-color)', 
              borderRadius: '6px', 
              border: '1px solid var(--surface-border)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              userSelect: 'none'
            }}
          >
            <input 
              type="checkbox" 
              checked={isComparison}
              onChange={(e) => setIsComparison(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Run A/B Comparison (Demo Mode)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Simultaneously runs a naive planner vs Parliamentary planner to compare budget and quality.</span>
            </div>
          </label>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            <button type="button" onClick={handleClose} className="btn-outline" disabled={isSubmitting}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !repoPath.trim() || !issue.trim()}
              style={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  Starting...
                </>
              ) : (
                <><PlayCircle size={16} /> Start Run</>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
