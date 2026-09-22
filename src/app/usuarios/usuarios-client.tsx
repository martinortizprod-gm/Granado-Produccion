"use client";

import { MODULOS } from "@/lib/modulos";
import {
  actualizarUsuarioApp,
  crearUsuarioApp,
  eliminarRol,
  guardarRol,
  listarPermisosRol,
  type RolPermisoInput,
} from "@/app/usuarios/actions";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconUsers } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  DetalleFilas,
  RecordDetailDrawer,
  RowDetailButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";

type Rol = {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
};

type Usuario = {
  id: number;
  nombre: string | null;
  apellido: string | null;
  mail: string | null;
  rol: string | null;
  id_rol: number | null;
  contacto: string | null;
  auth_user_id: string | null;
};

type Props = {
  roles: Rol[];
  usuarios: Usuario[];
  puedeEditar: boolean;
};

function permisosVacios(): RolPermisoInput[] {
  return MODULOS.map((m) => ({
    modulo: m.id,
    puede_ver: false,
    puede_leer: false,
    puede_editar: false,
  }));
}

function iniciales(nombre: string, apellido: string) {
  const a = (nombre || "").trim()[0] || "";
  const b = (apellido || "").trim()[0] || "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

function badgeRol(nombre: string | undefined) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("admin")) return "g-badge g-badge-success";
  if (n.includes("oper")) return "g-badge g-badge-info";
  return "g-badge g-badge-neutral";
}

const COLS_USUARIOS = [
  { id: "nombre", label: "Nombre" },
  { id: "mail", label: "Mail" },
  { id: "rol", label: "Rol" },
  { id: "acciones", label: "Acciones", locked: true },
];

