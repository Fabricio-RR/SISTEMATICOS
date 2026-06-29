"use client";
import { useState } from "react";
import { Building2, Plus, Trash2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useInstituciones } from "@/lib/hooks";
import { useDuplicadosInstitucion } from "@/lib/useDuplicadosInstitucion";
import { AvisoDuplicados } from "@/components/AvisoDuplicados";
import {
  PageHeader, Button, Alert, Badge, Vacio,
  TableShell, THead, TBody, Tr, Th, Td,
  Modal, Field, Input, Select,
} from "@/components/ui";
import type { Institucion, CategoriaInstitucion } from "@/types/api";
import { CATEGORIAS, CATEGORIA_PAIS } from "@/types/api";

export default function InstitucionesPage() {
  const queryClient = useQueryClient();
  const institucionesQ = useInstituciones();
  const instituciones = institucionesQ.data ?? [];
  const cargando = institucionesQ.isLoading;
  const recargar = () => queryClient.invalidateQueries({ queryKey: ["instituciones"] });

  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    nombre: "", nombre_corto: "", ciudad: "", estado: "activo",
    contacto: "", categoria: "" as CategoriaInstitucion | "",
  });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [eliminando, setEliminando] = useState<number | null>(null);
  // Confirmación explícita para crear pese a un parecido (override).
  const [confirmarParecido, setConfirmarParecido] = useState(false);

  const { similares, exacto } = useDuplicadosInstitucion(form.nombre, form.nombre_corto);
  const hayParecido = similares.length > 0 && !exacto;

  const errorMostrado = error || (institucionesQ.isError ? "No se pudo cargar las instituciones. Verifica que el backend esté activo." : "");

  function resetForm() {
    setForm({ nombre: "", nombre_corto: "", ciudad: "", estado: "activo", contacto: "", categoria: "" });
    setConfirmarParecido(false);
    setErrorForm("");
  }

  function cerrarModal() {
    setModalAbierto(false);
    resetForm();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.nombre.length > 200) {
      setErrorForm("El nombre no puede tener más de 200 caracteres.");
      return;
    }
    if (form.nombre_corto.length > 50) {
      setErrorForm("El nombre corto no puede tener más de 50 caracteres.");
      return;
    }
    if (form.ciudad.length > 100) {
      setErrorForm("La ciudad no puede tener más de 100 caracteres.");
      return;
    }
    if (form.contacto && form.contacto.length > 200) {
      setErrorForm("El contacto no puede tener más de 200 caracteres.");
      return;
    }
    // Coincidencia exacta: no se puede crear (el servidor también lo bloquea).
    if (exacto) {
      setErrorForm(`Ya existe una institución equivalente: «${exacto.nombre}» (${exacto.ciudad}).`);
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      // Si hay parecidos y el admin confirmó, se envía el override al backend.
      await api.createInstitucion(
        { ...form, categoria: form.categoria || undefined },
        { permitirDuplicado: hayParecido && confirmarParecido },
      );
      cerrarModal();
      await recargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleDelete(id: number) {
    setEliminando(id);
    setError("");
    try {
      await api.deleteInstitucion(id);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la institución.");
    } finally {
      setEliminando(null);
    }
  }

  const filtradas = instituciones.filter((i) =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.ciudad.toLowerCase().includes(busqueda.toLowerCase())
  );

  function iniciales(inst: Institucion) {
    const fuente = inst.nombre_corto || inst.nombre;
    return fuente.slice(0, 2).toUpperCase();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instituciones"
        subtitle="Gestión de colegios, universidades y clubes deportivos."
        actions={
          <Button onClick={() => setModalAbierto(true)}>
            <Plus className="w-4 h-4" />Nueva institución
          </Button>
        }
      />

      {errorMostrado && <Alert>{errorMostrado}</Alert>}

      {/* Búsqueda */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar por nombre o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10 bg-white"
          aria-label="Buscar instituciones"
        />
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <Vacio
          icon={<Building2 className="h-6 w-6" />}
          titulo={busqueda ? "Sin resultados para la búsqueda" : "No hay instituciones registradas"}
          detalle={busqueda ? "Prueba con otro nombre o ciudad." : "Crea la primera institución con el botón «Nueva institución»."}
        />
      ) : (
        <TableShell>
          <THead>
            <Tr className="hover:bg-transparent">
              <Th>#</Th>
              <Th>Institución</Th>
              <Th>Ciudad</Th>
              <Th>Categoría / País</Th>
              <Th>Contacto</Th>
              <Th className="text-center">Estado</Th>
              <Th className="text-center">Acciones</Th>
            </Tr>
          </THead>
          <TBody>
            {filtradas.map((inst) => (
              <Tr key={inst.id}>
                <Td className="font-mono text-slate-400">{String(inst.id).padStart(2, "0")}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                      <span className="text-brand-600 text-xs font-bold">{iniciales(inst)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{inst.nombre}</p>
                      <p className="text-xs text-slate-400">{inst.nombre_corto}</p>
                    </div>
                  </div>
                </Td>
                <Td>{inst.ciudad}</Td>
                <Td>
                  {inst.categoria ? (
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inst.categoria}</p>
                      <p className="text-xs text-slate-400">{inst.pais_representativo ?? "—"}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </Td>
                <Td className="text-slate-500">{inst.contacto ?? "—"}</Td>
                <Td className="text-center">
                  <Badge tone={inst.estado === "activo" ? "success" : "neutral"} className="capitalize">{inst.estado}</Badge>
                </Td>
                <Td className="text-center">
                  <button
                    onClick={() => handleDelete(inst.id)}
                    disabled={eliminando === inst.id}
                    aria-label={`Eliminar ${inst.nombre}`}
                    className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableShell>
      )}

      {/* Modal */}
      <Modal
        open={modalAbierto}
        onClose={cerrarModal}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <Building2 className="h-4 w-4 text-brand-600" />
            </span>
            Nueva institución
          </span>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Nombre completo" required>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={200} placeholder="Ej. Universidad de Lima" />
          </Field>
          <Field label="Nombre corto" required>
            <Input value={form.nombre_corto} onChange={(e) => setForm({ ...form, nombre_corto: e.target.value })} required maxLength={50} placeholder="Ej. UL" />
          </Field>
          <Field label="Ciudad" required>
            <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} required maxLength={100} placeholder="Ej. Lima" />
          </Field>
          <Field
            label="Contacto (teléfono o correo)"
            hint="Si ingresas un correo electrónico, la institución recibirá un aviso de registro."
          >
            <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} maxLength={200} placeholder="Ej. contacto@colegio.pe o 999-888-777" />
          </Field>
          <Field
            label="Categoría (año escolar)"
            hint={form.categoria ? `País asignado automáticamente: ${CATEGORIA_PAIS[form.categoria as CategoriaInstitucion]}` : undefined}
          >
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaInstitucion | "" })}>
              <option value="">Sin categoría</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c} — {CATEGORIA_PAIS[c]}</option>
              ))}
            </Select>
          </Field>

          {/* Aviso de posibles duplicados en vivo */}
          <AvisoDuplicados similares={similares} />

          {/* Override: solo cuando hay parecidos (no exactos) */}
          {hayParecido && (
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={confirmarParecido}
                onChange={(e) => setConfirmarParecido(e.target.checked)}
                className="mt-0.5 accent-brand-600"
              />
              <span>No es un duplicado, registrar de todas formas.</span>
            </label>
          )}

          {errorForm && <Alert>{errorForm}</Alert>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={cerrarModal}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={guardando} disabled={!!exacto || (hayParecido && !confirmarParecido)}>
              {guardando ? "Guardando..." : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
