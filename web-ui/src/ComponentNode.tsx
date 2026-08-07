import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ComponentNode({ data }: { data: any }) {
  const { label, description, layerColor, isSelected } = data;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: isSelected
          ? `linear-gradient(135deg, ${layerColor}33, ${layerColor}11)`
          : 'rgba(15, 23, 42, 0.8)',
        border: `1.5px solid ${isSelected ? layerColor : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 10,
        padding: '8px 14px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: isSelected
          ? `0 0 20px ${layerColor}33`
          : '0 1px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: layerColor, width: 6, height: 6, border: 'none', opacity: 0.6 }} />
      <div style={{ fontWeight: 600, fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </div>
      <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {description}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: layerColor, width: 6, height: 6, border: 'none', opacity: 0.6 }} />
    </div>
  );
}

export default memo(ComponentNode);
