# Logic Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the project’s domain logic so tournament flow, enrollments, results, and frontend admin flows behave consistently and stay covered by automated regression checks.

**Architecture:** Add a backend regression harness first, then move fragile tournament/enrollment rules out of routers into small service modules with explicit tests. After the backend contract is stable, align the frontend with those invariants and finish with a verification matrix that can be rerun before every merge.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, Next.js 14, TypeScript, pytest, httpx

---

## Execution Status - 2026-05-23

**Completed in this pass**
- Backend regression harness created and passing (`12` tests).
- Competition rules extracted to `backend/app/services/competition.py`.
- Enrollment and ownership rules extracted to `backend/app/services/enrollment.py`.
- Database-level constraints added in models plus Alembic migration `0010`.
- Regression matrix documented in `DOCS/logic-regression-matrix.md`.
- README updated with backend regression commands.

**Still pending if you want to continue later**
- Frontend error helper unification (`frontend/lib/errors.ts`).
- Frontend alignment work in admin pages (`encuentros`, `resultados`, `torneos`, shared layouts) beyond the backend contract already stabilized.

---

## Scope And File Map

**Create**
- `backend/requirements-dev.txt`
- `backend/pytest.ini`
- `backend/tests/conftest.py`
- `backend/tests/factories.py`
- `backend/tests/test_smoke_app.py`
- `backend/tests/services/test_competition.py`
- `backend/tests/services/test_enrollment.py`
- `backend/app/services/__init__.py`
- `backend/app/services/competition.py`
- `backend/app/services/enrollment.py`
- `backend/alembic/versions/0010_logic_constraints.py`
- `frontend/lib/errors.ts`
- `DOCS/logic-regression-matrix.md`

**Modify**
- `backend/app/routers/torneos.py`
- `backend/app/routers/fixture.py`
- `backend/app/routers/partidos.py`
- `backend/app/routers/inscripciones.py`
- `backend/app/routers/club_equipo.py`
- `backend/app/routers/atleta_jugador.py`
- `backend/app/models/club_equipo.py`
- `backend/app/models/inscripciones.py`
- `backend/app/models/atleta_jugador.py`
- `backend/app/models/partidos.py`
- `frontend/lib/api.ts`
- `frontend/app/admin/sorteos/page.tsx`
- `frontend/app/admin/inscripciones/page.tsx`
- `frontend/app/admin/encuentros/page.tsx`
- `frontend/app/admin/resultados/page.tsx`
- `frontend/app/admin/torneos/page.tsx`
- `frontend/app/admin/layout.tsx`
- `frontend/app/institucion/layout.tsx`
- `README.md`

**Why this split**
- Backend routers currently own too much business logic, which makes fixes risky and repetitive.
- The repo has no test harness, so every logic change is currently a blind edit.
- Frontend admin pages are already coupled to backend state rules, so contract alignment must happen after backend rules are stabilized, not before.

---

### Task 1: Create A Backend Regression Harness

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/pytest.ini`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/factories.py`
- Create: `backend/tests/test_smoke_app.py`

- [ ] **Step 1: Write the failing smoke test**

```python
# backend/tests/test_smoke_app.py
def test_root_endpoint_returns_docs_link(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Olimpiadas Perú API activa",
        "docs": "/docs",
    }


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_smoke_app.py -q`
Expected: FAIL because `pytest` and `httpx` are not installed and the repo does not yet provide a test client fixture.

- [ ] **Step 3: Add the test dependencies and pytest config**

```txt
# backend/requirements-dev.txt
-r requirements.txt
pytest==8.3.5
httpx==0.28.1
```

```ini
# backend/pytest.ini
[pytest]
pythonpath = .
testpaths = tests
addopts = -q
```

- [ ] **Step 4: Add reusable test fixtures and factories**

```python
# backend/tests/conftest.py
import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

import app.models  # noqa: F401, E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def reset_db() -> Iterator[None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session() -> Iterator[Session]:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

```python
# backend/tests/factories.py
from app.core.security import hash_password
from app.models.club_equipo import ClubEquipo
from app.models.deportes import Deporte
from app.models.inscripciones import Inscripcion
from app.models.instituciones import Institucion
from app.models.partidos import Partido
from app.models.torneos import Torneo
from app.models.usuarios import Usuario


