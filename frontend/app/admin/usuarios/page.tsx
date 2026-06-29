"use client";
import { useEffect, useState } from "react";
import {
  Users, CheckCircle, XCircle, Clock, Search,
  Building2, Mail, RefreshCw, AlertCircle, Shield, UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useInstituciones } from "@/lib/hooks";
import { useDuplicadosInstitucion } from "@/lib/useDuplicadosInstitucion";
import type { Institucion, Usuario } from "@/types/api";

type Tab = "pendientes" | "todos";

const ROL_BADGE: Record<string, string> = {
  admin: "bg-red-50 text-red-600",
  arbitro: "bg-purple-50 text-purple-600",
  institucion: "bg-blue-50 text-blue-600",
};

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  arbitro: "Árbitro",
  institucion: "Institución",
};

export default function UsuariosPage() {
  const [todos, setTodos] = useState<Usuario[]>([]);
  const [pendientes, setPendientes] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState<Tab>("pendientes");
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Para mostrar el nombre real de la institución y detectar duplicados al aprobar.
  const institucionesQ = useInstituciones();
  const institucionPorId = new Map((institucionesQ.data ?? []).map((i) => [i.id, i]));

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [t, p] = await Promise.all([api.getUsuarios(), api.getPendientes()]);
      setTodos(t);
      setPendientes(p);
    } catch {
      setError("No se pudo cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function aprobar(id: number) {
    setAccion(id);
    setError("");
    try { await api.approveUsuario(id); await cargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo aprobar el usuario."); }
    finally { setAccion(null); }
  }

  async function desactivar(id: number) {
    setAccion(id);
    setError("");
    try { await api.deactivateUsuario(id); await cargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo desactivar el usuario."); }
    finally { setAccion(null); }
  }

  const lista = tab === "pendientes" ? pendientes : todos;
  const filtrada = lista.filter((u) =>
    `${u.nombres} ${u.apellidos} ${u.correo}`.toLowerCase().includes(busqueda.toLowerCase())
  );
  const activos = todos.filter((u) => u.esta_activo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Administración</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Usuarios</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestión de accesos y aprobaciones.</p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{pendientes.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Solicitudes pendientes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{activos}</p>
            <p className="text-xs text-slate-400 mt-0.5">Usuarios activos</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-100">
          <div className="px-6 flex items-center justify-between">
            {/* Tabs underline */}
            <div className="flex">
              {([
                { key: "pendientes", label: "Pendientes", count: pendientes.length, dot: pendientes.length > 0 },
                { key: "todos", label: "Todos", count: todos.length, dot: false },
              ] as { key: Tab; label: string; count: number; dot: boolean }[]).map(({ key, label, count, dot }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setBusqueda(""); }}
                  className={`relative flex items-center gap-2 px-4 py-4 text-sm font-semibold transition-colors ${
                    tab === key
                      ? "text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-red-600 after:rounded-full"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {label}
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                    tab === key
                      ? dot ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative py-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
              />
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : filtrada.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-400">
              {tab === "pendientes" ? "No hay solicitudes pendientes" : busqueda ? "Sin resultados" : "No hay usuarios"}
            </p>
            {tab === "pendientes" && (
              <p className="text-xs text-slate-300">Las nuevas solicitudes aparecerán aquí</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Correo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rol</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrada.map((u) => {
                const inicial = u.nombres.charAt(0).toUpperCase();
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          u.esta_activo ? "bg-red-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          {inicial}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.nombres} {u.apellidos}</p>
                          {u.institucion_id && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {institucionPorId.get(u.institucion_id)?.nombre ?? `Inst. #${u.institucion_id}`}
                            </p>
                          )}
                          {/* Aviso si la institución pendiente parece duplicar una ya registrada */}
                          {!u.esta_activo && u.rol === "institucion" && u.institucion_id && (
                            <BadgeDuplicado institucion={institucionPorId.get(u.institucion_id)} />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        {u.correo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROL_BADGE[u.rol] ?? "bg-slate-100 text-slate-600"}`}>
                        <Shield className="w-3 h-3" />
                        {ROL_LABEL[u.rol] ?? u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.esta_activo ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!u.esta_activo ? (
                        <button
                          onClick={() => aprobar(u.id)}
                          disabled={accion === u.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {accion === u.id ? "..." : "Aprobar"}
                        </button>
                      ) : u.rol !== "admin" ? (
                        <button
                          onClick={() => desactivar(u.id)}
                          disabled={accion === u.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-slate-600 text-xs font-semibold rounded-lg transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {accion === u.id ? "..." : "Desactivar"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300 px-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * Avisa al administrador, antes de aprobar una solicitud, si la institución
 * pendiente parece duplicar una ya registrada y activa. Reutiliza el mismo
 * endpoint de detección (sin recalcular normalización en el cliente).
 */
function BadgeDuplicado({ institucion }: { institucion?: Institucion }) {
  const { similares } = useDuplicadosInstitucion(
    institucion?.nombre ?? "",
    institucion?.nombre_corto,
    institucion?.id,
  );
  if (!institucion) return null;
  const activos = similares.filter((s) => s.estado === "activo");
  if (activos.length === 0) return null;

  return (
    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      <AlertCircle className="w-3 h-3" />
      Posible duplicado de: {activos[0].nombre}
    </p>
  );
}
