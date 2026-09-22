"""
Migra data/sistema.db (SQLite) → Supabase (PostgreSQL vía REST).

Requisitos:
  - web/.env.local con:
      NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
      SUPABASE_SERVICE_ROLE_KEY=...   (Settings → API → service_role)

Uso (desde la raíz Py-Produccion, con el venv activado):

  python web/scripts/migrar_sqlite_a_supabase.py

Opciones:
  python web/scripts/migrar_sqlite_a_supabase.py --solo catalogo_productos,usuarios
  python web/scripts/migrar_sqlite_a_supabase.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
DB_PATH = ROOT / "data" / "sistema.db"
ENV_PATH = WEB / ".env.local"

# No migrar basura de Excel ni metadatos internos si no hace falta.
SKIP_TABLES = {"tablas_detalle"}

# No subir claves en texto plano a la nube.
OMIT_COLUMNS = {
    "usuarios": {"clave"},
}

BATCH = 200


def cargar_env(ruta: Path) -> dict[str, str]:
    if not ruta.is_file():
        raise SystemExit(f"No está {ruta}. Creá web/.env.local primero.")
    out: dict[str, str] = {}
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        k, _, v = linea.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def sql_valor(v):
    if v is None:
        return None
    if isinstance(v, (bytes, bytearray)):
        return v.decode("utf-8", errors="replace")
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v
    return str(v)


def leer_tabla(conn: sqlite3.Connection, nombre: str) -> tuple[list[str], list[dict]]:
    cols = [r[1] for r in conn.execute(f'PRAGMA table_info("{nombre}")')]
    omit = OMIT_COLUMNS.get(nombre, set())
    cols_ok = [c for c in cols if c not in omit]
    filas = []
    for row in conn.execute(f'SELECT * FROM "{nombre}"'):
        reg = {cols[i]: sql_valor(row[i]) for i in range(len(cols))}
        for c in omit:
            reg.pop(c, None)
        # Solo columnas permitidas
        filas.append({c: reg.get(c) for c in cols_ok})
    return cols_ok, filas


def postgrest(
    base_url: str,
    service_key: str,
    table: str,
    rows: list[dict],
    dry_run: bool,
) -> None:
    if not rows:
        return
    if dry_run:
        print(f"  [dry-run] {table}: {len(rows)} filas")
        return

    conflict = "nombre" if table == "_meta_tablas" else "id"
    url = (
        f"{base_url.rstrip('/')}/rest/v1/{table}"
        f"?on_conflict={conflict}"
    )
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            if resp.status not in (200, 201, 204):
                raise SystemExit(f"HTTP {resp.status} en {table}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Error en {table}: HTTP {e.code}\n{detail}") from e


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrar SQLite → Supabase")
    parser.add_argument(
        "--solo",
        help="Tablas separadas por coma (ej. catalogo_productos,usuarios)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo muestra conteos, no escribe en Supabase",
    )
    args = parser.parse_args()

    if not DB_PATH.is_file():
        raise SystemExit(f"No está la base SQLite: {DB_PATH}")

    env = cargar_env(ENV_PATH)
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not base_url.startswith("http"):
        raise SystemExit("NEXT_PUBLIC_SUPABASE_URL inválida en .env.local")
    if not args.dry_run and (
        not service_key or service_key.startswith("tu_")
    ):
        raise SystemExit(
            "Falta SUPABASE_SERVICE_ROLE_KEY en web/.env.local\n"
            "Supabase → Project Settings → API → service_role (secret)"
        )

    conn = sqlite3.connect(DB_PATH)
    try:
        tablas = [
            r[0]
            for r in conn.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name NOT LIKE 'sqlite_%' "
                "ORDER BY name"
            )
        ]
        tablas = [t for t in tablas if t not in SKIP_TABLES]
        if args.solo:
            pedidas = {x.strip() for x in args.solo.split(",") if x.strip()}
            tablas = [t for t in tablas if t in pedidas]
            faltan = pedidas - set(tablas)
            if faltan:
                raise SystemExit(f"Tablas no encontradas: {sorted(faltan)}")

        print(f"DB: {DB_PATH}")
        print(f"Destino: {base_url}")
        print(f"Tablas: {len(tablas)}")
        print()

        for nombre in tablas:
            cols, filas = leer_tabla(conn, nombre)
            print(f"- {nombre}: {len(filas)} filas, cols={cols}")
            for i in range(0, len(filas), BATCH):
                lote = filas[i : i + BATCH]
                postgrest(base_url, service_key, nombre, lote, args.dry_run)
                if not args.dry_run and len(filas) > BATCH:
                    print(f"   ... {min(i + BATCH, len(filas))}/{len(filas)}")

        print()
        print("Listo." if not args.dry_run else "Dry-run terminado (no se escribió nada).")
        if not args.dry_run:
            print("Recargá http://localhost:3000 — debería mostrar registros.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
    sys.exit(0)
