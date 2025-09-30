import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import KpiTiles from './KpiTiles';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Scatter } from 'recharts';

const ResultsDetailsPanel: React.FC<{ result?: any }> = ({ result }) => {
  if (!result) return (
    <Paper sx={{ p: 2 }}><Typography variant="body2">Select a result to see details.</Typography></Paper>
  );

  // resolve hourly array
  const hourly = result?.hourly_values || result?.hourly_timeseries?.hourly_values || result?.raw_json?.hourly_values || (Array.isArray(result?.hourly_timeseries) && result.hourly_timeseries[0]?.hourly_values) || null;
  // previously computed EUI for scatter; removed scatter so this is no longer needed

  return (
    <Box>
      {/* Detailed simulation overview card */}
      <Box sx={{ mb: 2 }}>
        <KpiTiles result={result} />
      </Box>

      {/* EUI Scatter removed per request */}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Hourly Timeseries</Typography>
        {Array.isArray(hourly) && hourly.length > 0 ? (
          <Box sx={{ width: '100%', height: 300, mt: 1 }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={hourly.map((v: any, i: number) => ({ x: i, y: Number(v) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis />
                <RechartsTooltip />
                <Scatter data={hourly.map((v: any, i: number) => ({ x: i, y: Number(v) }))} fill="#82ca9d" />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>No hourly timeseries available for this result.</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ResultsDetailsPanel;
