import { createAdminClient } from "@/lib/supabase/admin";
import type { PerfilSesion } from "@/lib/auth/permisos-core";

export type FilaUsuarioPropia = {
  id: number;
  nombre: string | null;
  apellido: string | null;
  mail: string | null;
  contacto: string | null;
  fecha_registro: string | null;
};

export type DatosMiPerfil = {
  vinculado: boolean;
  nombre: string;
  apellido: string;
  mail: string;
  contacto: string;
  rol: string;
  fechaRegistro: string;
  fotoUrl: string | null;
};

const COLUMNAS = "id, nombre, apellido, mail, contacto, fecha_registro";

export function fechaVisible(valor: string | null | undefined) {
  if (!valor?.trim()) return "—";
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return valor;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function datosDesdePerfil(perfil: PerfilSesion): DatosMiPerfil {
  return {
    vinculado: perfil.usuarioId != null,
    nombre: perfil.nombre ?? "",
    apellido: perfil.apellido ?? "",
    mail: perfil.email,
    contacto: "",
    rol: perfil.rolNombre ?? "Sin rol",
    fechaRegistro: "—",
    fotoUrl: perfil.fotoUrl,
  };
}

export async function filaDelUsuario(authUserId: string, email: string) {
  const admin = createAdminClient();
  const porAuth = await admin
    .from("usuarios")
    .select(COLUMNAS)
    .eq("auth_user_id", authUserId)
    .limit(1);
  if (porAuth.error) throw new Error(porAuth.error.message);
  const propia = porAuth.data?.[0] as FilaUsuarioPropia | undefined;
  if (propia) return propia;

  const porMail = await admin
    .from("usuarios")
    .select(COLUMNAS)
    .ilike("mail", email)
    .limit(1);
  if (porMail.error) throw new Error(porMail.error.message);
  return (porMail.data?.[0] as FilaUsuarioPropia | undefined) ?? null;
}

export async function cargarMiPerfil(perfil: PerfilSesion): Promise<DatosMiPerfil> {
  const fila = await filaDelUsuario(perfil.authUserId, perfil.email);
  if (!fila) return { ...datosDesdePerfil(perfil), vinculado: false };

  return {
    vinculado: true,
    nombre: fila.nombre ?? "",
    apellido: fila.apellido ?? "",
    mail: (fila.mail ?? perfil.email).trim(),
    contacto: fila.contacto ?? "",
    rol: perfil.rolNombre ?? "Sin rol",
    fechaRegistro: fechaVisible(fila.fecha_registro),
    fotoUrl: perfil.fotoUrl,
  };
}
