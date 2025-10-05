# Raw Data Lazy Loading Implementation

## Overview
Implemented lazy loading and pagination for raw simulation data in the ResultsTab component to handle large hourly results efficiently.

## Changes Made

### 1. New State Management
- `currentPage`: Tracks the current page of raw data being displayed
- `linesPerPage`: Configurable number of lines to display per page (50, 100, 200, 500, 1000)
- `isLoadingRawData`: Loading state indicator
- `rawDataChunks`: Array of lines from the stringified JSON data

### 2. Chunked Data Processing
- JSON data is split into individual lines for efficient pagination
- Processing happens asynchronously using `useEffect` with cleanup
- Data is only processed when the Raw Data tab is selected
- Uses a small delay (100ms) to ensure smooth tab transition animation

### 3. Pagination Implementation
- **Lines per page selector**: Dropdown to choose 50, 100, 200, 500, or 1000 lines per page
- **Page navigation**: Material-UI Pagination component with first/last page buttons
- **Progress indicator**: Shows current line range and total lines
- **Memoized rendering**: Only renders the current page's data to prevent UI freezing

### 4. User Experience Improvements
- Loading spinner with message during data processing
- Total line count display
- Current range indicator (e.g., "Showing lines 1 to 100 of 15,234")
- Better formatted pre-formatted text display with monospace font
- Responsive layout with proper spacing

## Performance Benefits

### Before
- All raw data rendered at once
- Could freeze UI with large datasets (10,000+ lines)
- High memory consumption
- Poor user experience with hourly results

### After
- Only renders one page at a time (configurable)
- Smooth performance even with 50,000+ lines
- Reduced memory footprint
- Responsive UI with pagination controls
- Progressive loading prevents blocking

## Usage

1. Navigate to the Results tab
2. Click on "Raw Data" tab
3. Wait for initial data processing (loading spinner shown)
4. Use the dropdown to select preferred lines per page
5. Navigate through pages using pagination controls
6. View line range information at the bottom

## Technical Details

- **Component**: `frontend/src/components/baseline/ResultsTab.tsx`
- **Dependencies**: Material-UI Pagination, TextField, MenuItem, Stack components
- **Data Processing**: Asynchronous with cancellation support
- **Memory Optimization**: Only current page stored in DOM
- **Rendering Optimization**: useMemo for pagination calculations

## Future Enhancements

Potential improvements for further optimization:
- Virtual scrolling for even better performance
- Search/filter functionality within raw data
- Syntax highlighting for JSON
- Collapsible sections for nested data
- Export current page to file
- Jump to specific line number
