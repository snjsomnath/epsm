from database.models import Scenario, ScenarioConstruction
import collections, json

s = Scenario.objects.filter(name='Test scenario').first()
print('FOUND' if s else 'NOT FOUND')
print('SCENARIO_ID:', str(s.id) if s else None)
if s:
    qs = ScenarioConstruction.objects.filter(scenario=s)
    counts = collections.Counter([sc.element_type for sc in qs])
    print('COUNTS:', json.dumps(dict(counts)))
    details = [{'id':str(sc.id),'element_type': sc.element_type, 'construction_name': (sc.construction.name if sc.construction else None)} for sc in qs]
    print('DETAILS:')
    print(json.dumps(details, default=str, indent=2))
