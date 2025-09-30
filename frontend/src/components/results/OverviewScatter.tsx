import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { ResponsiveContainer, ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, Scatter, Cell } from 'recharts';

interface Props {
  data: any[];
  xKey?: string;
  yKey?: string;
  colorKey?: string; // metric used to color points (low->green, high->red)
  colorLabel?: string;
  onPointClick?: (d: any) => void;
}

const OverviewScatter: React.FC<Props> = ({ data = [], xKey = 'eui_total', yKey = 'eui_heating', colorKey = 'eui_total', colorLabel = 'Metric', onPointClick }) => {
  // Lightweight sampling if very large
  const sample = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const max = 2000;
    if (data.length <= max) return data;
    const step = Math.ceil(data.length / max);
    return data.filter((_: any, i: number) => i % step === 0).slice(0, max);
  }, [data]);

  // compute color scale based on colorKey across the sample
  const colors = useMemo(() => {
    if (!Array.isArray(sample) || sample.length === 0) return [];
    const vals = sample.map((d: any) => Number(d[colorKey] ?? 0));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
    const clamp = (v: number) => Math.max(min, Math.min(max, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    // color from green (#4caf50) to red (#f44336)
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    };
    const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
    const gRgb = hexToRgb('#4caf50');
    const rRgb = hexToRgb('#f44336');
    return vals.map((v: number) => {
      const t = (max === min) ? 0.5 : ((clamp(v) - min) / (max - min));
      const rr = lerp(gRgb[0], rRgb[0], t);
      const rg = lerp(gRgb[1], rRgb[1], t);
      const rb = lerp(gRgb[2], rRgb[2], t);
      return rgbToHex(rr, rg, rb);
    });
  }, [sample, colorKey]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis dataKey={xKey} name="EUI" label={{ value: xKey, position: 'insideBottom', offset: -10 }} />
          <YAxis dataKey={yKey} name="Heating EUI" label={{ value: yKey, angle: -90, position: 'insideLeft' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="runs" data={sample} onClick={(d: any) => onPointClick && onPointClick(d)}>
            {sample.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index] || '#1976d2'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {/* Legend: gradient bar with min/max */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="caption" color="text.secondary">{colorLabel}</Typography>
        <Box sx={{ height: 10, flex: 1, borderRadius: 1, background: `linear-gradient(90deg, #4caf50 0%, #f44336 100%)` }} />
        <Typography variant="caption" color="text.secondary">{sample.length ? Number(sample.map((d: any) => Number(d[colorKey] ?? 0)).reduce((a: number, b: number) => Math.min(a, b), Infinity)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{sample.length ? Number(sample.map((d: any) => Number(d[colorKey] ?? 0)).reduce((a: number, b: number) => Math.max(a, b), -Infinity)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</Typography>
      </Box>
    </Box>
  );
};

export default OverviewScatter;
