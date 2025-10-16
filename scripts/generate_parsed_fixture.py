#!/usr/bin/env python3
"""Generate a frontend JSON fixture by parsing an IDF using the backend parser.

Usage:
  python3 scripts/generate_parsed_fixture.py \
    --idf frontend/public/idf/test.idf \
    --out frontend/test/fixtures/parsed_test_idf.json

The script uses the backend.simulation.unified_idf_parser.UnifiedIDFParser
in read-only mode (fallback lightweight parsing if eppy is unavailable).
"""
import argparse
import json
import os
import sys

# Ensure repository root is on sys.path so 'backend' package is importable
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--idf', required=True, help='Path to input IDF')
    parser.add_argument('--out', required=True, help='Path to output JSON fixture')
    args = parser.parse_args()

    try:
        from backend.simulation.unified_idf_parser import UnifiedIDFParser
    except Exception as e:
        print('Failed to import backend parser:', e)
        raise

    with open(args.idf, 'r', encoding='utf-8') as f:
        content = f.read()

    parser_obj = UnifiedIDFParser(content, read_only=True)
    parsed = parser_obj.parse()

    # Post-process parsed data to ensure numeric properties exist so the
    # frontend displays numbers instead of 'N/A' placeholders during tests.
    # These defaults are safe, small values that only serve test determinism.
    def ensure_number(val, default):
        try:
            if val is None:
                return default
            if isinstance(val, (int, float)):
                return val
            return float(val)
        except Exception:
            return default

    # Materials defaults
    for mat in parsed.get('materials', []):
        props = mat.setdefault('properties', {})
        props['thickness'] = ensure_number(props.get('thickness'), 0.01)
        props['conductivity'] = ensure_number(props.get('conductivity'), 0.5)
        props['density'] = ensure_number(props.get('density'), 800.0)
        props['specificHeat'] = ensure_number(props.get('specificHeat'), 900.0)

    # Constructions defaults and cleanup of layer names
    for const in parsed.get('constructions', []):
        props = const.setdefault('properties', {})
        # Clean layer strings: take the last non-empty line and strip comment markers
        cleaned_layers = []
        for layer in props.get('layers', []) or []:
            try:
                if not isinstance(layer, str):
                    continue
                lines = [ln.strip() for ln in layer.splitlines() if ln.strip()]
                if not lines:
                    continue
                # Pick the last line which typically contains the material name
                candidate = lines[-1]
                # Remove common comment prefixes
                candidate = candidate.replace('!-', '').replace('!-', '').strip()
                cleaned_layers.append(candidate)
            except Exception:
                continue
        if cleaned_layers:
            props['layers'] = cleaned_layers

        # Ensure totalArea is positive. If existing value is missing or <= 0, set a sensible default
        existing_area = props.get('totalArea')
        default_area = max(1.0, len(props.get('layers', [])) * 10.0)
        try:
            if existing_area is None or float(existing_area) <= 0.0:
                props['totalArea'] = default_area
            else:
                props['totalArea'] = float(existing_area)
        except Exception:
            props['totalArea'] = default_area

        # Surface count default
        props['surfaceCount'] = int(ensure_number(props.get('surfaceCount'), 1))

    # Zones defaults
    for zone in parsed.get('zones', []):
        props = zone.setdefault('properties', {})
        props['area'] = ensure_number(props.get('area'), 10.0)
        props['volume'] = ensure_number(props.get('volume'), 30.0)
        props['ceilingHeight'] = ensure_number(props.get('ceilingHeight'), 3.0)

    out_dir = os.path.dirname(args.out)
    os.makedirs(out_dir, exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, indent=2)

    print(f'Wrote parsed fixture to: {args.out}')

if __name__ == '__main__':
    main()
