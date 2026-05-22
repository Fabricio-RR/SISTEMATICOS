"use client";
import { Construction } from "lucide-react";

export default function Proximamente({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">{titulo}</h1>
        <p className="text-sm text-gray-400 mt-1">{descripcion ?? "Módulo en desarrollo"}</p>
      </div>
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-24 text-gray-300">
        <Construction className="w-12 h-12 mb-3" />
        <p className="text-base font-bold text-gray-400">Próximamente</p>
        <p className="text-sm text-gray-300 mt-1">Este módulo estará disponible en el siguiente avance.</p>
      </div>
    </div>
  );
}