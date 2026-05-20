"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, User, Mail, Lock, MapPin, ShieldQuestion, Eye, EyeOff, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

const PREGUNTAS = [
  "¿Cuál es el nombre de tu primera mascota?",
  "¿En qué ciudad naciste?",
  "¿Cuál es el nombre de tu madre?",
  "¿Cuál fue el nombre de tu escuela primaria?",
  "¿Cuál es tu deporte favorito?",
  "¿Cuál es el segundo nombre de tu padre?",
];

type Step = "form" | "success";

export default function SolicitarPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    correo: "",
    contrasena: "",
    nombre_institucion: "",
    ciudad: "",
    pregunta_seguridad_1: PREGUNTAS[0],
    respuesta_seguridad_1: "",
    pregunta_seguridad_2: PREGUNTAS[1],
    respuesta_seguridad_2: "",
    pregunta_seguridad_3: PREGUNTAS[2],
    respuesta_seguridad_3: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!form.respuesta_seguridad_1 || !form.respuesta_seguridad_2 || !form.respuesta_seguridad_3) {
      setError("Debes responder las 3 preguntas de seguridad");
      return;
    }

    const p1 = form.pregunta_seguridad_1;
    const p2 = form.pregunta_seguridad_2;
    const p3 = form.pregunta_seguridad_3;
    if (p1 === p2 || p1 === p3 || p2 === p3) {
      setError("Debes seleccionar 3 preguntas de seguridad diferentes");
      return;
    }

    setCargando(true);
    try {
      await api.solicitar(form);
      setStep("success");
    } catch (err: any) {
      setError(err.message ?? "Error al enviar la solicitud");
    } finally {
      setCargando(false);
    }
  }

  if (step === "success") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(145deg, #7f1010 0%, #c0392b 40%, #8b0000 70%, #6b0f0f 100%)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">¡Solicitud enviada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu solicitud de acceso institucional ha sido recibida. El administrador revisará tu registro
            y te notificará cuando tu cuenta esté aprobada.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-10 px-4"
      style={{ background: "linear-gradient(145deg, #7f1010 0%, #c0392b 40%, #8b0000 70%, #6b0f0f 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <p className="text-xs font-black tracking-widest text-red-600">OLIMPIADAS</p>
          <p className="text-2xl font-black tracking-widest text-gray-900">PERÚ</p>
          <h1 className="text-lg font-bold text-gray-700 mt-3">Solicitar Acceso Institucional</h1>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Completa el formulario. Un administrador revisará tu solicitud.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Datos personales */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Datos del responsable</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nombres</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={form.nombres}
                    onChange={(e) => set("nombres", e.target.value)}
                    placeholder="Juan"
                    required
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={form.apellidos}
                  onChange={(e) => set("apellidos", e.target.value)}
                  placeholder="Pérez García"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="email"
                value={form.correo}
                onChange={(e) => set("correo", e.target.value)}
                placeholder="contacto@institucion.pe"
                required
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type={mostrarPass ? "text" : "password"}
                value={form.contrasena}
                onChange={(e) => set("contrasena", e.target.value)}
                placeholder="Mín. 8 caracteres"
                required
                className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() => setMostrarPass(!mostrarPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Institución */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Datos de la institución</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nombre de la institución</label>
                <input
                  type="text"
                  value={form.nombre_institucion}
                  onChange={(e) => set("nombre_institucion", e.target.value)}
                  placeholder="Universidad Nacional..."
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Ciudad</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={(e) => set("ciudad", e.target.value)}
                    placeholder="Lima"
                    required
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preguntas de seguridad */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldQuestion className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Preguntas de seguridad
              </p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Se usarán para recuperar tu contraseña sin necesidad de correo.
            </p>
            {([1, 2, 3] as const).map((n) => {
              const pregKey = `pregunta_seguridad_${n}` as keyof typeof form;
              const respKey = `respuesta_seguridad_${n}` as keyof typeof form;
              const usedPreguntas = [1, 2, 3]
                .filter((x) => x !== n)
                .map((x) => form[`pregunta_seguridad_${x}` as keyof typeof form]);

              return (
                <div key={n} className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Pregunta {n}</label>
                  <select
                    value={form[pregKey]}
                    onChange={(e) => set(pregKey, e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                  >
                    {PREGUNTAS.map((p) => (
                      <option key={p} value={p} disabled={usedPreguntas.includes(p)}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form[respKey]}
                    onChange={(e) => set(respKey, e.target.value)}
                    placeholder="Tu respuesta..."
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3.5 rounded-xl tracking-widest text-sm transition-colors shadow-lg shadow-red-200"
          >
            {cargando ? "ENVIANDO..." : "ENVIAR SOLICITUD"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-400">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}