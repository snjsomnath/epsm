from database.models import Scenario, ScenarioConstruction, Layer
import itertools, json

s = Scenario.objects.using('materials_db').filter(name='Test scenario').first()
if not s:
    print('SCENARIO NOT FOUND')
else:
    sc_qs = ScenarioConstruction.objects.using('materials_db').filter(scenario=s)
    groups = {}
    for sc in sc_qs:
        c = sc.construction
        if not c:
            continue
        # collect ordered layer names if available
        layers = []
        try:
            from database.models import Layer
            for L in Layer.objects.using('materials_db').filter(construction=c).order_by('layer_order'):
                if getattr(L, 'material', None):
                    layers.append(L.material.name)
                elif getattr(L, 'window', None):
                    layers.append(L.window.name)
        except Exception:
            pass
        groups.setdefault(sc.element_type, []).append({'name': c.name, 'layers': layers})

    print('GROUPS:')
    print(json.dumps(groups, indent=2))

    keys = list(groups.keys())
    lists = [[None] + groups[k] for k in keys]
    combos = list(itertools.product(*lists))
    construction_sets = []
    for combo in combos:
        cs = {}
        for k, chosen in zip(keys, combo):
            if chosen is None:
                continue
            cs[k] = {'name': chosen['name'], 'layers': chosen['layers']}
        if not cs:
            continue
        construction_sets.append(cs)

    print('TOTAL_COMBOS:', len(construction_sets))
    for i, cs in enumerate(construction_sets, 1):
        print(f"COMBO {i}: {json.dumps(cs)}")
