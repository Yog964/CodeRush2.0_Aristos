import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const data = [
  { subject: 'Health Score', A: 82, fullMark: 100 },
  { subject: 'Test Quality', A: 72, fullMark: 100 },
  { subject: 'Documentation', A: 65, fullMark: 100 },
  { subject: 'Complexity', A: 58, fullMark: 100 },
  { subject: 'Code Coverage', A: 78, fullMark: 100 },
];

export function RepoRadarChart() {
  return (
    <div style={{ width: '100%', height: '220px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Repository" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
