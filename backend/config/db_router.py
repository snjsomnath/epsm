class DatabaseRouter:
    """
    A router to control all database operations on models
    Strictly enforces separation between Django app data and materials data
    """
    
    # Models that MUST use the materials database (local PostgreSQL)
    materials_db_models = {
        'database.material',
        'database.construction', 
        'database.constructionset',
        'database.author',
        'database.windowglazing',
        'database.layer',
        'database.unitdescription'
    }

    # Models that MUST use the dedicated results database
    results_db_models = {
        'simulation.simulationresult',
        'simulation.simulationzone',
        'simulation.simulationenergyuse',
        'simulation.simulationhourlytimeseries'
    }

    def db_for_read(self, model, **hints):
        """Suggest the database to read from."""
        model_name = f"{model._meta.app_label}.{model._meta.model_name}"
        if model_name in self.materials_db_models:
            return 'materials_db'
        if model_name in self.results_db_models:
            return 'results_db'
        return 'default'

    def db_for_write(self, model, **hints):
        """Suggest the database to write to."""
        model_name = f"{model._meta.app_label}.{model._meta.model_name}"
        if model_name in self.materials_db_models:
            return 'materials_db'
        if model_name in self.results_db_models:
            return 'results_db'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations if models are in the same database."""
        db_set = {'default', 'materials_db', 'results_db'}
        if getattr(obj1, '_state').db in db_set and getattr(obj2, '_state').db in db_set:
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that materials models NEVER migrate to Django database."""
        if db == 'materials_db':
            # Only allow database app models to migrate to materials_db
            return app_label == 'database'
        elif db == 'results_db':
            # Only allow migration of the simulation result models to results_db
            if app_label == 'simulation' and model_name:
                model_full = f"{app_label}.{model_name}"
                return model_full in self.results_db_models
            return False
        elif db == 'default':
            # NEVER allow database app models to migrate to default db
            if app_label == 'database':
                return False
            return True
        return False