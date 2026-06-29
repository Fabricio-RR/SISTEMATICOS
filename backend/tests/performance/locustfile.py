"""
Pruebas de rendimiento (carga) sobre los endpoints públicos de lectura.

Uso:
    pip install -r requirements-dev.txt
    locust -f tests/performance/locustfile.py --host http://localhost:8000

Luego abrir http://localhost:8089 y definir nº de usuarios y ramp-up.
Modo headless (para CI / reporte):
    locust -f tests/performance/locustfile.py --host http://localhost:8000 \
           --headless -u 50 -r 10 -t 1m --csv reporte_rendimiento
"""
from locust import HttpUser, between, task


class VisitantePortal(HttpUser):
    """Simula a un aficionado navegando el portal público."""
    wait_time = between(1, 3)

    @task(3)
    def portada(self):
        self.client.get("/")

    @task(3)
    def deportes(self):
        self.client.get("/api/deportes/")

    @task(2)
    def torneos(self):
        self.client.get("/api/torneos/")

    @task(2)
    def equipos(self):
        self.client.get("/api/equipos/")

    @task(2)
    def resultados(self):
        self.client.get("/api/partidos/?estado=finalizado")

    @task(1)
    def proximos(self):
        self.client.get("/api/partidos/?estado=programado")
