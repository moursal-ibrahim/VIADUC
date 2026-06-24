import { ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function ChartContainer({ children, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
}

export const chartColors = ['#E07B39', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export const ChartLegend = Legend;

const tooltipBox = {
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '8px 12px',
  boxShadow: 'none',
};

/** Tooltip for grouped bars — one warehouse at a time, no hover cursor band. */
export function SingleBarTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const formatted = valueFormatter ? valueFormatter(entry.value) : entry.value;

  return (
    <div style={tooltipBox}>
      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: entry.color }}>
        {entry.name}: {formatted}
      </p>
    </div>
  );
}

/** Tooltip for pie/donut — single material slice only. */
export function SinglePieTooltip({ active, payload, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const formatted = valueFormatter ? valueFormatter(entry.value) : entry.value;

  return (
    <div style={tooltipBox}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: entry.payload?.color || entry.color }}>
        {entry.name}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ccc' }}>{formatted}</p>
    </div>
  );
}

export const barTooltipProps = {
  shared: false,
  cursor: false,
  wrapperStyle: { outline: 'none', zIndex: 10 },
};

export const ChartTooltip = Tooltip;
