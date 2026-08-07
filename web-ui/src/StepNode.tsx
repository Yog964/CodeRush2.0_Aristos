import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function StepNode({ data }: { data: any }) {
  const {
    label,
    description,
    layerColor,
    isSelected,
    isActive,
    inputs = [],
    outputs = [],
    stepIndex,
    totalSteps,
  } = data;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: isActive
          ? `linear-gradient(135deg, ${layerColor}33, ${layerColor}18)`
          : isSelected
          ? `linear-gradient(135deg, ${layerColor}22, ${layerColor}0d)`
          : 'rgba(15, 23, 42, 0.88)',
        border: `1.5px solid ${isActive ? layerColor : isSelected ? `${layerColor}88` : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        boxShadow: isActive
          ? `0 0 22px ${layerColor}55, 0 0 8px ${layerColor}33`
          : isSelected
          ? `0 0 14px ${layerColor}33`
          : '0 1px 6px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        position: 'relative',
      }}
    >
      {/* Active pulse ring */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: -3,
          borderRadius: 13,
          border: `2px solid ${layerColor}`,
          opacity: 0,
          animation: 'pulseBorder 1.5s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Left color accent bar */}
      <div style={{
        width: 4,
        background: isActive
          ? layerColor
          : isSelected
          ? `${layerColor}bb`
          : `${layerColor}44`,
        flexShrink: 0,
        transition: 'background 0.25s',
      }} />

      {/* Step index badge */}
      <div style={{
        width: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
        color: isActive ? layerColor : '#475569',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {stepIndex + 1}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{
          fontWeight: 600,
          fontSize: 12.5,
          color: isActive ? '#f8fafc' : '#e2e8f0',
          marginBottom: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {isActive && (
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: layerColor,
              display: 'inline-block',
              boxShadow: `0 0 8px ${layerColor}`,
              animation: 'breathe 1.2s ease-in-out infinite alternate',
              flexShrink: 0,
            }} />
          )}
          {label}
        </div>
        <div style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {description}
        </div>
      </div>

      {/* I/O Summary */}
      <div style={{
        width: 160,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
        padding: '6px 12px',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {inputs.slice(0, 1).map((inp: string) => (
          <div key={inp} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: '#64748b', fontFamily: "'Fira Code', monospace" }}>
            <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 9 }}>IN</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inp}</span>
          </div>
        ))}
        {inputs.length > 1 && (
          <div style={{ fontSize: 9, color: '#475569' }}>+{inputs.length - 1} more</div>
        )}
        {outputs.slice(0, 1).map((out: string) => (
          <div key={out} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: '#64748b', fontFamily: "'Fira Code', monospace" }}>
            <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 9 }}>OUT</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{out}</span>
          </div>
        ))}
        {outputs.length > 1 && (
          <div style={{ fontSize: 9, color: '#475569' }}>+{outputs.length - 1} more</div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: layerColor, width: 8, height: 8, border: `2px solid #0f172a`, top: -5, opacity: isFirst ? 0 : 1 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: layerColor, width: 8, height: 8, border: `2px solid #0f172a`, bottom: -5, opacity: isLast ? 0 : 1 }}
      />
    </div>
  );
}

export default memo(StepNode);
