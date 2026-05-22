"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Trophy, ShieldCheck, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

type Step = "email" | "questions" | "success";

interface Questions {
  correo: string;
  pregunta_1: string;
  pregunta_2: string;
  pregunta_3: string;
}

export default function RecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [correo, setCorreo] = useState("");
  const [questions, setQuestions] = useState<Questions | null>(null);
  const [respuestas, setRespuestas] = useState({ r1: "", r2: "", r3: "" });
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await api.recoveryQuestions(correo);
      setQuestions(data);
      setStep("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se encontró la cuenta");
    } finally {
      setCargando(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nuevaContrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setCargando(true);
    try {
      await api.recoveryReset({
        correo,
        respuesta_1: respuestas.r1,
        respuesta_2: respuestas.r2,
        respuesta_3: respuestas.r3,
        nueva_contrasena: nuevaContrasena,
      });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Las respuestas son incorrectas");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #7f1010 0%, #c0392b 40%, #8b0000 70%, #6b0f0f 100%)" }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-red-600 flex items-center justify-center mb-3 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-xs font-black tracking-widest text-red-600">OLIMPIADAS</p>
          <p className="text-xl font-black tracking-widest text-gray-900">PERÚ</p>
        </div>

        {/* ── PASO 1: Correo ── */}
        {step === "email" && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Recuperar Contraseña</h1>
              <p className="text-sm text-gray-400 mt-1">Ingresa tu correo para verificar tu identidad</p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ejemplo@institucion.pe"
                    required
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3.5 rounded-xl tracking-wider text-sm transition-colors"
              >
                {cargando ? "BUSCANDO..." : "CONTINUAR"}
              </button>
            </form>
          </>
        )}

        {/* ── PASO 2: Preguntas ── */}
        {step === "questions" && questions && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Preguntas de Seguridad</h1>
              <p className="text-sm text-gray-400 mt-1">Responde las 3 preguntas para continuar</p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              {[
                { pregunta: questions.pregunta_1, key: "r1" as const },
                { pregunta: questions.pregunta_2, key: "r2" as const },
                { pregunta: questions.pregunta_3, key: "r3" as const },
              ].map(({ pregunta, key }, i) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Pregunta {i + 1}
                  </label>
                  <p className="text-sm text-gray-700 mb-2 font-medium">{pregunta}</p>
                  <input
                    type="text"
                    value={respuestas[key]}
                    onChange={(e) => setRespuestas({ ...respuestas, [key]: e.target.value })}
                    placeholder="Tu respuesta"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3.5 rounded-xl tracking-wider text-sm transition-colors"
              >
                {cargando ? "VERIFICANDO..." : "CAMBIAR CONTRASEÑA"}
              </button>
            </form>
          </>
        )}

        {/* ── PASO 3: Éxito ── */}
        {step === "success" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h1>
            <p className="text-sm text-gray-500 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl tracking-wider text-sm transition-colors"
            >
              IR AL LOGIN
            </button>
          </div>
        )}

        {/* Link volver */}
        {step !== "success" && (
          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}