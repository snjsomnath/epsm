import React from 'react';
import { Grid, Card, CardContent, Typography, Divider, Box, Chip, Avatar } from '@mui/material';

interface ConstructionLayer { name?: string; layers?: string[] }
interface ConstructionSet {
  roof?: ConstructionLayer;
  floor?: ConstructionLayer;
  window?: ConstructionLayer;
  [key: string]: any;
}

interface SimulationResult {
  id?: string;
  simulation_id?: string | null;
  simulation_name?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  file_name?: string | null;
  building?: string | null;
  total_energy_use?: number | null;
  heating_demand?: number | null;
  cooling_demand?: number | null;
  run_time?: number | null;
  total_area?: number | null;
  status?: string | null;
  variant_idx?: number | null;
  idf_idx?: number | null;
  construction_set?: ConstructionSet | null;
  created_at?: string | null;
  [key: string]: any;
}

interface Props { result?: SimulationResult }

const maybe = (v: any) => (v === null || v === undefined ? '-' : v);
const fmt = (v: any) => (typeof v === 'number' ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : maybe(v));

// RenderConstructionSet removed; construction_set rendering handled inline with safe local variable `cs`.

const MinimalIcon: React.FC<{ emoji: string; bg?: string }> = ({ emoji, bg = 'transparent' }) => (
  <Box sx={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', bgcolor: bg, fontSize: 14 }}>
    {emoji}
  </Box>
);


const KpiTiles: React.FC<Props> = ({ result = {} }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>🆔</Avatar>
              <Box>
                <Typography variant="h6">Simulation Overview</Typography>
                <Typography variant="caption" color="text.secondary">Created: {maybe(result.created_at)}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'grid', gap: 0.5 }}>
              <Typography variant="subtitle2">Identifiers</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{maybe(result.id)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Simulation</Typography>
                <Typography variant="body1">{maybe(result.simulation_name)} <Typography component="span" variant="caption" color="text.secondary">({maybe(result.simulation_id)})</Typography></Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2">User</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>👤</Avatar>
              <Box>
                <Typography variant="body1">{maybe(result.user_email) !== '-' ? result.user_email : 'Anonymous'}</Typography>
                <Typography variant="caption" color="text.secondary">ID: {maybe(result.user_id)}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 24, height: 24 }}>📄</Avatar>
              <Typography variant="body2">{maybe(result.file_name)}</Typography>
              <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'grey.100', width: 24, height: 24 }}>🏢</Avatar>
                <Typography variant="body2">{maybe(result.building)}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Performance</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', width: 28, height: 28 }}>🔥</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total energy (kWh)</Typography>
                  <Typography variant="h6">{fmt(result.total_energy_use)}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>🌡️</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Heating</Typography>
                  <Typography variant="h6">{fmt(result.heating_demand)}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', width: 28, height: 28 }}>❄️</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cooling</Typography>
                  <Typography variant="h6">{fmt(result.cooling_demand)}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'grey.300', width: 28, height: 28 }}>⏱️</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Runtime (s)</Typography>
                  <Typography variant="h6">{fmt(result.run_time)}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'grey.300', width: 28, height: 28 }}>📐</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total area (m²)</Typography>
                  <Typography variant="h6">{fmt(result.total_area)}</Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={String(result.status ?? '-')} color={result.status === 'success' ? 'success' : (result.status === 'failed' ? 'error' : 'default')} />
              <Typography variant="body2">Variant: <strong>{maybe(result.variant_idx)}</strong></Typography>
              <Typography variant="body2">IDF: <strong>{maybe(result.idf_idx)}</strong></Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Construction set</Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(() => {
                const cs = (result.construction_set || {}) as ConstructionSet;
                const keys = Object.keys(cs || {});
                if (keys.length === 0) return <Typography variant="caption" color="text.secondary">-</Typography>;
                return keys.map((k: string) => (
                  <Card key={k} variant="outlined" sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <MinimalIcon emoji={k === 'roof' ? '🔺' : k === 'floor' ? '🟫' : k === 'window' ? '▣' : '▤'} bg="transparent" />
                      <Box>
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>{k}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{maybe(cs[k]?.name)}</Typography>
                        {Array.isArray(cs[k]?.layers) && (
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {cs[k].layers!.map((l: string, i: number) => (
                              <li key={i}><Typography variant="body2">{l}</Typography></li>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Card>
                ));
              })()}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default KpiTiles;
