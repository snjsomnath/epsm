import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  TextField,
  Stack,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  FileType2, 
  FileText,
  Check
} from 'lucide-react';

const ExportPage = () => {
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [selectedData, setSelectedData] = useState<string[]>([]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [customFileName, setCustomFileName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setExportComplete(true);
      // Reset after 3 seconds
      setTimeout(() => setExportComplete(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportFormats = [
    { value: 'json', label: 'JSON', icon: <FileJson size={24} /> },
    { value: 'csv', label: 'CSV', icon: <FileSpreadsheet size={24} /> },
    { value: 'pdf', label: 'PDF Report', icon: <FileType2 size={24} /> },
    { value: 'txt', label: 'Plain Text', icon: <FileText size={24} /> }
  ];

  const dataOptions = [
    { value: 'energy', label: 'Energy Use Data' },
    { value: 'cost', label: 'Cost Analysis' },
    { value: 'environmental', label: 'Environmental Impact' },
    { value: 'thermal', label: 'Thermal Performance' },
    { value: 'comfort', label: 'Comfort Metrics' }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Export Results
      </Typography>
      <Typography variant="body1" paragraph>
        Export simulation results and analysis in various formats.
      </Typography>

      <Grid container spacing={3}>
        {/* Export Format Selection */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Export Format
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <Stack spacing={2}>
                  {exportFormats.map((format) => (
                    <Card 
                      key={format.value}
                      variant="outlined"
                      sx={{
                        borderColor: selectedFormat === format.value ? 'primary.main' : 'divider',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedFormat(format.value)}
                    >
                      <CardContent sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        py: 1,
                        '&:last-child': { pb: 1 }
                      }}>
                        <Radio 
                          checked={selectedFormat === format.value}
                          value={format.value}
                        />
                        {format.icon}
                        <Box>
                          <Typography variant="subtitle1">
                            {format.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Export as {format.value.toUpperCase()} format
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </RadioGroup>
            </FormControl>
          </Paper>
        </Grid>

        {/* Data Selection */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Data Selection
            </Typography>
            <Stack spacing={2}>
              {dataOptions.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={selectedData.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedData([...selectedData, option.value]);
                        } else {
                          setSelectedData(selectedData.filter(d => d !== option.value));
                        }
                      }}
                    />
                  }
                  label={option.label}
                />
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                  />
                }
                label="Include Charts and Visualizations"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                  />
                }
                label="Include Metadata"
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Export Options */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Export Options
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Custom Filename"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="Enter custom filename (optional)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="contained"
                  startIcon={exportComplete ? <Check /> : <Download />}
                  onClick={handleExport}
                  disabled={exporting || selectedData.length === 0}
                  fullWidth
                >
                  {exporting ? 'Exporting...' : exportComplete ? 'Export Complete!' : 'Export Results'}
                </Button>
              </Grid>
            </Grid>

            {selectedData.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please select at least one data type to export
              </Alert>
            )}

            {selectedData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Data:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedData.map((data) => (
                    <Chip
                      key={data}
                      label={dataOptions.find(opt => opt.value === data)?.label}
                      onDelete={() => setSelectedData(selectedData.filter(d => d !== data))}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExportPage;