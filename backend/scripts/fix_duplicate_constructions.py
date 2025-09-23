#!/usr/bin/env python3
"""
Simple IDF post-processor to fix duplicate CONSTRUCTION object names.

This script does a best-effort, text-based pass that:
- Finds all CONSTRUCTION object blocks
- Detects duplicate names
- Renames each occurrence to a unique name prefixed with `epsm_` (and `_dupN` for repeats)
- Updates references elsewhere in the file by replacing occurrences followed by `,` or `;`

This is intended as a pragmatic fallback when the eppy-based pipeline cannot be run
in this environment and we need to repair generated IDF files so EnergyPlus can run.
"""
import re
import sys
from pathlib import Path


def fix_file(path: Path) -> int:
    text = path.read_text(encoding='utf-8')

    # Regex to capture CONSTRUCTION blocks (case-insensitive)
    # Matches from the 'CONSTRUCTION,' header up to the next semicolon that ends the object
    pattern = re.compile(r'(?i)(^CONSTRUCTION\s*,\s*[^;]*?;)', re.M | re.S)
    blocks = list(pattern.finditer(text))
    if not blocks:
        print(f"No CONSTRUCTION blocks found in {path}")
        return 0

    # Extract names in order of appearance
    names = []
    for m in blocks:
        block = m.group(1)
        # The Name is the first token after the leading 'CONSTRUCTION,'
        # which may be on the same or the next line. Split by commas.
        parts = block.split(',')
        if len(parts) >= 2:
            raw_name = parts[1].strip()
            # Remove surrounding quotes if present
            raw_name = raw_name.strip().strip('"').strip("'")
            names.append((raw_name, m.start(), m.end(), block))
        else:
            names.append((None, m.start(), m.end(), block))

    # Build replacement mapping for duplicate names
    counts = {}
    replacements = []  # tuples (start, end, old, new)
    for idx, (name, start, end, block) in enumerate(names):
        if not name:
            continue
        counts.setdefault(name, 0)
        counts[name] += 1

    # For names with count > 1, assign unique new names
    occ_index = {}
    for idx, (name, start, end, block) in enumerate(names):
        if not name:
            continue
        if counts.get(name, 0) > 1:
            occ_index.setdefault(name, 0)
            i = occ_index[name]
            occ_index[name] = i + 1
            base = name if name.startswith('epsm_') else f"epsm_{name}"
            new_name = base if i == 0 else f"{base}_dup{i}"
            replacements.append((start, end, name, new_name))

    if not replacements:
        print(f"No duplicate CONSTRUCTION names to fix in {path}")
        return 0

    # Apply replacements to object blocks (replace the Name token only inside each block)
    new_text = text
    offset = 0
    for start, end, old, new in replacements:
        s = start + offset
        e = end + offset
        block = new_text[s:e]
        # Replace only the first occurrence of the old name inside the block
        block_new = block.replace(old, new, 1)
        new_text = new_text[:s] + block_new + new_text[e:]
        offset += len(block_new) - len(block)

    # Also update references in the rest of the file: replace 'OldName,' and 'OldName;'
    for _, _, old, new in replacements:
        # Replace occurrences where the name is followed by a comma or semicolon (typical in IDF)
        new_text = re.sub(re.escape(old) + r'\s*,', new + ',', new_text)
        new_text = re.sub(re.escape(old) + r'\s*;', new + ';', new_text)

    # Write back
    backup = path.with_suffix(path.suffix + '.bak')
    path.rename(backup)
    path.write_text(new_text, encoding='utf-8')
    print(f"Fixed {len(replacements)} duplicate CONSTRUCTION name(s) in {path} (backup at {backup})")
    return len(replacements)


def main(argv):
    if len(argv) < 2:
        print("Usage: fix_duplicate_constructions.py <input.idf> [<more.idf> ...]")
        return 1
    total = 0
    for p in argv[1:]:
        total += fix_file(Path(p))
    print(f"Total duplicates fixed: {total}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
