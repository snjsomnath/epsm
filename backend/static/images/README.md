# Static Images

This directory contains static images that should be served via Django's static files system.

## Chalmers Logos

The Chalmers University logos are used on the login page and throughout the application.

### Production Deployment Note

In production, these logo files need to be copied to the `backend/media/` directory during deployment, as the frontend references them via `/media/` URLs.

Add this step to your deployment script:

```bash
docker-compose exec backend bash -c "cp /app/static/images/chalmers_logo_*.png /app/media/"
```

Or update your Dockerfile to copy them during build:

```dockerfile
COPY backend/static/images/chalmers_logo_*.png /app/media/
```

### Files

- `chalmers_logo_light_theme.png` - Logo for light mode
- `chalmers_logo_dark_theme.png` - Logo for dark mode

### Source

Original files are maintained in `frontend/src/media/` and copied here for backend serving.
