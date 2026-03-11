# Plastic-Hogar · Configuración Supabase

## 1. Crear tabla `productos`

Ve a tu dashboard de Supabase → SQL Editor y ejecuta:

```sql
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  precio numeric NOT NULL DEFAULT 0,
  categoria text DEFAULT 'otros',
  imagen_url text,
  stock text DEFAULT 'disponible',
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (permisivo para demo)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública
CREATE POLICY "Lectura pública" ON productos
  FOR SELECT USING (true);

-- Política: escritura con service role (admin)
CREATE POLICY "Escritura admin" ON productos
  FOR ALL USING (true);
```

## 2. Crear bucket de imágenes (opcional)

Ve a Storage → Crear bucket `productos-img` → Público

Si no se crea el bucket, las imágenes se pueden agregar por URL externa.

## 3. Acceso Admin

- URL: `admin.html`
- Usuario: `admin`
- Contraseña: `plastic2025`

## 4. Estructura de archivos

```
plastic-hogar/
├── index.html      ← Tienda pública
├── admin.html      ← Panel de administración
├── style.css       ← Estilos
├── app.js          ← Lógica tienda + Supabase
├── admin.js        ← Lógica admin
└── SETUP.md        ← Este archivo
```

