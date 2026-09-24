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
export function IconDollar(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18" />
      <path d="M16.5 7.2c0-1.6-2-2.7-4.5-2.7S7.5 5.6 7.5 7.2 9.5 9.8 12 9.8s4.5 1.1 4.5 2.7-2 2.7-4.5 2.7-4.5-1.1-4.5-2.7" />
    </Svg>
  );
}
export function IconCalculator(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
      <path d="M8 16h.01M12 16h.01M16 16h.01" />
    </Svg>
  );
}
export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19h14" />
    </Svg>
  );
}
export function IconFile(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3.5h7l5 5V20.5H7z" />
      <path d="M14 3.5V9h5" />
    </Svg>
  );
}
export function IconList(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 7h10M9 12h10M9 17h10" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" />
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
export function IconBuilding(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21V5l8-2 8 2v16" />
      <path d="M9 21v-6h6v6" />
      <path d="M8 8h2M14 8h2M8 12h2M14 12h2" />
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
export function IconUserPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.7-5 6-5" />
      <path d="M17 11v6M14 14h6" />
    </Svg>
  );
}
export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.2 11 14.5 15.5 9.5" />
    </Svg>
  );
}
export function IconChevron(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
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
export function IconPencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.5 6.5l4 4" />
      <path d="M4.5 19.5l1-4L15 6a1.8 1.8 0 0 1 2.5 2.5L8 18l-4 1.5z" />
    </Svg>
  );
}
export function IconDatabase(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" />
      <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </Svg>
  );
}
export function IconBolt(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 2.5 5.5 13H12l-1 8.5L18.5 11H12l1-8.5z" />
    </Svg>
  );
}
export function IconWeight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5v3" />
      <path d="M7 6.5h10" />
      <path d="M6.5 10.5 5 15a3.2 3.2 0 0 0 3.1 2h1.2" />
      <path d="M17.5 10.5 19 15a3.2 3.2 0 0 1-3.1 2h-1.2" />
      <path d="M12 6.5V20" />
      <path d="M8 20h8" />
    </Svg>
  );
}
export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l.8 12h6.4L16 7" />
      <path d="M10 11v5M14 11v5" />
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
  proveedores: IconBuilding,
  clientes: IconUsers,
  analytics: IconChart,
  contabilidad: IconCalculator,
  usuarios: IconUsers,
  respaldos: IconDatabase,
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
