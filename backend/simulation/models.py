from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Simulation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    results_file = models.FileField(upload_to='simulation_results', null=True, blank=True)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} - {self.status}"

class SimulationFile(models.Model):
    simulation = models.ForeignKey(Simulation, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='simulation_files')
    file_type = models.CharField(max_length=50)  # 'idf' or 'weather'
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_type} file for {self.simulation.name}"