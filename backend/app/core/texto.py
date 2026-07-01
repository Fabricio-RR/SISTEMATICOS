"""Utilidades de normalización de texto, compartidas por varios módulos.

Mantener esta función en un solo lugar evita que cada módulo (instituciones,
equipos, torneos…) reimplemente su propia comparación de nombres y diverja.
"""

import re
import unicodedata


def normalizar(texto: str | None) -> str:
    """Mayúsculas, sin tildes, solo alfanumérico y espacios colapsados.

    "Los Tigres", "los tigres" y "LOS  TIGRES" → "LOS TIGRES".
    """
    if not texto:
        return ""
    descompuesto = unicodedata.normalize("NFKD", texto)
    sin_tildes = "".join(c for c in descompuesto if not unicodedata.combining(c))
    solo_alfa = re.sub(r"[^A-Za-z0-9 ]+", " ", sin_tildes).upper()
    return re.sub(r"\s+", " ", solo_alfa).strip()
