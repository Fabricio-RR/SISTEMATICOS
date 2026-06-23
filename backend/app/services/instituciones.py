"""
Normalización y detección de instituciones duplicadas.

Una misma institución suele escribirse de formas distintas:
"Universidad Tecnológica del Perú", "UTP", "UNIVERSIDAD TECNOLOGICA DEL PERU".
Este módulo reduce esas variantes a una forma comparable para poder avisar (o
bloquear) cuando alguien intenta registrar algo que ya existe.

Solo usa la librería estándar (sin dependencias nuevas). Todas las funciones de
texto son puras; `candidatos_duplicados` es la única que toca la base de datos.

Es la *única* fuente de verdad de la normalización: el frontend nunca recalcula,
siempre consulta el endpoint que se apoya en estas funciones.
"""

from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.core.texto import normalizar
from app.models.instituciones import Institucion

__all__ = [
    "normalizar",
    "clave_canonica",
    "sigla",
    "candidatos_duplicados",
    "hay_duplicado_exacto",
    "Candidato",
    "UMBRAL_PARECIDO",
]

# Palabras que describen el *tipo* de institución, no su identidad. Se ignoran al
# construir la clave canónica para que "Colegio San José" y "San José" coincidan.
_PALABRAS_TIPO: frozenset[str] = frozenset({
    "UNIVERSIDAD", "INSTITUTO", "COLEGIO", "ESCUELA", "CENTRO", "EDUCATIVO",
    "NACIONAL", "CLUB", "IE", "IES", "CETPRO", "UNIVERSITARIO",
})

# Conectores sin valor distintivo. Se ignoran tanto en la clave canónica como en
# la sigla (así "Universidad Tecnológica del Perú" → "UTP", saltando "del").
_CONECTORES: frozenset[str] = frozenset({
    "DEL", "DE", "LA", "EL", "LOS", "LAS", "Y", "DA", "DO", "E",
})

# Umbral de similitud difusa (0..1) para marcar nombres "parecidos". Conservador
# a propósito: preferimos avisar de menos que bloquear instituciones legítimas.
UMBRAL_PARECIDO = 0.82


def _tokens(texto: str | None) -> list[str]:
    return normalizar(texto).split()


def clave_canonica(nombre: str | None) -> str:
    """
    Forma canónica que define la coincidencia *exacta*: quita palabras de tipo y
    conectores y deja el núcleo identificador. Es lo que se guarda en la columna
    `nombre_normalizado`. Si tras quitar todo no queda nada (el nombre era solo
    palabras genéricas), cae al texto normalizado completo.
    """
    nucleo = [t for t in _tokens(nombre) if t not in _PALABRAS_TIPO and t not in _CONECTORES]
    if not nucleo:
        return normalizar(nombre)
    return " ".join(nucleo)


def sigla(nombre: str | None) -> str:
    """
    Iniciales de los tokens significativos, saltando solo conectores. Detecta el
    caso sigla ↔ nombre largo: sigla("Universidad Tecnológica del Perú") == "UTP".
    """
    return "".join(t[0] for t in _tokens(nombre) if t not in _CONECTORES)


@dataclass
class Candidato:
    """Una institución existente que podría ser la misma que se intenta crear."""
    institucion: Institucion
    motivo: str          # "exacto" | "sigla" | "parecido"
    score: float         # 0..1, mayor = más probable
    exacto: bool         # True solo en coincidencia idéntica tras normalizar


def _clave_de(inst: Institucion) -> str:
    # Usa la columna persistida si existe; si no (datos viejos), la recomputa.
    return inst.nombre_normalizado or clave_canonica(inst.nombre)


def candidatos_duplicados(
    db: Session,
    nombre: str,
    nombre_corto: str | None = None,
    *,
    excluir_id: int | None = None,
) -> list[Candidato]:
    """
    Devuelve las instituciones existentes que podrían ser duplicadas del nombre
    dado, ordenadas de más a menos probable. Compara en memoria contra toda la
    tabla: es pequeña (decenas/cientos de filas) y el match exacto se apoya en la
    columna indexada. Si la tabla creciera mucho, el filtro difuso se puede acotar
    por ciudad o primera letra antes de comparar.
    """
    nombre_norm = normalizar(nombre)
    clave = clave_canonica(nombre)
    sig = sigla(nombre)
    corto_norm = normalizar(nombre_corto)

    resultados: list[Candidato] = []
    for inst in db.query(Institucion).all():
        if excluir_id is not None and inst.id == excluir_id:
            continue

        e_nombre_norm = normalizar(inst.nombre)
        e_clave = _clave_de(inst)
        e_sig = sigla(inst.nombre)
        e_corto_norm = normalizar(inst.nombre_corto)

        if clave and (clave == e_clave or nombre_norm == e_nombre_norm):
            resultados.append(Candidato(inst, "exacto", 1.0, True))
            continue

        # Coincidencia por sigla (requiere al menos 2 letras para evitar ruido).
        por_sigla = (
            (len(sig) >= 2 and (sig == e_corto_norm or sig == e_sig))
            or (len(corto_norm) >= 2 and (corto_norm == e_sig or corto_norm == e_corto_norm))
        )
        if por_sigla:
            resultados.append(Candidato(inst, "sigla", 0.9, False))
            continue

        ratio = SequenceMatcher(None, nombre_norm, e_nombre_norm).ratio()
        if ratio >= UMBRAL_PARECIDO:
            resultados.append(Candidato(inst, "parecido", round(ratio, 2), False))

    resultados.sort(key=lambda c: c.score, reverse=True)
    return resultados


def hay_duplicado_exacto(candidatos: list[Candidato]) -> Candidato | None:
    """Primer candidato exacto, si lo hay (el que justifica bloquear)."""
    return next((c for c in candidatos if c.exacto), None)
