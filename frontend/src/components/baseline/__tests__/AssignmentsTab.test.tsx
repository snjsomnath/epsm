import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AssignmentsTab from '../AssignmentsTab';

// Mock the context providers
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../context/DatabaseContext', () => ({
  useDatabase: vi.fn(),
}));

// Mock the react-chartjs-2 Bar to avoid chart rendering complexities
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart-mock" />,
}));

// Provide a simple mock for Chart.js registration used in the component
vi.mock('chart.js', async () => {
  const actual = await vi.importActual('chart.js');
  return {
    ...actual,
    register: () => {},
  };
});

import { useAuth } from '../../../context/AuthContext';
import { useDatabase } from '../../../context/DatabaseContext';

// Representative mock parsed data (matches expectations in AssignmentsTab)
const mockParsedData = {
  materials: [
    {
      name: 'Wood_Stud_Test',
      type: 'Material',
      properties: {
        thickness: 0.038,
        conductivity: 0.12,
        density: 512,
        specificHeat: 1380,
        roughness: 'MediumRough',
      },
      existsInDatabase: false,
      uniqueKey: 'm1',
    },
    {
      name: 'Gyp_Wallboard_Test',
      type: 'Material',
      properties: {
        thickness: 0.0127,
        conductivity: 0.16,
        density: 800,
        specificHeat: 1090,
        roughness: 'MediumSmooth',
      },
      existsInDatabase: false,
      uniqueKey: 'm2',
    },
  ],
  constructions: [
    {
      name: 'Interior_Wall_Test',
      type: 'Wall',
      properties: {
        layers: ['Gyp_Wallboard_Test', 'Wood_Stud_Test', 'Gyp_Wallboard_Test'],
        totalArea: 50.5,
        surfaceCount: 2,
      },
      existsInDatabase: false,
      uniqueKey: 'c1',
    },
  ],
  zones: [
    {
      name: 'Zone_1',
      type: 'Zone',
      properties: {
        area: 25.2,
        volume: 63.0,
        ceilingHeight: 2.5,
      },
      uniqueKey: 'z1',
    },
  ],
};

const mockUploadedFiles = [{ name: 'test.idf' } as any];

describe('AssignmentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as unknown as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'test-user-id' },
    });

    (useDatabase as unknown as any).mockReturnValue({
      addMaterial: vi.fn(),
      addConstruction: vi.fn(),
      materials: [],
      constructions: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows info alert when no parsedData or uploaded files', () => {
    render(<AssignmentsTab uploadedFiles={[]} parsedData={null} />);
    expect(screen.getByText(/Please upload and analyze IDF files/i)).toBeInTheDocument();
  });

  it('renders materials table with numeric values (no N/A or -)', async () => {
    render(<AssignmentsTab parsedData={mockParsedData as any} uploadedFiles={mockUploadedFiles as any} />);

    // Materials tab is default. Find material rows
    const woodRow = screen.getByText('Wood_Stud_Test').closest('tr')!;
    expect(woodRow).toBeTruthy();

    // Assert numeric cells are rendered and do not show 'N/A' or '-'
    expect(within(woodRow).queryByText(/N\/A|-/i)).toBeNull();

    // Check formatted numeric strings
    expect(within(woodRow).getByText('0.0380')).toBeInTheDocument(); // thickness 4 decimals
    expect(within(woodRow).getByText('0.120')).toBeInTheDocument(); // conductivity 3 decimals
    expect(within(woodRow).getByText('512.0')).toBeInTheDocument(); // density 1 decimal
  });

  it('renders constructions table with numeric values (no N/A or -)', async () => {
    render(<AssignmentsTab parsedData={mockParsedData as any} uploadedFiles={mockUploadedFiles as any} />);

    // Switch to constructions tab
    const constructionsTab = screen.getByRole('tab', { name: /Constructions/i });
    await userEvent.click(constructionsTab);

    const constructionRow = screen.getByText('Interior_Wall_Test').closest('tr')!;
    expect(constructionRow).toBeTruthy();

    // Ensure no placeholder values are present
    expect(within(constructionRow).queryByText(/N\/A|-/i)).toBeNull();

    // Check total area and surfaceCount displayed
    expect(within(constructionRow).getByText('2')).toBeInTheDocument();
    expect(within(constructionRow).getByText('50.50')).toBeInTheDocument();
  });

  it('calculates material stock totals correctly and displays them', async () => {
    render(<AssignmentsTab parsedData={mockParsedData as any} uploadedFiles={mockUploadedFiles as any} />);

    // Switch to Material Stock tab
    const stockTab = screen.getByRole('tab', { name: /Material Stock/i });
    await userEvent.click(stockTab);

    // Compute expected values
    const area = mockParsedData.constructions[0].properties.totalArea;
    const woodVolume = area * mockParsedData.materials[0].properties.thickness;
    const gypVolume = area * mockParsedData.materials[1].properties.thickness * 2; // appears twice
    const totalVolume = woodVolume + gypVolume;

    const woodMass = woodVolume * mockParsedData.materials[0].properties.density;
    const gypMass = gypVolume * mockParsedData.materials[1].properties.density;
    const totalMass = woodMass + gypMass;

    // Summary cards
    expect(screen.getByText(totalVolume.toFixed(2) + ' m³')).toBeInTheDocument();
    expect(screen.getByText((totalMass / 1000).toFixed(2) + ' tonnes')).toBeInTheDocument();

    // Detailed table rows
    const table = screen.getByRole('table');
    const woodRow = within(table).getByText('Wood_Stud_Test').closest('tr')!;
    const gypRow = within(table).getByText('Gyp_Wallboard_Test').closest('tr')!;

    expect(within(woodRow).getByText(woodVolume.toFixed(3))).toBeInTheDocument();
    expect(within(gypRow).getByText(gypVolume.toFixed(3))).toBeInTheDocument();

    expect(within(woodRow).getByText((woodMass / 1000).toFixed(3))).toBeInTheDocument();
    expect(within(gypRow).getByText((gypMass / 1000).toFixed(3))).toBeInTheDocument();
  });
});

export {};