def make_institucion(nombre: str = "Colegio Demo", nombre_corto: str = "DEMO") -> Institucion:
    return Institucion(nombre=nombre, nombre_corto=nombre_corto, ciudad="Lima", estado="activo")


def make_user(rol: str = "admin", institucion_id: int | None = None) -> Usuario:
    return Usuario(
        nombres="Test",
        apellidos="User",
        correo=f"{rol}-{institucion_id or 0}@test.pe",
        contrasena_hash=hash_password("Admin1234!"),
        rol=rol,
        esta_activo=True,
        institucion_id=institucion_id,
    )


def make_deporte(nombre: str = "Fútbol Varones") -> Deporte:
    return Deporte(nombre=nombre, tipo_competidor="equipo", esta_activo=True)


def make_torneo(deporte_id: int, estado: str = "inscripcion_abierta", formato: str = "liga") -> Torneo:
    return Torneo(deporte_id=deporte_id, nombre="Torneo Demo", formato=formato, temporada="2026", estado=estado)


def make_equipo(institucion_id: int, deporte_id: int, nombre_equipo: str) -> ClubEquipo:
    return ClubEquipo(institucion_id=institucion_id, deporte_id=deporte_id, nombre_equipo=nombre_equipo, estado="aprobado")


def make_inscripcion(torneo_id: int, club_equipo_id: int, estado: str = "aprobado") -> Inscripcion:
    return Inscripcion(torneo_id=torneo_id, club_equipo_id=club_equipo_id, estado=estado)


def make_partido(fixture_id: int, local_id: int, visitante_id: int) -> Partido:
    return Partido(fixture_id=fixture_id, inscripcion_local_id=local_id, inscripcion_visitante_id=visitante_id)
```

- [ ] **Step 5: Run the smoke test and commit the harness**

Run: `cd backend && python -m pip install -r requirements-dev.txt && python -m pytest tests/test_smoke_app.py`
Expected: PASS

```bash
git add backend/requirements-dev.txt backend/pytest.ini backend/tests
git commit -m "test: add backend regression harness"
```

---

### Task 2: Centralize Competition Rules In A Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/competition.py`
- Create: `backend/tests/services/test_competition.py`
- Modify: `backend/app/routers/torneos.py`
- Modify: `backend/app/routers/fixture.py`
- Modify: `backend/app/routers/partidos.py`
- Modify: `backend/app/routers/inscripciones.py`

- [ ] **Step 1: Write failing unit tests for tournament transitions and result recalculation**

