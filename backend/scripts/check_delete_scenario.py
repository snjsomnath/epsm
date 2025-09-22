import traceback, uuid
from django import setup
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
setup()

try:
    sid = uuid.UUID('e4ec9f27-f1f3-408a-b5ea-542b99b13e80')
    from database.models import Scenario, ScenarioConstruction
    s = Scenario.objects.using('materials_db').filter(id=sid).first()
    print('Scenario object:', s)
    if not s:
        print('Scenario not found')
    else:
        print('DB state:', getattr(s, '_state', None).db)
        count = ScenarioConstruction.objects.using('materials_db').filter(scenario=s).count()
        print('Count scenario_constructions (materials_db):', count)
        ScenarioConstruction.objects.using('materials_db').filter(scenario=s).delete()
        print('Deleted scenario_constructions (materials_db)')
        s.delete()
        print('Deleted scenario')
except Exception as e:
    traceback.print_exc()
    raise
