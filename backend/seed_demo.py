"""
Seed de datos de prueba realistas para Olimpiadas PERÚ.
Crea instituciones, usuarios, torneos, equipos, jugadores, partidos y noticias.

Ejecutar DESPUÉS de seed.py:
    docker exec -it olimpiadas_backend python seed_demo.py
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.usuarios import Usuario
from app.models.deportes import Deporte
from app.models.instituciones import Institucion
from app.models.torneos import Torneo
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador
from app.models.inscripciones import Inscripcion
from app.models.sedes import Sede
from app.models.noticias import Noticia
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.eventos_partido import EventoPartido
from app.core.security import hash_password
from app.core.pais_categoria import asignar_pais, LISTA_PAISES

db = SessionLocal()

def main():
    if db.query(Institucion).count() > 0:
        print("Los datos de demo ya existen. Omitiendo seed_demo.")
        return

    print("Generando datos de prueba…")

    # ── 1. INSTITUCIONES ──────────────────────────────────────────────────
    inst_data = [
        dict(nombre="UTP – Campus Lima Centro", nombre_corto="UTP-CENTRO",
             ciudad="Lima", nivel="universidad", categoria="3° ciclo",
             pais_asignado="Italia", pais_emoji="🇮🇹"),
        dict(nombre="UTP – Campus Lima Norte", nombre_corto="UTP-NORTE",
             ciudad="Lima", nivel="universidad", categoria="5° ciclo",
             pais_asignado="Japón", pais_emoji="🇯🇵"),
        dict(nombre="UTP – Campus Lima Sur", nombre_corto="UTP-SUR",
             ciudad="Lima", nivel="universidad", categoria="2° ciclo",
             pais_asignado="España", pais_emoji="🇪🇸"),
        dict(nombre="Universidad Nacional Mayor de San Marcos", nombre_corto="UNMSM",
             ciudad="Lima", nivel="universidad", categoria="4° ciclo",
             pais_asignado="Alemania", pais_emoji="🇩🇪"),
        dict(nombre="Universidad de Lima", nombre_corto="ULIMA",
             ciudad="Lima", nivel="universidad", categoria="6° ciclo",
             pais_asignado="Australia", pais_emoji="🇦🇺"),
        dict(nombre="Universidad Privada del Norte", nombre_corto="UPN",
             ciudad="Lima", nivel="universidad", categoria="1° ciclo",
             pais_asignado="Estados Unidos", pais_emoji="🇺🇸"),
    ]
    instituciones = []
    for d in inst_data:
        i = Institucion(**d, estado="activo")
        db.add(i)
        instituciones.append(i)
    db.flush()

    # ── 2. USUARIOS DE INSTITUCIÓN ────────────────────────────────────────
    P = hash_password("Olimp2026!")
    users_data = [
        ("Coordinador", "UTP Centro",   "utp.centro@olimpiadas.pe",  instituciones[0].id),
        ("Coordinador", "UTP Norte",    "utp.norte@olimpiadas.pe",   instituciones[1].id),
        ("Coordinador", "UTP Sur",      "utp.sur@olimpiadas.pe",     instituciones[2].id),
        ("Coordinador", "San Marcos",   "unmsm@olimpiadas.pe",       instituciones[3].id),
        ("Coordinador", "U de Lima",    "ulima@olimpiadas.pe",       instituciones[4].id),
        ("Coordinador", "UPN Lima",     "upn@olimpiadas.pe",         instituciones[5].id),
    ]
    for nombres, apellidos, correo, inst_id in users_data:
        u = Usuario(
            nombres=nombres, apellidos=apellidos, correo=correo,
            contrasena_hash=P, rol="institucion", esta_activo=True,
            institucion_id=inst_id,
            pregunta_seguridad_1="¿Nombre de tu primera mascota?",
            respuesta_seguridad_1=hash_password("olimpo"),
            pregunta_seguridad_2="¿Ciudad donde naciste?",
            respuesta_seguridad_2=hash_password("lima"),
            pregunta_seguridad_3="¿Nombre de tu colegio?",
            respuesta_seguridad_3=hash_password("olimpiadas"),
        )
        db.add(u)
    db.flush()
    print("  ✓ Instituciones y usuarios")

    # ── 3. DEPORTES (obtener IDs ya creados por seed.py) ─────────────────
    futbol_v  = db.query(Deporte).filter(Deporte.nombre == "Fútbol Varones").first()
    basket_v  = db.query(Deporte).filter(Deporte.nombre == "Básquet Varones").first()
    voley_d   = db.query(Deporte).filter(Deporte.nombre == "Vóley Damas").first()

    if not futbol_v or not basket_v or not voley_d:
        print("ERROR: Ejecuta primero 'python seed.py' para crear los deportes.")
        sys.exit(1)

    # ── 4. SEDES ──────────────────────────────────────────────────────────
    sedes_data = [
        dict(nombre_sede="Estadio UTP Lima Centro",    ciudad="Lima", capacidad=500),
        dict(nombre_sede="Polideportivo Lima Norte",   ciudad="Lima", capacidad=300),
        dict(nombre_sede="Coliseo Universitario Sur",  ciudad="Lima", capacidad=250),
        dict(nombre_sede="Campo Deportivo San Marcos", ciudad="Lima", capacidad=400),
    ]
    sedes = []
    for d in sedes_data:
        s = Sede(**d, esta_activo=True)
        db.add(s)
        sedes.append(s)
    db.flush()
    print("  ✓ Sedes")

    # ── 5. TORNEOS ────────────────────────────────────────────────────────
    torneo_futbol = Torneo(
        deporte_id=futbol_v.id,
        nombre="Olimpiadas PERÚ 2026 – Fútbol Varones",
        formato="liga", temporada="2026", estado="activo",
        fecha_inicio="2026-05-05", fecha_fin="2026-07-25",
        descripcion="Torneo de fútbol varones de la temporada 2026. Participan 6 universidades de Lima en formato liga (todos contra todos).",
    )
    torneo_basket = Torneo(
        deporte_id=basket_v.id,
        nombre="Olimpiadas PERÚ 2026 – Básquet Varones",
        formato="grupos", temporada="2026", estado="activo",
        fecha_inicio="2026-05-12", fecha_fin="2026-07-18",
        descripcion="Torneo de básquetbol varones con fase de grupos y eliminación directa.",
    )
    torneo_voley = Torneo(
        deporte_id=voley_d.id,
        nombre="Olimpiadas PERÚ 2026 – Vóley Damas",
        formato="liga", temporada="2026", estado="activo",
        fecha_inicio="2026-05-19", fecha_fin="2026-07-11",
        descripcion="Torneo de vóleibol femenino en formato liga.",
    )
    db.add_all([torneo_futbol, torneo_basket, torneo_voley])
    db.flush()
    print("  ✓ Torneos")

    def _pais_seed(equipos_lista):
        """Asigna países únicos por deporte a cada equipo recién creado."""
        for eq in equipos_lista:
            inst = next((i for i in instituciones if i.id == eq.institucion_id), None)
            if not inst:
                continue
            deseado_pais, deseado_emoji = asignar_pais(inst.nivel, inst.categoria)
            if not deseado_pais:
                deseado_pais, deseado_emoji = LISTA_PAISES[0]
            tomados = {e.pais_asignado for e in db.query(ClubEquipo).filter(
                ClubEquipo.deporte_id == eq.deporte_id, ClubEquipo.id != eq.id
            ).all() if e.pais_asignado}
            if deseado_pais not in tomados:
                eq.pais_asignado = deseado_pais
                eq.pais_emoji = deseado_emoji
            else:
                for pais, emoji in LISTA_PAISES:
                    if pais not in tomados:
                        eq.pais_asignado = pais
                        eq.pais_emoji = emoji
                        break

    # ── 6. EQUIPOS DE FÚTBOL (6 equipos) ─────────────────────────────────
    equipos_futbol_data = [
        ("Los Aguilas",        instituciones[0].id),  # UTP Centro
        ("Los Leones",         instituciones[1].id),  # UTP Norte
        ("Los Vikingos",       instituciones[2].id),  # UTP Sur
        ("Los Sammarquinos",   instituciones[3].id),  # UNMSM
        ("Los Académicos",     instituciones[4].id),  # U Lima
        ("Los Norteños",       instituciones[5].id),  # UPN
    ]
    equipos_f = []
    for nombre, inst_id in equipos_futbol_data:
        e = ClubEquipo(nombre_equipo=nombre, institucion_id=inst_id,
                       deporte_id=futbol_v.id, estado="aprobado",
                       partidos_jugados=3)
        db.add(e)
        equipos_f.append(e)
    db.flush()
    _pais_seed(equipos_f)

    # Jugadores de fútbol (12-14 por equipo) — nombres peruanos realistas
    plantillas_futbol = [
        # Los Aguilas – UTP Centro
        [("Carlos Quispe Huanca","47231894","Capitán","1"),
         ("Luis García Torres","48123045","Portero","12"),
         ("José Flores Condori","46892341","Defensa","4"),
         ("Miguel Mamani Ramos","47503218","Defensa","5"),
         ("Diego Chávez Cruz","48341209","Defensa","3"),
         ("André Mendoza López","46712893","Defensa","2"),
         ("Alejandro Ramos Morales","48902134","Mediocampo","6"),
         ("Sebastián Castro Solis","47214980","Mediocampo","8"),
         ("Rodrigo Torres Rojas","46531287","Mediocampo","10"),
         ("Franco Condori Vásquez","48023561","Delantero","9"),
         ("Rafael Huanca Espinoza","47689032","Delantero","11"),
         ("Erick Quispe García","46234189","Suplente","13"),
         ("Daniel López Gutierrez","48512034","Suplente","14")],
        # Los Leones – UTP Norte
        [("Kevin Mamani Flores","47834521","Capitán","10"),
         ("Josué Ríos Condori","48209834","Portero","1"),
         ("Samuel Huanca García","47123456","Defensa","4"),
         ("Martín Rojas Cruz","48634021","Defensa","5"),
         ("Bryan Espinoza Ramos","47345678","Defensa","3"),
         ("Renato Gutierrez Quispe","46892034","Defensa","2"),
         ("Aldo Morales Chávez","48021345","Mediocampo","6"),
         ("Brayam Torres Mamani","47456789","Mediocampo","8"),
         ("Piero Solis Huanca","48123789","Mediocampo","11"),
         ("Jhon Vásquez López","47678901","Delantero","9"),
         ("Cristian Castro Flores","46901234","Delantero","7"),
         ("Gianmarco Condori Ríos","48345012","Suplente","14"),
         ("Fabrizio García Ramos","47890123","Suplente","15")],
        # Los Vikingos – UTP Sur
        [("Ángel Flores Mamani","48456789","Capitán","7"),
         ("Alexander Condori Chávez","47012345","Portero","1"),
         ("Roberto López Quispe","48567890","Defensa","4"),
         ("Omar Ramos Huanca","46134567","Defensa","5"),
         ("Henry Cruz García","48678901","Defensa","3"),
         ("Edwin Torres Espinoza","47234567","Defensa","2"),
         ("Joel Morales Vásquez","48789012","Mediocampo","6"),
         ("Yeferson Quispe Solis","46345678","Mediocampo","8"),
         ("Héctor Gutierrez Condori","48890123","Mediocampo","10"),
         ("Percy Chávez Rojas","47456789","Delantero","9"),
         ("Anthony Mamani López","48901234","Delantero","11"),
         ("Yamir García Ramos","46567890","Suplente","13")],
        # Los Sammarquinos – UNMSM
        [("Manuel Quispe Torres","47567890","Capitán","8"),
         ("Ricardo Flores Condori","48012345","Portero","1"),
         ("Fernando Mamani Cruz","47678901","Defensa","4"),
         ("César García Morales","46123456","Defensa","5"),
         ("Hugo Chávez Gutierrez","48123901","Defensa","3"),
         ("Iván Ramos Vásquez","47234012","Defensa","2"),
         ("Santiago Torres Espinoza","48234567","Mediocampo","6"),
         ("Eduardo Condori Huanca","46345123","Mediocampo","8"),
         ("Paúl Solis Quispe","47345678","Mediocampo","10"),
         ("Renato López Flores","48456234","Delantero","9"),
         ("Alonso Rojas Mamani","47456234","Delantero","11"),
         ("Diego Espinoza García","46567345","Suplente","13"),
         ("Luis Cruz Chávez","48567901","Suplente","14"),
         ("José Gutierrez Ramos","47678456","Suplente","15")],
        # Los Académicos – U Lima
        [("Mauricio Vásquez Huanca","48678234","Capitán","10"),
         ("Rodrigo Quispe Solis","46789012","Portero","1"),
         ("Álvaro Mamani Torres","47789012","Defensa","4"),
         ("Felipe García Cruz","48890234","Defensa","5"),
         ("Alejandro Flores Rojas","47890456","Defensa","3"),
         ("Pablo Condori Espinoza","46901345","Defensa","2"),
         ("Gabriel Chávez Vásquez","47901678","Mediocampo","6"),
         ("Santiago Ramos Morales","48012678","Mediocampo","8"),
         ("Nicolás Torres Quispe","47012901","Mediocampo","11"),
         ("Diego López Mamani","48123012","Delantero","9"),
         ("Andres Huanca García","46234234","Delantero","7"),
         ("Bruno Solis Flores","47234345","Suplente","13")],
        # Los Norteños – UPN
        [("Ítalo Espinoza Condori","48345456","Capitán","9"),
         ("Gustavo Rojas López","47345567","Portero","1"),
         ("Víctor Cruz Vásquez","46456789","Defensa","4"),
         ("Raúl Morales Chávez","48456890","Defensa","5"),
         ("Luis Gutierrez Huanca","47457012","Defensa","3"),
         ("Marco Quispe Mamani","46568123","Defensa","2"),
         ("Javier Flores Ramos","48568234","Mediocampo","6"),
         ("Carlos Torres Solis","47568456","Mediocampo","8"),
         ("Sergio García Espinoza","48679567","Mediocampo","10"),
         ("Juan Condori Cruz","46679678","Delantero","7"),
         ("Pedro Mamani Rojas","47679789","Delantero","11"),
         ("Oscar Chávez Vásquez","48780890","Suplente","14")],
    ]
    for equipo, jugadores in zip(equipos_f, plantillas_futbol):
        for nombre, dni, rol, camiseta in jugadores:
            db.add(AtletaJugador(
                club_equipo_id=equipo.id,
                nombre_completo=nombre, documento_identidad=dni,
                posicion_rol=rol, numero_camiseta=camiseta, estado="activo",
            ))
    db.flush()

    # ── 7. EQUIPOS DE BÁSQUET (4 equipos, 6-8 jugadores) ─────────────────
    equipos_basket_data = [
        ("Aguilas Basket",      instituciones[0].id),
        ("Leones Basket",       instituciones[1].id),
        ("Sammarquinos Basket", instituciones[3].id),
        ("Norteños Basket",     instituciones[5].id),
    ]
    equipos_b = []
    for nombre, inst_id in equipos_basket_data:
        e = ClubEquipo(nombre_equipo=nombre, institucion_id=inst_id,
                       deporte_id=basket_v.id, estado="aprobado",
                       partidos_jugados=2)
        db.add(e)
        equipos_b.append(e)
    db.flush()
    _pais_seed(equipos_b)

    plantillas_basket = [
        # Aguilas Basket
        [("Carlos Quispe Mendoza","47100001","Capitán","5"),
         ("André García Torres","48200002","Base","7"),
         ("Diego Flores Ramos","47300003","Escolta","8"),
         ("Rodrigo Mamani Cruz","48400004","Alero","11"),
         ("Franco Chávez López","47500005","Pívot","12"),
         ("Sebastián Condori Solis","48600006","Suplente","15"),
         ("Miguel Torres Huanca","47700007","Suplente","16")],
        # Leones Basket
        [("Kevin Ríos Mamani","47111001","Capitán","4"),
         ("Samuel Condori García","48211002","Base","6"),
         ("Bryan Huanca Flores","47311003","Escolta","8"),
         ("Josué Espinoza Cruz","48411004","Alero","10"),
         ("Aldo Ramos Chávez","47511005","Pívot","13"),
         ("Renato Morales Vásquez","48611006","Suplente","14")],
        # Sammarquinos Basket
        [("Manuel Quispe Condori","47122001","Capitán","7"),
         ("Ricardo Flores Cruz","48222002","Base","5"),
         ("Fernando Mamani Morales","47322003","Escolta","6"),
         ("César García Gutierrez","48422004","Alero","9"),
         ("Hugo Chávez Espinoza","47522005","Pívot","11"),
         ("Iván Ramos Solis","48622006","Suplente","13"),
         ("Santiago Torres López","47722007","Suplente","15")],
        # Norteños Basket
        [("Ítalo Cruz Vásquez","47133001","Capitán","8"),
         ("Gustavo Morales Quispe","48233002","Base","4"),
         ("Víctor Gutierrez Mamani","47333003","Escolta","7"),
         ("Raúl Flores Huanca","48433004","Alero","10"),
         ("Luis Espinoza Condori","47533005","Pívot","12"),
         ("Marco Rojas García","48633006","Suplente","14")],
    ]
    for equipo, jugadores in zip(equipos_b, plantillas_basket):
        for nombre, dni, rol, camiseta in jugadores:
            db.add(AtletaJugador(
                club_equipo_id=equipo.id,
                nombre_completo=nombre, documento_identidad=dni,
                posicion_rol=rol, numero_camiseta=camiseta, estado="activo",
            ))
    db.flush()

    # ── 8. EQUIPOS DE VÓLEY DAMAS (4 equipos, 6-8 jugadoras) ────────────
    equipos_voley_data = [
        ("Aguilas Vóley",     instituciones[0].id),
        ("Vikingos Vóley",    instituciones[2].id),
        ("Académicos Vóley",  instituciones[4].id),
        ("Sanmarquinas Vóley",instituciones[3].id),
    ]
    equipos_v = []
    for nombre, inst_id in equipos_voley_data:
        e = ClubEquipo(nombre_equipo=nombre, institucion_id=inst_id,
                       deporte_id=voley_d.id, estado="aprobado",
                       partidos_jugados=2)
        db.add(e)
        equipos_v.append(e)
    db.flush()
    _pais_seed(equipos_v)

    plantillas_voley = [
        # Aguilas Vóley
        [("Valeria Quispe Huanca","47144001","Capitán","5"),
         ("María García Torres","48244002","Libero","8"),
         ("Andrea Flores Condori","47344003","Central","3"),
         ("Camila Mamani Ramos","48444004","Receptora","7"),
         ("Lucía Chávez Cruz","47544005","Opuesta","4"),
         ("Daniela Mendoza López","48644006","Colocadora","1"),
         ("Sofía Ramos Morales","47744007","Suplente","9"),
         ("Gabriela Castro Solis","48844008","Suplente","11")],
        # Vikingos Vóley
        [("Ximena Condori Vásquez","47155001","Capitán","6"),
         ("Paola Huanca Espinoza","48255002","Libero","9"),
         ("Yanina Quispe García","47355003","Central","4"),
         ("Fiorella López Gutierrez","48455004","Receptora","7"),
         ("Angie Mamani Flores","47555005","Opuesta","3"),
         ("Cielo Torres Condori","48655006","Colocadora","2"),
         ("Keyla Rojas Cruz","47755007","Suplente","10")],
        # Académicos Vóley
        [("Luciana Espinoza Ramos","47166001","Capitán","5"),
         ("Alessandra Morales Chávez","48266002","Libero","7"),
         ("Ariana Gutierrez Huanca","47366003","Central","3"),
         ("Romina Vásquez Quispe","48466004","Receptora","8"),
         ("Fernanda Solis Mamani","47566005","Opuesta","4"),
         ("Isabella Torres García","48666006","Colocadora","1"),
         ("Antonela Flores López","47766007","Suplente","9"),
         ("Nicol Condori Chávez","48866008","Suplente","11")],
        # Sanmarquinas Vóley
        [("Karla Ramos Huanca","47177001","Capitán","6"),
         ("Milagros Cruz Espinoza","48277002","Libero","8"),
         ("Stefany García Condori","47377003","Central","3"),
         ("Noelia Mamani Solis","48477004","Receptora","7"),
         ("Brenda Quispe Rojas","47577005","Opuesta","4"),
         ("Tatiana Flores Vásquez","48677006","Colocadora","2"),
         ("Juana López Morales","47777007","Suplente","10")],
    ]
    for equipo, jugadores in zip(equipos_v, plantillas_voley):
        for nombre, dni, rol, camiseta in jugadores:
            db.add(AtletaJugador(
                club_equipo_id=equipo.id,
                nombre_completo=nombre, documento_identidad=dni,
                posicion_rol=rol, numero_camiseta=camiseta, estado="activo",
            ))
    db.flush()
    print("  ✓ Equipos y jugadores (fútbol, básquet, vóley)")

    # ── 9. INSCRIPCIONES ─────────────────────────────────────────────────
    inscripciones_f = []
    for equipo in equipos_f:
        insc = Inscripcion(torneo_id=torneo_futbol.id,
                           club_equipo_id=equipo.id, estado="aprobado")
        db.add(insc)
        inscripciones_f.append(insc)

    inscripciones_b = []
    for equipo in equipos_b:
        insc = Inscripcion(torneo_id=torneo_basket.id,
                           club_equipo_id=equipo.id, estado="aprobado")
        db.add(insc)
        inscripciones_b.append(insc)

    inscripciones_v = []
    for equipo in equipos_v:
        insc = Inscripcion(torneo_id=torneo_voley.id,
                           club_equipo_id=equipo.id, estado="aprobado")
        db.add(insc)
        inscripciones_v.append(insc)
    db.flush()
    print("  ✓ Inscripciones (todas aprobadas)")

    # ── 10. FIXTURES Y PARTIDOS ───────────────────────────────────────────
    # Fútbol – Jornada 1 (finalizada, con resultados)
    fix_f1 = Fixture(torneo_id=torneo_futbol.id, jornada=1,
                     nombre_fase="Jornada 1 – Liga",
                     fecha_generacion=datetime(2026, 5, 1), estado="activo")
    db.add(fix_f1)
    db.flush()

    # Jornada 1 – 3 partidos del 5 mayo 2026
    partidos_j1 = [
        # Aguilas vs Leones → 2-1
        (inscripciones_f[0], inscripciones_f[1], 2, 1, "finalizado",
         datetime(2026, 5, 5, 10, 0), sedes[0].id),
        # Vikingos vs Sammarquinos → 0-3
        (inscripciones_f[2], inscripciones_f[3], 0, 3, "finalizado",
         datetime(2026, 5, 5, 12, 0), sedes[3].id),
        # Académicos vs Norteños → 1-1
        (inscripciones_f[4], inscripciones_f[5], 1, 1, "finalizado",
         datetime(2026, 5, 5, 15, 0), sedes[0].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_j1:
        p = Partido(fixture_id=fix_f1.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 1",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    # Fútbol – Jornada 2 (finalizada)
    fix_f2 = Fixture(torneo_id=torneo_futbol.id, jornada=2,
                     nombre_fase="Jornada 2 – Liga",
                     fecha_generacion=datetime(2026, 5, 8), estado="activo")
    db.add(fix_f2)
    db.flush()

    partidos_j2 = [
        # Leones vs Vikingos → 1-0
        (inscripciones_f[1], inscripciones_f[2], 1, 0, "finalizado",
         datetime(2026, 5, 12, 10, 0), sedes[1].id),
        # Sammarquinos vs Académicos → 2-2
        (inscripciones_f[3], inscripciones_f[4], 2, 2, "finalizado",
         datetime(2026, 5, 12, 12, 0), sedes[3].id),
        # Norteños vs Aguilas → 0-2
        (inscripciones_f[5], inscripciones_f[0], 0, 2, "finalizado",
         datetime(2026, 5, 12, 15, 0), sedes[2].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_j2:
        p = Partido(fixture_id=fix_f2.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 2",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    # Fútbol – Jornada 3 (programada)
    fix_f3 = Fixture(torneo_id=torneo_futbol.id, jornada=3,
                     nombre_fase="Jornada 3 – Liga",
                     fecha_generacion=datetime(2026, 5, 15), estado="activo")
    db.add(fix_f3)
    db.flush()

    partidos_j3 = [
        (inscripciones_f[0], inscripciones_f[3], None, None, "programado",
         datetime(2026, 6, 23, 10, 0), sedes[0].id),
        (inscripciones_f[1], inscripciones_f[4], None, None, "programado",
         datetime(2026, 6, 23, 12, 0), sedes[1].id),
        (inscripciones_f[2], inscripciones_f[5], None, None, "programado",
         datetime(2026, 6, 23, 15, 0), sedes[2].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_j3:
        p = Partido(fixture_id=fix_f3.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 3",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    # Básquet – Jornada 1 (finalizada)
    fix_b1 = Fixture(torneo_id=torneo_basket.id, jornada=1,
                     nombre_fase="Jornada 1",
                     fecha_generacion=datetime(2026, 5, 10), estado="activo")
    db.add(fix_b1)
    db.flush()

    partidos_b1 = [
        (inscripciones_b[0], inscripciones_b[1], 68, 55, "finalizado",
         datetime(2026, 5, 19, 10, 0), sedes[0].id),
        (inscripciones_b[2], inscripciones_b[3], 72, 61, "finalizado",
         datetime(2026, 5, 19, 12, 0), sedes[0].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_b1:
        p = Partido(fixture_id=fix_b1.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 1",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    # Básquet – Jornada 2 (programada)
    fix_b2 = Fixture(torneo_id=torneo_basket.id, jornada=2,
                     nombre_fase="Jornada 2",
                     fecha_generacion=datetime(2026, 5, 22), estado="activo")
    db.add(fix_b2)
    db.flush()

    partidos_b2 = [
        (inscripciones_b[0], inscripciones_b[2], None, None, "programado",
         datetime(2026, 6, 26, 10, 0), sedes[0].id),
        (inscripciones_b[1], inscripciones_b[3], None, None, "programado",
         datetime(2026, 6, 26, 12, 0), sedes[0].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_b2:
        p = Partido(fixture_id=fix_b2.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 2",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    # Vóley – Jornada 1 (finalizada)
    fix_v1 = Fixture(torneo_id=torneo_voley.id, jornada=1,
                     nombre_fase="Jornada 1",
                     fecha_generacion=datetime(2026, 5, 15), estado="activo")
    db.add(fix_v1)
    db.flush()

    partidos_v1 = [
        (inscripciones_v[0], inscripciones_v[1], 3, 1, "finalizado",
         datetime(2026, 5, 26, 10, 0), sedes[2].id),
        (inscripciones_v[2], inscripciones_v[3], 2, 3, "finalizado",
         datetime(2026, 5, 26, 12, 0), sedes[2].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_v1:
        p = Partido(fixture_id=fix_v1.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 1",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    # Vóley – Jornada 2 (programada)
    fix_v2 = Fixture(torneo_id=torneo_voley.id, jornada=2,
                     nombre_fase="Jornada 2",
                     fecha_generacion=datetime(2026, 5, 28), estado="activo")
    db.add(fix_v2)
    db.flush()

    partidos_v2 = [
        (inscripciones_v[0], inscripciones_v[2], None, None, "programado",
         datetime(2026, 6, 30, 10, 0), sedes[2].id),
        (inscripciones_v[1], inscripciones_v[3], None, None, "programado",
         datetime(2026, 6, 30, 12, 0), sedes[2].id),
    ]
    for local, visitante, rl, rv, estado, fecha, sede_id in partidos_v2:
        p = Partido(fixture_id=fix_v2.id,
                    inscripcion_local_id=local.id,
                    inscripcion_visitante_id=visitante.id,
                    resultado_local=rl, resultado_visitante=rv,
                    estado=estado, ronda="Jornada 2",
                    fecha_hora=fecha, sede_id=sede_id)
        db.add(p)

    db.flush()
    print("  ✓ Fixtures y partidos (2 jornadas finalizadas, 1 programada por torneo)")

    # ── 11. EVENTOS DE PARTIDO (demo con datos reales) ────────────────────
    # Consultar atletas por DNI para asociarlos a eventos
    _franco   = db.query(AtletaJugador).filter_by(documento_identidad="48023561").first()
    _carlos_c = db.query(AtletaJugador).filter_by(documento_identidad="47231894").first()
    _kevin    = db.query(AtletaJugador).filter_by(documento_identidad="47834521").first()
    _paul     = db.query(AtletaJugador).filter_by(documento_identidad="47345678").first()
    _alonso   = db.query(AtletaJugador).filter_by(documento_identidad="47456234").first()
    _mauricio = db.query(AtletaJugador).filter_by(documento_identidad="48678234").first()
    _andres   = db.query(AtletaJugador).filter_by(documento_identidad="46234234").first()
    _angel    = db.query(AtletaJugador).filter_by(documento_identidad="48456789").first()

    def _eid(a): return a.id if a else None

    # Consultar partidos finalizados de fútbol
    partidos_fin_f = (
        db.query(Partido).join(Fixture)
        .filter(Fixture.torneo_id == torneo_futbol.id, Partido.estado == "finalizado")
        .order_by(Partido.fecha_hora).all()
    )

    for pf in partidos_fin_f:
        lid, vid = pf.inscripcion_local_id, pf.inscripcion_visitante_id
        evs = []

        # J1: Aguilas(0) 2-1 Leones(1)
        if lid == inscripciones_f[0].id and vid == inscripciones_f[1].id:
            evs = [
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_franco),   tipo_evento="gol",              minuto=23),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_kevin),    tipo_evento="gol",              minuto=45),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_franco),   tipo_evento="gol",              minuto=67),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="tarjeta_amarilla", minuto=80, descripcion="Reclamo al árbitro"),
            ]
        # J1: Vikingos(2) 0-3 Sammarquinos(3)
        elif lid == inscripciones_f[2].id and vid == inscripciones_f[3].id:
            evs = [
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_paul),     tipo_evento="gol",              minuto=15),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_alonso),   tipo_evento="gol",              minuto=34),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_angel),    tipo_evento="tarjeta_amarilla", minuto=55, descripcion="Falta fuerte"),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_paul),     tipo_evento="gol",              minuto=71),
            ]
        # J1: Académicos(4) 1-1 Norteños(5)
        elif lid == inscripciones_f[4].id and vid == inscripciones_f[5].id:
            evs = [
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_mauricio), tipo_evento="gol",              minuto=30),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="tarjeta_amarilla", minuto=58),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="gol",              minuto=72, descripcion="Gol de Norteños"),
            ]
        # J2: Leones(1) 1-0 Vikingos(2)
        elif lid == inscripciones_f[1].id and vid == inscripciones_f[2].id:
            evs = [
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="tarjeta_amarilla", minuto=38),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_kevin),    tipo_evento="gol",              minuto=55),
            ]
        # J2: Sammarquinos(3) 2-2 Académicos(4)
        elif lid == inscripciones_f[3].id and vid == inscripciones_f[4].id:
            evs = [
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_alonso),   tipo_evento="gol",              minuto=20),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_carlos_c), tipo_evento="gol",              minuto=35),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="gol",              minuto=50, descripcion="Gol de Sammarquinos"),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_andres),   tipo_evento="gol",              minuto=80),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="tarjeta_roja",     minuto=88, descripcion="Doble amarilla"),
            ]
        # J2: Norteños(5) 0-2 Aguilas(0)
        elif lid == inscripciones_f[5].id and vid == inscripciones_f[0].id:
            evs = [
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_carlos_c), tipo_evento="gol",              minuto=22),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=None,            tipo_evento="falta",            minuto=40),
                EventoPartido(partido_id=pf.id, atleta_jugador_id=_eid(_franco),   tipo_evento="gol",              minuto=78),
        ]

        for ev in evs:
            db.add(ev)

    db.flush()
    print("  ✓ Eventos de partido (fútbol: 6 partidos con eventos demo)")

    # ── 13. ESTADÍSTICAS DE GOLEADORES (actualizar atletas destacados) ────
    # Aguilas: Franco Condori 2 goles (j1), Carlos Quispe 1 asistencia
    franco = db.query(AtletaJugador).filter_by(documento_identidad="48023561").first()
    if franco:
        franco.goles_anotados = 3
    carlos_c = db.query(AtletaJugador).filter_by(documento_identidad="47231894").first()
    if carlos_c:
        carlos_c.goles_anotados = 2

    # Sammarquinos: Paúl Solis 2 goles, Alonso Rojas 1 gol
    paul = db.query(AtletaJugador).filter_by(documento_identidad="47345678").first()
    if paul:
        paul.goles_anotados = 2
        paul.tarjetas_amarillas = 1
    alonso = db.query(AtletaJugador).filter_by(documento_identidad="47456234").first()
    if alonso:
        alonso.goles_anotados = 2

    # Leones: Kevin Mamani 1 gol
    kevin = db.query(AtletaJugador).filter_by(documento_identidad="47834521").first()
    if kevin:
        kevin.goles_anotados = 1

    # Académicos: Mauricio Vásquez 1 gol, Andres Huanca 1 gol
    mauricio = db.query(AtletaJugador).filter_by(documento_identidad="48678234").first()
    if mauricio:
        mauricio.goles_anotados = 1
    andres = db.query(AtletaJugador).filter_by(documento_identidad="46234234").first()
    if andres:
        andres.goles_anotados = 1

    # Actualizar puntos equipos fútbol (tras 2 jornadas, 3 partidos c/u)
    # Aguilas: G2 E0 P1 → 6 pts
    equipos_f[0].partidos_ganados = 2; equipos_f[0].partidos_perdidos = 1; equipos_f[0].puntos = 6
    # Leones: G1 E0 P1 → 3 pts
    equipos_f[1].partidos_ganados = 1; equipos_f[1].partidos_perdidos = 1; equipos_f[1].puntos = 3
    # Vikingos: G0 E0 P2 → 0 pts
    equipos_f[2].partidos_ganados = 0; equipos_f[2].partidos_perdidos = 2; equipos_f[2].puntos = 0
    # Sammarquinos: G1 E1 P0 → 4 pts
    equipos_f[3].partidos_ganados = 1; equipos_f[3].partidos_perdidos = 0; equipos_f[3].puntos = 4
    equipos_f[3].partidos_jugados = 2
    # Académicos: G0 E1 P0 → 1 pts (empate con Norteños)
    equipos_f[4].partidos_ganados = 0; equipos_f[4].partidos_perdidos = 0; equipos_f[4].puntos = 1
    equipos_f[4].partidos_jugados = 2
    # Norteños: G0 E1 P1 → 1 pts
    equipos_f[5].partidos_ganados = 0; equipos_f[5].partidos_perdidos = 1; equipos_f[5].puntos = 1
    equipos_f[5].partidos_jugados = 2

    # ── 14. NOTICIAS ──────────────────────────────────────────────────────
    noticias = [
        Noticia(
            titulo="¡Olimpiadas PERÚ 2026 ya están en marcha!",
            contenido=(
                "Con gran entusiasmo se dio inicio a la temporada deportiva 2026 de las Olimpiadas Universitarias PERÚ. "
                "Seis universidades de Lima compiten esta temporada en Fútbol Varones, Básquet Varones y Vóley Damas. "
                "La inauguración se realizó el 5 de mayo en el Estadio UTP Lima Centro con capacidad para 500 espectadores. "
                "El presidente del comité organizador destacó el crecimiento del 40% en equipos inscritos respecto al año anterior."
            ),
            esta_publicado=True,
            fecha_publicacion=datetime(2026, 5, 5, 8, 0),
        ),
        Noticia(
            titulo="Los Aguilas lideran la tabla de Fútbol Varones con 6 puntos",
            contenido=(
                "Tras dos jornadas disputadas, el equipo Los Aguilas de UTP Lima Centro encabeza la clasificación "
                "con 6 puntos, producto de dos victorias consecutivas. Los Sammarquinos de la UNMSM ocupan el "
                "segundo lugar con 4 unidades. La próxima jornada se disputará el 23 de junio en el Estadio UTP Lima Centro. "
                "El goleador del torneo es Franco Condori de Los Aguilas con 3 tantos."
            ),
            esta_publicado=True,
            fecha_publicacion=datetime(2026, 5, 13, 10, 0),
        ),
        Noticia(
            titulo="Convocatoria: Inscripciones para Atletismo 100m abiertas hasta el 30 de junio",
            contenido=(
                "El comité organizador de las Olimpiadas PERÚ 2026 informa que las inscripciones para el torneo de "
                "Atletismo 100m permanecerán abiertas hasta el 30 de junio de 2026. Cada institución puede inscribir "
                "hasta 3 atletas por categoría. Los interesados deben registrarse a través del portal institucional "
                "con su usuario y contraseña. Para consultas escribir a olimpiadas@olimpiadas.pe."
            ),
            esta_publicado=True,
            fecha_publicacion=datetime(2026, 6, 1, 9, 0),
        ),
    ]
    for n in noticias:
        db.add(n)

    db.commit()

    print("\n" + "="*55)
    print("  SEED DEMO COMPLETADO EXITOSAMENTE")
    print("="*55)
    print("\n  INSTITUCIONES Y ACCESOS:")
    print("  ─────────────────────────────────────────────────")
    print("  Admin:       admin@olimpiadas.pe  /  Admin1234!")
    print("  UTP Centro:  utp.centro@olimpiadas.pe  /  Olimp2026!")
    print("  UTP Norte:   utp.norte@olimpiadas.pe   /  Olimp2026!")
    print("  UTP Sur:     utp.sur@olimpiadas.pe     /  Olimp2026!")
    print("  San Marcos:  unmsm@olimpiadas.pe        /  Olimp2026!")
    print("  U de Lima:   ulima@olimpiadas.pe        /  Olimp2026!")
    print("  UPN:         upn@olimpiadas.pe          /  Olimp2026!")
    print("\n  DATOS CREADOS:")
    print(f"  • 6 instituciones universitarias de Lima")
    print(f"  • 6 usuarios de institución")
    print(f"  • 4 sedes")
    print(f"  • 3 torneos activos (fútbol, básquet, vóley)")
    print(f"  • 14 equipos con {len(plantillas_futbol)*13 + 28 + 29} jugadores aprox.")
    print(f"  • Todas las inscripciones aprobadas")
    print(f"  • 5 fixtures con partidos (2 jornadas finalizadas, 1 pendiente)")
    print(f"  • Tabla de goleadores con stats reales")
    print(f"  • 3 noticias publicadas")
    print("="*55)

try:
    main()
except Exception as e:
    db.rollback()
    import traceback
    traceback.print_exc()
    print(f"\nError en seed_demo: {e}")
    sys.exit(1)
finally:
    db.close()