```python
# backend/tests/services/test_competition.py
import pytest

from app.services.competition import (
    apply_result_change,
    assert_transition_allowed,
    collect_winners,
)


def test_apply_result_change_reverses_previous_points(db_session):
    from app.models.fixture import Fixture
    from tests.factories import make_deporte, make_equipo, make_inscripcion, make_institucion, make_torneo

    inst_a = make_institucion("Colegio A", "COLA")
    inst_b = make_institucion("Colegio B", "COLB")
    db_session.add_all([inst_a, inst_b])
    db_session.commit()

    deporte = make_deporte()
    db_session.add(deporte)
    db_session.commit()

    torneo = make_torneo(deporte.id, estado="en_curso")
    db_session.add(torneo)
    db_session.commit()

    equipo_a = make_equipo(inst_a.id, deporte.id, "A")
    equipo_b = make_equipo(inst_b.id, deporte.id, "B")
    db_session.add_all([equipo_a, equipo_b])
    db_session.commit()

    insc_a = make_inscripcion(torneo.id, equipo_a.id)
    insc_b = make_inscripcion(torneo.id, equipo_b.id)
    db_session.add_all([insc_a, insc_b])
    db_session.commit()

    fixture = Fixture(torneo_id=torneo.id, jornada=1, nombre_fase="Jornada 1")
    db_session.add(fixture)
    db_session.commit()

    from app.models.partidos import Partido

    partido = Partido(
        fixture_id=fixture.id,
        inscripcion_local_id=insc_a.id,
        inscripcion_visitante_id=insc_b.id,
        resultado_local=2,
        resultado_visitante=1,
        estado="finalizado",
    )
    db_session.add(partido)
    db_session.commit()
    db_session.refresh(partido)
    db_session.refresh(insc_a)
    db_session.refresh(insc_b)

    apply_result_change(partido, insc_a, insc_b, 1, 1)

    assert insc_a.puntos == 1
    assert insc_b.puntos == 1
    assert insc_a.partidos_ganados == 0
    assert insc_b.partidos_perdidos == 0


def test_transition_to_en_curso_requires_fixture():
    class DummyTorneo:
        id = 9
        estado = "en_sorteo"
        formato = "liga"

    with pytest.raises(Exception):
        assert_transition_allowed(DummyTorneo(), "en_curso", aprobadas=4, fixture_count=0, pending_matches=0)


def test_collect_winners_rejects_draws():
    class DummyPartido:
        id = 7
        resultado_local = 1
        resultado_visitante = 1
        inscripcion_local_id = 3
        inscripcion_visitante_id = 4

    with pytest.raises(Exception):
        collect_winners([DummyPartido()])
```

- [ ] **Step 2: Run service tests to verify they fail**

Run: `cd backend && python -m pytest tests/services/test_competition.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.competition'`.

- [ ] **Step 3: Write the competition service**

```python
# backend/app/services/competition.py
from fastapi import HTTPException, status


def assert_transition_allowed(torneo, siguiente: str, *, aprobadas: int, fixture_count: int, pending_matches: int) -> None:
    if siguiente == "en_sorteo" and aprobadas < 2:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Se necesitan al menos 2 equipos aprobados para pasar a sorteo")
    if siguiente == "en_curso":
        if aprobadas < 2:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Se necesitan al menos 2 equipos aprobados para iniciar el torneo")
        if torneo.formato in ("liga", "grupos") and fixture_count == 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Genera el fixture antes de iniciar el torneo")
    if siguiente == "finalizado":
        if fixture_count == 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se puede finalizar un torneo sin partidos generados")
        if pending_matches > 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Faltan {pending_matches} partido(s) por finalizar antes de cerrar el torneo")


def _apply_score(local, visitante, rl: int, rv: int, *, factor: int) -> None:
    local.partidos_jugados += factor
    visitante.partidos_jugados += factor
    if rl > rv:
        local.partidos_ganados += factor
        local.puntos += 3 * factor
        visitante.partidos_perdidos += factor
    elif rv > rl:
        visitante.partidos_ganados += factor
        visitante.puntos += 3 * factor
        local.partidos_perdidos += factor
    else:
        local.partidos_empatados += factor
        visitante.partidos_empatados += factor
        local.puntos += factor
        visitante.puntos += factor


def apply_result_change(partido, local, visitante, nuevo_local: int, nuevo_visitante: int) -> None:
    if partido.estado == "finalizado" and partido.resultado_local is not None and partido.resultado_visitante is not None:
        _apply_score(local, visitante, partido.resultado_local, partido.resultado_visitante, factor=-1)
    partido.resultado_local = nuevo_local
    partido.resultado_visitante = nuevo_visitante
    partido.estado = "finalizado"
    partido.es_walkover = False
    _apply_score(local, visitante, nuevo_local, nuevo_visitante, factor=1)


def collect_winners(partidos: list) -> list[int]:
    winners: list[int] = []
    for partido in partidos:
        if partido.resultado_local is None or partido.resultado_visitante is None:
            raise HTTPException(status_code=400, detail=f"El partido #{partido.id} no tiene resultado")
        if partido.resultado_local == partido.resultado_visitante:
            raise HTTPException(status_code=400, detail=f"El partido #{partido.id} terminó empatado. En fase eliminatoria no puede haber empates.")
        if partido.resultado_local > partido.resultado_visitante:
            winners.append(partido.inscripcion_local_id)
        else:
            winners.append(partido.inscripcion_visitante_id)
    return winners


def apply_walkover(partido, inscripcion_retirada_id: int) -> None:
    local = partido.local
    visitante = partido.visitante
    if partido.inscripcion_local_id == inscripcion_retirada_id:
        partido.resultado_local = 0
        partido.resultado_visitante = 3
        if local:
            local.partidos_jugados += 1
            local.partidos_perdidos += 1
        if visitante:
            visitante.partidos_jugados += 1
            visitante.partidos_ganados += 1
            visitante.puntos += 3
    else:
        partido.resultado_local = 3
        partido.resultado_visitante = 0
        if local:
            local.partidos_jugados += 1
            local.partidos_ganados += 1
            local.puntos += 3
        if visitante:
            visitante.partidos_jugados += 1
            visitante.partidos_perdidos += 1
    partido.es_walkover = True
    partido.estado = "finalizado"
```

