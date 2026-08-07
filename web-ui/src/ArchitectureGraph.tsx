import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LayerNode from './LayerNode';
import StepNode from './StepNode';
import DetailPanel from './DetailPanel';
import { buildGraphData, ARCHITECTURE_DATA } from './architecture-data';

// IMPORTANT: nodeTypes must be defined outside the component to avoid re-registration on each render
const nodeTypes = {
  layerNode: LayerNode,
  stepNode: StepNode,
};

interface ArchitectureGraphProps {
  activeStepId?: string | null;
}

export default function ArchitectureGraph({ activeStepId = null }: ArchitectureGraphProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(
    new Set(['layer-0', 'layer-a'])
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derive nodes & edges from state — this is the source of truth
  const { nodes: builtNodes, edges: builtEdges } = useMemo(
    () => buildGraphData(expandedLayers, selectedId, activeStepId),
    [expandedLayers, selectedId, activeStepId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  // Sync React Flow internal state whenever derived nodes/edges change
  useEffect(() => {
    setNodes(builtNodes);
  }, [builtNodes, setNodes]);

  useEffect(() => {
    setEdges(builtEdges);
  }, [builtEdges, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    // Toggle expand on layer nodes
    if (node.type === 'layerNode') {
      setExpandedLayers(prev => {
        const next = new Set(prev);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      });
    }
    // Toggle selection
    setSelectedId(prev => (prev === node.id ? null : node.id));
  }, []);

  const handleNavigate = useCallback((id: string) => {
    // Auto-expand the parent layer when jumping to a step
    const parent = ARCHITECTURE_DATA.find(l =>
      l.id === id || l.steps.some(s => s.id === id)
    );
    if (parent) {
      setExpandedLayers(prev => {
        const next = new Set(prev);
        next.add(parent.id);
        return next;
      });
    }
    setSelectedId(id);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setExpandedLayers(new Set(ARCHITECTURE_DATA.map(l => l.id)))}
          style={toolbarBtnStyle}
        >
          ⊞ Expand All
        </button>
        <button
          onClick={() => { setExpandedLayers(new Set()); setSelectedId(null); }}
          style={toolbarBtnStyle}
        >
          ⊟ Collapse All
        </button>
        {selectedId && (
          <button onClick={() => setSelectedId(null)} style={toolbarBtnDangerStyle}>
            ✕ Clear Selection
          </button>
        )}
        {activeStepId && (
          <div style={{
            padding: '6px 14px',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: 8,
            color: '#34d399',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'breathe 1.2s ease-in-out infinite alternate' }} />
            Live Execution
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.06}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#080d16' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.03)" />
        <Controls
          style={{
            background: 'rgba(20,28,45,0.92)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
          }}
        />
        <MiniMap
          nodeColor={(n: any) =>
            n.type === 'layerNode' ? (n.data?.color || '#3b82f6') : (n.data?.layerColor || '#64748b')
          }
          style={{
            background: 'rgba(10,15,26,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
          }}
          maskColor="rgba(0,0,0,0.75)"
        />
      </ReactFlow>

      <DetailPanel
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(20,28,45,0.92)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const toolbarBtnDangerStyle: React.CSSProperties = {
  ...toolbarBtnStyle,
  background: 'rgba(239,68,68,0.12)',
  border: '1px solid rgba(239,68,68,0.3)',
  color: '#f87171',
};
