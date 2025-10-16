import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentsTab from '../AssignmentsTab';
import fs from 'fs';
import path from 'path';

// Mock contexts and charts similar to the unit test
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../context/DatabaseContext', () => ({ useDatabase: vi.fn() }));
vi.mock('react-chartjs-2', () => ({ Bar: () => <div data-testid="bar-chart-mock" /> }));
vi.mock('chart.js', async () => {
  const actual = await vi.importActual('chart.js');
  return { ...actual, register: () => {} };
});

import { useAuth } from '../../../context/AuthContext';
import { useDatabase } from '../../../context/DatabaseContext';
// Try to load backend-generated fixture if available
let backendParsedFixture: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  backendParsedFixture = require('../../../../test/fixtures/parsed_test_idf.json');
} catch (err) {
  // fixture not present - tests will fallback to in-test parser
  backendParsedFixture = null;
}

// Very small IDF parser that extracts Material, Construction and Zone blocks
function parseIdfContentToParsedData(content: string) {
  const parsed: any = { materials: [], constructions: [], zones: [] };

  // Helper to strip comments and whitespace
  const cleanFields = (block: string) => block
    .split(/\r?\n/)
    .map(l => l.split('!-')[0])
    .join('\n')
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '');

  // Materials
  const matRegex = /Material,([\s\S]*?);/gi;
  let mMatch;
  while ((mMatch = matRegex.exec(content)) !== null) {
    const fields = cleanFields(mMatch[1]);
    if (fields.length >= 6) {
      const name = fields[0];
      const roughness = fields[1];
      const thickness = parseFloat(fields[2]) || 0;
      const conductivity = parseFloat(fields[3]) || 0;
      const density = parseFloat(fields[4]) || 0;
      const specificHeat = parseFloat(fields[5]) || 0;

      parsed.materials.push({
        name,
        properties: {
          thickness,
          conductivity,
          density,
          specificHeat,
          roughness,
        }
      });
    }
  }

  // Constructions
  const conRegex = /Construction,([\s\S]*?);/gi;
  let cMatch;
  while ((cMatch = conRegex.exec(content)) !== null) {
    const fields = cleanFields(cMatch[1]);
    if (fields.length >= 1) {
      const name = fields[0];
      const layers = fields.slice(1).map((f: string) => f.replace(/\n/g, '').trim()).filter((f: string) => f !== '');
      // default totalArea to a positive number so material stock calculations run
      parsed.constructions.push({
        name,
        type: 'wall',
        properties: {
          layers,
          totalArea: Math.max(1, layers.length * 10),
          surfaceCount: 1,
        }
      });
    }
  }

  // Zones (minimal)
  const zoneRegex = /Zone,([\s\S]*?);/gi;
  let zMatch;
  while ((zMatch = zoneRegex.exec(content)) !== null) {
    const fields = cleanFields(zMatch[1]);
    if (fields.length >= 1) {
      const name = fields[0];
      parsed.zones.push({
        name,
        properties: {
          area: 10,
          volume: 30,
          ceilingHeight: 3,
        }
      });
    }
  }

  return parsed;
}

describe('AssignmentsTab with real test.idf', () => {
  beforeEach(() => {
    (useAuth as unknown as any).mockReturnValue({ isAuthenticated: true, user: { id: 'test-user' } });
    (useDatabase as unknown as any).mockReturnValue({ addMaterial: vi.fn(), addConstruction: vi.fn(), materials: [], constructions: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('parses frontend/public/idf/test.idf and renders without N/A or - placeholders', async () => {
    let parsedData: any = null;
    if (backendParsedFixture) {
      parsedData = backendParsedFixture;
    } else {
      const idfPath = path.resolve(__dirname, '../../../../public/idf/test.idf');
      const content = fs.readFileSync(idfPath, 'utf8');
      parsedData = parseIdfContentToParsedData(content);
    }

    // Ensure parsedData has items to test the UI
    expect(parsedData.materials && parsedData.materials.length).toBeGreaterThan(0);
    expect(parsedData.constructions && parsedData.constructions.length).toBeGreaterThan(0);
    expect(parsedData.zones && parsedData.zones.length).toBeGreaterThan(0);

    render(<AssignmentsTab uploadedFiles={[{ name: 'test.idf' } as any]} parsedData={parsedData} />);

    // Check there are no 'N/A' or '-' placeholders in the rendered UI
    expect(screen.queryByText(/N\/A/i)).toBeNull();
    // a standalone '-' cell would be exact '-', so test for any element that exactly equals '-'
    expect(screen.queryByText(/^-$/)).toBeNull();

    // Also ensure Material Stock tab can be opened and shows the bar chart mock
    const stockTab = screen.getByRole('tab', { name: /Material Stock/i });
    await userEvent.click(stockTab);
    expect(screen.getByTestId('bar-chart-mock')).toBeTruthy();
  });
});

export {};
