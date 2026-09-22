# Granado-Produccion

Sistema modular para la gestión de procesos y análisis de datos en producción de alimentos para bovinos de la empresa Granado Prod. Vet.

## Web (Next.js)

### Local

```bash
cp .env.example .env.local
# Completá URL, anon key y (para migrar) service_role key

npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### Subir cambios a GitHub / Vercel

```powershell
cd C:\Produccion-Granado\Py-Produccion\web
git add .
git status
git commit -m "Conectar Supabase, pantallas iniciales y script de migracion"
git push
```

Vercel redeploya solo. No subas `.env.local`.

### Supabase

- Esquema: `supabase/schema_inicial.sql`
- Lectura pública temporal (dev): `supabase/politica_lectura_anon_dev.sql`
- Migración SQLite → Supabase: `scripts/migrar_sqlite_a_supabase.py`
