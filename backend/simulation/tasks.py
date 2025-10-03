"""
Celery tasks for EnergyPlus simulations.
"""
import os
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from celery import shared_task, current_task, chord, group
from celery.exceptions import SoftTimeLimitExceeded
from django.conf import settings
from django.core.files.storage import default_storage


@shared_task(bind=True, name='simulation.aggregate_batch_results')
def aggregate_batch_results(self, variant_results, simulation_id, parent_task_id, total_variants):
    """
    Callback task that aggregates results from all variant tasks.
    This runs AFTER all variant tasks complete (via Celery chord).
    
    Args:
        variant_results: List of results from all variant tasks
        simulation_id: UUID of the parent Simulation
        parent_task_id: ID of the parent batch task
        total_variants: Total number of variants processed
    """
    from .models import Simulation
    from .services import EnergyPlusSimulator
    from pathlib import Path
    
    try:
        print(f"Aggregating results for {total_variants} variants (simulation {simulation_id})")
        
        simulation = Simulation.objects.get(id=simulation_id)
        simulator = EnergyPlusSimulator(simulation, celery_task=None)
        
        # Collect successful results
        all_results = []
        for task_result in variant_results:
            if task_result and task_result.get('status') == 'success':
                all_results.append(task_result['results'])
            else:
                all_results.append(task_result)
        
        # Persist results to database and ensure we actually saved data
        print(f"Saving {len(all_results)} results to database")
        save_summary = simulator.save_results_to_database(all_results, job_info={
            "simulation_id": simulation.id,
            "run_id": simulator.run_id
        })

        saved_count = save_summary.get('saved', 0)
        failed_count = save_summary.get('failed', 0)
        print(f"Result persistence summary: saved={saved_count}, failed={failed_count}")

        # Ensure the results directory exists before writing combined JSON
        results_dir = simulator.results_dir
        results_dir.mkdir(parents=True, exist_ok=True)
        combined_results_path = results_dir / 'combined_results.json'
        with open(combined_results_path, 'w') as f:
            json.dump(all_results, f)

        if saved_count <= 0:
            # Do not signal completion if nothing was saved; mark as failure so the frontend keeps polling
            error_details = '; '.join(save_summary.get('errors', [])[:5])
            simulation.status = 'failed'
            simulation.progress = max(simulation.progress or 0, 90)
            simulation.error_message = (
                "Simulation finished but produced no persisted results. "
                "Check Celery worker logs." + (f" Details: {error_details}" if error_details else '')
            )
            simulation.save(update_fields=['status', 'progress', 'error_message', 'updated_at'])
            raise RuntimeError("No simulation results were saved to the results database")

        # Update simulation record only after results have been persisted
        from django.utils import timezone
        simulation.status = 'completed'
        simulation.progress = 100
        simulation.error_message = None
        simulation.end_time = timezone.now()
        simulation.save(update_fields=['status', 'progress', 'error_message', 'end_time', 'updated_at'])
        
        # Send WebSocket completion message
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"simulation_progress_{simulation_id}",
                {
                    'type': 'progress_update',
                    'payload': {
                        'progress': 100,
                        'status': 'completed'
                    }
                }
            )
        except Exception as ws_err:
            print(f"Warning: Failed to send WebSocket completion: {ws_err}")
        
        print(f"Batch simulation {simulation_id} completed successfully with {len(all_results)} results")
        
        return {
            'status': 'completed',
            'simulation_id': str(simulation_id),
            'results_count': len(all_results),
            'message': 'Batch parametric simulation completed successfully',
            'saved_results': saved_count,
            'failed_results': failed_count,
            'errors': save_summary.get('errors', [])
        }
        
    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"ERROR in aggregate_batch_results: {error_msg}")
        
        try:
            simulation = Simulation.objects.get(id=simulation_id)
            simulation.status = 'failed'
            simulation.error_message = str(e)
            simulation.save()
        except Exception:
            pass
        
        raise


