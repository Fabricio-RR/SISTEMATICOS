"""
Tests de asignación de país por categoría (RF02).
"""
from app.core.pais_categoria import asignar_pais


def test_secundaria_1():
    pais, emoji = asignar_pais("secundaria", "1°")
    assert pais == "Brasil"
    assert emoji == "🇧🇷"


def test_secundaria_5():
    pais, emoji = asignar_pais("secundaria", "5°")
    assert pais == "Francia"
    assert emoji == "🇫🇷"


def test_primaria_1():
    pais, emoji = asignar_pais("primaria", "1°")
    assert pais == "México"


def test_primaria_6():
    pais, emoji = asignar_pais("primaria", "6°")
    assert pais == "Paraguay"


def test_universidad_1():
    pais, emoji = asignar_pais("universidad", "1° ciclo")
    assert pais == "Estados Unidos"


def test_universidad_10():
    pais, emoji = asignar_pais("universidad", "10° ciclo")
    assert pais == "Suecia"


def test_nivel_invalido():
    pais, emoji = asignar_pais("postgrado", "1°")
    assert pais is None
    assert emoji is None


def test_categoria_invalida():
    pais, emoji = asignar_pais("secundaria", "7°")
    assert pais is None


def test_nivel_none():
    pais, emoji = asignar_pais(None, "1°")
    assert pais is None


def test_case_insensitive():
    """El nivel debe ser case-insensitive."""
    pais, emoji = asignar_pais("SECUNDARIA", "1°")
    assert pais == "Brasil"
