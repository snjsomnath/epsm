#!/usr/bin/env python3
"""Diagnostic: check eppy, Energy+.idd path, and UnifiedIDFParser readiness.

Run this from the repository root. It will print:
 - whether the eppy import succeeded (_EPPY_AVAILABLE)
 - resolved ENERGYPLUS_PATH / fallback path and whether Energy+.idd exists there
 - whether UnifiedIDFParser initializes with _eppy_ready True
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

def main():
    try:
        from backend.simulation import unified_idf_parser as u
    except Exception as e:
        print('ERROR: failed to import backend.simulation.unified_idf_parser:', e)
        sys.exit(2)

    print('module _EPPY_AVAILABLE =', getattr(u, '_EPPY_AVAILABLE', None))
    try:
        path = u._get_energyplus_path()
    except Exception as e:
        print('ERROR while resolving _get_energyplus_path():', e)
        path = None
    print('resolved ENERGYPLUS_PATH / fallback ->', path)
    if path:
        idd_path = os.path.join(path, 'Energy+.idd')
        print('Energy+.idd exists at', idd_path, ':', os.path.exists(idd_path))

    # Try to create a parser and see if eppy becomes ready
    sample = 'Zone,TestZone;\n'
    try:
        parser = u.UnifiedIDFParser(sample, read_only=True)
        print('UnifiedIDFParser._eppy_ready =', getattr(parser, '_eppy_ready', None))
    except Exception as e:
        print('ERROR creating UnifiedIDFParser:', e)

    # If eppy import exists, also print whether IDF symbol is present
    try:
        IDF = getattr(u, 'IDF', None)
        print('module IDF available:', IDF is not None)
    except Exception:
        pass

if __name__ == '__main__':
    main()
