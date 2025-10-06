import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';

export type SectionCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, actions, children, sx }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'visible', ...(sx || {}) }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'visible' }}>
      <Box sx={{ display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'visible' }}>{children}</Box>
    </CardContent>
  </Card>
);

export default SectionCard;
