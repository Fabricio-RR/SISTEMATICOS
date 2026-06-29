"use client";
import { useState } from "react";
import { User, Plus, Trash2, Search, AlertCircle, Save, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAtletas, useEquipos, useDeportes } from "@/lib/hooks";
import type { AtletaJugador, ClubEquipo, Deporte } from "@/types/api";

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

type StatEdit = { goles_anotados?: number; puntos_anotados?: number; tarjetas_amarillas?: number; tarjetas_rojas?: number };

function esFutbol(deporte: Deporte | undefined): boolean {
  if (!deporte) return false;
  const n = deporte.nombre.toLowerCase();
  return n.includes("fútbol") || n.includes("futbol");
}

export default function AtletasAdminPage() {
  const queryClient = useQueryClient();
  const [equipoFiltro, setEquipoFiltro] = useState<number | undefined>();
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ club_equipo_id: 0, nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [editStats, setEditStats] = useState<Record<number, StatEdit>>({});
  const [guardandoStat, setGuardandoStat] = useState<number | null>(null);
  const [expandido, setExpandido] = useState<Set<number>>(new Set());

  const atletasQ = useAtletas(equipoFiltro);
  const equiposQ = useEquipos();
  const deportesQ = useDeportes();
  const atletas = atletasQ.data ?? [];
  const equipos = equiposQ.data ?? [];
  const deportes = deportesQ.data ?? [];
  const cargando = atletasQ.isLoading || equiposQ.isLoading || deportesQ.isLoading;
  const recargar = () => queryClient.invalidateQueries({ queryKey: ["atletas"] });
  const errorMostrado = error || ((atletasQ.isError || equiposQ.isError || deportesQ.isError) ? "No se pudo cargar los atletas." : "");

  const depMap = new Map(deportes.map((d) => [d.id, d]));
  const eqMap = new Map(equipos.map((e) => [e.id, e]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.club_equipo_id || !form.documento_identidad) { setErrorForm("Selecciona equipo e ingresa el documento."); return; }
    setGuardando(true);
    setErrorForm("");
    try {
      await api.createAtleta({
        club_equipo_id: form.club_equipo_id,
        nombre_completo: form.nombre_completo,
        numero_camiseta: form.numero_camiseta || undefined,
        posicion_rol: form.posicion_rol || undefined,
        documento_identidad: form.documento_identidad,
      });
      setModal(false);
      setForm({ club_equipo_id: 0, nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
      await recargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false); }
  }

  async function handleDelete(id: number) {
    setEliminando(id);
    setError("");
    try { await api.deleteAtleta(id); await recargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo eliminar el atleta."); }
    finally { setEliminando(null); }
  }

  async function guardarStat(atleta: AtletaJugador) {
    const cambios = editStats[atleta.id];
    if (!cambios) return;
    setGuardandoStat(atleta.id);
    try {
      await api.updateAtleta(atleta.id, cambios);
      setEditStats((prev) => { const next = { ...prev }; delete next[atleta.id]; return next; });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardandoStat(null);
    }
  }

  function toggleExpandido(equipoId: number) {
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(equipoId)) next.delete(equipoId);
      else next.add(equipoId);
      return next;
    });
  }

  const filtrados = atletas.filter((a) =>
    a.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.documento_identidad.includes(busqueda)
  );

  const equiposConAtletas = equipos.filter((eq) => filtrados.some((a) => a.club_equipo_id === eq.id));
  const atletasSinEquipo = filtrados.filter((a) => !equipos.find((eq) => eq.id === a.club_equipo_id));

  function renderAtleta(a: AtletaJugador) {
    const eq = eqMap.get(a.club_equipo_id);
    const dep = eq ? depMap.get(eq.deporte_id) : undefined;
    const futbol = esFutbol(dep);
    const stat = editStats[a.id] ?? {};
    const statActual = {
      goles_anotados: stat.goles_anotados ?? a.goles_anotados,
      puntos_anotados: stat.puntos_anotados ?? a.puntos_anotados,
      tarjetas_amarillas: stat.tarjetas_amarillas ?? a.tarjetas_amarillas,
      tarjetas_rojas: stat.tarjetas_rojas ?? a.tarjetas_rojas,
    };
    const hayEdicion = editStats[a.id] !== undefined;

    return (
      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{a.nombre_completo}</p>
              <p className="text-xs text-slate-400">{a.documento_identidad}{a.posicion_rol ? ` · ${a.posicion_rol}` : ""}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center text-sm text-slate-500">{a.numero_camiseta ?? "—"}</td>
        <td className="px-4 py-3 text-center">
          <input
            type="number" min={0}
            value={futbol ? statActual.goles_anotados : statActual.puntos_anotados}
            onChange={(e) => {
              const val = Number(e.target.value);
              setEditStats((prev) => ({
                ...prev,
                [a.id]: { ...prev[a.id], ...(futbol ? { goles_anotados: val } : { puntos_anotados: val }) },
              }));
            }}
            className="w-16 text-center text-sm border border-slate-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </td>
        {futbol && (
          <>
            <td className="px-4 py-3 text-center">
              <input
                type="number" min={0}
                value={statActual.tarjetas_amarillas}
                onChange={(e) => setEditStats((prev) => ({ ...prev, [a.id]: { ...prev[a.id], tarjetas_amarillas: Number(e.target.value) } }))}
                className="w-14 text-center text-sm border border-slate-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </td>
            <td className="px-4 py-3 text-center">
              <input
                type="number" min={0}
                value={statActual.tarjetas_rojas}
                onChange={(e) => setEditStats((prev) => ({ ...prev, [a.id]: { ...prev[a.id], tarjetas_rojas: Number(e.target.value) } }))}
                className="w-14 text-center text-sm border border-slate-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </td>
          </>
        )}
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            {hayEdicion && (
              <button
                onClick={() => guardarStat(a)}
                disabled={guardandoStat === a.id}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
              >
                <Save className="w-3 h-3" />
                {guardandoStat === a.id ? "..." : "Guardar"}
              </button>
            )}
            <button onClick={() => handleDelete(a.id)} disabled={eliminando === a.id} className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  function renderGrupoEquipo(eq: ClubEquipo) {
    const dep = depMap.get(eq.deporte_id);
    const futbol = esFutbol(dep);
    const atletasDeEquipo = filtrados.filter((a) => a.club_equipo_id === eq.id);
    const abierto = expandido.has(eq.id);

    return (
      <div key={eq.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => toggleExpandido(eq.id)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">{eq.nombre_equipo}</p>
              <p className="text-xs text-slate-400">{dep?.nombre ?? "—"} · {atletasDeEquipo.length} atleta{atletasDeEquipo.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </button>

        {abierto && (
          <div className="border-t border-slate-50 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/60">
                  <th className="text-left px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Atleta</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {futbol ? "Goles" : "Puntos"}
                  </th>
                  {futbol && (
                    <>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">TA</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-red-400 uppercase tracking-wider">TR</th>
                    </>
                  )}
                  <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {atletasDeEquipo.length === 0 ? (
                  <tr><td colSpan={futbol ? 6 : 4} className="text-center py-6 text-sm text-slate-400">Sin atletas registrados</td></tr>
                ) : atletasDeEquipo.map(renderAtleta)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Administración</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Atletas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Registro de jugadores y estadísticas individuales por deporte.</p>
        </div>
        <button
          onClick={() => { setModal(true); setErrorForm(""); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo atleta
        </button>
      </div>

      {errorMostrado && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{errorMostrado}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
          />
        </div>
        <select
          value={equipoFiltro ?? ""}
          onChange={(e) => setEquipoFiltro(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Todos los equipos</option>
          {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>)}
        </select>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
          <User className="w-8 h-8 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">Sin atletas registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equiposConAtletas.map(renderGrupoEquipo)}
          {atletasSinEquipo.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-xl p-4 text-sm text-slate-400">
              {atletasSinEquipo.length} atleta(s) sin equipo asignado
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Nuevo atleta</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <select
                  value={form.club_equipo_id || ""}
                  onChange={(e) => setForm({ ...form, club_equipo_id: Number(e.target.value) })}
                  required className={inputCls}
                >
                  <option value="">Seleccionar equipo</option>
                  {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre completo</label>
                <input
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  required placeholder="Ej. Juan Pérez López"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Documento de identidad</label>
                <input
                  value={form.documento_identidad}
                  onChange={(e) => setForm({ ...form, documento_identidad: e.target.value })}
                  required placeholder="DNI / Carnet"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">N° Camiseta</label>
                  <input
                    value={form.numero_camiseta}
                    onChange={(e) => setForm({ ...form, numero_camiseta: e.target.value })}
                    placeholder="Ej. 10"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Posición / Rol</label>
                  <input
                    value={form.posicion_rol}
                    onChange={(e) => setForm({ ...form, posicion_rol: e.target.value })}
                    placeholder="Ej. Delantero"
                    className={inputCls}
                  />
                </div>
              </div>
              {errorForm && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{errorForm}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModal(false); setErrorForm(""); }}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                  {guardando ? "Guardando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
