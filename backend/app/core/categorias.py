CATEGORIA_PAIS: dict[str, str] = {
    "Primer año":   "Brasil",
    "Segundo año":  "Argentina",
    "Tercer año":   "Alemania",
    "Cuarto año":   "España",
    "Quinto año":   "Francia",
}

CATEGORIAS = list(CATEGORIA_PAIS.keys())


def pais_por_categoria(categoria: str) -> str | None:
    return CATEGORIA_PAIS.get(categoria)
