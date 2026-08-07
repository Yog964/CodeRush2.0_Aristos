import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, PlayCircle, Code, RefreshCw, Download, RotateCcw } from 'lucide-react';
import { TestDonutChart } from '../components/TestDonutChart';
import { MetricsLineChart } from '../components/MetricsLineChart';

import type { EventLog } from '../App';

export function TaskRun({ onBack, runId, liveEvents = [] }: { onBack: () => void, runId: string, liveEvents?: EventLog[] }) {
  const [activeTab, setActiveTab] = useState('Trace');

  const tabs = ['Trace', 'Plan', 'Context', 'Files Changed', 'Tests', 'Logs', 'Metrics', 'Evidence'];



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Back to Runs
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 className="text-h2" style={{ color: 'var(--text-secondary)' }}>{runId}</h2>
              <span className="badge badge-success">Success</span>
            </div>
            <h1 className="text-h1">Implement email verification flow</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-outline">Open in Viewer ▾</button>
            <button className="btn-outline" style={{ padding: '8px' }}><RefreshCw size={16} /></button>
            <button className="btn-outline" style={{ padding: '8px' }}><Download size={16} /></button>
            <button className="btn-outline" style={{ padding: '8px' }}><SettingsIcon /></button>
          </div>
        </div>

        {/* Meta info row */}
        <div style={{ display: 'flex', gap: '48px', marginTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--surface-border)' }}>
          <div><div className="text-sm">Repository</div><div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4 }}>acme-platform</div></div>
          <div><div className="text-sm">Branch</div><div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4 }}>feature/email-verification</div></div>
          <div><div className="text-sm">Started</div><div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4 }}>May 12, 2025 10:15 AM</div></div>
          <div><div className="text-sm">Duration</div><div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4 }}>18m 42s</div></div>
          <div><div className="text-sm">Model</div><div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4 }}>GPT-4.1</div></div>
          <div><div className="text-sm">Cost</div><div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4 }}>$0.42</div></div>
        </div>
      </div>

      {/* Timeline Stepper */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginBottom: '32px', padding: '0 40px' }}>
        <div style={{ position: 'absolute', top: 12, left: 60, right: 60, height: 2, background: 'var(--color-success)', zIndex: 0 }} />
        
        {['Planning', 'Context', 'Code', 'Verify', 'Review'].map((step, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
            <div style={{ 
              width: 24, height: 24, borderRadius: '50%', 
              background: 'var(--color-success)',
              border: `2px solid white`,
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--color-success)'
            }}>
              <CheckCircle size={14} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{step}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              {i === 0 ? '1m 12s' : i === 1 ? '2m 45s' : i === 2 ? '7m 18s' : i === 3 ? '5m 05s' : '2m 22s'}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--surface-border)', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <div 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '12px 4px', 
              fontSize: '0.875rem', 
              fontWeight: activeTab === tab ? 600 : 500, 
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Trace Tab Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {/* Left: Execution Trace */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-border)', fontWeight: 600 }}>
            Execution Trace
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 10, bottom: 10, left: 10, width: 2, background: 'var(--surface-border)', zIndex: 0 }} />
              {liveEvents.length === 0 && (
                <div style={{ padding: '20px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  Waiting for events...
                </div>
              )}
              {liveEvents.map((event, i) => {
                const isError = event.event_type === 'ERROR';
                const timeStr = new Date(event.timestamp).toLocaleTimeString();
                
                return (
                <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: isError ? 'var(--color-error)' : 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                  }}>
                    {isError ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>[{event.layer}] {event.component}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{timeStr}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{event.message}</div>
                    
                    {event.data && Object.keys(event.data).length > 0 && (
                      <div style={{ marginTop: '8px', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--surface-border)', borderRadius: '6px', fontSize: '0.7rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-tertiary)' }}>
                        {JSON.stringify(event.data, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>

        {/* Right: Files Changed Diff */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e293b', color: '#f8fafc' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Files Changed (8)</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ padding: '4px 12px', fontSize: '0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 4 }}>Diff</button>
              <button style={{ padding: '4px 12px', fontSize: '0.75rem', background: 'transparent', color: '#94a3b8', border: 'none', borderRadius: 4 }}>File</button>
            </div>
          </div>
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* File List */}
            <div style={{ width: 220, borderRight: '1px solid #334155', overflowY: 'auto' }}>
              {['controllers/auth.py', 'models/user.py', 'services/email_service.py', 'templates/verify_email.html', 'tests/test_auth.py', 'tests/test_email_service.py', 'README.md', 'requirements.txt'].map((f, i) => (
                <div key={i} style={{ padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'monospace', color: i === 0 ? '#38bdf8' : '#94a3b8', background: i === 0 ? '#0f172a' : 'transparent', cursor: 'pointer' }}>
                  {f}
                  {i === 0 && <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>Python</div>}
                </div>
              ))}
            </div>
            {/* Diff View */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontFamily: "'Fira Code', monospace", fontSize: '0.8rem', lineHeight: 1.5 }}>
              <div style={{ color: '#64748b', marginBottom: 8 }}>@@ -48,6 +48,14 @@ def register():</div>
              <div style={{ display: 'flex' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>48</div><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>48</div><div style={{ color: '#cbd5e1' }}>    user = User(**data)</div></div>
              <div style={{ display: 'flex' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>49</div><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>49</div><div style={{ color: '#cbd5e1' }}>    db.session.add(user)</div></div>
              <div style={{ display: 'flex' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>50</div><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>50</div><div style={{ color: '#cbd5e1' }}>    db.session.commit()</div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>51</div><div style={{ color: '#34d399' }}>+   # Send verification email</div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>52</div><div style={{ color: '#34d399' }}>+   token = generate_verification_token(user.email)</div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>53</div><div style={{ color: '#34d399' }}>+   verify_url = url_for('auth.verify_email', token=token, _external=True)</div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>54</div><div style={{ color: '#34d399' }}>+   email_service.send_verification_email(user.email, verify_url)</div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>55</div><div style={{ color: '#34d399' }}>+   return jsonify({`{"message": "Registration successful. Please check your email."}`})</div></div>
              <div style={{ display: 'flex', background: 'rgba(239, 68, 68, 0.15)' }}><div style={{ width: 40, color: '#ef4444', userSelect: 'none' }}>51</div><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ color: '#f87171' }}>-   return jsonify({`{"message": "User created"}`}), 201</div></div>
              <div style={{ color: '#64748b', margin: '16px 0 8px' }}>@@ -120,3 +128,17 @@ def login():</div>
              <div style={{ display: 'flex' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>120</div><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}>128</div><div style={{ color: '#cbd5e1' }}>    return jsonify({`{"token": token}`})</div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>129</div><div style={{ color: '#34d399' }}>+ </div></div>
              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.15)' }}><div style={{ width: 40, color: '#64748b', userSelect: 'none' }}></div><div style={{ width: 40, color: '#10b981', userSelect: 'none' }}>130</div><div style={{ color: '#34d399' }}>+ @auth.route('/verify-email/&lt;token&gt;')</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginTop: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>Test Results</h3>
          <TestDonutChart />
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '48px', marginBottom: '16px' }}>
            <div><div className="text-sm">Tokens Used</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>312,145</div></div>
            <div><div className="text-sm">Tool Calls</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>24</div></div>
            <div><div className="text-sm">Files Touched</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>8</div></div>
            <div><div className="text-sm">Avg. Latency / Call</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>1.23s</div></div>
          </div>
          <MetricsLineChart />
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--surface-border)' }}>
        <button className="btn btn-primary"><PlayCircle size={16} /> Re-run</button>
        <button className="btn-outline"><Code size={16} /> Open in IDE</button>
        <button className="btn-outline" style={{ color: '#10b981', borderColor: '#10b981' }}><GitPullRequestIcon size={16} /> Create PR</button>
        <button className="btn-outline"><Download size={16} /> Download Patch</button>
        <button className="btn-outline" style={{ marginLeft: 'auto', color: '#ef4444', borderColor: '#ef4444' }}><RotateCcw size={16} /> Rollback</button>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
}

function GitPullRequestIcon({size}: {size: number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>;
}
