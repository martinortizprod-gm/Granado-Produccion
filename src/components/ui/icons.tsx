import type { ModuloId } from "@/lib/modulos";
import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "h-[18px] w-[18px]"}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </Svg>
  );
}
export function IconClipboard(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5h6V6H9z" />
      <path d="M9 11h6M9 15h4" />
    </Svg>
  );
}
export function IconFactory(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 21h18" />
      <path d="M5 21V10l5 3V10l5 3V7h4v14" />
      <path d="M9 21v-3h2v3M13 21v-3h2v3" />
    </Svg>
  );
}
export function IconSwap(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </Svg>
  );
}
export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </Svg>
  );
}
export function IconChart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-5M12 16V8M16 16v-8" />
    </Svg>
  );
}
export function IconFlask(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
    </Svg>
  );
}
export function IconBox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3z" />
      <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
    </Svg>
  );
}
export function IconPackage(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 8V7l-9-4-9 4v1l9 4 9-4z" />
      <path d="M3 8v9l9 4 9-4V8" />
      <path d="M12 12v9" />
    </Svg>
  );
}
export function IconTag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12 12 4H5v7l8 8 7-7z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </Svg>
  );
}
export function IconLayers(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 3 8l9 5 9-5-9-5z" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
    </Svg>
  );
}
export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z" />
      <path d="M8 4v16" />
    </Svg>
  );
}
export function IconUsers(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2.2-1.6-3.8-4-4.5" />
    </Svg>
  );
}
export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </Svg>
  );
}
export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" />
    </Svg>
  );
}
export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 5H5v14h5" />
      <path d="M14 12H7M14 12l3-3M14 12l3 3" />
    </Svg>
  );
}
export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}
export function IconMenu(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}
export function IconSidebarHide(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9 4v16M13.5 10l-2 2 2 2" />
    </Svg>
  );
}
export function IconSidebarShow(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9 4v16M12.5 10l2 2-2 2" />
    </Svg>
  );
}
export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}
export function IconColumns(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M10 4v16M14 4v16" />
    </Svg>
  );
}
export function IconEye(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

const MAP: Record<ModuloId, (p: IconProps) => ReactNode> = {
  inicio: IconHome,
  solicitudes: IconClipboard,
  produccion: IconFactory,
  movimientos: IconSwap,
  planificacion: IconCalendar,
  informes: IconChart,
  ingredientes: IconFlask,
  insumos: IconBox,
  envases: IconPackage,
  etiquetas: IconTag,
  productos: IconLayers,
  recetas: IconBook,
  analytics: IconChart,
  usuarios: IconUsers,
};

export function IconModulo({
  id,
  className,
}: {
  id: ModuloId;
  className?: string;
}) {
  const Comp = MAP[id] || IconHome;
  return <>{Comp({ className })}</>;
}
