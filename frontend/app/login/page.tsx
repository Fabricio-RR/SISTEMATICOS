"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Trophy, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (correo.length > 150) {
      setError("El correo no puede tener más de 150 caracteres.");
      return;
    }
    if (contrasena.length > 255) {
      setError("La contraseña no puede tener más de 255 caracteres.");
      return;
    }
    setCargando(true);
    try {
      const data = await api.login(correo, contrasena);
      router.push(data.rol === "admin" ? "/admin" : "/institucion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #7f1010 0%, #c0392b 40%, #8b0000 70%, #6b0f0f 100%)" }}
    >
      {/* Efecto reflejo inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 opacity-20"
        style={{ background: "linear-gradient(to top, #c0392b, transparent)", transform: "scaleY(-1)" }}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-red-600 flex items-center justify-center mb-4 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs font-black tracking-widest text-red-600">OLIMPIADAS</p>
            <p className="text-2xl font-black tracking-widest text-gray-900">PERÚ</p>
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-xl font-bold text-gray-900">Acceso a la Plataforma</h1>
            <p className="text-sm text-gray-400 mt-1">Excelencia en Gestión Deportiva</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Correo */}
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
                maxLength={150}
                placeholder="ejemplo@institucion.pe"
                required
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={mostrarPass ? "text" : "password"}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                maxLength={255}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setMostrarPass(!mostrarPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link href="/recovery" className="text-xs font-semibold text-red-600 hover:text-red-700">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3.5 rounded-xl tracking-widest text-sm transition-colors shadow-lg shadow-red-200"
          >
            {cargando ? "VERIFICANDO..." : "INICIAR SESIÓN"}
          </button>
        </form>

        {/* Registro */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">¿Tu institución no está registrada?</p>
          <Link href="/solicitar" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 mt-1">
            Solicitar acceso para mi institución →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative mt-6 flex items-center justify-between w-full max-w-md px-4 text-white/60 text-xs">
        <span>© 2026 Olimpiadas PERÚ. Todos los derechos reservados.</span>
      </div>
      <div className="relative mt-2 flex gap-6 text-white/50 text-xs">
        <a href="#" className="hover:text-white/80">Privacidad</a>
        <a href="#" className="hover:text-white/80">Términos</a>
        <a href="#" className="hover:text-white/80">Soporte</a>
      </div>
    </div>
  );
}
