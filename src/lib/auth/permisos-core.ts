import {
  AccionPermiso,
  ModuloId,
  PermisoModulo,
} from "@/lib/modulos";

export type PerfilSesion = {
  authUserId: string;
  email: string;
  usuarioId: number | null;
  nombre: string | null;
  apellido: string | null;
  rolNombre: string | null;
  idRol: number | null;
  esAdministrador: boolean;
  permisos: PermisoModulo[];
};

export function puede(
  perfil: PerfilSesion | null,
  modulo: ModuloId,
  accion: AccionPermiso,
): boolean {
  if (!perfil) return false;
  if (perfil.esAdministrador) return true;
  const p = perfil.permisos.find((x) => x.modulo === modulo);
  if (!p) return false;
  if (accion === "ver") return p.puede_ver || p.puede_leer || p.puede_editar;
  if (accion === "leer") return p.puede_leer || p.puede_editar;
  return p.puede_editar;
}
