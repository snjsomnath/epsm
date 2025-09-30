#!/usr/bin/env python3
"""
Build a simple search-index.json from the markdown files in this folder.
Creates `search-index.json` in the same `docs/` folder.

Usage: python3 docs/tools/build_search_index.py
"""
import os
import re
import json

DOCS_DIR = os.path.dirname(os.path.dirname(__file__))
OUT_FILE = os.path.join(DOCS_DIR, 'search-index.json')

def strip_front_matter(text):
    # remove YAML front matter if present
    if text.startswith('---'):
        parts = text.split('---', 2)
        if len(parts) >= 3:
            return parts[2]
    return text

def extract_title(text, path):
    # try YAML title
    m = re.search(r"^title:\s*(.+)$", text, flags=re.MULTILINE)
    if m:
        return m.group(1).strip()
    # first markdown heading
    m = re.search(r"^#\s+(.+)$", text, flags=re.MULTILINE)
    if m:
        return m.group(1).strip()
    # fallback to filename
    return os.path.splitext(os.path.basename(path))[0]

def clean_text(text):
    # remove code fences
    text = re.sub(r'```.*?```', ' ', text, flags=re.S)
    # remove inline code
    text = re.sub(r'`([^`]*)`', r'\1', text)
    # remove images and links, keep link text
    text = re.sub(r'!\[.*?\]\(.*?\)', ' ', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    # remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # remove non-word punctuation
    text = re.sub(r'[^\w\s]', ' ', text)
    # collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def should_include(path):
    # exclude assets, layouts, includes, backups, and hidden files
    rel = os.path.relpath(path, DOCS_DIR)
    if rel.startswith('assets') or rel.startswith('_layouts') or rel.startswith('_includes'):
        return False
    if rel.startswith('docs-backup'):
        return False
    if os.path.basename(path).startswith('.'): 
        return False
    if not path.endswith('.md'):
        return False
    return True

docs = []
for root, dirs, files in os.walk(DOCS_DIR):
    # skip hidden dirs
    dirs[:] = [d for d in dirs if not d.startswith('.')]
    for f in files:
        full = os.path.join(root, f)
        if not should_include(full):
            continue
        try:
            with open(full, 'r', encoding='utf-8') as fh:
                text = fh.read()
        except Exception:
            continue
        body = strip_front_matter(text)
        title = extract_title(text, full)
        content = clean_text(body)
        rel = os.path.relpath(full, DOCS_DIR).replace('\\', '/')
        url = '/' + rel  # will be resolved by site
        docs.append({'path': rel, 'url': url, 'title': title, 'content': content})

out = {'docs': docs}
with open(OUT_FILE, 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
print('Wrote', OUT_FILE, 'with', len(docs), 'documents')
