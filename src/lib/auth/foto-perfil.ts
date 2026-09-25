const RUTA_FOTO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(jpg|png|webp)$/i;

export const BUCKET_PERFILES = "perfiles";

export const TIPOS_FOTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_FOTO_BYTES = 2 * 1024 * 1024;

export function urlFotoPerfil(path: unknown, version: unknown): string | null {
  if (typeof path !== "string" || !RUTA_FOTO.test(path)) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  const marca =
    typeof version === "string" && version
      ? `?v=${encodeURIComponent(version)}`
      : "";
  return `${base}/storage/v1/object/public/${BUCKET_PERFILES}/${path}${marca}`;
}

export function rutasAvatar(authUserId: string) {
  return (["jpg", "png", "webp"] as const).map(
    (ext) => `${authUserId}/avatar.${ext}`,
  );
}
