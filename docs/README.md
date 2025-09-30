# Publishing `docs/` with a Jekyll theme

---
title: Docs README
layout: default
---

This repository uses a Jekyll-style docs site located in the `docs/` folder. The current Jekyll configuration is in `docs/_config.yml` and sets the `minima` theme by default.

## Goal

Serve the contents of `docs/` as a GitHub Pages site using a Jekyll theme (no MkDocs needed).

## Publish via GitHub Pages (recommended for Jekyll)

1. On GitHub, open the repository Settings → Pages.
2. Under "Build and deployment", set the Source to:
   - Branch: `main`
   - Folder: `/docs`
3. Save. GitHub Pages will build the site using Jekyll and the configuration in `docs/_config.yml`.

Notes:
- Do NOT add a `.nojekyll` file if you want GitHub to run Jekyll and apply the `minima` theme.
- If you publish to a subpath (e.g. project pages), set `baseurl` in `docs/_config.yml` and push changes.

## Local preview (Jekyll)

If you want to preview the site locally with the same Jekyll theme GitHub Pages uses, run Jekyll locally.

Prerequisites:
- Ruby (2.7+ recommended)
- Bundler

Typical steps:

```bash
# from repo root
cd docs
gem install bundler jekyll
bundle init                      # optional: creates a Gemfile
# add `gem "jekyll"` and any theme gems to the Gemfile, or skip to install globally
bundle add jekyll minima         # installs jekyll and the minima theme locally
bundle exec jekyll serve --host 0.0.0.0 --port 4000
# open http://127.0.0.1:4000
```

If you prefer not to use bundler you can install `jekyll` and `minima` globally with `gem install jekyll minima` and run `jekyll serve`.

### macOS notes (if `bundle install` fails)

If `bundle install` or `gem install` fails on macOS you may need to install a supported Ruby and make sure `gem` can install executables.

Recommended steps using Homebrew:

```bash
# install a modern Ruby
brew install ruby
# ensure Ruby bin path is in your shell PATH (add to .zshrc if necessary)
export PATH="$(brew --prefix)/opt/ruby/bin:$PATH"
# install bundler and jekyll gems
gem install bundler
cd docs
bundle install
bundle exec jekyll serve
```

If you prefer not to change system Ruby, consider using `rbenv` or `asdf` to manage a project Ruby installation.

## Customizing the theme

- Edit `docs/_config.yml` to change `title`, `description`, `baseurl`, or `theme`.
- Add layout, includes, or custom CSS under `docs/_layouts`, `docs/_includes`, or `docs/assets` as needed.

## Notes about the existing GitHub Action

There is an existing workflow at `.github/workflows/publish-docs.yml` that runs `mkdocs build`. That workflow is for MkDocs and is unrelated to Jekyll. You can:

- Leave it in place (harmless) but it will fail until a `mkdocs.yml` exists. If you won't use MkDocs, consider removing or disabling that workflow to avoid confusion.
- Or update the workflow to deploy the static `site/` output if you switch to an automated build/deploy flow instead of serving `docs/` directly.

## If you later want MkDocs instead

- Move or copy markdown files into the `docs/` folder (MkDocs also defaults to `docs/`).
- Add a `mkdocs.yml` at repo root and the workflow will be able to build and publish the generated site. Note: MkDocs will produce a `_site` or `site/` directory; do not commit that output.

## Quick checklist to go live now

- [ ] Confirm `docs/_config.yml` has desired `title` and `baseurl`.
- [ ] In GitHub → Settings → Pages set Source = `main` / `/docs`.
- [ ] (Optional) Add CNAME in `docs/` for a custom domain.

That's it — if you'd like I can:
- remove or rename the MkDocs workflow so there is no confusion, and/or
- add a short CI workflow that simply validates `jekyll build` (optional), or
- help customize the `minima` theme.

If you want me to make changes now, tell me which of the 3 options above you want (remove MkDocs workflow, add a small Jekyll CI check, or customize the theme) and I'll implement it.
