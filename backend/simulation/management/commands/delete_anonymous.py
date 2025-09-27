from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from simulation.models import Simulation, SimulationResult


class Command(BaseCommand):
    help = 'Find and optionally delete all Simulations and SimulationResults for anonymous users (user is null / user_id is null). Dry-run by default.'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Actually perform deletions. Without this flag the command only reports counts (dry-run).')

    def handle(self, *args, **options):
        confirm = options.get('confirm', False)

        self.stdout.write('Scanning for anonymous simulations and results...')

        # Simulations with no user (user is null)
        anon_sims = Simulation.objects.filter(user__isnull=True)
        anon_sim_ids = list(anon_sims.values_list('id', flat=True))
        sims_count = anon_sims.count()

        # Results with no user_id OR results pointing to anon simulations
        anon_results_qs = SimulationResult.objects.filter(user_id__isnull=True)
        results_count_by_user_null = anon_results_qs.count()

        # Results referencing anon simulation ids
        results_pointing_to_anon_sim_qs = SimulationResult.objects.filter(simulation_id__in=anon_sim_ids)
        results_count_pointing = results_pointing_to_anon_sim_qs.count()

        # Avoid double counting overlap by combining querysets conservatively
        total_results_candidates = SimulationResult.objects.filter(user_id__isnull=True).union(results_pointing_to_anon_sim_qs)
        # union() returns a queryset only in Django 3.2+; fallback to manual count
        try:
            total_results_count = total_results_candidates.count()
        except Exception:
            # fallback: compute ids
            ids = set(list(anon_results_qs.values_list('id', flat=True)) + list(results_pointing_to_anon_sim_qs.values_list('id', flat=True)))
            total_results_count = len(ids)

        self.stdout.write(f'Found {sims_count} Simulation(s) with null user.')
        self.stdout.write(f'Found {results_count_by_user_null} SimulationResult(s) with null user_id.')
        self.stdout.write(f'Found {results_count_pointing} SimulationResult(s) pointing to those simulations.')
        self.stdout.write(f'Combined candidate SimulationResult rows: ~{total_results_count}')

        if not confirm:
            self.stdout.write(self.style.WARNING('Dry-run: no rows were deleted. Rerun with --confirm to delete these records.'))
            return

        # Perform deletions in a transaction for safety
        with transaction.atomic():
            # Delete simulation results first so cascade removes related detail rows
            # Build a queryset that covers both criteria
            from django.db.models import Q
            q = Q(user_id__isnull=True)
            if anon_sim_ids:
                q = q | Q(simulation_id__in=anon_sim_ids)

            results_to_delete = SimulationResult.objects.filter(q)
            del_results = results_to_delete.count()
            self.stdout.write(f'Deleting {del_results} SimulationResult rows...')
            results_to_delete.delete()

            sims_to_delete = Simulation.objects.filter(user__isnull=True)
            del_sims = sims_to_delete.count()
            self.stdout.write(f'Deleting {del_sims} Simulation rows...')
            sims_to_delete.delete()

        self.stdout.write(self.style.SUCCESS(f'Deletion complete. Removed {del_results} results and {del_sims} simulations at {timezone.now()}.'))