@shared_task(bind=True, name='simulation.run_single_variant')
def run_single_variant_task(
    self,
    simulation_id: str,
    variant_idf_path: str,
    weather_file_path: str,
    variant_dir: str,
    variant_idx: int,
    idf_idx: int,
    construction_set: Optional[Dict[str, Any]] = None
):
    """
    Run a single EnergyPlus simulation for one variant.
    This task is designed to be dispatched in parallel by Celery workers.
    
    Args:
        simulation_id: UUID of parent Simulation
        variant_idf_path: Absolute path to the generated variant IDF file
        weather_file_path: Relative path to weather file in MEDIA_ROOT
        variant_dir: Directory to store results
        variant_idx: Index of the construction variant
        idf_idx: Index of the base IDF file
        construction_set: The construction set dictionary used for this variant
        
    Returns:
        Dict with variant results
    """
    from .models import Simulation, SimulationFile
    from .services import EnergyPlusSimulator
    from pathlib import Path
    
    try:
        print(f"Running variant {variant_idx} IDF {idf_idx} for simulation {simulation_id}")
        
        # Get simulation and weather file
        simulation = Simulation.objects.get(id=simulation_id)
        weather_file = SimulationFile.objects.get(
            simulation=simulation,
            file_path=weather_file_path,
            file_type='weather'
        )
        
        # Update task state to show this variant is processing
        self.update_state(
            state='PROGRESS',
            meta={'status': f'Running variant {variant_idx+1}...', 'variant_idx': variant_idx}
        )
        
        # Create simulator instance
        simulator = EnergyPlusSimulator(simulation, celery_task=None)
        
        # Create a fake file object for the variant IDF
        # Must have both .file.path (for run_single_simulation) and .file_path (for process_file_results)
        class FakeFileWrapper:
            def __init__(self, path):
                self.file = type('File', (), {'path': path, 'name': Path(path).name})()
                self.file_path = path  # Add this for process_file_results
                self.original_name = Path(path).name
                self.file_name = Path(path).name
        
        fake_idf = FakeFileWrapper(variant_idf_path)
        
        # Run single simulation
        log = simulator.run_single_simulation(fake_idf, weather_file, variant_dir)
        
        # Process results
        output_file = Path(variant_dir) / "output"
        file_results = simulator.process_file_results(output_file, fake_idf)
        
        if file_results:
            file_results["variant_idx"] = variant_idx
            file_results["idf_idx"] = idf_idx
            file_results["construction_set"] = construction_set
            
            # Increment progress on the Simulation model
            # This gives real-time feedback as variants complete
            # Use atomic counter on the simulation model
            try:
                from django.db.models import F
                from django.db import transaction
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                
                with transaction.atomic():
                    # Use F() expression to atomically increment a counter
                    # We'll track this with the progress field directly
                    simulation = Simulation.objects.select_for_update().get(id=simulation_id)
                    # Increment by roughly (100 / total_variants) per completion
                    # Assuming 35 variants, each adds ~2.86%
                    increment = 90.0 / 35.0  # Reserve last 10% for aggregation callback
                    current = simulation.progress or 0
                    new_progress = min(90, int(current + increment))
                    simulation.progress = new_progress
                    simulation.save()
                    print(f"Variant {variant_idx} completed - Progress: {simulation.progress}%")
                    
                    # Send WebSocket progress update
                    try:
                        channel_layer = get_channel_layer()
                        async_to_sync(channel_layer.group_send)(
                            f"simulation_progress_{simulation_id}",
                            {
                                'type': 'progress_update',
                                'payload': {
                                    'progress': new_progress,
                                    'status': 'running'
                                }
                            }
                        )
                    except Exception as ws_err:
                        print(f"Warning: Failed to send WebSocket update: {ws_err}")
            except Exception as e:
                print(f"Warning: Failed to update progress: {e}")
            
            return {
                'status': 'success',
                'results': file_results
            }
        else:
            return {
                'status': 'failed',
                'error': 'No results generated',
                'variant_idx': variant_idx,
                'idf_idx': idf_idx
            }
            
    except Exception as e:
        import traceback
        print(f"ERROR in run_single_variant_task: {traceback.format_exc()}")
        return {
            'status': 'failed',
            'error': str(e),
            'variant_idx': variant_idx,
            'idf_idx': idf_idx
        }


from django.core.files.storage import default_storage


