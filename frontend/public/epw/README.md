Place a default EPW file here to allow users to use a built-in weather file.

- Filename: `default.epw`
- Location (relative to frontend build output): `/epw/default.epw`

When running the dev server or after building the frontend, the file will be available at `/epw/default.epw`.

Notes:
- Use a valid EnergyPlus EPW file.
- The `EpwUploadArea` component has a "Use default EPW" button that will fetch this file and validate it before using it.