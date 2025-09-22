Simulation results — backend notes

This file documents how simulation outputs are stored and the API endpoints used by the frontend. It is intended for contributors working on the backend or integrating the frontend.

Files & layout

- MEDIA_ROOT (default in `config/settings.py`) points to the `backend/media` directory.
- Simulation files are stored under:
  - `media/simulation_files/<simulation_id>/...` (uploaded IDF/EPW inputs)
  - `media/simulation_results/<simulation_id>/...` (simulation outputs)
- Typical EnergyPlus outputs in `media/simulation_results/<id>/base/` include:
  - `output.htm` (EnergyPlus HTML report)
  - `output.html` (copied from `output.htm` for simpler access)
  - `output.json` (parsed JSON for single runs)
  - `combined_results.json` (combined JSON for multi-file simulations)
  - `run_output.log` (run logs)

API endpoints (relevant)

- GET `/api/simulation/<id>/download/`
  - Purpose: Open/view the HTML report in the browser.
  - Returns: `output.html` (if present) otherwise `output.htm`. If no HTML exists, returns a ZIP of the simulation results directory.
  - Intended for: browser viewing of the simulation HTML report.

- GET `/api/simulation/<id>/results/`
  - Purpose: Download the key parsed results as JSON.
  - Returns: `combined_results.json` or an array of `output.json` files for individual IDFs.
  - Intended for: programmatic consumption, export, or quick downloads of parsed metrics.

Notes for contributors

- EnergyPlus frequently produces `output.htm` (and sometimes `eplustbl.htm`). To keep frontend code simple, the backend copies `output.htm` => `output.html` after simulation completes so `output.html` links work.
- During development `config.urls` includes a debug-only fallback that serves `output.htm` when `output.html` is requested. This should not be relied on in production — prefer Nginx/static hosting for media.
- The `simulation_download` view is intentionally simple: prefer browser-friendly HTML viewing. The `simulation_results` view returns parsed JSON.

Verification (quick)

- From inside the backend container (or host if running locally):
  - Check that files exist:
    ```bash
    ls -la backend/media/simulation_results/<simulation_id>/base/
    ```
  - View HTML via API:
    ```bash
    curl -I http://localhost:8000/api/simulation/<simulation_id>/download/
    ```
  - Fetch JSON results:
    ```bash
    curl -s http://localhost:8000/api/simulation/<simulation_id>/results/ | jq .
    ```

Production considerations

- In production, serve `MEDIA_ROOT` with Nginx or a cloud storage solution (S3). Avoid letting Django serve large static files in production.
- If sticking with a reverse proxy, add a rewrite or try_files rule to map `output.html` → `output.htm` when necessary, or ensure your simulation runner writes both names.

If you update the simulation output naming or want to move parsing out of Django, add notes here describing how to produce both HTML and JSON artifacts and where to host them.
