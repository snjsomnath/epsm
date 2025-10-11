# Z-Index Hierarchy for EPSM Frontend

This document defines the z-index values used across the application to ensure proper layering and prevent UI conflicts.

## Material-UI Default Z-Index Values

Material-UI uses these standard z-index values:
- **mobileStepper**: 1000
- **fab**: 1050
- **speedDial**: 1050
- **appBar**: 1100
- **drawer**: 1200
- **modal (Dialog backdrop)**: 1300
- **modal (Dialog)**: 1300
- **snackbar**: 1400
- **tooltip**: 1500

## Application-Specific Z-Index Values

### Base Layer (0-100)
- **Regular content/cards**: `auto` or `1` (default)
- **SectionCard components**: `auto` (inherits default)
- **Paper components**: `auto` (inherits default)

### Interactive Elements (100-1000)
- **Chart tooltips (CoreLaneView)**: `10`
  - Location: `frontend/src/components/simulation/CoreLaneView.tsx`
  - Ensures tooltips appear above chart content but below modals

### Dropdown Menus (1300-1400)
- **Select dropdown menu**: `1350`
  - Location: `frontend/src/components/simulation/sections/SimulationSetupSection.tsx`
  - Positioned above Dialog backdrops (1300) but below Snackbars (1400)
  - Uses `disablePortal: false` to render in a portal outside the DOM hierarchy

### Modals & Dialogs (1300+)
- **StartSimulationDialog**: `1300` (MUI default)
- **UploadDialog**: `1300` (MUI default)

### Notifications (1400+)
- **Snackbar notifications**: `1400` (MUI default)

## Best Practices

1. **Always use portals for overlays**: Set `disablePortal: false` for Select MenuProps to ensure dropdowns render outside parent containers
2. **Avoid arbitrary high values**: Use values that fit within the MUI z-index scale (0-1500)
3. **Layer intentionally**: 
   - Base content: 0-100
   - Interactive overlays: 100-1000
   - Dropdowns/Popovers: 1300-1400
   - Global notifications: 1400+
4. **Test with all components mounted**: The ResourcePanel with charts can create stacking contexts that affect other components

## Common Issues & Solutions

### Issue: Select dropdown not visible
**Cause**: Parent containers with `overflow: hidden` or competing z-index values
**Solution**: 
- Set `disablePortal: false` in MenuProps
- Set explicit z-index (1350) on PaperProps
- Ensure parent containers have `overflow: visible`

### Issue: Tooltips appearing above modals
**Cause**: Tooltip z-index too high
**Solution**: Keep tooltips in the 10-100 range for local context, use MUI default (1500) only for global tooltips

### Issue: Components interfering after mounting
**Cause**: Dynamic stacking contexts from charts/visualizations
**Solution**: Use portals for dropdowns and ensure explicit z-index values on critical interactive elements

## File References

- Select dropdown: `frontend/src/components/simulation/sections/SimulationSetupSection.tsx`
- Chart tooltips: `frontend/src/components/simulation/CoreLaneView.tsx`
- Card containers: `frontend/src/components/simulation/SectionCard.tsx`

Last updated: 2025-10-06
