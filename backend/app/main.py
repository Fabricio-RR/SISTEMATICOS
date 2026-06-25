from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth, instituciones, usuarios, deportes, club_equipo, torneos, sedes, noticias,
    atleta_jugador, inscripciones, fixture, partidos, estadisticas,
)

app = FastAPI(
    title="Olimpiadas Perú API",
    description="Sistema de gestión para Olimpiadas Perú",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Módulos base
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(instituciones.router, prefix="/api/instituciones", tags=["Instituciones"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])
app.include_router(deportes.router, prefix="/api/deportes", tags=["Deportes"])
app.include_router(club_equipo.router, prefix="/api/equipos", tags=["Equipos"])
app.include_router(torneos.router, prefix="/api/torneos", tags=["Torneos"])
app.include_router(sedes.router, prefix="/api/sedes", tags=["Sedes"])
app.include_router(noticias.router, prefix="/api/noticias", tags=["Noticias"])

# Módulos nuevos
app.include_router(atleta_jugador.router, prefix="/api/atletas", tags=["Atletas / Jugadores"])
app.include_router(inscripciones.router, prefix="/api/inscripciones", tags=["Inscripciones"])
app.include_router(fixture.router, prefix="/api/fixture", tags=["Fixture / Sorteo"])
app.include_router(partidos.router, prefix="/api/partidos", tags=["Partidos"])
app.include_router(estadisticas.router, prefix="/api/estadisticas", tags=["Estadísticas"])


@app.get("/", tags=["Raíz"])
def root():
    return {"message": "Olimpiadas Perú API activa", "docs": "/docs"}