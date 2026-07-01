"""
Asigna país y emoji según nivel educativo peruano y categoría (grado/año/ciclo).
La asignación de país ahora es POR EQUIPO en un deporte, no por institución.
"""

# Lista maestra de países en orden de prioridad para asignación.
# Se usa como fallback cuando el país deseado ya está tomado en ese deporte.
LISTA_PAISES: list[tuple[str, str]] = [
    ("Brasil", "🇧🇷"),
    ("Argentina", "🇦🇷"),
    ("Colombia", "🇨🇴"),
    ("Chile", "🇨🇱"),
    ("Francia", "🇫🇷"),
    ("Estados Unidos", "🇺🇸"),
    ("España", "🇪🇸"),
    ("Italia", "🇮🇹"),
    ("Alemania", "🇩🇪"),
    ("Japón", "🇯🇵"),
    ("Australia", "🇦🇺"),
    ("México", "🇲🇽"),
    ("Ecuador", "🇪🇨"),
    ("Bolivia", "🇧🇴"),
    ("Venezuela", "🇻🇪"),
    ("Uruguay", "🇺🇾"),
    ("Paraguay", "🇵🇾"),
    ("Canadá", "🇨🇦"),
    ("Portugal", "🇵🇹"),
    ("Países Bajos", "🇳🇱"),
    ("Suecia", "🇸🇪"),
    ("Inglaterra", "🇬🇧"),
    ("Perú", "🇵🇪"),
]

_MAPA: dict[str, dict[str, tuple[str, str]]] = {
    "primaria": {
        "1°": ("México", "🇲🇽"),
        "2°": ("Ecuador", "🇪🇨"),
        "3°": ("Bolivia", "🇧🇴"),
        "4°": ("Venezuela", "🇻🇪"),
        "5°": ("Uruguay", "🇺🇾"),
        "6°": ("Paraguay", "🇵🇾"),
    },
    "secundaria": {
        "1°": ("Brasil", "🇧🇷"),
        "2°": ("Argentina", "🇦🇷"),
        "3°": ("Colombia", "🇨🇴"),
        "4°": ("Chile", "🇨🇱"),
        "5°": ("Francia", "🇫🇷"),
    },
    "universidad": {
        "1° ciclo": ("Estados Unidos", "🇺🇸"),
        "2° ciclo": ("España", "🇪🇸"),
        "3° ciclo": ("Italia", "🇮🇹"),
        "4° ciclo": ("Alemania", "🇩🇪"),
        "5° ciclo": ("Japón", "🇯🇵"),
        "6° ciclo": ("Australia", "🇦🇺"),
        "7° ciclo": ("Canadá", "🇨🇦"),
        "8° ciclo": ("Portugal", "🇵🇹"),
        "9° ciclo": ("Países Bajos", "🇳🇱"),
        "10° ciclo": ("Suecia", "🇸🇪"),
    },
}


def asignar_pais(nivel: str | None, categoria: str | None) -> tuple[str | None, str | None]:
    """Retorna (pais_asignado, pais_emoji) o (None, None) si no coincide."""
    if not nivel or not categoria:
        return None, None
    nivel_norm = nivel.strip().lower()
    categoria_norm = categoria.strip()
    sub = _MAPA.get(nivel_norm, {})
    resultado = sub.get(categoria_norm)
    if resultado:
        return resultado
    return None, None
