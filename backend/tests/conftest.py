"""
Configuración de pruebas — usa base de datos SQLite en memoria para aislar tests.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Usar SQLite en memoria para tests (no requiere MySQL)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_olimpiadas.db")
os.environ.setdefault("SECRET_KEY", "test_secret_key_para_pruebas")
os.environ.setdefault("SMTP_USER", "")
os.environ.setdefault("SMTP_PASSWORD", "")

from app.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite:///./test_olimpiadas.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_olimpiadas.db"):
        os.remove("test_olimpiadas.db")


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
