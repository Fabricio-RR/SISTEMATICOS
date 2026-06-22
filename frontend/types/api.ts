// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  rol: "admin" | "institucion" | "arbitro";
  nombre: string;
}

export interface RecoveryQuestionsResponse {
  correo: string;
  pregunta_1: string;
  pregunta_2: string;
  pregunta_3: string;
}

export interface SolicitudAccesoPayload {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  nombre_institucion: string;
  ciudad: string;
  contacto?: string;
  categoria?: CategoriaInstitucion;
  pregunta_seguridad_1: string;
  respuesta_seguridad_1: string;
  pregunta_seguridad_2: string;
  respuesta_seguridad_2: string;
  pregunta_seguridad_3: string;
  respuesta_seguridad_3: string;
}

export interface RecoveryResetPayload {
  correo: string;
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
  nueva_contrasena: string;
}

export interface MessageResponse {
  message: string;
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "institucion" | "arbitro";

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: UserRole;
  esta_activo: boolean;
  institucion_id: number | null;
}

// ── Instituciones ─────────────────────────────────────────────────────────────

export type CategoriaInstitucion =
  | "Primer año"
  | "Segundo año"
  | "Tercer año"
  | "Cuarto año"
  | "Quinto año";

export const CATEGORIAS: CategoriaInstitucion[] = [
  "Primer año",
  "Segundo año",
  "Tercer año",
  "Cuarto año",
  "Quinto año",
];

export const CATEGORIA_PAIS: Record<CategoriaInstitucion, string> = {
  "Primer año":  "Brasil",
  "Segundo año": "Argentina",
  "Tercer año":  "Alemania",
  "Cuarto año":  "España",
  "Quinto año":  "Francia",
};

export interface Institucion {
  id: number;
  nombre: string;
  nombre_corto: string;
  ciudad: string;
  estado: string;
  imagen_url: string | null;
  contacto: string | null;
  categoria: CategoriaInstitucion | null;
  pais_representativo: string | null;
}

export interface InstitucionCreate {
  nombre: string;
  nombre_corto: string;
  ciudad: string;
  estado?: string;
  contacto?: string;
  categoria?: CategoriaInstitucion;
  pais_representativo?: string;
}

// ── Deportes ──────────────────────────────────────────────────────────────────

export type TipoCompetidor = "equipo" | "individual";

export interface Deporte {
  id: number;
  nombre: string;
  tipo_competidor: TipoCompetidor;
  esta_activo: boolean;
  es_obligatorio: boolean;
}

export interface DeporteCreate {
  nombre: string;
  tipo_competidor: TipoCompetidor;
}

export interface DeporteUpdate {
  nombre?: string;
  tipo_competidor?: TipoCompetidor;
  esta_activo?: boolean;
}

// ── Equipos ───────────────────────────────────────────────────────────────────

export type EstadoEquipo = "pendiente" | "aprobado" | "rechazado";

export interface ClubEquipo {
  id: number;
  institucion_id: number;
  deporte_id: number;
  nombre_equipo: string;
  estado: EstadoEquipo;
  posicion_tabla: number;
  puntos: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_perdidos: number;
}

export interface ClubEquipoCreate {
  institucion_id: number;
  deporte_id: number;
  nombre_equipo: string;
}

export interface ClubEquipoUpdate {
  nombre_equipo?: string;
}

// ── Torneos ───────────────────────────────────────────────────────────────────

export type FormatoTorneo = "liga" | "eliminacion_simple" | "grupos";
export type EstadoTorneo =
  | "inscripcion_abierta"
  | "inscripcion_cerrada"
  | "en_sorteo"
  | "en_curso"
  | "finalizado"
  | "suspendido";

export const ESTADO_TORNEO_LABEL: Record<EstadoTorneo, string> = {
  inscripcion_abierta:  "Inscripción abierta",
  inscripcion_cerrada:  "Inscripción cerrada",
  en_sorteo:            "En sorteo",
  en_curso:             "En curso",
  finalizado:           "Finalizado",
  suspendido:           "Suspendido",
};

export const ESTADO_TORNEO_SIGUIENTE: Partial<Record<EstadoTorneo, EstadoTorneo>> = {
  inscripcion_abierta:  "inscripcion_cerrada",
  inscripcion_cerrada:  "en_sorteo",
  en_sorteo:            "en_curso",
  en_curso:             "finalizado",
};

export const ESTADO_TORNEO_BADGE: Record<EstadoTorneo, string> = {
  inscripcion_abierta:  "bg-blue-50 text-blue-700",
  inscripcion_cerrada:  "bg-amber-50 text-amber-700",
  en_sorteo:            "bg-purple-50 text-purple-700",
  en_curso:             "bg-green-50 text-green-700",
  finalizado:           "bg-gray-100 text-gray-500",
  suspendido:           "bg-red-50 text-red-600",
};

export interface Torneo {
  id: number;
  deporte_id: number;
  nombre: string;
  formato: FormatoTorneo;
  temporada: string;
  estado: EstadoTorneo;
}

export interface TorneoCreate {
  deporte_id: number;
  nombre: string;
  formato: FormatoTorneo;
  temporada: string;
}

// ── Sedes ─────────────────────────────────────────────────────────────────────

