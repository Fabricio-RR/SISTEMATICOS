"use client";
import { useState } from "react";
import { Trophy, Plus, Trash2, Search, AlertCircle, ShieldCheck, Pencil, Power, PowerOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDeportes } from "@/lib/hooks";
import {
  PageHeader, Button, Alert, Badge, Vacio,
  TableShell, THead, TBody, Tr, Th, Td,
  Modal, Field, Input, Select,
} from "@/components/ui";
import type { Deporte, TipoCompetidor } from "@/types/api";

export default function DeportesPage() {
  const queryClient = useQueryClient();
  const deportesQ = useDeportes(true);
  const deportes = deportesQ.data ?? [];
  const cargando = deportesQ.isLoading;
  const recargar = () => queryClient.invalidateQueries({ queryKey: ["deportes"] });

  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", tipo_competidor: "equipo" as TipoCompetidor });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [eliminando, setEliminando]   = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Deporte | null>(null);
  const [errorConfirm, setErrorConfirm] = useState("");

  const errorMostrado = error || (deportesQ.isError ? "No se pudo cargar los deportes." : "");

  function abrirCrear() {
    setEditId(null);
    setForm({ nombre: "", tipo_competidor: "equipo" });
    setErrorForm("");
    setModal(true);
  }

  function abrirEditar(d: Deporte) {
    setEditId(d.id);
    setForm({ nombre: d.nombre, tipo_competidor: d.tipo_competidor });
    setErrorForm("");
    setModal(true);
  }

  function cerrarModal() {
    setModal(false);
    setEditId(null);
    setErrorForm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (nombre.length < 2) {
      setErrorForm("El nombre del deporte debe tener al menos 2 caracteres.");
      return;
    }
    if (nombre.length > 100) {
      setErrorForm("El nombre del deporte no puede tener más de 100 caracteres.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      if (editId == null) await api.createDeporte({ ...form, nombre });
      else await api.updateDeporte(editId, { ...form, nombre });
      cerrarModal();
      setForm({ nombre: "", tipo_competidor: "equipo" });
      await recargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally { setGuardando(false); }
  }

  async function handleToggleActivo(d: Deporte) {
    setToggling(d.id);
    setError("");
    try { await api.updateDeporte(d.id, { esta_activo: !d.esta_activo }); await recargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo cambiar el estado del deporte."); }
    finally { setToggling(null); }
  }

  async function handleDelete() {
    if (!confirmarEliminar) return;
    const id = confirmarEliminar.id;
    setEliminando(id);
    setErrorConfirm("");
    try {
      await api.deleteDeporte(id);
      setConfirmarEliminar(null);
      await recargar();
    } catch (err) {
      setErrorConfirm(err instanceof Error ? err.message : "No se pudo eliminar el deporte.");
    } finally { setEliminando(null); }
  }

  const filtrados = deportes.filter((d) =>
    d.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deportes"
        subtitle="Gestión de disciplinas deportivas del torneo."
        actions={<Button onClick={abrirCrear}><Plus className="w-4 h-4" />Nuevo deporte</Button>}
      />

      {errorMostrado && <Alert>{errorMostrado}</Alert>}

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar deporte..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10 bg-white"
          aria-label="Buscar deportes"
        />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <Vacio
          icon={<Trophy className="h-6 w-6" />}
          titulo={busqueda ? "Sin resultados" : "No hay deportes registrados"}
          detalle={busqueda ? "Prueba con otro nombre." : "Crea el primer deporte con el botón «Nuevo deporte»."}
        />
      ) : (
        <TableShell>
          <THead>
            <Tr className="hover:bg-transparent">
              <Th>#</Th>
              <Th>Deporte</Th>
              <Th className="text-center">Tipo</Th>
              <Th className="text-center">Categoría</Th>
              <Th className="text-center">Estado</Th>
              <Th className="text-center">Acciones</Th>
            </Tr>
          </THead>
          <TBody>
            {filtrados.map((d) => (
              <Tr key={d.id}>
                <Td className="font-mono text-slate-400">{String(d.id).padStart(2, "0")}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${d.es_obligatorio ? "bg-amber-50" : "bg-brand-50"}`}>
                      <Trophy className={`w-4 h-4 ${d.es_obligatorio ? "text-amber-600" : "text-brand-600"}`} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{d.nombre}</p>
                  </div>
                </Td>
                <Td className="text-center">
                  <Badge tone="info">{d.tipo_competidor === "equipo" ? "Equipos" : "Individual"}</Badge>
                </Td>
                <Td className="text-center">
                  {d.es_obligatorio ? (
                    <Badge tone="warning"><ShieldCheck className="w-3 h-3" />Obligatorio</Badge>
                  ) : (
                    <Badge tone="neutral">Adicional</Badge>
                  )}
                </Td>
                <Td className="text-center">
                  <Badge tone={d.esta_activo ? "success" : "neutral"}>{d.esta_activo ? "Activo" : "Inactivo"}</Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => abrirEditar(d)} aria-label={`Editar ${d.nombre}`}
                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-blue-50 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!d.es_obligatorio && (
                      <button onClick={() => handleToggleActivo(d)} disabled={toggling === d.id}
                        aria-label={d.esta_activo ? `Desactivar ${d.nombre}` : `Activar ${d.nombre}`}
                        className={`rounded-lg p-1.5 transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          d.esta_activo ? "text-slate-300 hover:bg-amber-50 hover:text-amber-500" : "text-slate-300 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}>
                        {d.esta_activo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    )}
                    {!d.es_obligatorio && (
                      <button onClick={() => { setConfirmarEliminar(d); setErrorConfirm(""); }} aria-label={`Eliminar ${d.nombre}`}
                        className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableShell>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modal}
        onClose={cerrarModal}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <Trophy className="h-4 w-4 text-brand-600" />
            </span>
            {editId == null ? "Nuevo deporte" : "Editar deporte"}
          </span>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre" required>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={100} required placeholder="Ej. Fútbol, Vóley, Atletismo" />
          </Field>
          <Field label="Tipo de competidor">
            <Select value={form.tipo_competidor} onChange={(e) => setForm({ ...form, tipo_competidor: e.target.value as TipoCompetidor })}>
              <option value="equipo">Equipos</option>
              <option value="individual">Individual</option>
            </Select>
          </Field>
          {errorForm && <Alert>{errorForm}</Alert>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={cerrarModal}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={guardando}>
              {guardando ? "Guardando..." : editId == null ? "Crear" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal
        open={!!confirmarEliminar}
        onClose={() => { setConfirmarEliminar(null); setErrorConfirm(""); }}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <Trash2 className="h-4 w-4 text-red-600" />
            </span>
            Eliminar deporte
          </span>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Seguro que deseas eliminar <span className="font-semibold text-slate-900">{confirmarEliminar?.nombre}</span>?
          Dejará de mostrarse en la lista, pero se conservará en la base de datos.
        </p>
        {errorConfirm && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{errorConfirm}
          </div>
        )}
        <div className="flex gap-3 pt-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => { setConfirmarEliminar(null); setErrorConfirm(""); }}>Cancelar</Button>
          <Button type="button" variant="danger" className="flex-1" loading={eliminando === confirmarEliminar?.id} onClick={handleDelete}>
            {eliminando === confirmarEliminar?.id ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
