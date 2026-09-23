"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { IconClose, IconEye, IconPencil, IconSwap, IconTrash } from "@/components/ui/icons";

export function RowDetailButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="g-btn g-btn-icon h-7 w-7"
      title="Ver detalle"
      aria-label="Ver detalle completo"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IconEye className="h-4 w-4" />
    </button>
  );
}

export function RowEditButton({
  onClick,
  href,
}: {
  onClick?: () => void;
  href?: string;
}) {
  const className = "g-btn g-btn-icon g-btn-icon-edit h-7 w-7";
  if (href) {
    return (
      <Link href={href} className={className} title="Editar" aria-label="Editar">
        <IconPencil className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      title="Editar"
      aria-label="Editar"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <IconPencil className="h-4 w-4" />
    </button>
  );
}

export function RowAdjustButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="g-btn g-btn-icon h-7 w-7"
      title="Ajustar stock"
      aria-label="Ajustar stock"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IconSwap className="h-4 w-4" />
    </button>
  );
}

export function RowDeleteButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="g-btn g-btn-icon g-btn-icon-danger h-7 w-7"
      title="Eliminar"
      aria-label="Eliminar"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IconTrash className="h-4 w-4" />
    </button>
  );
}

export function RecordDetailDrawer({
  heading,
  title,
  badge,
  children,
  onClose,
}: {
  heading?: string;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <aside className="g-drawer-detail absolute top-2 right-2 z-20 flex max-h-[calc(100%-1rem)] w-[min(320px,calc(100%-1rem))] flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <p className="text-[11px] font-medium text-[var(--color-text-muted)]">
          {heading ?? "Detalle"}
        </p>
        <button
          type="button"
          className="g-btn g-btn-ghost h-7 w-7 px-0"
          title="Cerrar detalle"
          aria-label="Cerrar detalle"
          onClick={onClose}
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="overflow-y-auto p-3.5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          {badge}
        </div>
        {children}
      </div>
    </aside>
  );
}

export function DetalleFilas({
  filas,
}: {
  filas: { label: string; valor: string }[];
}) {
  return (
    <dl className="space-y-1 text-[13px]">
      {filas.map((f) => (
        <div key={f.label} className="flex justify-between gap-2 py-0.5">
          <dt className="shrink-0 text-[var(--color-text-muted)]">{f.label}</dt>
          <dd
            className="g-truncate text-right font-medium"
            title={f.valor || undefined}
          >
            {f.valor || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
