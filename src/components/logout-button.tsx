import { signOut } from "@/app/logout/actions";
import { IconLogout } from "@/components/ui/icons";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="g-btn g-btn-ghost h-[var(--control-height)] gap-1 px-2 text-[12px]"
        title="Cerrar sesión"
      >
        <IconLogout className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </form>
  );
}
