import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/permisos";
import { exportarRespaldo, marcaRespaldo } from "@/lib/respaldos/exportar";
import { leerTablas } from "@/lib/respaldos/esquema";
import type { FormatoRespaldo } from "@/lib/respaldos/tipos";

export const dynamic = "force-dynamic";

const FORMATOS = new Set<FormatoRespaldo>(["xlsx", "pdf", "sql", "json"]);

export async function POST(request: Request) {
  try {
    const perfil = await requirePermiso("respaldos", "leer");
    let body: {
      formato?: string;
      tablas?: { nombre?: string; columnas?: unknown[] }[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "No se pudo leer la selección." }, { status: 400 });
    }
    if (!body.formato || !FORMATOS.has(body.formato as FormatoRespaldo)) {
      return NextResponse.json({ error: "Formato no válido." }, { status: 400 });
    }
    if (!Array.isArray(body.tablas) || body.tablas.length === 0 || body.tablas.length > 300) {
      return NextResponse.json({ error: "Elegí al menos una tabla." }, { status: 400 });
    }

    const pedido = body.tablas.map((tabla) => ({
      nombre: String(tabla?.nombre ?? ""),
      columnas: Array.isArray(tabla?.columnas)
        ? tabla.columnas.filter((col): col is string => typeof col === "string").slice(0, 500)
        : [],
    }));
    const tablas = await leerTablas(pedido);
    const usuario =
      [perfil.nombre, perfil.apellido].filter(Boolean).join(" ") || perfil.email;
    const archivo = exportarRespaldo(
      body.formato as FormatoRespaldo,
      tablas,
      marcaRespaldo(usuario),
    );

    return new NextResponse(Buffer.from(archivo.bytes), {
      headers: {
        "Content-Type": archivo.mime,
        "Content-Disposition": `attachment; filename="${archivo.nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo exportar el respaldo.";
    const status = msg === "Sin permiso" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
