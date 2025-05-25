import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Tooltip,
  Alert
} from '@mui/material';
import { ChevronDown, AlertCircle, Database, Check } from 'lucide-react';
import { mockExtractedComponents } from '../../data/mockData';

interface ComponentItem {
  id: string;
  name: string;
  type: string;
  properties: { [key: string]: any };
  existsInDatabase: boolean;
}

interface ExtractedComponents {
  fileName: string;
  materials: ComponentItem[];
  constructions: ComponentItem[];
  zones: ComponentItem[];
}

interface AssignmentsTabProps {
  uploadedFiles: File[];
  simulationComplete: boolean;
}

const AssignmentsTab = ({ uploadedFiles, simulationComplete }: AssignmentsTabProps) => {
  const [extractedComponents] = useState<ExtractedComponents[]>(mockExtractedComponents);
  const [expanded, setExpanded] = useState<string | false>('panel0');

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (uploadedFiles.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Please upload IDF files to view component assignments.
      </Alert>
    );
  }

  if (!simulationComplete) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Run the baseline simulation to extract components.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Extracted Building Components
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Components extracted from your IDF files are listed below. Add unique components to the database.
      </Typography>

      {extractedComponents.map((fileComponents, fileIndex) => (
        <Accordion
          key={fileIndex}
          expanded={expanded === `panel${fileIndex}`}
          onChange={handleChange(`panel${fileIndex}`)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ChevronDown />}
            aria-controls={`panel${fileIndex}bh-content`}
            id={`panel${fileIndex}bh-header`}
          >
            <Typography sx={{ width: '33%', flexShrink: 0 }}>
              {fileComponents.fileName}
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
              {fileComponents.materials.length} materials, {fileComponents.constructions.length} constructions, {fileComponents.zones.length} zones
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle1" gutterBottom>
              Materials
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Thickness</TableCell>
                    <TableCell>Conductivity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fileComponents.materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>{material.name}</TableCell>
                      <TableCell>{material.type}</TableCell>
                      <TableCell>{material.properties.thickness} m</TableCell>
                      <TableCell>{material.properties.conductivity} W/m·K</TableCell>
                      <TableCell>
                        {material.existsInDatabase ? (
                          <Chip 
                            icon={<Check size={16} />} 
                            label="In Database" 
                            size="small" 
                            color="success" 
                            variant="outlined" 
                          />
                        ) : (
                          <Chip 
                            icon={<AlertCircle size={16} />} 
                            label="New" 
                            size="small" 
                            color="warning" 
                            variant="outlined" 
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          variant="outlined" 
                          startIcon={<Database size={16} />}
                          color={material.existsInDatabase ? "secondary" : "primary"}
                          disabled={material.existsInDatabase}
                        >
                          {material.existsInDatabase ? 'Already in DB' : 'Add to DB'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle1" gutterBottom>
              Constructions
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Layers</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fileComponents.constructions.map((construction) => (
                    <TableRow key={construction.id}>
                      <TableCell>{construction.name}</TableCell>
                      <TableCell>{construction.type}</TableCell>
                      <TableCell>{construction.properties.layers.join(', ')}</TableCell>
                      <TableCell>
                        {construction.existsInDatabase ? (
                          <Chip 
                            icon={<Check size={16} />} 
                            label="In Database" 
                            size="small" 
                            color="success" 
                            variant="outlined" 
                          />
                        ) : (
                          <Chip 
                            icon={<AlertCircle size={16} />} 
                            label="New" 
                            size="small" 
                            color="warning" 
                            variant="outlined" 
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          variant="outlined" 
                          startIcon={<Database size={16} />}
                          color={construction.existsInDatabase ? "secondary" : "primary"}
                          disabled={construction.existsInDatabase}
                        >
                          {construction.existsInDatabase ? 'Already in DB' : 'Add to DB'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined">Add All New Components</Button>
              <Tooltip title="Only components that don't already exist in the database will be added">
                <span>
                  <Button variant="contained" color="primary">
                    Add Materials & Constructions
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default AssignmentsTab;