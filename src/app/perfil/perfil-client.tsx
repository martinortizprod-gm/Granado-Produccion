"use client";

import {
  cambiarMiClave,
  guardarMiFoto,
  guardarMiPerfil,
  quitarMiFoto,
} from "@/app/perfil/actions";
import { IconUser } from "@/components/ui/icons";
import type { DatosMiPerfil } from "@/lib/auth/mi-perfil";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function iniciales(nombre: string, apellido: string, mail: string) {
  const a = nombre.trim()[0] || "";
  const b = apellido.trim()[0] || "";
  const s = (a + b).toUpperCase();
  if (s) return s;
  return (mail.trim()[0] || "G").toUpperCase();
}

export function PerfilClient({
  datos,
  errorCarga,
}: {
  datos: DatosMiPerfil;
  errorCarga: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(errorCarga);
  const [ok, setOk] = useState<string | null>(null);

  const [nombre, setNombre] = useState(datos.nombre);
  const [apellido, setApellido] = useState(datos.apellido);
  const [mail, setMail] = useState(datos.mail);
  const [contacto, setContacto] = useState(datos.contacto);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");

  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!archivo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const foto = preview || datos.fotoUrl;
  const ini = iniciales(nombre || datos.nombre, apellido || datos.apellido, datos.mail);

  function limpiarArchivo() {
    setArchivo(null);
    if (archivoRef.current) archivoRef.current.value = "";
  }

  function correr(accion: () => Promise<void>, mensaje: string, alFinal?: () => void) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      try {
        await accion();
        setOk(mensaje);
        alFinal?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onDatos(e: FormEvent) {
    e.preventDefault();
    if (!datos.vinculado) return;
    correr(
      () => guardarMiPerfil({ nombre, apellido, mail, contacto }),
      mail.trim().toLowerCase() === datos.mail.trim().toLowerCase()
        ? "Datos actualizados"
        : "Datos actualizados. A partir de ahora ingresá con el mail nuevo.",
    );
  }

  function onClave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    startTransition(async () => {
      try {
        const aviso = await cambiarMiClave({ actual, nueva, repetir });
        setOk(aviso ?? "Contraseña actualizada");
        setActual("");
        setNueva("");
        setRepetir("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onFoto(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    const body = new FormData();
    body.set("foto", archivo);
    correr(
      () => guardarMiFoto(body),
      "Imagen de perfil actualizada",
      limpiarArchivo,
    );
  }

  return (
    <div className="g-stack mx-auto w-full max-w-[760px]">
      <div>
        <h1 className="g-page-title">Mi perfil</h1>
        <p className="g-page-subtitle">
          Tus datos de la cuenta y la contraseña. El rol lo asigna un administrador.
        </p>
      </div>

      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {ok ? <p className="g-alert g-alert-success">{ok}</p> : null}

      <section className="g-card p-3.5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <IconUser className="h-3.5 w-3.5" />
          </span>
          <h2 className="g-section-title">Imagen</h2>
        </div>
        <form onSubmit={onFoto} className="flex flex-wrap items-center gap-3">
          {foto ? (
            <img
              src={foto}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-[18px] font-bold text-white"
              style={{ background: "var(--color-primary)" }}
            >
              {ini}
            </span>
          )}
          <div className="min-w-[220px] flex-1 space-y-2">
            <p className="text-[12.5px] text-[var(--color-text-muted)]">
              JPG, PNG o WEBP. Hasta 2 MB.
            </p>
            <input
              ref={archivoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-[12.5px] text-[var(--color-text-secondary)] file:mr-2 file:h-8 file:rounded-[var(--radius-sm)] file:border file:border-[var(--color-border)] file:bg-[var(--color-surface)] file:px-2.5 file:text-[12.5px] file:font-semibold file:text-[var(--color-text)]"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="g-btn g-btn-primary"
                disabled={pending || !archivo}
              >
                Guardar imagen
              </button>
              {datos.fotoUrl ? (
                <button
                  type="button"
                  className="g-btn g-btn-secondary"
                  disabled={pending}
                  onClick={() =>
                    correr(
                      () => quitarMiFoto(),
                      "Imagen quitada",
                      limpiarArchivo,
                    )
                  }
                >
                  Quitar imagen
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </section>

      <section className="g-card p-3.5">
        <h2 className="g-section-title mb-3">Datos</h2>
        {!datos.vinculado ? (
          <p className="mb-2.5 text-[13px] text-[var(--color-text-muted)]">
            Esta sesión no está vinculada a un usuario del sistema. Podés cambiar
            la contraseña y la imagen; el resto lo tiene que revisar un administrador.
          </p>
        ) : null}
        <form onSubmit={onDatos} className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="g-label" htmlFor="perfil-nombre">
                Nombre
              </label>
              <input
                id="perfil-nombre"
                className="g-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={!datos.vinculado || pending}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="g-label" htmlFor="perfil-apellido">
                Apellido
              </label>
              <input
                id="perfil-apellido"
                className="g-input"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                disabled={!datos.vinculado || pending}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className="g-label" htmlFor="perfil-mail">
              Mail
            </label>
            <input
              id="perfil-mail"
              type="email"
              className="g-input"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              required
              disabled={!datos.vinculado || pending}
              autoComplete="email"
            />
            <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
              Es el correo con el que ingresás.
            </p>
          </div>
          <div>
            <label className="g-label" htmlFor="perfil-contacto">
              Contacto
            </label>
            <input
              id="perfil-contacto"
              className="g-input"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              disabled={!datos.vinculado || pending}
              autoComplete="tel"
            />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="g-label" htmlFor="perfil-rol">
                Rol
              </label>
              <select id="perfil-rol" className="g-input" value={datos.rol} disabled>
                <option value={datos.rol}>{datos.rol}</option>
              </select>
              <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                Solo un administrador puede cambiar el rol, desde Usuarios.
              </p>
            </div>
            <div>
              <label className="g-label" htmlFor="perfil-fecha">
                Fecha de registro
              </label>
              <input
                id="perfil-fecha"
                className="g-input"
                value={datos.fechaRegistro}
                disabled
              />
            </div>
          </div>
          <button
            type="submit"
            className="g-btn g-btn-primary"
            disabled={pending || !datos.vinculado}
          >
            Guardar datos
          </button>
        </form>
      </section>

      <section className="g-card p-3.5">
        <h2 className="g-section-title mb-3">Contraseña</h2>
        <form onSubmit={onClave} className="space-y-2.5">
          <div>
            <label className="g-label" htmlFor="perfil-actual">
              Contraseña actual
            </label>
            <input
              id="perfil-actual"
              type="password"
              className="g-input"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
              disabled={pending}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="g-label" htmlFor="perfil-nueva">
                Contraseña nueva
              </label>
              <input
                id="perfil-nueva"
                type="password"
                className="g-input"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
                minLength={6}
                disabled={pending}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="g-label" htmlFor="perfil-repetir">
                Repetir contraseña nueva
              </label>
              <input
                id="perfil-repetir"
                type="password"
                className="g-input"
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                required
                minLength={6}
                disabled={pending}
                autoComplete="new-password"
              />
            </div>
          </div>
          <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
            Cambiar contraseña
          </button>
        </form>
      </section>
    </div>
  );
}
