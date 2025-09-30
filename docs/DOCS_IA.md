# Proposed Information Architecture for EPSM Docs

Goal: Simplify navigation, reduce clutter, remove archive, and provide a clear hierarchy and sidebar.

Top-level sections (sidebar order):

- Home
- Getting Started
- Guides
  - Development
  - Deployment
  - Results Database
- API Reference
- Architecture
- Scripts & Utilities
- Contributing
- Project & Legal

Notes:
- Remove `archive/` entirely. Move any useful archived content into "Guides" or append to a "Changelog/History" section if needed.
- `Project README` and `README.md` are distinct; keep `PROJECT_README.md` under Project & Legal or Home as a link.
- Keep index page minimal with hero, short description, and primary quick links.

Migration plan:
1. Create the new `_sidebar.md` reflecting this IA.
2. Replace heavy index content with concise landing page.
3. Move or merge outdated archive content.
4. Update `_layouts/default.html` to include the sidebar and a simplified header.
5. Modernize `assets/css/site.css`.

Acceptance criteria:
- Sidebar shows hierarchical nav and appears on all pages.
- Index is concise and links to major sections.
- Archive folder removed.

