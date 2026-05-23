from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.core.limiter import limiter
from app.routers import auth, instituciones, usuarios, deportes, club_equipo, torneos, sedes, noticias, inscripciones, grupos, fixture, partidos, atleta_jugador, estadisticas, notificaciones

app = FastAPI(
    title="Olimpiadas Perú API",
    description="Sistema de gestión para Olimpiadas Perú",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(instituciones.router, prefix="/api/instituciones", tags=["Instituciones"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])
app.include_router(deportes.router, prefix="/api/deportes", tags=["Deportes"])
app.include_router(club_equipo.router, prefix="/api/equipos", tags=["Equipos"])
app.include_router(torneos.router, prefix="/api/torneos", tags=["Torneos"])
app.include_router(sedes.router, prefix="/api/sedes", tags=["Sedes"])
app.include_router(noticias.router, prefix="/api/noticias", tags=["Noticias"])
app.include_router(inscripciones.router, prefix="/api/inscripciones", tags=["Inscripciones"])
app.include_router(grupos.router, prefix="/api/grupos", tags=["Grupos"])
app.include_router(fixture.router, prefix="/api/fixture", tags=["Fixture"])
app.include_router(partidos.router, prefix="/api/partidos", tags=["Partidos"])
app.include_router(atleta_jugador.router, prefix="/api/atletas", tags=["Atletas"])
app.include_router(estadisticas.router, prefix="/api/estadisticas", tags=["Estadísticas"])
app.include_router(notificaciones.router, prefix="/api/notificaciones", tags=["Notificaciones"])


@app.get("/", tags=["Raíz"])
def root():
    return {"message": "Olimpiadas Perú API activa", "docs": "/docs"}