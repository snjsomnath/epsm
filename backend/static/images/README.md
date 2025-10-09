# Static Images

This directory contains static images that should be served via Django's static files system.

## Chalmers Logos

The Chalmers University logos are used on the login page and throughout the application.

### Production Deployment Note

In production, these logo files are **automatically copied** to the `backend/media/` directory during the Docker build process (see `backend/Dockerfile.prod`).

The Dockerfile includes:
```dockerfile
COPY static/images/ /app/static/images/
RUN cp /app/static/images/chalmers_logo_*.png /app/media/
```

No manual deployment step is required - just rebuild the Docker image and the logos will be available at `/media/` URLs.

### Files

- `chalmers_logo_light_theme.png` - Logo for light mode
- `chalmers_logo_dark_theme.png` - Logo for dark mode

### Source

Original files are maintained in `frontend/src/media/` and copied here for backend serving.
