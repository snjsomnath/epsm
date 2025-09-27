import React, { useMemo } from 'react';
import { Box, Accordion, AccordionSummary, AccordionDetails, Typography, Stack, Chip, List, ListItem, ListItemText } from '@mui/material';
import { ChevronDown, Folder, FolderOpen } from 'lucide-react';

type Result = any;

interface Props {
  results: Result[];
  onSelect: (opts: { userId?: string | number; simulationId?: string; idfIdx?: number | string; result?: Result }) => void;
}

const ResultsExplorer: React.FC<Props> = ({ results, onSelect }) => {
  // Group by user -> simulation -> idf
  const grouped = useMemo(() => {
    const byUser: Record<string, any> = {};
    (results || []).forEach((r: Result) => {
      const email = r.user_email || (r.user && r.user.email) || null;
      const user = String(email || r.user_id ?? r.user ?? 'anonymous');
      const sim = String(r.simulation_id ?? r.id ?? r.run_id ?? 'unspecified');
      const idf = r.idf_idx ?? r.idf ?? r.idfIndex ?? 0;
      byUser[user] = byUser[user] || { user, simulations: {} };
      const u = byUser[user];
      u.simulations[sim] = u.simulations[sim] || { simulationId: sim, idfs: {} };
      const s = u.simulations[sim];
      const idfKey = String(idf);
      s.idfs[idfKey] = s.idfs[idfKey] || { idfIdx: idf, results: [] };
      s.idfs[idfKey].results.push(r);
    });
    return byUser;
  }, [results]);

    return (
    <Box sx={{ width: '100%', maxHeight: 'calc(100vh - 120px)', overflow: 'auto', pr: 1 }}>
      {Object.values(grouped).map((u: any) => (
        <Accordion key={u.user} disableGutters>
          <AccordionSummary expandIcon={<ChevronDown />}> 
            <Stack direction="row" spacing={1} alignItems="center">
              <Folder size={16} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.user}</Typography>
              <Chip size="small" label={`${Object.keys(u.simulations).length} runs`} sx={{ ml: 1 }} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {Object.values(u.simulations).map((s: any) => (
                <Accordion key={s.simulationId} sx={{ boxShadow: 'none' }} disableGutters>
                  <AccordionSummary expandIcon={<ChevronDown />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FolderOpen size={14} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.simulationId}</Typography>
                      <Chip size="small" label={`${Object.keys(s.idfs).length} idfs`} sx={{ ml: 1 }} />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense disablePadding>
                      {Object.values(s.idfs).map((i: any) => (
                        <ListItem key={String(i.idfIdx)} button onClick={() => onSelect({ userId: u.user, simulationId: s.simulationId, idfIdx: i.idfIdx, result: i.results[0] })}>
                          <ListItemText primary={`IDF ${i.idfIdx}`} secondary={`${i.results.length} constructions`} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ResultsExplorer;
