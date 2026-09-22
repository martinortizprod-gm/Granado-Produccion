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

export function UsuariosClient({ roles, usuarios, puedeEditar }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"usuarios" | "roles">("usuarios");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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

  function resetRolForm() {
    setRolEditId(null);
    setRolNombre("");
    setRolDesc("");
    setPermisos(permisosVacios());
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
        setEditUserId(null);
        setUNombre("");
        setUApellido("");
        setUMail("");
        setUPass("");
        setUContacto("");
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

  const inputClass =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--granado)]";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("usuarios")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            tab === "usuarios"
              ? "bg-[var(--granado)] text-white"
              : "bg-[var(--muted)]"
          }`}
        >
          Usuarios
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            tab === "roles"
              ? "bg-[var(--granado)] text-white"
              : "bg-[var(--muted)]"
          }`}
        >
          Roles y permisos
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-md border border-[var(--granado)]/40 bg-[var(--muted)] px-3 py-2 text-sm text-[var(--granado)]">
          {ok}
        </p>
      ) : null}

      {tab === "usuarios" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="font-semibold">
              {editUserId ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            {!puedeEditar ? (
              <p className="mt-2 text-sm text-[var(--muted-fg)]">
                Solo lectura: no tenés permiso de edición.
              </p>
            ) : (
              <form onSubmit={onCrearUsuario} className="mt-3 space-y-3">
                <div>
                  <label className="text-xs">Nombre</label>
                  <input
                    className={inputClass}
                    value={uNombre}
                    onChange={(e) => setUNombre(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs">Apellido</label>
                  <input
                    className={inputClass}
                    value={uApellido}
                    onChange={(e) => setUApellido(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs">Mail (login)</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={uMail}
                    onChange={(e) => setUMail(e.target.value)}
                    required={!editUserId}
                    disabled={!!editUserId}
                  />
                </div>
                {!editUserId ? (
                  <div>
                    <label className="text-xs">Contraseña inicial</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={uPass}
                      onChange={(e) => setUPass(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                ) : null}
                <div>
                  <label className="text-xs">Rol</label>
                  <select
                    className={inputClass}
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
                  <label className="text-xs">Contacto</label>
                  <input
                    className={inputClass}
                    value={uContacto}
                    onChange={(e) => setUContacto(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-[var(--granado)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {pending
                      ? "Guardando…"
                      : editUserId
                        ? "Actualizar"
                        : "Crear usuario"}
                  </button>
                  {editUserId ? (
                    <button
                      type="button"
                      className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                      onClick={() => {
                        setEditUserId(null);
                        setUNombre("");
                        setUApellido("");
                        setUMail("");
                        setUPass("");
                        setUContacto("");
                      }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </section>

          <section className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--granado)] text-white">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Mail</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">
                      {u.nombre} {u.apellido}
                    </td>
                    <td className="px-3 py-2">{u.mail}</td>
                    <td className="px-3 py-2">
                      {u.id_rol ? rolesMap.get(u.id_rol) : u.rol ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {puedeEditar ? (
                        <button
                          type="button"
                          className="text-[var(--granado)] underline"
                          onClick={() => editarUsuario(u)}
                        >
                          Editar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">
                {rolEditId ? "Editar rol" : "Nuevo rol"}
              </h2>
              {rolEditId ? (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={resetRolForm}
                >
                  Nuevo
                </button>
              ) : null}
            </div>
            <form onSubmit={onGuardarRol} className="mt-3 space-y-3">
              <div>
                <label className="text-xs">Nombre</label>
                <input
                  className={inputClass}
                  value={rolNombre}
                  onChange={(e) => setRolNombre(e.target.value)}
                  required
                  disabled={!puedeEditar || rolNombre === "Administrador"}
                />
              </div>
              <div>
                <label className="text-xs">Descripción</label>
                <input
                  className={inputClass}
                  value={rolDesc}
                  onChange={(e) => setRolDesc(e.target.value)}
                  disabled={!puedeEditar}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-2 pr-2">Módulo</th>
                      <th className="px-2 py-2">Ver</th>
                      <th className="px-2 py-2">Leer</th>
                      <th className="px-2 py-2">Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisos.map((p, idx) => {
                      const label =
                        MODULOS.find((m) => m.id === p.modulo)?.label ??
                        p.modulo;
                      const locked = rolNombre === "Administrador";
                      return (
                        <tr
                          key={p.modulo}
                          className="border-b border-[var(--border)]/60"
                        >
                          <td className="py-1.5 pr-2">{label}</td>
                          {(["puede_ver", "puede_leer", "puede_editar"] as const).map(
                            (campo) => (
                              <td key={campo} className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={p[campo]}
                                  disabled={!puedeEditar || locked}
                                  onChange={(e) => {
                                    const next = [...permisos];
                                    next[idx] = {
                                      ...next[idx],
                                      [campo]: e.target.checked,
                                    };
                                    if (campo === "puede_editar" && e.target.checked) {
                                      next[idx].puede_leer = true;
                                      next[idx].puede_ver = true;
                                    }
                                    if (campo === "puede_leer" && e.target.checked) {
                                      next[idx].puede_ver = true;
                                    }
                                    setPermisos(next);
                                  }}
                                />
                              </td>
                            ),
                          )}
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
                  className="rounded-md bg-[var(--granado)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {pending ? "Guardando…" : "Guardar rol"}
                </button>
              ) : null}
            </form>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="font-semibold">Roles existentes</h2>
            <ul className="mt-3 space-y-2">
              {roles.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {r.nombre}
                      {r.es_sistema ? (
                        <span className="ml-2 text-xs text-[var(--muted-fg)]">
                          sistema
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted-fg)]">
                      {r.descripcion || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-[var(--granado)] underline"
                      onClick={() => cargarRol(r.id)}
                    >
                      Abrir
                    </button>
                    {puedeEditar && !r.es_sistema ? (
                      <button
                        type="button"
                        className="text-[var(--danger)] underline"
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