- [ ] **Step 4: Replace duplicated router logic with service calls**

```python
# backend/app/routers/torneos.py
from app.services.competition import assert_transition_allowed

# inside avanzar()
aprobadas = _contar_inscripciones_aprobadas(torneo.id, db)
fixture_count = db.query(Fixture).filter(Fixture.torneo_id == torneo.id).count()
pending_matches = (
    db.query(Partido)
    .join(Fixture, Partido.fixture_id == Fixture.id)
    .filter(Fixture.torneo_id == torneo.id, Partido.estado != "finalizado")
    .count()
)
assert_transition_allowed(
    torneo,
    siguiente,
    aprobadas=aprobadas,
    fixture_count=fixture_count,
    pending_matches=pending_matches,
)
```

```python
# backend/app/routers/partidos.py
from app.services.competition import apply_result_change

# inside set_resultado()
apply_result_change(p, p.local, p.visitante, data.resultado_local, data.resultado_visitante)
```

```python
# backend/app/routers/fixture.py
from app.services.competition import collect_winners

# inside generar_siguiente_fase()
ganadores = collect_winners(sorted(partidos, key=lambda x: x.id))
```

```python
# backend/app/routers/inscripciones.py
from app.services.competition import apply_walkover

# inside retirar()
for p in partidos_pendientes:
    apply_walkover(p, id)
```

- [ ] **Step 5: Run service tests and commit**

Run: `cd backend && python -m pytest tests/services/test_competition.py`
Expected: PASS

```bash
git add backend/app/services backend/app/routers backend/tests/services/test_competition.py
git commit -m "refactor: centralize competition rules"
```

---

### Task 3: Enforce Enrollment And Data-Boundary Invariants

**Files:**
- Create: `backend/app/services/enrollment.py`
- Create: `backend/tests/services/test_enrollment.py`
- Create: `backend/alembic/versions/0010_logic_constraints.py`
- Modify: `backend/app/models/club_equipo.py`
- Modify: `backend/app/models/atleta_jugador.py`
- Modify: `backend/app/models/inscripciones.py`
- Modify: `backend/app/models/partidos.py`
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/app/routers/club_equipo.py`
- Modify: `backend/app/routers/atleta_jugador.py`
- Modify: `backend/app/routers/inscripciones.py`

- [ ] **Step 1: Write failing tests for duplicate enrollment data and impossible matches**

```python
# backend/tests/services/test_enrollment.py
import pytest
from sqlalchemy.exc import IntegrityError


