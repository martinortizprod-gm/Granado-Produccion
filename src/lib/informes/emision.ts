/** Quién y cuándo se emite un informe. AppShell registra el usuario de la sesión. */

let usuarioInforme = "";

export function registrarUsuarioInforme(nombre: string) {
  usuarioInforme = nombre.trim();
}

export function datosEmision() {
  const cuando = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return { cuando, usuario: usuarioInforme || "—" };
}

export function lineaEmision() {
  const { cuando, usuario } = datosEmision();
  return `Emitido: ${cuando}  ·  ${usuario}`;
}
