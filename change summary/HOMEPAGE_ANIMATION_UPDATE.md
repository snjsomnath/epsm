# Home Page Animation Update

## Overview
Added an engaging animated explainer section to the home page that visually demonstrates what EPSM does, using the official EPSM blue color scheme.

## What Was Added

### EPSMExplainerAnimation Component
A beautiful, animated component that explains EPSM's three main functions:

1. **Build Scenarios** 
   - Create combinatorial renovation scenarios with different building materials, constructions, and systems
   - Icon: Building with Layers sub-icon
   - Color: EPSM Primary Blue (#1976d2)

2. **Simulate Performance**
   - Run EnergyPlus simulations to analyze energy performance, costs, and environmental impact
   - Icon: Zap with FlaskConical sub-icon
   - Color: EPSM Dark Blue (#1565c0)

3. **Visualize Results**
   - Compare scenarios with interactive charts and identify optimal renovation strategies
   - Icon: BarChart3 with TrendingUp sub-icon
   - Color: EPSM Accent Blue (#2196f3)

## Color Scheme
The component now uses the official EPSM blue color palette:
- **Primary Blue**: #1976d2 (Main EPSM brand color)
- **Primary Light**: #42a5f5 
- **Primary Dark**: #1565c0
- **Secondary**: #0d47a1 (Darker blue for depth)
- **Accent**: #2196f3 (Lighter accent blue)

The gradient background uses: `linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #2196f3 100%)`
This creates a smooth blue gradient from dark to light, maintaining brand consistency.

## Features

### Visual Design
- **Blue gradient background**: Professional EPSM blue gradient for brand consistency
- **Animated ripple effect**: Background circles with enhanced opacity for visibility
- **Responsive layout**: Two-column layout on desktop, stacks on mobile
- **Glass morphism cards**: Semi-transparent cards with backdrop blur and blue tinted shadows

### Animations
- **Auto-cycling steps**: Steps automatically cycle every 3.5 seconds
- **Smooth transitions**: All state changes use smooth CSS transitions
- **Fade/Grow/Zoom effects**: Different MUI animation components for visual interest
- **Pulsing active step**: The currently active step has a pulsing animation effect with blue glow
- **Interactive dots**: Enhanced progress indicator dots with blue shadow on active state

### Interactive Elements
- **Clickable progress dots**: Users can click on the dots to jump to any step
- **Hover effects**: Cards and dots respond to mouse hover with scale transforms
- **Check marks**: Completed (past) steps show a check mark icon
- **Dynamic sizing**: Active step cards slightly scale up and have different font sizes
- **Arrow indicators**: Show flow between steps except for the last one
- **Blue shadows**: Active elements have blue-tinted shadows matching EPSM brand

### Technical Implementation
- Uses React hooks (useState, useEffect) for state management
- Auto-cleanup of interval on component unmount
- Proper TypeScript typing with React.FC
- MUI components for consistent design system
- Lucide React icons for crisp, scalable icons
- Separated into its own component file for better organization

## Files Structure
```
frontend/src/components/home/
├── EPSMExplainer.tsx    (New animated component)
└── HomePage.tsx         (Updated to import component)
```

## Files Modified/Created
- **Created**: `/Users/ssanjay/GitHub/epsm/frontend/src/components/home/EPSMExplainer.tsx`
- **Modified**: `/Users/ssanjay/GitHub/epsm/frontend/src/components/home/HomePage.tsx`

## Component Location
The component is placed at the top of the home page, immediately after the Joyride tour component and before the main grid layout.

## Styling Approach
- Inline SX prop styling for dynamic, state-dependent styles
- CSS animations defined in SX for ripple and pulse effects
- Responsive breakpoints for mobile/desktop layouts
- Consistent spacing and sizing using MUI theme units
- EPSM blue color constants defined at component level for easy updates

## User Experience
1. Users immediately see an eye-catching blue animated section explaining EPSM
2. The animation draws attention and explains the workflow visually
3. Users can interact with the dots to explore each step
4. The smooth animations create a professional, polished feel
5. The blue color scheme reinforces EPSM brand identity
6. The gradient and shadows create depth and visual hierarchy

## Benefits
- **Improved Organization**: Component is now in its own file, making it reusable
- **Brand Consistency**: Uses official EPSM blue colors throughout
- **Better Maintainability**: Color constants defined in one place
- **Enhanced Visual Appeal**: Blue gradient and shadows create a more professional look
- **Cleaner Code**: HomePage.tsx is now less cluttered