def run_batch_parametric_with_celery(parent_task, simulation, idf_files, construction_sets, weather_file, simulator):
    """
    Run batch parametric simulation by dispatching each variant as a separate Celery task.
    This allows Celery to handle parallelism across workers instead of using ThreadPoolExecutor.
    
    Args:
        parent_task: The parent Celery task instance
        simulation: Simulation model instance
        idf_files: List of SimulationFile objects (IDF files)
        construction_sets: List of construction set dictionaries
        weather_file: SimulationFile object (weather file)
        simulator: EnergyPlusSimulator instance
        
    Returns:
        Dict with task completion status
    """
    from pathlib import Path
    
    try:
        from .unified_idf_parser import IdfParser
    except Exception as e:
        raise ImportError(
            "Parametric simulation requires `IdfParser.insert_construction_set` which is provided by `unified_idf_parser.py`. "
            "Please ensure `backend/simulation/unified_idf_parser.py` is present and importable."
        )
    
    results_dir = simulator.results_dir
    variant_tasks = []
    variant_map = []
    
    # Generate all variant IDFs
    parent_task.update_state(
        state='PROGRESS',
        meta={'current': 10, 'total': 100, 'status': 'Generating variant IDF files...'}
    )
    
    for idf_idx, idf_file in enumerate(idf_files):
        idf_path = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
        with open(idf_path, "r", encoding="utf-8") as f:
            base_content = f.read()
            
        for variant_idx, construction_set in enumerate(construction_sets):
            parser = IdfParser(base_content)
            parser.insert_construction_set(construction_set)
            
            # Create variant directory
            variant_dir = results_dir / f"variant_{variant_idx+1}_idf_{idf_idx+1}"
            variant_dir.mkdir(parents=True, exist_ok=True)
            idf_name = f"idf_{idf_idx+1}_variant_{variant_idx+1}.idf"
            variant_idf_path = variant_dir / idf_name
            
            # Save variant IDF
            try:
                idf_obj = getattr(parser, 'idf', None)
                if idf_obj is not None and hasattr(idf_obj, 'saveas'):
                    idf_obj.saveas(str(variant_idf_path))
                else:
                    with open(str(variant_idf_path), 'w', encoding='utf-8') as _f:
                        _f.write(parser.to_string())
            except Exception:
                with open(str(variant_idf_path), 'w', encoding='utf-8') as _f:
                    _f.write(parser.to_string())
            
            variant_map.append({
                "idf_file": idf_file,
                "variant_idx": variant_idx,
                "idf_idx": idf_idx,
                "construction_set": construction_set,
                "idf_path": str(variant_idf_path),
                "variant_dir": str(variant_dir)
            })
    
    # Dispatch all variants as Celery tasks
    total_variants = len(variant_map)
    
    # Reset progress to 0 at start
    simulation.progress = 0
    simulation.save()
    
    parent_task.update_state(
        state='PROGRESS',
        meta={'current': 15, 'total': 100, 'status': f'Dispatching {total_variants} variant tasks to Celery workers...'}
    )
    
    # Create a group of tasks (all run in parallel across available workers)
    for entry in variant_map:
        task_signature = run_single_variant_task.si(  # Use .si() for immutable signature
            simulation_id=str(simulation.id),
            variant_idf_path=entry["idf_path"],
            weather_file_path=weather_file.file_path,
            variant_dir=entry["variant_dir"],
            variant_idx=entry["variant_idx"],
            idf_idx=entry["idf_idx"],
            construction_set=entry["construction_set"]
        )
        variant_tasks.append(task_signature)
    
    # Execute all variant tasks in parallel using Celery chord
    # Chord: All tasks run in parallel, then callback collects results
    print(f"Dispatching {total_variants} variant tasks via Celery chord...")
    
    # Create callback task that will aggregate results
    callback = aggregate_batch_results.s(
        simulation_id=str(simulation.id),
        parent_task_id=parent_task.request.id,
        total_variants=total_variants
    )
    
    # Execute group with callback (chord)
    job = chord(variant_tasks)(callback)
    
    # Return immediately - parent task completes, but chord continues running
    # The callback will update the simulation status to 'completed' when done
    print(f"Dispatched chord {job.id} with {total_variants} variants")
    parent_task.update_state(
        state='PROGRESS',
        meta={'current': 20, 'total': 100, 'status': f'Processing {total_variants} variants in parallel...'}
    )
    
    # Return success - the simulation is now "processing"
    # Frontend should poll simulation.status (not task status) to check completion
    return {
        'status': 'processing',
        'simulation_id': str(simulation.id),
        'message': f'Batch parametric simulation dispatched with {total_variants} variants',
        'total_variants': total_variants,
        'chord_id': str(job.id)
    }


