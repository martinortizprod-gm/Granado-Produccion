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

Abrí [http://localhost:3000](http://localhost:3000) → redirige a `/login`.

### Login (Supabase Auth)

1. Supabase → **Authentication** → **Users** → **Add user**
2. URL Configuration con `/auth/callback` (local y Vercel)

### Roles y usuarios

1. Ejecutá en SQL Editor: `supabase/roles_y_permisos.sql`
2. Alineá el mail del admin Auth con `usuarios.mail` (ver comentario al final del SQL)
3. En Vercel agregá `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, no `NEXT_PUBLIC_`)
4. Entró como admin → menú **Usuarios** para roles y altas

### Tema

Botón **Claro / Oscuro** en la barra superior (se guarda en el navegador).

### Subir a GitHub / Vercel

```powershell
cd C:\Produccion-Granado\Py-Produccion\web
git add .
git commit -m "Login con Supabase Auth"
git push
```

### Supabase

- Esquema: `supabase/schema_inicial.sql`
- Lectura pública temporal (dev): `supabase/politica_lectura_anon_dev.sql`
- Migración SQLite → Supabase: `scripts/migrar_sqlite_a_supabase.py`
