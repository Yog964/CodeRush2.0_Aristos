import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Passed', value: 203, color: '#10b981' },
  { name: 'Failed', value: 0, color: '#ef4444' },
  { name: 'Skipped', value: 0, color: '#f59e0b' },
  { name: 'XFailed', value: 0, color: '#3b82f6' },
];

export function TestDonutChart() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '140px' }}>
      <div style={{ width: '120px', height: '120px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>203</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Total Tests</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
              <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
            </div>
            <div style={{ color: 'var(--text-tertiary)' }}>
              {d.value} ({d.value === 203 ? '100%' : '0%'})
            </div>
          </div>
        ))}
        <button className="btn-outline" style={{ marginTop: '8px', fontSize: '0.75rem', padding: '4px 8px' }}>View All Tests →</button>
      </div>
    </div>
  );
}
