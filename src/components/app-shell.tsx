"use client";

import { BrandMark, BrandWordmark } from "@/components/ui/brand";
import {
  IconClose,
  IconHome,
  IconMenu,
  IconModulo,
  IconSidebarHide,
  IconSidebarShow,
} from "@/components/ui/icons";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GRUPOS_NAV, MODULOS, type ModuloId } from "@/lib/modulos";
import { type PerfilSesion, puede } from "@/lib/auth/permisos-core";
import { registrarUsuarioInforme } from "@/lib/informes/emision";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const SIDEBAR_KEY = "granado-sidebar";
const sidebarListeners = new Set<() => void>();

function avisarSidebar() {
  sidebarListeners.forEach((fn) => fn());
}

function suscribirSidebar(fn: () => void) {
  sidebarListeners.add(fn);
  return () => sidebarListeners.delete(fn);
}

function leerSidebarCliente() {
  return window.localStorage.getItem(SIDEBAR_KEY) !== "0";
}

function leerSidebarServidor() {
  return true;
}

function iniciales(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppShell({
  perfil,
  activo,
  children,
}: {
  perfil: PerfilSesion;
  activo: ModuloId;
  children: React.ReactNode;
}) {
  const visibles = MODULOS.filter((m) => puede(perfil, m.id, "ver"));
  const visibleIds = new Set(visibles.map((m) => m.id));
  const nombre =
    [perfil.nombre, perfil.apellido].filter(Boolean).join(" ") || perfil.email;
  registrarUsuarioInforme(nombre);
  const ini = iniciales(nombre);

  const grupos = GRUPOS_NAV.map((g) => ({
    ...g,
    items: g.modulos
      .map((id) => MODULOS.find((m) => m.id === id)!)
      .filter((m) => visibleIds.has(m.id)),
  })).filter((g) => g.items.length > 0);

  const desktopOpen = useSyncExternalStore(
    suscribirSidebar,
    leerSidebarCliente,
    leerSidebarServidor,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleDesktop() {
    window.localStorage.setItem(SIDEBAR_KEY, desktopOpen ? "0" : "1");
    avisarSidebar();
  }

  const nav = (onNavigate?: () => void) => (
    <>
      <div
        className="flex items-center gap-2.5 px-3 py-3"
        style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}
      >
        <BrandMark size={34} />
        <BrandWordmark light />
      </div>

      <nav className="g-nav-scroll flex-1 px-2 py-3">
        {grupos.map((g) => (
          <div key={g.id} className="mb-3.5 last:mb-1">
            <p
              className="mb-1 px-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: "var(--color-sidebar-muted)" }}
            >
              {g.label}
            </p>
            <ul className="space-y-px">
              {g.items.map((m) => {
                const on = m.id === activo;
                return (
                  <li key={m.id}>
                    <Link
                      href={m.href}
                      aria-current={on ? "page" : undefined}
                      onClick={onNavigate}
                      className="g-nav-link relative flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-[7px] text-[12.5px] font-medium"
                      style={{
                        background: on
                          ? "var(--color-sidebar-active)"
                          : "transparent",
                        color: on ? "#fff" : "var(--color-sidebar-text)",
                      }}
                    >
                      {on ? (
                        <span
                          className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r"
                          style={{ background: "var(--color-accent-bar)" }}
                        />
                      ) : null}
                      <IconModulo
                        id={m.id}
                        className="h-4 w-4 shrink-0 opacity-90"
                      />
                      <span className="truncate">{m.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className="px-3 pt-2.5 pb-4 text-[10px] leading-snug"
        style={{
          borderTop: "1px solid var(--color-sidebar-border)",
          color: "var(--color-sidebar-muted)",
        }}
      >
        GRANADO PRODUCTOS VETERINARIOS S.R.L.
        <br />
        Sistema de Producción · v1.0.0
      </div>
    </>
  );

  return (
    <div className="flex h-dvh flex-1 overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
      {desktopOpen ? (
        <aside
          className="hidden h-full w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden md:flex"
          style={{ background: "var(--color-sidebar)" }}
        >
          {nav()}
        </aside>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative z-10 flex h-full w-[var(--sidebar-width)] flex-col"
            style={{ background: "var(--color-sidebar)" }}
          >
            {nav(() => setMobileOpen(false))}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-2 border-b px-3 md:px-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="g-btn g-btn-icon hidden md:inline-flex"
              title={desktopOpen ? "Ocultar menú" : "Mostrar menú"}
              aria-label={desktopOpen ? "Ocultar menú" : "Mostrar menú"}
              aria-expanded={desktopOpen}
              onClick={toggleDesktop}
            >
              {desktopOpen ? (
                <IconSidebarHide className="h-[18px] w-[18px]" />
              ) : (
                <IconSidebarShow className="h-[18px] w-[18px]" />
              )}
            </button>
            <button
              type="button"
              className="g-btn g-btn-icon md:hidden"
              title={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? (
                <IconClose className="h-[18px] w-[18px]" />
              ) : (
                <IconMenu className="h-[18px] w-[18px]" />
              )}
            </button>
            <div className="min-w-0 md:hidden">
              <BrandWordmark />
            </div>
            <p className="hidden min-w-0 items-center gap-2 truncate text-[13px] font-medium md:flex">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <IconHome className="h-4 w-4" />
              </span>
              Sistema de Producción
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "var(--color-primary)" }}
              >
                {ini}
              </span>
              <div className="hidden min-w-0 pr-1 sm:block">
                <p className="truncate text-[12.5px] leading-tight font-semibold">
                  {nombre}
                </p>
                <p className="truncate text-[10.5px] leading-tight text-[var(--color-text-muted)]">
                  {perfil.rolNombre ?? "Sin rol"}
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main
          className="min-h-0 flex-1 overflow-y-auto"
          style={{
            padding: "var(--page-pad-y) var(--page-pad-x)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
