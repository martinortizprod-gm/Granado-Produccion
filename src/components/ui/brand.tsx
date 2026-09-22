import Image from "next/image";

export function BrandMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/granado-icon.png"
      alt="Granado"
      width={size}
      height={size}
      className={`rounded-[22%] object-contain ${className}`}
      priority
    />
  );
}

export function BrandWordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="min-w-0">
      <p
        className={`truncate text-sm font-bold tracking-wide ${
          light ? "text-white" : "text-[var(--color-text)]"
        }`}
      >
        GRANADO
      </p>
      <p
        className={`truncate text-[10px] uppercase tracking-wider ${
          light ? "text-white/55" : "text-[var(--color-text-muted)]"
        }`}
      >
        Prod. Veterinario
      </p>
    </div>
  );
}
