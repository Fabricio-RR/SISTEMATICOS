from app.services.instituciones import (
    candidatos_duplicados,
    clave_canonica,
    hay_duplicado_exacto,
    normalizar,
    sigla,
)
from tests.factories import make_institucion

# Tres formas de escribir la misma institución.
UTP_LARGO = "Universidad Tecnológica del Perú"
UTP_MAYUS = "UNIVERSIDAD TECNOLOGICA DEL PERU"
UTP_SIGLA = "UTP"


def test_normalizar_quita_tildes_y_mayusculiza():
    assert normalizar(UTP_LARGO) == "UNIVERSIDAD TECNOLOGICA DEL PERU"
    assert normalizar("  Colegio   San José  ") == "COLEGIO SAN JOSE"
    assert normalizar(None) == ""


def test_clave_canonica_iguala_variantes_largas():
    # Las dos formas escritas completas colapsan a la misma clave → duplicado exacto.
    assert clave_canonica(UTP_LARGO) == clave_canonica(UTP_MAYUS)
    assert clave_canonica(UTP_LARGO) == "TECNOLOGICA PERU"


def test_clave_canonica_solo_genericas_cae_a_normalizado():
    # Si tras quitar palabras genéricas no queda nada, usa el texto normalizado.
    assert clave_canonica("Universidad") == "UNIVERSIDAD"


def test_sigla_detecta_acronimo():
    assert sigla(UTP_LARGO) == "UTP"
    assert sigla(UTP_MAYUS) == "UTP"


def test_candidatos_exacto_bloquea(db_session):
    db_session.add(make_institucion(nombre=UTP_LARGO, nombre_corto="UTP"))
    db_session.commit()

    candidatos = candidatos_duplicados(db_session, UTP_MAYUS)
    exacto = hay_duplicado_exacto(candidatos)
    assert exacto is not None
    assert exacto.motivo == "exacto"
    assert exacto.exacto is True


def test_candidatos_sigla_avisa_no_bloquea(db_session):
    db_session.add(make_institucion(nombre=UTP_LARGO, nombre_corto="UTP"))
    db_session.commit()

    # Registrar "UTP" contra "Universidad Tecnológica del Perú": misma sigla, pero
    # la clave canónica difiere → se avisa (no bloquea).
    candidatos = candidatos_duplicados(db_session, UTP_SIGLA, "UTP")
    assert candidatos, "debería detectar al menos un candidato"
    assert hay_duplicado_exacto(candidatos) is None
    assert candidatos[0].motivo in ("sigla", "parecido")


def test_candidatos_sin_relacion_no_marca(db_session):
    db_session.add(make_institucion(nombre=UTP_LARGO, nombre_corto="UTP"))
    db_session.commit()

    assert candidatos_duplicados(db_session, "Club Deportivo Amazonas", "CDA") == []


def test_candidatos_excluye_id(db_session):
    inst = make_institucion(nombre=UTP_LARGO, nombre_corto="UTP")
    db_session.add(inst)
    db_session.commit()

    # Excluyendo la propia institución no debería marcarse a sí misma.
    assert candidatos_duplicados(db_session, UTP_LARGO, excluir_id=inst.id) == []
