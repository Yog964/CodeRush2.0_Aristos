import type { WorkflowStep, ArchLayer } from './architecture-data';
import { ARCHITECTURE_DATA } from './architecture-data';

interface DetailPanelProps {
  selectedId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function findItem(id: string): { layer: ArchLayer; step?: WorkflowStep } | null {
  for (const layer of ARCHITECTURE_DATA) {
    if (layer.id === id) return { layer };
    for (const step of layer.steps) {
      if (step.id === id) return { layer, step };
    }
  }
  return null;
}

export default function DetailPanel({ selectedId, onClose, onNavigate }: DetailPanelProps) {
  if (!selectedId) return null;
  const item = findItem(selectedId);
  if (!item) return null;

  const { layer, step } = item;
  const color = layer.color;
  const isStep = !!step;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 400,
        maxHeight: 'calc(100% - 32px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 26, 0.97)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${color}55`,
        borderRadius: 16,
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 50px ${color}1a`,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: `linear-gradient(135deg, ${layer.gradientFrom}55, ${layer.gradientTo}22)`,
        borderBottom: `1px solid ${color}22`,
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              {layer.icon} {layer.shortLabel} {isStep ? `· Step ${layer.steps.findIndex(s => s.id === step!.id) + 1} of ${layer.steps.length}` : ''}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              {isStep ? step!.label : layer.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Description */}
        <p style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: 0 }}>
          {isStep ? step!.description : layer.description}
        </p>

        {/* I/O for step */}
        {isStep && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#22d3ee', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>⬇ Inputs</div>
              {step!.inputs.length === 0
                ? <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>None (entry point)</div>
                : step!.inputs.map((inp, i) => (
                  <div key={i} style={{ fontSize: 10.5, color: '#7dd3fc', fontFamily: "'Fira Code', monospace", padding: '3px 8px', background: 'rgba(34,211,238,0.07)', borderRadius: 5, marginBottom: 4 }}>
                    {inp}
                  </div>
                ))
              }
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>⬆ Outputs</div>
              {step!.outputs.length === 0
                ? <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>None (terminal)</div>
                : step!.outputs.map((out, i) => (
                  <div key={i} style={{ fontSize: 10.5, color: '#c4b5fd', fontFamily: "'Fira Code', monospace", padding: '3px 8px', background: 'rgba(167,139,250,0.07)', borderRadius: 5, marginBottom: 4 }}>
                    {out}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Details / capabilities */}
        {isStep && step!.details.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>What Happens</div>
            {step!.details.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5, fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                <span style={{ color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>▸</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Source file */}
        {isStep && step!.file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: 11, color: '#60a5fa', fontFamily: "'Fira Code', monospace" }}>
            📄 {step!.file}
          </div>
        )}

        {/* Layer steps list (when a layer is selected) */}
        {!isStep && (
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Execution Steps</div>
            {layer.steps.map((s, i) => (
              <div
                key={s.id}
                onClick={() => onNavigate(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = `${color}11`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${color}44`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#e2e8f0' }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{s.description.slice(0, 60)}...</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Jump */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Jump to Layer</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ARCHITECTURE_DATA.map(l => (
              <button
                key={l.id}
                onClick={() => onNavigate(l.id)}
                style={{
                  padding: '4px 10px',
                  background: l.id === layer.id ? `${l.color}2a` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${l.id === layer.id ? l.color : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 6,
                  color: l.id === layer.id ? l.color : '#94a3b8',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {l.icon} {l.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