def test_duplicate_inscripcion_hits_database_constraint(db_session):
    from tests.factories import make_deporte, make_equipo, make_inscripcion, make_institucion, make_torneo

    inst = make_institucion()
    db_session.add(inst)
    db_session.commit()

    deporte = make_deporte()
    db_session.add(deporte)
    db_session.commit()

    torneo = make_torneo(deporte.id)
    equipo = make_equipo(inst.id, deporte.id, "Equipo A")
    db_session.add_all([torneo, equipo])
    db_session.commit()

    db_session.add(make_inscripcion(torneo.id, equipo.id))
    db_session.commit()

    db_session.add(make_inscripcion(torneo.id, equipo.id))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_partido_rejects_same_team_twice(db_session):
    from app.models.fixture import Fixture
    from app.models.partidos import Partido
    from tests.factories import make_deporte, make_equipo, make_inscripcion, make_institucion, make_torneo

    inst = make_institucion()
    db_session.add(inst)
    db_session.commit()
    deporte = make_deporte()
    db_session.add(deporte)
    db_session.commit()
    torneo = make_torneo(deporte.id)
    equipo = make_equipo(inst.id, deporte.id, "Equipo A")
    db_session.add_all([torneo, equipo])
    db_session.commit()
    insc = make_inscripcion(torneo.id, equipo.id)
    db_session.add(insc)
    db_session.commit()
    fixture = Fixture(torneo_id=torneo.id, jornada=1, nombre_fase="Jornada 1")
    db_session.add(fixture)
    db_session.commit()

    db_session.add(Partido(fixture_id=fixture.id, inscripcion_local_id=insc.id, inscripcion_visitante_id=insc.id))
    with pytest.raises(IntegrityError):
        db_session.commit()
```

- [ ] **Step 2: Run enrollment tests to verify they fail**

Run: `cd backend && python -m pytest tests/services/test_enrollment.py`
Expected: FAIL because the DB constraints and shared enrollment service do not exist yet.

- [ ] **Step 3: Add model constraints and migration**

```python
# backend/app/models/inscripciones.py
from sqlalchemy import UniqueConstraint

class Inscripcion(Base):
    __tablename__ = "inscripciones"
    __table_args__ = (
        UniqueConstraint("torneo_id", "club_equipo_id", name="uq_inscripcion_torneo_equipo"),
    )
```

```python
# backend/app/models/club_equipo.py
from sqlalchemy import UniqueConstraint

class ClubEquipo(Base):
    __tablename__ = "club_equipo"
    __table_args__ = (
        UniqueConstraint("institucion_id", "deporte_id", "nombre_equipo", name="uq_equipo_inst_dep_nombre"),
    )
```

```python
# backend/app/models/atleta_jugador.py
from sqlalchemy import UniqueConstraint

class AtletaJugador(Base):
    __tablename__ = "atleta_jugador"
    __table_args__ = (
        UniqueConstraint("club_equipo_id", "documento_identidad", name="uq_atleta_equipo_documento"),
    )
```

```python
# backend/app/models/partidos.py
from sqlalchemy import CheckConstraint

class Partido(Base):
    __tablename__ = "partidos"
    __table_args__ = (
        CheckConstraint("inscripcion_local_id <> inscripcion_visitante_id", name="ck_partido_equipos_distintos"),
    )
```

```python
# backend/alembic/versions/0010_logic_constraints.py
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_equipo_inst_dep_nombre", "club_equipo", ["institucion_id", "deporte_id", "nombre_equipo"])
    op.create_unique_constraint("uq_atleta_equipo_documento", "atleta_jugador", ["club_equipo_id", "documento_identidad"])
    op.create_unique_constraint("uq_inscripcion_torneo_equipo", "inscripciones", ["torneo_id", "club_equipo_id"])
    op.create_check_constraint("ck_partido_equipos_distintos", "partidos", "inscripcion_local_id <> inscripcion_visitante_id")


def downgrade() -> None:
    op.drop_constraint("ck_partido_equipos_distintos", "partidos", type_="check")
    op.drop_constraint("uq_inscripcion_torneo_equipo", "inscripciones", type_="unique")
    op.drop_constraint("uq_atleta_equipo_documento", "atleta_jugador", type_="unique")
    op.drop_constraint("uq_equipo_inst_dep_nombre", "club_equipo", type_="unique")
```

- [ ] **Step 4: Add an enrollment service and simplify the routers**

```python
# backend/app/services/enrollment.py
from fastapi import HTTPException, status


def assert_team_creation_allowed(*, requester_role: str, requester_institucion_id: int | None, payload_institucion_id: int) -> None:
    if requester_role != "admin" and payload_institucion_id != requester_institucion_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes crear equipos para tu institución")


