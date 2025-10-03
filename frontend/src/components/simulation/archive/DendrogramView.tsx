import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

type DendrogramProps = {
  totalSimulations: number;
  cpuCores: number;
  completedSimulations: number;
  // Maximum leaf nodes to render individually before aggregating
  maxLeaves?: number;
  width?: number;
  height?: number;
};

// Small helper to clamp values
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * DendrogramView
 * - Draws a compact dendrogram where each top-level branch represents a CPU core.
 * - Leaves are simulation tasks assigned to that core.
 * - If too many leaves, they are aggregated into group nodes showing a count.
 * - Nodes are colored green when all child sims in that node are complete.
 */
const DendrogramView: React.FC<DendrogramProps> = ({
  totalSimulations,
  cpuCores,
  completedSimulations,
  maxLeaves = 80,
  width = 700,
  height = 220,
}) => {
  // Determine distribution of simulations across cores (simple round-robin or even split)
  const cores = Math.max(1, Math.floor(cpuCores) || 1);
  const perCoreBase = Math.floor(totalSimulations / cores);
  const remainder = totalSimulations % cores;

  const coreBuckets = Array.from({ length: cores }).map((_, i) => perCoreBase + (i < remainder ? 1 : 0));

  // Compute completed distribution: assume completions fill cores left-to-right
  const completedLeft = clamp(Math.floor(completedSimulations), 0, totalSimulations);
  // completedPerCore is computed below as a running distribution

  // We actually need a running allocation for completed sims across cores
  const completedDistribution = (() => {
    let remaining = completedLeft;
    return coreBuckets.map((count) => {
      const take = Math.min(count, remaining);
      remaining -= take;
      return take;
    });
  })();

  // Radial layout parameters
  const cx = width / 2;
  const cy = height / 2 + 6; // nudge center slightly down to leave title space
  const radius = Math.min(width, height) / 2 - 24;
  const innerRadius = 36; // where core trunks start

  // For each core, compute leaf groups (aggregate if more than maxLeaves per core)
  const coreGroups = useMemo(() => {
    return coreBuckets.map((count, coreIdx) => {
      if (count <= 0) return [] as Array<{ label: string; size: number; completed: number }>;

      // If count is small, show each leaf
      if (count <= maxLeaves) {
        const completed = completedDistribution[coreIdx] || 0;
        return Array.from({ length: count }).map((_, li) => ({
          label: `${li + 1}`,
          size: 1,
          completed: li < completed ? 1 : 0,
        }));
      }

      // Aggregate into N groups so that groups ~ maxLeaves
      const groups = Math.ceil(count / maxLeaves);
      const base = Math.floor(count / groups);
      const rem = count % groups;
      let remainingCompleted = completedDistribution[coreIdx] || 0;
      const out: Array<{ label: string; size: number; completed: number }> = [];
      for (let g = 0; g < groups; g++) {
        const size = base + (g < rem ? 1 : 0);
        const take = Math.min(size, remainingCompleted);
        remainingCompleted -= take;
        out.push({ label: `${size}`, size, completed: take });
      }
      return out;
    });
  }, [coreBuckets, completedDistribution, maxLeaves]);

  // Use MUI theme to pick colors that contrast in dark mode
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const textColor = theme.palette.text.primary || (isDark ? '#fff' : '#111');
  const dividerColor = theme.palette.divider || (isDark ? '#4b5563' : '#ddd');
  const completedFill = isDark ? '#66bb6a' : '#4caf50';
  const partialFill = isDark ? '#ffca28' : '#ffb300';
  const pendingFill = isDark ? '#bdbdbd' : '#9e9e9e';

  // Helper to determine node fill color: fully completed -> green, partially -> yellow, none -> gray
  const nodeColor = (completed: number, size: number) => {
    if (size <= 0) return isDark ? '#2b2b2b' : '#f0f0f0';
    if (completed >= size) return completedFill; // green
    if (completed === 0) return pendingFill; // gray
    return partialFill; // amber for partial
  };

  // helper: convert polar to cartesian
  const polarToCartesian = (angleDeg: number, r: number) => {
    const a = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  // angle per core
  const totalAngle = 360;
  const anglePerCore = totalAngle / cores;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={Math.max(width, 280)} height={height} viewBox={`0 0 ${Math.max(width, 280)} ${height}`}>
        <text x={12} y={16} style={{ fontSize: 12, fill: textColor, fontWeight: 600 }}>Simulation Assignment</text>

        {/* draw sectors for each core */}
        {coreGroups.map((groups, coreIdx) => {
          const startAngle = coreIdx * anglePerCore;
          const endAngle = startAngle + anglePerCore;
          const midAngle = (startAngle + endAngle) / 2;

          // trunk from innerRadius to innerRadius+8
          const trunkStart = polarToCartesian(midAngle, innerRadius);
          const trunkEnd = polarToCartesian(midAngle, innerRadius + 8);

          // distribute groups radially between innerRadius+18 and radius
          const groupCount = Math.max(1, groups.length);
          const radialStep = (radius - (innerRadius + 18)) / Math.max(1, groupCount - 1 || 1);

          return (
            <g key={`core-${coreIdx}`}>
              {/* core label */}
              <text x={polarToCartesian(midAngle, innerRadius - 8).x} y={polarToCartesian(midAngle, innerRadius - 8).y} textAnchor="middle" style={{ fontSize: 11, fill: textColor }}>{`Core ${coreIdx + 1}`}</text>

              {/* trunk */}
              <line x1={trunkStart.x} y1={trunkStart.y} x2={trunkEnd.x} y2={trunkEnd.y} stroke={dividerColor} strokeWidth={2} />

              {/* groups along radial arc */}
              {groups.map((g, gi) => {
                const r = innerRadius + 18 + gi * radialStep;
                // angle jitter inside sector so multiple groups don't overlap lines exactly
                const angleOffset = (groupCount > 1) ? ((gi - (groupCount - 1) / 2) * (anglePerCore / Math.max(4, groupCount))) : 0;
                const ang = midAngle + angleOffset;
                const p = polarToCartesian(ang, r);
                const fill = nodeColor(g.completed, g.size);
                const isAggregated = g.size > 1;

                // connector line from trunk end to node
                return (
                  <g key={`core-${coreIdx}-g-${gi}`}>
                    <line x1={trunkEnd.x} y1={trunkEnd.y} x2={p.x} y2={p.y} stroke={dividerColor} strokeWidth={1} />
                    <circle cx={p.x} cy={p.y} r={10} fill={fill} stroke={isDark ? '#111' : '#666'} strokeWidth={0.6} />
                    {isAggregated ? (
                      <text x={p.x} y={p.y + 4} textAnchor="middle" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }}>{g.size}</text>
                    ) : (
                      <text x={p.x} y={p.y + 4} textAnchor="middle" style={{ fontSize: 10, fill: '#fff' }} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(12, ${height - 34})`}>
          <rect x={0} y={0} width={12} height={12} fill={completedFill} />
          <text x={18} y={10} style={{ fontSize: 11, fill: textColor }}>Completed</text>
          <rect x={120} y={0} width={12} height={12} fill={partialFill} />
          <text x={138} y={10} style={{ fontSize: 11, fill: textColor }}>Partial</text>
          <rect x={220} y={0} width={12} height={12} fill={pendingFill} />
          <text x={238} y={10} style={{ fontSize: 11, fill: textColor }}>Pending</text>
        </g>
      </svg>
    </div>
  );
};

export default DendrogramView;
