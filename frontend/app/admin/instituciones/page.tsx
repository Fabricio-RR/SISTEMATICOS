"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Building2, Plus, Trash2, Search, AlertCircle, CheckCircle2, Edit2, X, Loader2, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Institucion, CategoriaInstitucion } from "@/types/api";
import { CATEGORIAS, CATEGORIA_PAIS } from "@/types/api";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all";

type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }
type ModalFormState = { isOpen: boolean; mode: "create" | "edit"; data: Partial<Institucion> };

//  Manejo de Datos y CRUD
function useInstitucionesManager(addToast: (msg: string, type: ToastType) => void) {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await api.getInstituciones();
      setInstituciones(data);
    } catch {
      addToast("No se pudo cargar las instituciones. Verifica la conexión.", "error");
    } finally {
      setCargando(false);
    }
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (payload: Partial<Institucion>) => {
    try {
      await api.createInstitucion(payload as any);
      addToast("Institución registrada correctamente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const editar = async (id: number, payload: Partial<Institucion>) => {
    try {
      // Asume que tu API tiene este método estándar
      await api.updateInstitucion(id, payload as any);
      addToast("Institución actualizada correctamente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const eliminar = async (id: number) => {
    try {
      await api.deleteInstitucion(id);
      addToast("Institución eliminada del sistema.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  return { instituciones, cargando, crear, editar, eliminar };
}

// COMPONENTE PRINCIPAL
export default function InstitucionesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [guardando, setGuardando] = useState(false);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const { instituciones, cargando, crear, editar, eliminar } = useInstitucionesManager(addToast);

  //  Estados de Modales 
  const [modalForm, setModalForm] = useState<ModalFormState>({ isOpen: false, mode: "create", data: {} });
  const [institucionEliminar, setInstitucionEliminar] = useState<Institucion | null>(null);
  const [errorForm, setErrorForm] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalForm(p => ({ ...p, isOpen: false }));
        setInstitucionEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handlers de Formulario 
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, nombre, nombre_corto, ciudad, contacto, categoria, estado } = modalForm.data;

    // Validaciones
    if (!nombre || !nombre_corto || !ciudad) {
      setErrorForm("Los campos Nombre, Nombre Corto y Ciudad son obligatorios."); return;
    }
    if (nombre.length > 200) { setErrorForm("El nombre no puede tener más de 200 caracteres."); return; }
    if (nombre_corto.length > 50) { setErrorForm("El nombre corto no puede tener más de 50 caracteres."); return; }
    if (ciudad.length > 100) { setErrorForm("La ciudad no puede tener más de 100 caracteres."); return; }
    if (contacto && contacto.length > 200) { setErrorForm("El contacto no puede tener más de 200 caracteres."); return; }

    setGuardando(true); setErrorForm("");
    
    const payload = {
      nombre: nombre.trim(),
      nombre_corto: nombre_corto.trim(),
      ciudad: ciudad.trim(),
      contacto: contacto?.trim() || undefined,
      categoria: categoria || undefined,
      estado: estado || "activo"
    };

    try {
      if (modalForm.mode === "create") {
        await crear(payload);
      } else if (modalForm.mode === "edit" && id) {
        await editar(id, payload);
      }
      setModalForm({ isOpen: false, mode: "create", data: {} });
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!institucionEliminar) return;
    setGuardando(true);
    try {
      await eliminar(institucionEliminar.id);
      setInstitucionEliminar(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al eliminar la institución.", "error");
    } finally {
      setGuardando(false);
    }
  };

  //  Optimizaciones 
  const filtradas = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return instituciones;
    return instituciones.filter(i => 
      i.nombre.toLowerCase().includes(termino) || 
      i.ciudad.toLowerCase().includes(termino) ||
      (i.nombre_corto && i.nombre_corto.toLowerCase().includes(termino))
    );
  }, [instituciones, busqueda]);

  function iniciales(inst: Institucion) {
    const fuente = inst.nombre_corto || inst.nombre;
    return fuente.slice(0, 2).toUpperCase();
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Instituciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de colegios, universidades y clubes deportivos.</p>
        </div>
        <button
          onClick={() => { setModalForm({ isOpen: true, mode: "create", data: { estado: "activo" } }); setErrorForm(""); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" /> Nueva institución
        </button>
      </div>

      {/* Buscador */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Institución</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ciudad</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría / País</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacto</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-6"></div></td>
                    <td className="px-6 py-5"><div className="flex gap-3 items-center"><div className="w-8 h-8 bg-gray-100 rounded-lg"></div><div className="space-y-2"><div className="h-4 bg-gray-100 rounded w-32"></div><div className="h-3 bg-gray-100 rounded w-16"></div></div></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-28"></div></td>
                    <td className="px-6 py-5"><div className="h-5 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Building2 className="w-10 h-10 text-gray-200 mb-3" strokeWidth={1.5} />
                      <p>{busqueda ? "No se encontraron instituciones para esta búsqueda." : "No hay instituciones registradas en el sistema."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{String(inst.id).padStart(2, "0")}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                          <span className="text-red-600 text-[10px] font-black tracking-wider">{iniciales(inst)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{inst.nombre}</p>
                          <p className="text-xs text-gray-500 font-medium">{inst.nombre_corto}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{inst.ciudad}</td>
                    <td className="px-6 py-4">
                      {inst.categoria ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inst.categoria}</p>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{inst.pais_representativo ?? "—"}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{inst.contacto ?? "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full ${
                        inst.estado === "activo" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {inst.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setModalForm({ isOpen: true, mode: "edit", data: { ...inst } }); setErrorForm(""); }} 
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" 
                          title="Editar Institución"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setInstitucionEliminar(inst)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Eliminar Institución"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DUAL: CREAR / EDITAR */}
      {modalForm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${modalForm.mode === "create" ? "bg-red-50" : "bg-blue-50"}`}>
                {modalForm.mode === "create" ? <Building2 className="w-4 h-4 text-red-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{modalForm.mode === "create" ? "Nueva institución" : "Editar institución"}</h2>
              </div>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre completo <span className="text-red-500">*</span></label>
                <input
                  value={modalForm.data.nombre || ""}
                  onChange={(e) => setModalForm(p => ({ ...p, data: { ...p.data, nombre: e.target.value } }))}
                  required maxLength={200} placeholder="Ej. Universidad de Lima"
                  className={inputCls} disabled={guardando}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre corto <span className="text-red-500">*</span></label>
                  <input
                    value={modalForm.data.nombre_corto || ""}
                    onChange={(e) => setModalForm(p => ({ ...p, data: { ...p.data, nombre_corto: e.target.value } }))}
                    required maxLength={50} placeholder="Ej. UL"
                    className={inputCls} disabled={guardando}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ciudad <span className="text-red-500">*</span></label>
                  <input
                    value={modalForm.data.ciudad || ""}
                    onChange={(e) => setModalForm(p => ({ ...p, data: { ...p.data, ciudad: e.target.value } }))}
                    required maxLength={100} placeholder="Ej. Lima"
                    className={inputCls} disabled={guardando}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contacto (Opcional)</label>
                <input
                  value={modalForm.data.contacto || ""}
                  onChange={(e) => setModalForm(p => ({ ...p, data: { ...p.data, contacto: e.target.value } }))}
                  maxLength={200} placeholder="Teléfono o correo de contacto"
                  className={inputCls} disabled={guardando}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Categoría</label>
                  <select
                    value={modalForm.data.categoria || ""}
                    onChange={(e) => setModalForm(p => ({ ...p, data: { ...p.data, categoria: e.target.value as CategoriaInstitucion | "" } }))}
                    className={inputCls} disabled={guardando}
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                  <select
                    value={modalForm.data.estado || "activo"}
                    onChange={(e) => setModalForm(p => ({ ...p, data: { ...p.data, estado: e.target.value } }))}
                    className={inputCls} disabled={guardando}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              {modalForm.data.categoria && (
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">País representativo:</span>
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{CATEGORIA_PAIS[modalForm.data.categoria as CategoriaInstitucion]}</span>
                </div>
              )}

              {errorForm && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorForm}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}
                  disabled={guardando}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className={`flex-1 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    modalForm.mode === "create" ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  }`}
                >
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                  {guardando ? "Guardando..." : modalForm.mode === "create" ? "Crear" : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SEGURIDAD: ELIMINAR */}
      {institucionEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setInstitucionEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar institución?</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Estás a punto de eliminar permanentemente a <strong className="text-gray-900">"{institucionEliminar.nombre}"</strong>. 
                  Si esta institución tiene equipos asignados, causará errores en el sistema.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button 
                type="button" 
                onClick={() => setInstitucionEliminar(null)}
                disabled={guardando}
                className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleDelete}
                disabled={guardando}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition flex items-center gap-2"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS MANAGER */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-auto ${toast.type === "success" ? "bg-gray-900 text-white border border-gray-800" : "bg-red-600 text-white border border-red-700"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="ml-2 opacity-70 hover:opacity-100 transition-opacity focus:outline-none"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}