def assert_athlete_edit_allowed(*, requester_role: str, requester_institucion_id: int | None, athlete_institucion_id: int | None) -> None:
    if requester_role != "admin" and athlete_institucion_id != requester_institucion_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes editar atletas de tu institución")


def assert_inscripcion_allowed(*, requester_role: str, requester_institucion_id: int | None, club_institucion_id: int, club_deporte_id: int, torneo_deporte_id: int, torneo_estado: str) -> None:
    if torneo_estado != "inscripcion_abierta":
        raise HTTPException(status_code=400, detail=f"Las inscripciones están cerradas. El torneo está en estado '{torneo_estado}'.")
    if club_deporte_id != torneo_deporte_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El deporte del equipo no coincide con el torneo")
    if requester_role != "admin" and club_institucion_id != requester_institucion_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes inscribir equipos de tu institución")
```

```python
# backend/app/routers/inscripciones.py
from app.services.enrollment import assert_inscripcion_allowed

assert_inscripcion_allowed(
    requester_role=current.rol,
    requester_institucion_id=current.institucion_id,
    club_institucion_id=club.institucion_id,
    club_deporte_id=club.deporte_id,
    torneo_deporte_id=torneo.deporte_id,
    torneo_estado=torneo.estado,
)
```

- [ ] **Step 5: Run enrollment tests and commit**

Run: `cd backend && python -m pytest tests/services/test_enrollment.py`
Expected: PASS

```bash
git add backend/app/services/enrollment.py backend/app/models backend/app/routers backend/alembic/versions/0010_logic_constraints.py backend/tests/services/test_enrollment.py
git commit -m "fix: enforce enrollment and data invariants"
```

---

### Task 4: Align Frontend Flows With Backend Invariants

**Files:**
- Create: `frontend/lib/errors.ts`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/admin/sorteos/page.tsx`
- Modify: `frontend/app/admin/inscripciones/page.tsx`
- Modify: `frontend/app/admin/encuentros/page.tsx`
- Modify: `frontend/app/admin/resultados/page.tsx`
- Modify: `frontend/app/admin/torneos/page.tsx`
- Modify: `frontend/app/admin/layout.tsx`
- Modify: `frontend/app/institucion/layout.tsx`

- [ ] **Step 1: Introduce failing imports for a shared error/session helper**

```ts
// frontend/app/admin/inscripciones/page.tsx
import { getErrorMessage } from "@/lib/errors";
```

```ts
// frontend/app/admin/sorteos/page.tsx
import { getErrorMessage } from "@/lib/errors";
```

```ts
// frontend/app/admin/layout.tsx
import { clearSession } from "@/lib/errors";
```

```ts
// frontend/app/institucion/layout.tsx
import { clearSession } from "@/lib/errors";
```

- [ ] **Step 2: Run the frontend build to confirm current behavior is still only build-level verified**

Run: `cd frontend && npm run build`
Expected: FAIL with `Cannot find module '@/lib/errors'`.

- [ ] **Step 3: Create the shared helper and reuse it**

```ts
// frontend/lib/errors.ts
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return fallback;
}

export function clearSession(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("nombre");
}
```

```ts
// frontend/app/admin/inscripciones/page.tsx
catch (e) {
  setError(getErrorMessage(e, "No se pudo aprobar la inscripción."));
}
```

```ts
// frontend/app/admin/sorteos/page.tsx
catch (e) {
  setError(getErrorMessage(e, "No se pudo eliminar el fixture."));
  setState("error");
}
```

```ts
// frontend/app/admin/layout.tsx
function logout() {
  clearSession();
  router.push("/login");
}
```

- [ ] **Step 4: Gate frontend actions strictly by backend states**

```ts
// frontend/app/admin/torneos/page.tsx
const siguiente = ESTADO_TORNEO_SIGUIENTE[t.estado];
const puedeEliminar = t.estado !== "en_curso" && t.estado !== "finalizado";
const puedeAvanzar = Boolean(siguiente);
```

