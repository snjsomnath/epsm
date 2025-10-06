import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

type CoreLaneProps = {
  totalSimulations?: number;
  cpuCores?: number;
  completedSimulations?: number;
  // overall percent progress (0-100). When provided, allows partial-fill within a segment
  progress?: number;
  maxSegments?: number;
  width?: number;
  height?: number;
};

const CoreLaneView: React.FC<CoreLaneProps> = ({
  totalSimulations = 0,
  cpuCores = 1,
  completedSimulations = 0,
  // overall percent progress (0-100). When provided, allows partial-fill within a segment
  progress,
  maxSegments = 150,
  width = 900,
  height = 320,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const textColor = theme.palette.text.primary ?? (isDark ? '#fff' : '#111');
  const completedFill = isDark ? '#66bb6a' : '#4caf50';
  const partialFill = isDark ? '#ffb74d' : '#ffb300';
  const pendingFill = isDark ? '#6b6b6b' : '#cfcfcf';
  const divider = theme.palette.divider ?? (isDark ? '#444' : '#ddd');

  const cores = Math.max(1, Math.floor(cpuCores) || 1);
  const perCoreBase = Math.floor(totalSimulations / cores);
  const remainder = totalSimulations % cores;
  const coreCounts = Array.from({ length: cores }).map((_, i) => perCoreBase + (i < remainder ? 1 : 0));

  // Distribute completed simulations proportionally across cores so progress appears concurrent.
  // If `progress` is provided (fractional 0-100), use it so we can display partial fills within a segment.
  const fractionalTotalCompleted = (() => {
    // prefer fractional progress if provided
    if (typeof progress !== 'undefined' && Number.isFinite(progress as any)) {
      return Math.max(0, (progress as any / 100) * totalSimulations);
    }
    return Math.max(0, Number.isFinite(completedSimulations as any) ? (completedSimulations as any) : 0);
  })();

  // raw (possibly fractional) allocation per core
  const completedDistribution = (() => {
    const total = Math.max(0, fractionalTotalCompleted || 0);
    const totalSlots = coreCounts.reduce((s, c) => s + c, 0) || 1;
    if (total <= 0) return coreCounts.map(() => 0);
    return coreCounts.map((c) => (c / totalSlots) * total);
  })();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setMeasuredWidth(Math.max(0, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const viewWidth = Math.max(480, measuredWidth ?? width);
  const leftLabelWidth = 84;
  const rightPadding = 12;
  const contentWidth = Math.max(120, viewWidth - leftLabelWidth - rightPadding);

  const titleHeight = 28;
  const legendHeight = 24;
  const bottomPadding = 8;
  const laneGap = 8;

  const availableForLanes = Math.max(32, height - titleHeight - legendHeight - bottomPadding);
  const laneHeight = Math.max(10, Math.floor((availableForLanes - (cores - 1) * laneGap) / cores));
  const lanesStartY = titleHeight;
  const lanesTotalHeight = cores * (laneHeight + laneGap) - laneGap;
  let legendTop = lanesStartY + lanesTotalHeight + 8;
  if (legendTop + legendHeight + 8 > height) {
    legendTop = Math.max(lanesStartY + lanesTotalHeight + 4, height - legendHeight - 8);
  }

  const svgHeight = height;

  const coreSegments = useMemo(() => {
    return coreCounts.map((count, idx) => {
      const completed = completedDistribution[idx] || 0;
      if (count <= maxSegments) {
        // allow fractional completed for a single segment (partial progress)
        const full = Math.floor(completed);
        const partial = Math.max(0, completed - full);
        return Array.from({ length: count }).map((_, i) => {
          if (i < full) return { size: 1, completed: 1 };
          if (i === full && partial > 0) return { size: 1, completed: partial };
          return { size: 1, completed: 0 };
        });
      }
      const groups = Math.ceil(count / maxSegments);
      const base = Math.floor(count / groups);
      const rem = count % groups;
      let remainingCompleted = completed;
      const out: Array<{ size: number; completed: number }> = [];
      for (let g = 0; g < groups; g++) {
        const size = base + (g < rem ? 1 : 0);
        const take = Math.min(size, remainingCompleted);
        remainingCompleted -= take;
        out.push({ size, completed: take });
      }
      return out;
    });
  }, [coreCounts, completedDistribution, maxSegments]);

  const [hover, setHover] = useState<{ visible: boolean; x: number; y: number; text: string }>({ visible: false, x: 0, y: 0, text: '' });

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', height: `${height}px`, overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${viewWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Simulations per core lanes">
        <text x={12} y={18} style={{ fontSize: 13, fill: textColor, fontWeight: 600 }}>Simulations per Core</text>

        {coreSegments.map((segments, ci) => {
          const y = lanesStartY + ci * (laneHeight + laneGap);
          const totalUnits = segments.reduce((s, seg) => s + seg.size, 0) || 1;
          let x = leftLabelWidth;
          return (
            <g key={`lane-${ci}`}>
              <rect x={leftLabelWidth} y={y} width={contentWidth} height={laneHeight} rx={6} fill={isDark ? '#111' : '#f7f7f7'} stroke={divider} />
              <text x={12} y={y + laneHeight / 2 + 4} style={{ fontSize: 11, fill: textColor }}>{`Core ${ci + 1}`}</text>

              {segments.map((seg, si) => {
                const segWidth = Math.max(2, (seg.size / totalUnits) * contentWidth);
                const isAggregated = seg.size > 1;
                const completedRatio = seg.size > 0 ? seg.completed / seg.size : 0;
                const isFullyCompleted = seg.completed >= seg.size && seg.size > 0;
                const segText = `Core ${ci + 1}: ${seg.size} sims — ${seg.completed} completed`;

                const onMove = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHover({ visible: true, x: e.clientX - rect.left + 8, y: e.clientY - rect.top + 8, text: segText });
                };
                const onLeave = () => setHover({ visible: false, x: 0, y: 0, text: '' });

                const elem = (
                  <g
                    key={`s-${ci}-${si}`}
                    tabIndex={0}
                    aria-label={`Core ${ci + 1} segment ${si + 1}`}
                    onMouseEnter={onMove}
                    onMouseMove={onMove}
                    onMouseLeave={onLeave}
                    onFocus={(e: React.FocusEvent<SVGElement>) => onMove(e as any)}
                    onBlur={onLeave}
                    style={{ cursor: 'default' }}
                  >
                    <rect x={x} y={y} width={segWidth} height={laneHeight} rx={4} fill={pendingFill} stroke={isDark ? '#222' : '#999'} />
                    {isFullyCompleted && <rect x={x} y={y} width={segWidth} height={laneHeight} rx={4} fill={completedFill} />}
                    {!isFullyCompleted && seg.completed > 0 && seg.size > 0 && (
                      <g>
                        <rect x={x} y={y} width={Math.max(1, segWidth * completedRatio)} height={laneHeight} rx={4} fill={completedFill} />
                        <rect x={x + Math.max(1, segWidth * completedRatio)} y={y} width={Math.max(1, segWidth * (1 - completedRatio))} height={laneHeight} rx={0} fill={partialFill} />
                      </g>
                    )}
                    {isAggregated && segWidth > 20 && (
                      <text x={x + segWidth / 2} y={y + laneHeight / 2 + 4} textAnchor="middle" style={{ fontSize: 10, fill: '#fff' }}>{String(seg.size)}</text>
                    )}
                  </g>
                );
                x += segWidth;
                return elem;
              })}
            </g>
          );
        })}

        <g transform={`translate(${leftLabelWidth}, ${legendTop})`}>
          <rect x={0} y={0} width={12} height={12} fill={completedFill} />
          <text x={18} y={10} style={{ fontSize: 11, fill: textColor }}>Completed</text>
          <rect x={120} y={0} width={12} height={12} fill={partialFill} />
          <text x={138} y={10} style={{ fontSize: 11, fill: textColor }}>Partial</text>
          <rect x={240} y={0} width={12} height={12} fill={pendingFill} />
          <text x={258} y={10} style={{ fontSize: 11, fill: textColor }}>Pending</text>
        </g>
      </svg>

      {hover.visible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            left: hover.x,
            top: hover.y,
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            padding: '6px 8px',
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap'
          }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
};

export default CoreLaneView;
