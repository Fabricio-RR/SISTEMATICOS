"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Trophy, Plus, Trash2, Search, AlertCircle, ShieldCheck, X, Loader2, HelpCircle, CheckCircle2, Edit2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Deporte, TipoCompetidor } from "@/types/api";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

//  Tipos Locales 
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }
type ModalFormState = { isOpen: boolean; mode: "create" | "edit"; data: Partial<Deporte> };

//  Lógica de datos 
function useDeportesManager(addToast: (msg: string, type: ToastType) => void) {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await api.getDeportes();
      setDeportes(data);
    } catch {
      addToast("Error al cargar la lista de deportes.", "error");
    } finally {
      setCargando(false);
    }
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (payload: Omit<Deporte, "id">) => {
    try {
      await api.createDeporte(payload);
      addToast(`La disciplina "${payload.nombre}" se registró correctamente.`, "success");
      await cargar(); 
    } catch (err) {
      throw err;
    }
  };

  // Editar deporte
  const editar = async (id: number, payload: Partial<Deporte>) => {
    const deportesAnteriores = [...deportes];
    setDeportes((prev) => prev.map(d => d.id === id ? { ...d, ...payload } : d));
    try {
      await api.updateDeporte(id, payload);
      addToast("Disciplina actualizada correctamente.", "success");
    } catch (err) {
      setDeportes(deportesAnteriores);
      throw err;
    }
  };

  const eliminar = async (id: number) => {
    const deporteAEliminar = deportes.find(d => d.id === id);
    const deportesAnteriores = [...deportes];

    setDeportes((prev) => prev.filter(d => d.id !== id)); // Optimistic Delete

    try {
      await api.deleteDeporte(id);
      addToast(`Se eliminó "${deporteAEliminar?.nombre}" del sistema.`, "success");
    } catch (err) {
      setDeportes(deportesAnteriores); // Rollback
      throw err;
    }
  };

  return { deportes, cargando, crear, editar, eliminar };
}

export default function DeportesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // --- Estados de Modales ---
  const [modalForm, setModalForm] = useState<ModalFormState>({ isOpen: false, mode: "create", data: {} });
  const [deporteEliminar, setDeporteEliminar] = useState<Deporte | null>(null);
  const [guardando, setGuardando] = useState(false);

  //  Helpers 
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const { deportes, cargando, crear, editar, eliminar } = useDeportesManager(addToast);

  //  Manejo de Teclado 
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalForm((prev) => ({ ...prev, isOpen: false }));
        setDeporteEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //  Handlers de UI 
  const abrirCrear = () => {
    setModalForm({ isOpen: true, mode: "create", data: { nombre: "", tipo_competidor: "equipo", es_obligatorio: false, esta_activo: true } });
  };

  const abrirEditar = (deporte: Deporte) => {
    setModalForm({ isOpen: true, mode: "edit", data: { ...deporte } });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, nombre, tipo_competidor, esta_activo } = modalForm.data;
    
    if (!nombre?.trim()) { addToast("El nombre es obligatorio.", "error"); return; }
    
    setGuardando(true);
    try {
      if (modalForm.mode === "create") {
        await crear({ nombre: nombre.trim(), tipo_competidor: tipo_competidor as TipoCompetidor, esta_activo: esta_activo ?? true, es_obligatorio: false });
      } else if (modalForm.mode === "edit" && id) {
        await editar(id, { nombre: nombre.trim(), tipo_competidor, esta_activo });
      }
      setModalForm((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al procesar la solicitud.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!deporteEliminar) return;
    setGuardando(true);
    try {
      await eliminar(deporteEliminar.id);
      setDeporteEliminar(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al eliminar el deporte.", "error");
    } finally {
      setGuardando(false);
    }
  };

  // --- Optimización ---
  const filtrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return deportes;
    return deportes.filter((d) => d.nombre.toLowerCase().includes(termino));
  }, [deportes, busqueda]);

  return (
    <div className="space-y-6 relative">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Deportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de disciplinas y categorías del torneo.</p>
        </div>
        <button onClick={abrirCrear} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
          <Plus className="w-4 h-4" /> Nuevo deporte
        </button>
      </div>

      {/* Buscador */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar disciplina..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deporte</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                // SKELETONS (Mejor UX visual)
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-6"></div></td>
                    <td className="px-6 py-5"><div className="flex gap-3 items-center"><div className="w-8 h-8 bg-gray-100 rounded-lg"></div><div className="h-4 bg-gray-100 rounded w-32"></div></div></td>
                    <td className="px-6 py-5"><div className="h-5 bg-gray-100 rounded-full w-20 mx-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-5 bg-gray-100 rounded-full w-24 mx-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-5 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-gray-400">
                    {busqueda ? "No se encontraron deportes que coincidan con la búsqueda." : "No hay deportes registrados."}
                  </td>
                </tr>
              ) : (
                filtrados.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{String(d.id).padStart(2, "0")}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${d.es_obligatorio ? "bg-amber-50" : "bg-red-50"}`}>
                          <Trophy className={`w-4 h-4 ${d.es_obligatorio ? "text-amber-600" : "text-red-600"}`} />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{d.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        {d.tipo_competidor === "equipo" ? "Equipos" : "Individual"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {d.es_obligatorio ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><ShieldCheck className="w-3 h-3" /> Obligatorio</span>
                      ) : (
                        <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Adicional</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${d.esta_activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {d.esta_activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(d)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!d.es_obligatorio && (
                          <button onClick={() => setDeporteEliminar(d)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DUAL (CREAR / EDITAR) */}
      {modalForm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"><X className="w-5 h-5" /></button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${modalForm.mode === "create" ? "bg-red-50" : "bg-blue-50"}`}>
                {modalForm.mode === "create" ? <Plus className="w-4 h-4 text-red-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{modalForm.mode === "create" ? "Nuevo deporte" : "Editar disciplina"}</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre</label>
                <input value={modalForm.data.nombre || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, nombre: e.target.value } }))} maxLength={100} required placeholder="Ej. Fútbol, Voley, Basquet, etc." className={inputCls} disabled={guardando} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
                  <select value={modalForm.data.tipo_competidor || "equipo"} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, tipo_competidor: e.target.value as TipoCompetidor } }))} className={inputCls} disabled={guardando}>
                    <option value="equipo">Equipos</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                  <select value={modalForm.data.esta_activo ? "true" : "false"} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, esta_activo: e.target.value === "true" } }))} className={inputCls} disabled={guardando}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} disabled={guardando} className="flex-1 border border-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-100 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className={`flex-1 font-semibold py-2.5 rounded-lg text-sm transition text-white flex items-center justify-center gap-2 ${modalForm.mode === "create" ? "bg-red-600 hover:bg-red-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : (modalForm.mode === "create" ? "Guardar" : "Actualizar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {deporteEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeporteEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar disciplina?</h2>
                <p className="text-sm text-gray-500 mt-2">Borrarás permanentemente <strong className="text-gray-900">"{deporteEliminar.nombre}"</strong>. Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button type="button" onClick={() => setDeporteEliminar(null)} disabled={guardando} className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
              <button type="button" onClick={handleDelete} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-auto ${toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="ml-2 opacity-70 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}