@shared_task(bind=True, name='simulation.run_energyplus_batch')
def run_energyplus_batch_task(
    self,
    simulation_id: str,
    idf_file_paths: List[str],
    weather_file_path: str,
    parallel: bool = True,
    max_workers: Optional[int] = None,
    batch_mode: bool = False,
    construction_sets: Optional[List[Dict[str, Any]]] = None
):
    """
    Celery task for running EnergyPlus batch parametric simulations.
    
    Args:
        simulation_id: UUID of the Simulation record
        idf_file_paths: List of relative paths to IDF files in MEDIA_ROOT
        weather_file_path: Relative path to weather file in MEDIA_ROOT
        parallel: Whether to run simulations in parallel
        max_workers: Number of parallel workers (None = auto-detect)
        batch_mode: Whether to use batch parametric mode
        construction_sets: List of construction set dictionaries for parametric runs
        
    Returns:
        Dict with task results including simulation_id, status, and result paths
    """
    from .models import Simulation, SimulationFile
    from .services import EnergyPlusSimulator
    
    try:
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Initializing simulation...'}
        )
        
        # Get simulation record
        try:
            simulation = Simulation.objects.get(id=simulation_id)
        except Simulation.DoesNotExist:
            return {
                'status': 'failed',
                'error': f'Simulation {simulation_id} not found',
                'simulation_id': simulation_id
            }
        
        # Update simulation status
        simulation.status = 'running'
        simulation.celery_task_id = self.request.id
        simulation.save()
        
        # Get SimulationFile objects
        idf_files = []
        for file_path in idf_file_paths:
            try:
                sim_file = SimulationFile.objects.get(
                    simulation=simulation,
                    file_path=file_path,
                    file_type='idf'
                )
                idf_files.append(sim_file)
            except SimulationFile.DoesNotExist:
                print(f"Warning: SimulationFile not found for path {file_path}")
                continue
        
        if not idf_files:
            simulation.status = 'failed'
            simulation.error_message = 'No IDF files found'
            simulation.save()
            return {
                'status': 'failed',
                'error': 'No IDF files found',
                'simulation_id': simulation_id
            }
        
        # Get weather file object
        try:
            weather_file = SimulationFile.objects.get(
                simulation=simulation,
                file_path=weather_file_path,
                file_type='weather'
            )
        except SimulationFile.DoesNotExist:
            simulation.status = 'failed'
            simulation.error_message = 'Weather file not found'
            simulation.save()
            return {
                'status': 'failed',
                'error': 'Weather file not found',
                'simulation_id': simulation_id
            }
        
        # Create simulator instance with reference to this task
        simulator = EnergyPlusSimulator(simulation, celery_task=self)
        
        # Update state
        self.update_state(
            state='PROGRESS',
            meta={'current': 5, 'total': 100, 'status': 'Starting EnergyPlus simulation...'}
        )
        
        # If batch_mode with construction_sets, dispatch variants as separate Celery tasks
        if batch_mode and construction_sets:
            print(f"Batch mode: Dispatching {len(idf_files)} × {len(construction_sets)} = {len(idf_files) * len(construction_sets)} variants as Celery tasks")
            return run_batch_parametric_with_celery(
                self,
                simulation,
                idf_files,
                construction_sets,
                weather_file,
                simulator
            )
        
        # Run simulation (non-batch or non-parametric)
        try:
            # For non-batch mode, run with minimal parallelism (Celery handles concurrency)
            simulator.run_simulation(
                parallel=False,  # Disable ThreadPoolExecutor
                max_workers=1,   # Single-threaded execution
                batch_mode=False,
                construction_sets=None
            )
        except SoftTimeLimitExceeded:
            simulation.status = 'failed'
            simulation.error_message = 'Simulation exceeded time limit'
            simulation.save()
            raise
        
        # Simulation completed successfully
        simulation.status = 'completed'
        simulation.progress = 100
        simulation.save()
        
        return {
            'status': 'completed',
            'simulation_id': simulation_id,
            'message': 'Simulation completed successfully'
        }
        
    except SoftTimeLimitExceeded:
        # Handle timeout
        try:
            simulation = Simulation.objects.get(id=simulation_id)
            simulation.status = 'failed'
            simulation.error_message = 'Task exceeded time limit'
            simulation.save()
        except Exception:
            pass
        raise
        
    except Exception as e:
        # Handle any other errors
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"ERROR in run_energyplus_batch_task: {error_msg}")
        
        try:
            simulation = Simulation.objects.get(id=simulation_id)
            simulation.status = 'failed'
            simulation.error_message = str(e)
            simulation.save()
        except Exception:
            pass
        
        return {
            'status': 'failed',
            'error': str(e),
            'simulation_id': simulation_id
        }


@shared_task(name='simulation.cleanup_old_results')
def cleanup_old_results(days_old: int = 30):
    """
    Periodic task to clean up old simulation results.
    
    Args:
        days_old: Delete simulations older than this many days
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import Simulation
    
    cutoff_date = timezone.now() - timedelta(days=days_old)
    old_simulations = Simulation.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['completed', 'failed']
    )
    
    count = 0
    for sim in old_simulations:
        try:
            # Delete files from storage
            results_dir = Path(settings.MEDIA_ROOT) / 'simulation_results' / str(sim.id)
            if results_dir.exists():
                import shutil
                shutil.rmtree(results_dir)
            
            files_dir = Path(settings.MEDIA_ROOT) / 'simulation_files' / str(sim.id)
            if files_dir.exists():
                import shutil
                shutil.rmtree(files_dir)
            
            # Delete database record
            sim.delete()
            count += 1
        except Exception as e:
            print(f"Failed to cleanup simulation {sim.id}: {e}")
    
    return {
        'status': 'completed',
        'deleted_count': count,
        'cutoff_date': cutoff_date.isoformat()
    }


@shared_task(bind=True, name='simulation.health_check')
def health_check_task(self):
    """Simple health check task to verify Celery is working."""
    return {
        'status': 'healthy',
        'task_id': self.request.id,
        'timestamp': str(__import__('datetime').datetime.now())
    }
