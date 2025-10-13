from database.models import Scenario, ScenarioConstruction, Layer
import itertools, json

s = Scenario.objects.filter(name='test').first()
if not s:
    print('SCENARIO NOT FOUND')
else:
    sc_qs = ScenarioConstruction.objects.filter(scenario=s)
    groups = {}
    for sc in sc_qs:
        c = sc.construction
        if not c:
            continue
        layers = []
        try:
            for L in Layer.objects.filter(construction=c).order_by('layer_order'):
                if getattr(L, 'material', None):
                    layers.append(L.material.name)
                elif getattr(L, 'window', None):
                    layers.append(L.window.name)
        except Exception:
            pass
        groups.setdefault(sc.element_type, []).append({'name': c.name, 'layers': layers})

    # combinatorial
    keys = list(groups.keys())
    lists = [[None] + groups[k] for k in keys]
    combos = list(itertools.product(*lists))
    combinatorial_sets = []
    for combo in combos:
        cs = {}
        for k, chosen in zip(keys, combo):
            if chosen is None:
                continue
            cs[k] = {'name': chosen['name'], 'layers': chosen['layers']}
        if cs:
            combinatorial_sets.append(cs)

    # per_construction (one per ScenarioConstruction row)
    per_sets = []
    for sc in sc_qs:
        c = sc.construction
        if not c:
            continue
        layers = []
        try:
            for L in Layer.objects.filter(construction=c).order_by('layer_order'):
                if getattr(L, 'material', None):
                    layers.append(L.material.name)
                elif getattr(L, 'window', None):
                    layers.append(L.window.name)
        except Exception:
            pass
        per_sets.append({sc.element_type: {'name': c.name, 'layers': layers}})

    print('COMBINATORIAL COUNT:', len(combinatorial_sets))
    print('PER_CONSTRUCTION COUNT:', len(per_sets))
    print('\nCOMBINATORIAL SETS:')
    for i, cs in enumerate(combinatorial_sets, 1):
        print(i, json.dumps(cs))
    print('\nPER_CONSTRUCTION SETS:')
    for i, cs in enumerate(per_sets, 1):
        print(i, json.dumps(cs))
