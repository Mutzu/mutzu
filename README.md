# Mutzu — Gestor de Tareas

Aplicación web full-stack para gestionar tareas con operaciones CRUD completas.

| Capa     | Tecnología                                    |
|----------|-----------------------------------------------|
| Frontend | HTML5 · CSS3 · JavaScript (Vanilla)           |
| Backend  | Node.js · Express.js                          |
| Base de datos | MySQL (pool de conexiones con `mysql2`) |
| Hosting  | Frontend → Vercel · Backend → Render · BD → Railway |

URLs en producción:
- **Frontend**: `https://mutzu.vercel.app` *(reemplazar con tu URL)*
- **API Backend**: `https://mutzu-backend.onrender.com` *(reemplazar con tu URL)*

---

## Estructura del proyecto

```
Mutzu/
├── frontend/
│   ├── index.html     # Estructura de la SPA
│   ├── styles.css     # Estilos (tema oscuro, diseño responsivo)
│   └── app.js         # Cliente HTTP y lógica de renderizado
│
├── backend/
│   ├── index.js       # Servidor Express y todas las rutas de la API
│   ├── db.js          # Pool de conexiones MySQL
│   ├── schema.sql     # Script de creación de la base de datos
│   ├── package.json
│   └── .env.example   # Variables de entorno requeridas
│
├── docs/
│   └── technical-documentation.md
│
├── .gitignore
└── README.md
```

---

## Configuración local

### 1 — Requisitos previos
- Node.js 18 o superior
- MySQL 8 corriendo localmente
- Git

### 2 — Clonar e instalar dependencias

```bash
git clone https://github.com/TU_USUARIO/mutzu.git
cd mutzu/backend
npm install
```

### 3 — Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con las credenciales de tu MySQL local
```

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=mutzu_db
FRONTEND_URL=http://localhost:5500
```

### 4 — Crear la base de datos

```bash
mysql -u root -p < schema.sql
```

### 5 — Iniciar el backend

```bash
npm start
# O con recarga automática durante el desarrollo:
npm run dev
```

### 6 — Abrir el frontend

Abre `frontend/index.html` con la extensión **Live Server** de VS Code
o cualquier servidor de archivos estáticos en el puerto 5500.

---

## Referencia de la API

| Método | Endpoint           | Descripción               |
|--------|--------------------|---------------------------|
| GET    | `/health`          | Verificación de estado    |
| GET    | `/api/tasks`       | Listar todas las tareas   |
| GET    | `/api/tasks/:id`   | Obtener una tarea         |
| POST   | `/api/tasks`       | Crear tarea               |
| PUT    | `/api/tasks/:id`   | Actualizar tarea          |
| DELETE | `/api/tasks/:id`   | Eliminar tarea            |

**Parámetros de consulta para GET /api/tasks:**
- `?status=pending|in_progress|completed`
- `?priority=low|medium|high`

**Estructura de una tarea:**
```json
{
  "id": 1,
  "title": "Desplegar backend",
  "description": "Configurar el servicio en Render",
  "status": "pending",
  "priority": "high",
  "created_at": "2026-04-13T12:00:00.000Z",
  "updated_at": "2026-04-13T12:00:00.000Z"
}
```

---

## Guía de despliegue

### Paso 1 — Subir a GitHub

```bash
git init
git add .
git commit -m "Commit inicial"
git remote add origin https://github.com/TU_USUARIO/mutzu.git
git push -u origin main
```

### Paso 2 — Base de datos en Railway

1. Entrar a [railway.app](https://railway.app) y crear un nuevo proyecto.
2. Clic en **Add a Service → Database → MySQL**.
3. Una vez aprovisionado, ir a la pestaña **Connect** y copiar:
   `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PORT`
4. Abrir la pestaña **Query** y pegar el contenido de `backend/schema.sql`.

### Paso 3 — Backend en Render

1. Entrar a [render.com](https://render.com) → **New → Web Service**.
2. Conectar el repositorio de GitHub, seleccionar la carpeta `backend` como raíz.
3. Configurar:
   - **Build command**: `npm install`
   - **Start command**: `node index.js`
4. En **Environment Variables**, agregar todas las variables de `.env.example`
   usando las credenciales de Railway:

   | Variable      | Valor                        |
   |---------------|------------------------------|
   | `PORT`        | `3000`                       |
   | `DB_HOST`     | *(de Railway)*               |
   | `DB_PORT`     | *(de Railway)*               |
   | `DB_USER`     | *(de Railway)*               |
   | `DB_PASSWORD` | *(de Railway)*               |
   | `DB_NAME`     | *(de Railway)*               |
   | `DB_SSL`      | `true`                       |
   | `FRONTEND_URL`| *(tu URL de Vercel)*         |

5. Desplegar. Copiar la URL pública (ej.: `https://mutzu-backend.onrender.com`).
6. Probar: `curl https://mutzu-backend.onrender.com/health`

### Paso 4 — Frontend en Vercel

1. Actualizar `API_URL` en `frontend/app.js` con la URL de Render del Paso 3.
2. Hacer commit y push.
3. Entrar a [vercel.com](https://vercel.com) → **New Project → Import Git Repository**.
4. Establecer **Root Directory** como `frontend`.
5. Desplegar (no necesita build command — son archivos estáticos).
6. Vercel asigna una URL como `https://mutzu.vercel.app`.

### Paso 5 — Configurar CORS final

En Render, actualizar la variable `FRONTEND_URL` con la URL de Vercel.
Forzar un nuevo despliegue desde el dashboard de Render.

---

## Variables de entorno

| Variable       | Requerida | Descripción                                        |
|----------------|-----------|----------------------------------------------------|
| `PORT`         | Sí        | Puerto del servidor (las plataformas lo asignan automáticamente) |
| `DB_HOST`      | Sí        | Host de MySQL                                      |
| `DB_PORT`      | No        | Puerto de MySQL (por defecto: 3306)                |
| `DB_USER`      | Sí        | Usuario de MySQL                                   |
| `DB_PASSWORD`  | Sí        | Contraseña de MySQL                                |
| `DB_NAME`      | Sí        | Nombre de la base de datos                         |
| `DB_SSL`       | No        | Poner `true` para bases de datos en la nube        |
| `FRONTEND_URL` | Sí        | Origen permitido por CORS                          |

---

## Errores comunes

| Problema                       | Causa                            | Solución                                              |
|-------------------------------|----------------------------------|-------------------------------------------------------|
| El backend no inicia           | Comando de inicio incorrecto     | Revisar logs; verificar que sea `node index.js`       |
| Error `ECONNREFUSED` en BD     | Host/puerto incorrectos          | Verificar credenciales de Railway; habilitar SSL      |
| Error CORS en el navegador     | `FRONTEND_URL` no coincide       | Actualizar con la URL exacta de Vercel en Render      |
| 404 en las llamadas a la API   | `API_URL` incorrecto en app.js   | Actualizar y redesplegar el frontend                  |
| Render tarda 30s en responder  | El plan gratuito se duerme       | Usar UptimeRobot para hacer ping a `/health` cada 10m |
