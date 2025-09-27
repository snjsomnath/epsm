import React from 'react';
import { Box } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Props { hourly?: number[] }

const HourlyTimeseries: React.FC<Props> = ({ hourly = [] }) => {
  const data = (Array.isArray(hourly) ? hourly : []).map((v: any, i: number) => ({ x: i, y: Number(v) }));

  if (!data.length) return <Box sx={{ color: 'text.secondary' }}>No hourly data</Box>;

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" hide />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="y" stroke="#1976d2" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default HourlyTimeseries;
