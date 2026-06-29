# Validación de eventos de partido (resultados): tipo y minuto.
import pytest
from pydantic import ValidationError

from app.schemas.partidos import EventoPartidoCreate, PartidoUpdate


def test_evento_tipo_valido_ok():
    ev = EventoPartidoCreate(atleta_jugador_id=1, tipo_evento="gol", minuto=10)
    assert ev.tipo_evento == "gol"


def test_evento_tipo_invalido_rechazado():
    with pytest.raises(ValidationError):
        EventoPartidoCreate(atleta_jugador_id=1, tipo_evento="autogol")


def test_evento_minuto_negativo_rechazado():
    with pytest.raises(ValidationError):
        EventoPartidoCreate(atleta_jugador_id=1, tipo_evento="gol", minuto=-1)


def test_partido_estado_valido_ok():
    assert PartidoUpdate(estado="en_curso").estado == "en_curso"


def test_partido_estado_invalido_rechazado():
    with pytest.raises(ValidationError):
        PartidoUpdate(estado="cancelado")


def test_partido_motivo_demasiado_largo_rechazado():
    with pytest.raises(ValidationError):
        PartidoUpdate(motivo_reprogramacion="x" * 501)