export function UsuariosClient({ roles, usuarios, puedeEditar }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"usuarios" | "roles">("usuarios");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const cols = useColumnVisibility("usuarios", COLS_USUARIOS);
  const show = cols.isVisible;

  const [rolEditId, setRolEditId] = useState<number | null>(null);
  const [rolNombre, setRolNombre] = useState("");
  const [rolDesc, setRolDesc] = useState("");
  const [permisos, setPermisos] = useState<RolPermisoInput[]>(permisosVacios());

  const [uNombre, setUNombre] = useState("");
  const [uApellido, setUApellido] = useState("");
  const [uMail, setUMail] = useState("");
  const [uPass, setUPass] = useState("");
  const [uRol, setURol] = useState<number | "">(roles[0]?.id ?? "");
  const [uContacto, setUContacto] = useState("");
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const rolesMap = useMemo(() => {
    const m = new Map<number, string>();
    roles.forEach((r) => m.set(r.id, r.nombre));
    return m;
  }, [roles]);

  const usuariosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => {
      const rol = u.id_rol ? rolesMap.get(u.id_rol) : u.rol;
      return [u.nombre, u.apellido, u.mail, rol]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [usuarios, filtro, rolesMap]);

  const detalleUsuario =
    usuarios.find((u) => u.id === detalleId) ?? null;

  function resetRolForm() {
    setRolEditId(null);
    setRolNombre("");
    setRolDesc("");
    setPermisos(permisosVacios());
  }

  function limpiarUsuario() {
    setEditUserId(null);
    setUNombre("");
    setUApellido("");
    setUMail("");
    setUPass("");
    setUContacto("");
  }

  async function cargarRol(id: number) {
    setError(null);
    setOk(null);
    const rol = roles.find((r) => r.id === id);
    if (!rol) return;
    setRolEditId(id);
    setRolNombre(rol.nombre);
    setRolDesc(rol.descripcion ?? "");
    try {
      const perms = await listarPermisosRol(id);
      const base = permisosVacios();
      for (const p of perms) {
        const i = base.findIndex((x) => x.modulo === p.modulo);
        if (i >= 0) {
          base[i] = {
            modulo: p.modulo,
            puede_ver: p.puede_ver,
            puede_leer: p.puede_leer,
            puede_editar: p.puede_editar,
          };
        }
      }
      setPermisos(base);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar permisos");
    }
  }

  function onGuardarRol(e: FormEvent) {
    e.preventDefault();
    if (!puedeEditar) return;
    setError(null);
    setOk(null);
    startTransition(async () => {
      try {
        await guardarRol({
          id: rolEditId ?? undefined,
          nombre: rolNombre,
          descripcion: rolDesc,
          permisos,
        });
        setOk(rolEditId ? "Rol actualizado" : "Rol creado");
        resetRolForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar rol");
      }
    });
  }

  function onBorrarRol(id: number) {
    if (!puedeEditar) return;
    if (!confirm("¿Eliminar este rol?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarRol(id);
        setOk("Rol eliminado");
        if (rolEditId === id) resetRolForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  function onCrearUsuario(e: FormEvent) {
    e.preventDefault();
    if (!puedeEditar || uRol === "") return;
    setError(null);
    setOk(null);
    startTransition(async () => {
      try {
        if (editUserId) {
          await actualizarUsuarioApp({
            id: editUserId,
            nombre: uNombre,
            apellido: uApellido,
            id_rol: Number(uRol),
            contacto: uContacto,
          });
          setOk("Usuario actualizado");
        } else {
          await crearUsuarioApp({
            nombre: uNombre,
            apellido: uApellido,
            mail: uMail,
            password: uPass,
            id_rol: Number(uRol),
            contacto: uContacto,
          });
          setOk("Usuario creado (ya puede ingresar)");
        }
        limpiarUsuario();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error con usuario");
      }
    });
  }

  function editarUsuario(u: Usuario) {
    setEditUserId(u.id);
    setUNombre(u.nombre ?? "");
    setUApellido(u.apellido ?? "");
    setUMail(u.mail ?? "");
    setUPass("");
    setURol(u.id_rol ?? "");
    setUContacto(u.contacto ?? "");
    setTab("usuarios");
  }

  return (
    <div className="g-stack">
      <div>
        <h1 className="g-page-title">Usuarios y roles</h1>
        <p className="g-page-subtitle">
          Gestioná los usuarios del sistema y sus permisos de acceso.
        </p>
      </div>

      <div className="inline-flex w-fit rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
        <button
          type="button"
          onClick={() => setTab("usuarios")}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-[background,color] duration-150 ${
            tab === "usuarios"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          }`}
        >
          Usuarios
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-[background,color] duration-150 ${
            tab === "roles"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          }`}
        >
          Roles y permisos
        </button>
      </div>

      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {ok ? <p className="g-alert g-alert-success">{ok}</p> : null}

      {tab === "usuarios" ? (
        <div className="grid gap-3 xl:grid-cols-[340px_1fr]">
          <section className="g-card p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <IconPlus className="h-3.5 w-3.5" />
              </span>
              <h2 className="g-section-title">
                {editUserId ? "Editar usuario" : "Nuevo usuario"}
              </h2>
            </div>
            {!puedeEditar ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Solo lectura: no tenés permiso de edición.
              </p>
            ) : (
              <form onSubmit={onCrearUsuario} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="g-label">Nombre</label>
                    <input
                      className="g-input"
                      value={uNombre}
                      onChange={(e) => setUNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="g-label">Apellido</label>
                    <input
                      className="g-input"
                      value={uApellido}
                      onChange={(e) => setUApellido(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="g-label">Mail (login)</label>
                  <input
                    type="email"
                    className="g-input"
                    value={uMail}
                    onChange={(e) => setUMail(e.target.value)}
                    required={!editUserId}
                    disabled={!!editUserId}
                  />
                </div>
                {!editUserId ? (
                  <div>
                    <label className="g-label">Contraseña inicial</label>
                    <input
                      type="password"
                      className="g-input"
                      value={uPass}
                      onChange={(e) => setUPass(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                ) : null}
                <div>
                  <label className="g-label">Rol</label>
                  <select
                    className="g-input"
                    value={uRol}
                    onChange={(e) =>
                      setURol(e.target.value ? Number(e.target.value) : "")
                    }
                    required
                  >
                    <option value="">Elegir…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="g-label">Contacto (opcional)</label>
                  <input
                    className="g-input"
                    value={uContacto}
                    onChange={(e) => setUContacto(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    className="g-btn g-btn-secondary flex-1"
                    onClick={limpiarUsuario}
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="g-btn g-btn-primary flex-[1.4]"
                  >
                    {pending
                      ? "Guardando…"
                      : editUserId
                        ? "Actualizar"
                        : "Crear usuario"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="relative min-w-0">
          <div className="g-table-wrap min-w-0">
            <div className="g-table-toolbar">
              <div className="flex items-center gap-2">
                <IconUsers className="h-4 w-4 text-[var(--color-primary-muted)]" />
                <div>
                  <p className="g-section-title">Usuarios registrados</p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    {usuariosFiltrados.length} de {usuarios.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="g-input max-w-[200px]"
                  placeholder="Buscar…"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
                <ColumnPicker
                  cols={cols.cols}
                  isVisible={cols.isVisible}
                  onToggle={cols.toggle}
                />
              </div>
            </div>
            <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  {show("nombre") ? <th>Nombre</th> : null}
                  {show("mail") ? <th>Mail</th> : null}
                  {show("rol") ? <th>Rol</th> : null}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={cols.visibleCount}
                      className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                    >
                      No hay usuarios para mostrar.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const rolNombre = u.id_rol
                      ? rolesMap.get(u.id_rol)
                      : u.rol ?? undefined;
                    return (
                      <tr
                        key={u.id}
                        className={detalleId === u.id ? "g-row-active" : ""}
                      >
                        {show("nombre") ? (
                          <td>
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ background: "var(--color-primary)" }}
                              >
                                {iniciales(u.nombre ?? "", u.apellido ?? "")}
                              </span>
                              <span className="font-medium">
                                {u.nombre} {u.apellido}
                              </span>
                            </div>
                          </td>
                        ) : null}
                        {show("mail") ? (
                          <td className="text-[var(--color-text-secondary)]">
                            {u.mail}
                          </td>
                        ) : null}
                        {show("rol") ? (
                          <td>
                            <span className={badgeRol(rolNombre)}>
                              {rolNombre ?? "—"}
                            </span>
                          </td>
                        ) : null}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <RowDetailButton onClick={() => setDetalleId(u.id)} />
                            {puedeEditar ? (
                              <button
                                type="button"
                                className="text-[12.5px] font-medium text-[var(--color-info)] hover:underline"
                                onClick={() => editarUsuario(u)}
                              >
                                Editar
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
          {detalleUsuario ? (
            <RecordDetailDrawer
              heading="Detalle de usuario"
              title={`${detalleUsuario.nombre ?? ""} ${detalleUsuario.apellido ?? ""}`.trim() || "Usuario"}
              badge={
                <span
                  className={badgeRol(
                    detalleUsuario.id_rol
                      ? rolesMap.get(detalleUsuario.id_rol)
                      : detalleUsuario.rol ?? undefined,
                  )}
                >
                  {(detalleUsuario.id_rol
                    ? rolesMap.get(detalleUsuario.id_rol)
                    : detalleUsuario.rol) ?? "—"}
                </span>
              }
              onClose={() => setDetalleId(null)}
            >
              <DetalleFilas
                filas={[
                  { label: "Nombre", valor: detalleUsuario.nombre ?? "—" },
                  { label: "Apellido", valor: detalleUsuario.apellido ?? "—" },
                  { label: "Mail", valor: detalleUsuario.mail ?? "—" },
                  {
                    label: "Rol",
                    valor:
                      (detalleUsuario.id_rol
                        ? rolesMap.get(detalleUsuario.id_rol)
                        : detalleUsuario.rol) ?? "—",
                  },
                  { label: "Contacto", valor: detalleUsuario.contacto ?? "—" },
                  {
                    label: "Auth",
                    valor: detalleUsuario.auth_user_id
                      ? "Vinculado"
                      : "Sin vínculo",
                  },
                ]}
              />
            </RecordDetailDrawer>
          ) : null}
          </section>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="g-card p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="g-section-title">
                {rolEditId ? "Editar rol" : "Nuevo rol"}
              </h2>
              {rolEditId ? (
                <button
                  type="button"
                  className="text-[12px] font-medium text-[var(--color-primary-muted)] hover:underline"
                  onClick={resetRolForm}
                >
                  Nuevo
                </button>
              ) : null}
            </div>
            <form onSubmit={onGuardarRol} className="space-y-2.5">
              <div>
                <label className="g-label">Nombre</label>
                <input
                  className="g-input"
                  value={rolNombre}
                  onChange={(e) => setRolNombre(e.target.value)}
                  required
                  disabled={!puedeEditar || rolNombre === "Administrador"}
                />
              </div>
              <div>
                <label className="g-label">Descripción</label>
                <input
                  className="g-input"
                  value={rolDesc}
                  onChange={(e) => setRolDesc(e.target.value)}
                  disabled={!puedeEditar}
                />
              </div>
              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <table className="g-table">
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Ver</th>
                      <th>Leer</th>
                      <th>Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisos.map((p, idx) => {
                      const label =
                        MODULOS.find((m) => m.id === p.modulo)?.label ??
                        p.modulo;
                      const locked = rolNombre === "Administrador";
                      return (
                        <tr key={p.modulo}>
                          <td>{label}</td>
                          {(
                            ["puede_ver", "puede_leer", "puede_editar"] as const
                          ).map((campo) => (
                            <td key={campo}>
                              <input
                                type="checkbox"
                                checked={p[campo]}
                                disabled={!puedeEditar || locked}
                                className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                                onChange={(e) => {
                                  const next = [...permisos];
                                  next[idx] = {
                                    ...next[idx],
                                    [campo]: e.target.checked,
                                  };
                                  if (
                                    campo === "puede_editar" &&
                                    e.target.checked
                                  ) {
                                    next[idx].puede_leer = true;
                                    next[idx].puede_ver = true;
                                  }
                                  if (
                                    campo === "puede_leer" &&
                                    e.target.checked
                                  ) {
                                    next[idx].puede_ver = true;
                                  }
                                  setPermisos(next);
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {puedeEditar ? (
                <button
                  type="submit"
                  disabled={pending}
                  className="g-btn g-btn-primary"
                >
                  {pending ? "Guardando…" : "Guardar rol"}
                </button>
              ) : null}
            </form>
          </section>

          <section className="g-card p-3.5">
            <h2 className="g-section-title">Roles existentes</h2>
            <ul className="mt-2.5 space-y-1.5">
              {roles.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-2.5 py-2 text-[13px]"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.nombre}
                      {r.es_sistema ? (
                        <span className="g-badge g-badge-neutral ml-2">
                          sistema
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {r.descripcion || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2.5">
                    <button
                      type="button"
                      className="text-[12.5px] font-medium text-[var(--color-info)] hover:underline"
                      onClick={() => cargarRol(r.id)}
                    >
                      Abrir
                    </button>
                    {puedeEditar && !r.es_sistema ? (
                      <button
                        type="button"
                        className="text-[12.5px] font-medium text-[var(--color-danger)] hover:underline"
                        onClick={() => onBorrarRol(r.id)}
                      >
                        Borrar
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