export interface Sede {
  id: number;
  nombre_sede: string;
  ciudad: string;
  capacidad: number | null;
  esta_activo: boolean;
}

export interface SedeCreate {
  nombre_sede: string;
  ciudad: string;
  capacidad?: number;
}

// ── Noticias ──────────────────────────────────────────────────────────────────

export interface Noticia {
  id: number;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  esta_publicado: boolean;
  fecha_publicacion: string | null;
}

// ── Inscripciones ─────────────────────────────────────────────────────────────

export type EstadoInscripcion = "pendiente" | "aprobado" | "rechazado" | "retirado";

export interface ClubMin {
  id: number;
  nombre_equipo: string;
}

export interface TorneoMin {
  id: number;
  nombre: string;
}

export interface Inscripcion {
  id: number;
  torneo_id: number;
  club_equipo_id: number;
  grupo_id: number | null;
  numero_seeding: number | null;
  estado: EstadoInscripcion;
  club_equipo: ClubMin | null;
  torneo: TorneoMin | null;
}

export interface InscripcionCreate {
  torneo_id: number;
  club_equipo_id: number;
  numero_seeding?: number;
}

// ── Grupos ────────────────────────────────────────────────────────────────────

export interface Grupo {
  id: number;
  torneo_id: number;
  nombre_grupo: string;
  orden: number;
}

export interface GrupoCreate {
  torneo_id: number;
  nombre_grupo: string;
  orden?: number;
}

// ── Fixture ───────────────────────────────────────────────────────────────────

export type EstadoFixture = "activo" | "inactivo";

export interface Fixture {
  id: number;
  torneo_id: number;
  jornada: number;
  nombre_fase: string;
  fecha_generacion: string;
  estado: EstadoFixture;
}

// ── Partidos ──────────────────────────────────────────────────────────────────

export type EstadoPartido = "programado" | "en_curso" | "finalizado";

export interface Partido {
  id: number;
  fixture_id: number;
  inscripcion_local_id: number;
  inscripcion_visitante_id: number;
  grupo_id: number | null;
  sede_id: number | null;
  arbitro_id: number | null;
  ronda: string | null;
  fecha_hora: string | null;
  resultado_local: number | null;
  resultado_visitante: number | null;
  estado: EstadoPartido;
  es_walkover: boolean;
  motivo_reprogramacion: string | null;
  reprogramado_en: string | null;
  local_nombre: string;
  visitante_nombre: string;
  local_club_equipo_id?: number | null;
  visitante_club_equipo_id?: number | null;
  torneo_nombre: string;
  sede_nombre: string;
  jornada: number;
  eventos?: EventoPartidoOut[];
}

export interface PartidoUpdate {
  sede_id?: number;
  arbitro_id?: number;
  fecha_hora?: string;
  ronda?: string;
  estado?: EstadoPartido;
  motivo_reprogramacion?: string;
}

// ── Notificaciones ────────────────────────────────────────────────────────────

export interface Notificacion {
  id: number;
  institucion_id: number;
  partido_id: number | null;
  titulo: string;
  contenido: string;
  leida: boolean;
  creada_en: string;
}

export interface EventoPartidoCreate {
  atleta_jugador_id: number;
  tipo_evento: string; // "gol", "puntos", "tarjeta_amarilla", "tarjeta_roja"
  minuto?: number | null;
  descripcion?: string | null;
}

export interface EventoPartidoOut {
  id: number;
  partido_id: number;
  atleta_jugador_id: number | null;
  tipo_evento: string;
  minuto: number | null;
  descripcion: string | null;
}

export interface ResultadoUpdate {
  resultado_local: number;
  resultado_visitante: number;
  eventos?: EventoPartidoCreate[];
}

// ── Atletas ───────────────────────────────────────────────────────────────────

export type EstadoAtleta = "activo" | "inactivo" | "suspendido";

export interface AtletaJugador {
  id: number;
  club_equipo_id: number;
  nombre_completo: string;
  numero_camiseta: string | null;
  posicion_rol: string | null;
  documento_identidad: string;
  goles_anotados: number;
  puntos_anotados: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  estado: EstadoAtleta;
}

export interface AtletaCreate {
  club_equipo_id: number;
  nombre_completo: string;
  numero_camiseta?: string;
  posicion_rol?: string;
  documento_identidad: string;
}

export interface AtletaUpdate {
  nombre_completo?: string;
  numero_camiseta?: string;
  posicion_rol?: string;
  goles_anotados?: number;
  puntos_anotados?: number;
  tarjetas_amarillas?: number;
  tarjetas_rojas?: number;
  estado?: EstadoAtleta;
}

// ── Estadísticas ──────────────────────────────────────────────────────────────

export interface PosicionTabla {
  posicion: number;
  equipo_id: number;
  nombre_equipo: string;
  puntos: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  goles_a_favor: number;
  goles_en_contra: number;
  diferencia_goles: number;
}

export interface Goleador {
  posicion: number;
  atleta_id: number;
  nombre_completo: string;
  nombre_equipo: string;
  goles: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  etiqueta: string;
}

// ── Auditoría ─────────────────────────────────────────────────────────────────

export interface AuditoriaEntry {
  id: number;
  usuario_id: number | null;
  tabla_afectada: string;
  accion: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  creado_en: string;
  usuario_nombre: string | null;
}
