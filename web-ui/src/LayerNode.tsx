import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function LayerNode({ data }: { data: any }) {
  const { label, icon, color, gradientFrom, gradientTo, description, isExpanded, isSelected } = data;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(160deg, ${gradientFrom}1a, ${gradientTo}0d)`,
        border: `2px solid ${isSelected ? color : `${color}44`}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: isSelected
          ? `0 0 28px ${color}55, inset 0 0 28px ${color}0d`
          : `0 4px 20px rgba(0,0,0,0.35)`,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 10, height: 10, border: `2px solid #0f172a`, top: -6 }}
      />

      {/* Layer header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          background: `linear-gradient(90deg, ${gradientFrom}55, ${gradientTo}22)`,
          borderBottom: `1px solid ${color}22`,
          cursor: 'pointer',
          height: 64,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f8fafc', letterSpacing: '0.01em' }}>
            {label}
          </div>
          {!isExpanded && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
              {description}
            </div>
          )}
        </div>
        {/* Step count badge */}
        <div style={{
          padding: '3px 10px',
          borderRadius: 20,
          background: `${color}22`,
          border: `1px solid ${color}44`,
          fontSize: 11,
          color: color,
          fontWeight: 600,
        }}>
          {data.steps?.length || 0} steps
        </div>
        {/* Expand arrow */}
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: color,
          transition: 'transform 0.3s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 10, height: 10, border: `2px solid #0f172a`, bottom: -6 }}
      />
    </div>
  );
}

export default memo(LayerNode);
