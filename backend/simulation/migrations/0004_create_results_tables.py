from django.db import migrations, models


class Migration(migrations.Migration):
    """
    This migration is a no-op state sync migration.
    
    Previously, this migration tried to CreateModel which conflicted with 0001_initial.
    The models already exist from migrations 0001-0003 on the default database.
    This migration just ensures the results_db database schema matches after 0003.
    
    The actual table creation happens via SeparateDatabaseAndState operations
    or by faking migrations 0001-0003 on results_db first (see entrypoint).
    """
    initial = False

    dependencies = [
        ('simulation', '0003_remove_simulationresult_simulation__simulat_55e4dc_idx_and_more'),
    ]

    operations = [
        # No operations needed - state is already correct from 0001-0003
        # Tables are created on results_db by faking 0001-0003 first in entrypoint
    ]
