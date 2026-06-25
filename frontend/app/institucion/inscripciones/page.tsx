"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Users, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Lock } from "lucide-react";
import { api } from "@/lib/api";

interface JugadorFila {
  nombre_completo: string;
  documento_identidad: string;
  posicion_rol: string;
  numero_camiseta: string;
}

const FILA_VACIA: JugadorFila = {
  nombre_completo: "",
  documento_identidad: "",
  posicion_rol: "Jugador",
  numero_camiseta: "",
};

export default function InstitucionInscripciones() {
  const [deportes, setDeportes] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [misInscripciones, setMisInscripciones] = useState<any[]>([]);
  const [atletas, setAtletas] = useState<Record<number, any[]>>({});
  const [expandido, setExpandido] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState({ texto: "", tipo: "ok" });

  const [step, setStep] = useState<"idle" | "equipo" | "jugadores">("idle");
  const [equipoCreado, setEquipoCreado] = useState<any>(null);
  const [equipoForm, setEquipoForm] = useState({ nombre_equipo: "", deporte_id: "", torneo_id: "" });
  const [filas, setFilas] = useState<JugadorFila[]>([{ ...FILA_VACIA }]);
  const [guardando, setGuardando] = useState(false);

  const deporteSeleccionado = deportes.find(d => d.id === Number(equipoForm.deporte_id));
  const minJug = deporteSeleccionado?.min_jugadores ?? 1;
  const maxJug = deporteSeleccionado?.max_jugadores ?? 50;
  const filasValidas = filas.filter(f => f.nombre_completo.trim() && f.documento_identidad.trim());

  useEffect(() => {
    api.getDeportes().then(setDeportes).catch(() => {});
    api.getTorneos().then(setTorneos).catch(() => {});
    cargarMisInscripciones();
  }, []);

  const cargarMisInscripciones = async () => {
    try {
      const data = await api.getMisInscripciones();
      setMisInscripciones(data);
      for (const insc of data) {
        const at = await api.getAtletasByEquipo(insc.club_equipo_id).catch(() => []);
        setAtletas(prev => ({ ...prev, [insc.club_equipo_id]: at }));
      }
    } catch {}
  };

  const flash = (texto: string, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "ok" }), 5000);
  };

  const crearEquipo = async () => {
    if (!equipoForm.nombre_equipo || !equipoForm.deporte_id || !equipoForm.torneo_id) {
      flash("Completa todos los campos", "err"); return;
    }
    setGuardando(true);
    try {
      const userInfo = await api.me();
      const equipo: any = await api.createEquipo({
        nombre_equipo: equipoForm.nombre_equipo,
        deporte_id: Number(equipoForm.deporte_id),
        institucion_id: userInfo.institucion_id,
      });
      setEquipoCreado({
        id: equipo.id,
        nombre_equipo: equipo.nombre_equipo,
        torneo_id: Number(equipoForm.torneo_id),
        deporte_id: Number(equipoForm.deporte_id),
      });
      setFilas(Array.from({ length: Math.max(minJug, 1) }, () => ({ ...FILA_VACIA })));
      setStep("jugadores");
    } catch (e: any) {
      flash(e.message, "err");
    } finally {
      setGuardando(false);
    }
  };

  const actualizarFila = (idx: number, campo: keyof JugadorFila, valor: string) => {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));
  };

  const agregarFila = () => {
    if (filas.length >= maxJug) {
      flash(`Máximo permitido: ${maxJug} jugadores para este deporte`, "err"); return;
    }
    setFilas(prev => [...prev, { ...FILA_VACIA }]);
  };

  const eliminarFila = (idx: number) => {
    if (filas.length <= 1) return;
    setFilas(prev => prev.filter((_, i) => i !== idx));
  };

  const finalizarInscripcion = async () => {
    if (!equipoCreado) return;
    const dep = deportes.find(d => d.id === equipoCreado.deporte_id);
    const minD = dep?.min_jugadores ?? 1;
    const maxD = dep?.max_jugadores ?? 50;
    if (filasValidas.length < minD) {
      flash(`Necesitas mínimo ${minD} jugadores con nombre y DNI. Tienes ${filasValidas.length} válidos.`, "err"); return;
    }
    if (filasValidas.length > maxD) {
      flash(`El máximo es ${maxD} jugadores. Tienes ${filasValidas.length} válidos.`, "err"); return;
    }
    setGuardando(true);
    try {
      await api.crearAtletasBulk({ club_equipo_id: equipoCreado.id, jugadores: filasValidas });
      await api.inscribir({ torneo_id: equipoCreado.torneo_id, club_equipo_id: equipoCreado.id });
      flash("Inscripción enviada. El administrador la revisará.");
      setStep("idle");
      setEquipoCreado(null);
      setFilas([{ ...FILA_VACIA }]);
      setEquipoForm({ nombre_equipo: "", deporte_id: "", torneo_id: "" });
      await cargarMisInscripciones();
    } catch (e: any) {
      flash(e.message, "err");
    } finally {
      setGuardando(false);
    }
  };

  const cancelarInscripcion = () => {
    setStep("idle");
    setEquipoCreado(null);
    setFilas([{ ...FILA_VACIA }]);
    setEquipoForm({ nombre_equipo: "", deporte_id: "", torneo_id: "" });
  };

  const eliminarAtleta = async (atletaId: number, equipoId: number) => {
    if (!confirm("¿Eliminar este jugador?")) return;
    try {
      await api.deleteAtleta(atletaId);
      const at = await api.getAtletasByEquipo(equipoId).catch(() => []);
      setAtletas(prev => ({ ...prev, [equipoId]: at }));
    } catch (e: any) {
      flash(e.message ?? "Error al eliminar jugador", "err");
    }
  };

  const estadoBadge = (estado: string) => {
    if (estado === "aprobado") return "bg-green-100 text-green-700 border border-green-200";
    if (estado === "rechazado") return "bg-red-100 text-red-700 border border-red-200";
    return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  };

  const torneosParaDeporte = torneos.filter(t =>
    !equipoForm.deporte_id || t.deporte_id === Number(equipoForm.deporte_id)
  );

  const deporteEnEquipo = deportes.find(d => d.id === equipoCreado?.deporte_id);
  const minJugEquipo = deporteEnEquipo?.min_jugadores ?? 1;
  const maxJugEquipo = deporteEnEquipo?.max_jugadores ?? 50;
  const progresoColor = filasValidas.length < minJugEquipo ? "bg-orange-400"
    : filasValidas.length > maxJugEquipo ? "bg-red-500" : "bg-green-500";

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Portal Institucional</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Mis <span className="text-red-600">Inscripciones</span>
        </h1>
      </div>

      {msg.texto && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold border flex items-start gap-2 ${
          msg.tipo === "err" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
        }`}>
          {msg.tipo === "err" && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          {msg.tipo === "ok" && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{msg.texto}</span>
        </div>
      )}

      {/* Botón nueva inscripción */}
      {step === "idle" && (
        <button
          onClick={() => setStep("equipo")}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-red-700 mb-6 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nueva Inscripción
        </button>
      )}

      {/* ── Paso 1: datos del equipo ─────────────────────────────────────── */}
      {step === "equipo" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">1</span>
            <h2 className="font-black text-gray-900">Datos del Equipo</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5 ml-8">Selecciona el deporte y torneo antes de continuar</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre del equipo *</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ej. Los Halcones"
                value={equipoForm.nombre_equipo}
                onChange={e => setEquipoForm(f => ({ ...f, nombre_equipo: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Deporte *</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={equipoForm.deporte_id}
                onChange={e => setEquipoForm(f => ({ ...f, deporte_id: e.target.value, torneo_id: "" }))}
              >
                <option value="">— Selecciona —</option>
                {deportes.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Torneo *</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={equipoForm.torneo_id}
                onChange={e => setEquipoForm(f => ({ ...f, torneo_id: e.target.value }))}
                disabled={!equipoForm.deporte_id}
              >
                <option value="">— Selecciona —</option>
                {torneosParaDeporte.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Banner de límites al seleccionar deporte */}
          {deporteSeleccionado && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-800">
                  {deporteSeleccionado.nombre}: de {minJug} a {maxJug} jugadores por equipo
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  En el siguiente paso deberás registrar entre {minJug} y {maxJug} participantes.
                  {deporteSeleccionado.tipo_competidor === "individual" && " Deporte individual — un participante por fila."}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={crearEquipo} disabled={guardando}
              className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40">
              {guardando ? "Creando equipo..." : "Continuar →"}
            </button>
            <button onClick={cancelarInscripcion}
              className="border border-gray-200 text-gray-500 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2: carga masiva de jugadores ───────────────────────────── */}
      {step === "jugadores" && equipoCreado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">2</span>
            <h2 className="font-black text-gray-900">Registro de Participantes</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5 ml-8">
            Equipo: <strong className="text-gray-700">{equipoCreado.nombre_equipo}</strong> · Completa nombre y DNI en cada fila
          </p>

          {/* Banner de límites del deporte */}
          {deporteEnEquipo && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-blue-800">
                    {deporteEnEquipo.nombre}: mínimo {minJugEquipo} — máximo {maxJugEquipo} jugadores
                  </span>
                </div>
                <span className={`text-sm font-black px-3 py-0.5 rounded-full ${
                  filasValidas.length < minJugEquipo ? "bg-orange-100 text-orange-700" :
                  filasValidas.length > maxJugEquipo ? "bg-red-100 text-red-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {filasValidas.length} / {minJugEquipo}–{maxJugEquipo}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progresoColor}`}
                  style={{ width: `${Math.min((filasValidas.length / maxJugEquipo) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-blue-500 mt-1.5">
                {filasValidas.length < minJugEquipo
                  ? `Faltan ${minJugEquipo - filasValidas.length} jugadores válidos para alcanzar el mínimo`
                  : filasValidas.length > maxJugEquipo
                  ? `Excedes el límite por ${filasValidas.length - maxJugEquipo} jugadores`
                  : "Cantidad válida — puedes confirmar la inscripción"}
              </p>
            </div>
          )}

          {/* Tabla de jugadores */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 w-8">#</th>
                  <th className="text-left px-3 py-2.5">Nombre completo *</th>
                  <th className="text-left px-3 py-2.5">DNI / Documento *</th>
                  <th className="text-left px-3 py-2.5 w-36">Rol</th>
                  <th className="text-left px-3 py-2.5 w-24">Camiseta</th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, idx) => (
                  <tr key={idx} className={`border-t border-gray-50 ${!fila.nombre_completo.trim() || !fila.documento_identidad.trim() ? "bg-gray-50/50" : ""}`}>
                    <td className="px-3 py-2 text-gray-400 text-xs font-medium">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Nombre y apellidos"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                        value={fila.nombre_completo}
                        onChange={e => actualizarFila(idx, "nombre_completo", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="DNI"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                        value={fila.documento_identidad}
                        onChange={e => actualizarFila(idx, "documento_identidad", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                        value={fila.posicion_rol}
                        onChange={e => actualizarFila(idx, "posicion_rol", e.target.value)}
                      >
                        <option value="Capitán">Capitán</option>
                        <option value="Jugador">Jugador</option>
                        <option value="Suplente">Suplente</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Nro."
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                        value={fila.numero_camiseta}
                        onChange={e => actualizarFila(idx, "numero_camiseta", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => eliminarFila(idx)}
                        disabled={filas.length <= 1}
                        className="text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={agregarFila}
              disabled={filas.length >= maxJugEquipo}
              className="flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" /> Añadir fila
            </button>
            {filas.length - filasValidas.length > 0 && (
              <span className="text-xs text-gray-400">
                {filas.length - filasValidas.length} fila{filas.length - filasValidas.length !== 1 ? "s" : ""} incompleta{filas.length - filasValidas.length !== 1 ? "s" : ""} (se ignorarán)
              </span>
            )}
          </div>

          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-50">
            <button onClick={finalizarInscripcion} disabled={guardando}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 shadow-sm">
              <CheckCircle className="w-4 h-4" />
              {guardando ? "Enviando inscripción..." : `Confirmar inscripción (${filasValidas.length} jugadores)`}
            </button>
            <button onClick={cancelarInscripcion}
              className="border border-gray-200 text-gray-500 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Mis inscripciones ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-black text-gray-900">Mis Equipos Inscritos</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {misInscripciones.length} equipo{misInscripciones.length !== 1 ? "s" : ""}
          </span>
        </div>

        {misInscripciones.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Aún no tienes equipos inscritos</p>
            <p className="text-xs mt-1">Usa "Nueva Inscripción" para registrar tu primer equipo</p>
          </div>
        ) : (
          <div>
            {misInscripciones.map(insc => {
              const jugadores = atletas[insc.club_equipo_id] ?? [];
              const abierto = expandido[insc.id] ?? false;
              const dep = deportes.find(d => d.nombre === insc.nombre_deporte);

              return (
                <div key={insc.id} className="border-b border-gray-50 last:border-0">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-bold text-gray-900 truncate">{insc.nombre_equipo}</p>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 ${estadoBadge(insc.estado)}`}>
                          {insc.estado}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{insc.nombre_deporte} · {insc.nombre_institucion}</p>
                      {insc.pais_asignado && (
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{insc.pais_emoji} {insc.pais_asignado}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="font-medium text-gray-600">{jugadores.length}</span> jugadores registrados
                        {dep && (
                          <span className="ml-2 text-gray-300">
                            · mín {dep.min_jugadores} / máx {dep.max_jugadores}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandido(prev => ({ ...prev, [insc.id]: !abierto }))}
                      className="ml-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 border border-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                    >
                      {abierto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {abierto ? "Ocultar" : "Ver jugadores"}
                    </button>
                  </div>

                  {abierto && (
                    <div className="px-6 pb-4">
                      {insc.estado === "aprobado" && (
                        <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">
                            Inscripción aprobada. Si el torneo ya inició, los jugadores no pueden modificarse.
                          </p>
                        </div>
                      )}
                      {jugadores.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Sin jugadores registrados</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-100">
                              <th className="text-left pb-1.5 pr-4 font-semibold">Nombre</th>
                              <th className="text-left pb-1.5 pr-4 font-semibold">DNI</th>
                              <th className="text-left pb-1.5 pr-4 font-semibold">Rol</th>
                              <th className="text-left pb-1.5 pr-4 font-semibold">Camiseta</th>
                              <th className="pb-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {jugadores.map((j: any) => (
                              <tr key={j.id} className="border-b border-gray-50 last:border-0">
                                <td className="py-1.5 pr-4 font-medium text-gray-900">{j.nombre_completo}</td>
                                <td className="py-1.5 pr-4 text-gray-500">{j.documento_identidad}</td>
                                <td className="py-1.5 pr-4 text-gray-500">{j.posicion_rol}</td>
                                <td className="py-1.5 pr-4 text-gray-400">{j.numero_camiseta || "—"}</td>
                                <td className="py-1.5">
                                  <button
                                    onClick={() => eliminarAtleta(j.id, insc.club_equipo_id)}
                                    className="text-gray-200 hover:text-red-500 transition-colors"
                                    title="Eliminar jugador"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