```ts
// frontend/app/admin/resultados/page.tsx
const torneosEnCurso = torneos.filter((t) => t.estado === "en_curso");
setPartidos(p.filter((x) => x.estado !== "finalizado"));
```

```ts
// frontend/app/admin/encuentros/page.tsx
if (fechaCambio && !motivo.trim()) {
  setError("Debes ingresar un motivo para reprogramar el partido.");
  return;
}
```

- [ ] **Step 5: Rebuild frontend and commit**

Run: `cd frontend && npm run build`
Expected: PASS

```bash
git add frontend/lib/errors.ts frontend/lib/api.ts frontend/app/admin frontend/app/institucion/layout.tsx frontend/app/admin/layout.tsx
git commit -m "fix: align frontend flows with backend invariants"
```

---

### Task 5: Publish A Repeatable Verification Matrix

**Files:**
- Create: `docs/logic-regression-matrix.md`
- Modify: `README.md`
- Modify: `DOCS/Registro_Cambios_22_MAY_Orlando.md`

- [ ] **Step 1: Write the failing regression matrix draft**

```markdown
# Logic Regression Matrix

## Backend
- torneo no avanza a `en_curso` sin fixture
- resultado corregido revierte puntos anteriores
- inscripción duplicada devuelve error controlado
- partido no puede enfrentar la misma inscripción contra sí misma

## Frontend
- Sorteos conserva estado si falla delete
- Inscripciones muestra error al aprobar/rechazar/eliminar
- Resultados solo permite capturar marcadores en torneos `en_curso`
```

- [ ] **Step 2: Run the full verification suite before documenting the final commands**

Run: `cd backend && python -m pytest`
Expected: PASS for backend test suite.

Run: `cd frontend && npm run build`
Expected: PASS for frontend production build.

- [ ] **Step 3: Save the real regression matrix**

```markdown
# Logic Regression Matrix

## 1. Backend test suite
Run: `cd backend && python -m pytest`
Expect: `tests/test_smoke_app.py`, `tests/services/test_competition.py`, `tests/services/test_enrollment.py` all PASS.

## 2. Frontend production build
Run: `cd frontend && npm run build`
Expect: Next.js build completes without ESLint or type errors.

## 3. Manual tournament flow
1. Crear torneo `liga`
2. Aprobar 2 inscripciones
3. Avanzar a `en_sorteo`
4. Generar fixture
5. Avanzar a `en_curso`
6. Registrar un resultado
7. Corregir el resultado
8. Confirmar que la tabla se recalcula

## 4. Manual enrollment flow
1. Crear equipo desde usuario institución
2. Confirmar `estado = pendiente`
3. Aprobar como admin
4. Intentar duplicar inscripción
5. Confirmar error controlado
```

- [ ] **Step 4: Update the repo docs and change log**

```markdown
# README.md
## QA rápida
- `cd backend && python -m pytest`
- `cd frontend && npm run build`
```

```markdown
# DOCS/Registro_Cambios_22_MAY_Orlando.md
- Agregada suite de regresión backend
- Centralizada lógica de competencia e inscripción
- Cerradas inconsistencias de flujo frontend/backend
```

- [ ] **Step 5: Run the final suite and commit**

Run: `cd backend && python -m pytest && cd ../frontend && npm run build`
Expected: PASS

```bash
git add docs/logic-regression-matrix.md README.md DOCS/Registro_Cambios_22_MAY_Orlando.md
git commit -m "docs: add logic regression matrix"
```

---

## Self-Review

**Spec coverage**
- Backend logic safety: covered by Tasks 1, 2, 3.
- Frontend contract alignment: covered by Task 4.
- Repeatable verification and documentation: covered by Task 5.

**Placeholder scan**
- No `TODO`, `TBD`, “similar to”, or unspecified “add tests later” placeholders remain.

**Type consistency**
- Service modules introduced in the plan are `competition.py` and `enrollment.py`.
- Test files reference those exact module names.
- Frontend continues using `api.ts` and `types/api.ts` as the contract boundary.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-logic-stabilization.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
