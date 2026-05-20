"use client";
import { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Clock, Search, Building2, Mail, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

type Usuario = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  esta_activo: boolean;
  institucion_id: number | null;
};

export default function UsuariosPage() {
  const [todos, setTodos] = useState<Usuario[]>([]);
  const [pendientes, setPendientes] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState<"pendientes" | "todos">("pendientes");
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const [t, p] = await Promise.all([api.getUsuarios(), api.getPendientes()]);
      setTodos(t);
      setPendientes(p);
    } catch {
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function aprobar(id: number) {
    setAccion(id);
    try {
      await api.approveUsuario(id);
      await cargar();
    } finally {
      setAccion(null);
    }
  }

  async function desactivar(id: number) {
    setAccion(id);
    try {
      await api.deactivateUsuario(id);
      await cargar();
    } finally {
      setAccion(null);
    }
  }

  const lista = tab === "pendientes" ? pendientes : todos;
  const filtrada = lista.filter(
    (u) =>
      `${u.nombres} ${u.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-400 mt-1">Aprobación de solicitudes institucionales</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black text-orange-700">{pendientes.length}</p>
            <p className="text-xs font-semibold text-orange-500">Solicitudes pendientes</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black text-green-700">{todos.filter((u) => u.esta_activo).length}</p>
            <p className="text-xs font-semibold text-green-500">Usuarios activos</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Tabs + búsqueda */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["pendientes", "todos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "pendientes" ? `Pendientes (${pendientes.length})` : `Todos (${todos.length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : filtrada.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Users className="w-10 h-10 mb-2" />
            <p className="text-sm">
              {tab === "pendientes" ? "No hay solicitudes pendientes" : "No se encontraron usuarios"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Correo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                          {u.nombres[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {u.nombres} {u.apellidos}
                          </p>
                          {u.institucion_id && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Institución #{u.institucion_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {u.correo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.rol === "admin"
                            ? "bg-red-50 text-red-600"
                            : u.rol === "arbitro"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`flex items-center gap-1.5 text-xs font-bold ${
                          u.esta_activo ? "text-green-600" : "text-orange-500"
                        }`}
                      >
                        {u.esta_activo ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {u.esta_activo ? "Activo" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!u.esta_activo ? (
                          <button
                            onClick={() => aprobar(u.id)}
                            disabled={accion === u.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aprobar
                          </button>
                        ) : u.rol !== "admin" ? (
                          <button
                            onClick={() => desactivar(u.id)}
                            disabled={accion === u.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 disabled:bg-orange-50 text-orange-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Desactivar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}