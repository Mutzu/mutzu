# Documentación Técnica
## Mutzu — Gestor de Tareas
**Actividad de Despliegue Full-Stack**
**Fecha:** Abril 2026

---

## 1. Selección de plataformas y justificación

### Plataformas elegidas

| Componente    | Plataforma  | Justificación |
|---------------|-------------|---------------|
| Frontend      | **Vercel**  | Despliegue sin configuración desde Git, SSL gratuito, CDN global, deploys instantáneos en cada push. La mejor opción para HTML/CSS/JS estático. |
| Backend       | **Render**  | Plan gratuito para servicios web, soporte nativo para Node.js, despliegues automáticos desde GitHub, gestión sencilla de variables de entorno. |
| Base de datos | **Railway** | MySQL administrado con plan gratuito generoso, editor de queries integrado, backups automáticos y exportación directa de credenciales. |

### Alternativas consideradas

- **Netlify** (frontend): También excelente, pero la experiencia de Vercel es más fluida para archivos estáticos puros.
- **Fly.io** (backend): Más potente, pero con una curva de aprendizaje más pronunciada para esta actividad.
- **PlanetScale** (base de datos): Usa un modelo de branching propietario que agrega complejidad innecesaria para un ejercicio de aprendizaje.

---

## 2. Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVEGADOR DEL USUARIO                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Vercel (Red CDN Global)                  │  │
│  │                                                       │  │
│  │   index.html  ──  styles.css  ──  app.js              │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │ Llamadas HTTPS con fetch()        │
└─────────────────────────┼───────────────────────────────────┘
                          │
          ┌───────────────▼──────────────────┐
          │           Render.com             │
          │   (Servidor Node.js + Express)   │
          │                                  │
          │  GET    /api/tasks               │
          │  POST   /api/tasks               │
          │  PUT    /api/tasks/:id           │
          │  DELETE /api/tasks/:id           │
          │  GET    /health                  │
          └───────────────┬──────────────────┘
                          │ mysql2 con SSL/TCP
          ┌───────────────▼──────────────────┐
          │           Railway.app            │
          │  (Instancia MySQL 8 administrada)│
          │                                  │
          │   Tabla: tasks                   │
          │   - id, title, description       │
          │   - status, priority             │
          │   - created_at, updated_at       │
          └──────────────────────────────────┘
```

### Flujo de datos — Crear una tarea

```
1. El usuario completa el formulario en el navegador (CDN de Vercel)
2. app.js ejecuta: POST https://mutzu-backend.onrender.com/api/tasks
3. Express recibe la solicitud y valida que el título no esté vacío
4. El pool de mysql2 ejecuta: INSERT INTO tasks (...)
5. El backend responde con: { success: true, data: { id, title, ... } }
6. app.js agrega la nueva tarjeta al DOM — sin recargar la página
```

---

## 3. Pasos de despliegue seguidos

### Fase 1 — Desarrollo local

1. Se crearon los directorios `/backend` y `/frontend`.
2. Se inicializó el proyecto Node.js (`npm init`) e instalaron `express`, `mysql2`, `dotenv`, `cors`.
3. Se escribió `schema.sql` con `CREATE TABLE tasks` y datos de semilla.
4. Se codificaron todas las rutas de la API en `index.js` usando `async/await` con `mysql2/promise`.
5. Se verificaron todos los endpoints localmente con `curl` y el navegador.
6. Se creó `.env` a partir de `.env.example` y se confirmó la conexión a la BD.
7. Se subió a GitHub. **El archivo `.env` nunca fue commiteado** (protegido por `.gitignore`).

### Fase 2 — Base de datos (Railway)

1. Se creó una cuenta en railway.app.
2. Nuevo proyecto → Add Service → Database → MySQL.
3. Railway aprovisionó una instancia MySQL 8 en ~30 segundos.
4. Se abrió la pestaña **Query** integrada, se pegó `schema.sql` y se ejecutó.
5. Se navegó a la pestaña **Connect** y se copiaron todas las credenciales de conexión.
6. Se verificó que la instancia era accesible desde internet público (Railway lo habilita por defecto en el plan gratuito).

### Fase 3 — Backend (Render)

1. Se creó una cuenta en render.com.
2. Nuevo Web Service → se conectó el repositorio de GitHub.
3. Se configuró **Root Directory** como `backend`.
4. Se establecieron:
   - Comando de build: `npm install`
   - Comando de inicio: `node index.js`
5. Se agregaron las 7 variables de entorno de `.env.example` usando las credenciales de Railway.
6. Se agregó `DB_SSL=true` (Railway requiere SSL para conexiones remotas).
7. Se desplegó. El primer despliegue tardó ~90 segundos.
8. Se probó: `curl https://mutzu-backend.onrender.com/health` → `{"status":"ok"}`
9. Se probó CRUD: `curl -X POST ... /api/tasks` con cuerpo JSON.

### Fase 4 — Frontend (Vercel)

1. Se actualizó la constante `API_URL` en `frontend/app.js` con la URL de Render.
2. Se hizo commit y push a GitHub.
3. Se creó una cuenta en vercel.com.
4. Nuevo proyecto → Importar desde GitHub.
5. Se estableció **Root Directory** como `frontend`.
6. No se requirió comando de build (archivos estáticos puros).
7. Se desplegó. Vercel asignó `https://mutzu.vercel.app`.
8. Se abrió la URL en el navegador — las tareas cargaron desde la BD de Railway a través de la API en Render.

### Fase 5 — CORS e integración final

1. Se copió la URL de Vercel.
2. En el dashboard de Render, se actualizó la variable `FRONTEND_URL` con la URL de Vercel.
3. Se forzó un nuevo despliegue en Render.
4. Se verificó: sin errores CORS en la pestaña Network de DevTools.
5. Se ejecutó el ciclo CRUD completo: crear, leer, editar y eliminar tareas.

---

## 4. Desafíos encontrados y soluciones

### Desafío 1: Requisito de SSL de Railway
**Problema:** El backend se caía con `ECONNREFUSED` al conectarse a Railway MySQL.
**Causa raíz:** Railway exige SSL para todas las conexiones remotas; `mysql2` no usa SSL por defecto.
**Solución:** Se agregó la variable de entorno `DB_SSL=true` y la opción `ssl: { rejectUnauthorized: false }` en `db.js`.

```js
ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
```

### Desafío 2: Arranque en frío de Render
**Problema:** Después de 15 minutos sin actividad, Render apaga el servicio gratuito. La primera solicitud tardaba ~30 segundos.
**Solución:** Se configuró [UptimeRobot](https://uptimerobot.com) (gratuito) para hacer ping a `/health` cada 10 minutos durante el horario activo.

### Desafío 3: CORS bloqueaba todas las llamadas a la API
**Problema:** El navegador rechazaba todos los `fetch()` con error `Access-Control-Allow-Origin`.
**Causa raíz:** El `FRONTEND_URL` del backend seguía apuntando a `http://localhost:5500` después de desplegar el frontend.
**Solución:** Se actualizó `FRONTEND_URL` en Render a `https://mutzu.vercel.app` y se redesplegó.

### Desafío 4: El frontend usaba la URL incorrecta de la API
**Problema:** El frontend usaba `http://localhost:3000` en producción porque olvidamos actualizar `app.js`.
**Solución:** Se cambió la lógica de `API_URL` para detectar automáticamente si estamos en `localhost` o en producción:

```js
const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://mutzu-backend.onrender.com";
```

---

## 5. Consideraciones de seguridad

| Riesgo                      | Medida aplicada                                                           |
|-----------------------------|---------------------------------------------------------------------------|
| Credenciales de BD expuestas | Almacenadas solo en variables de entorno de la plataforma, nunca en código |
| `.env` en el repositorio     | Bloqueado por `.gitignore`; se commitea `.env.example` en su lugar        |
| XSS mediante contenido del usuario | `escaparHtml()` aplicado antes de cada inserción con `innerHTML`   |
| Inyección SQL               | Queries parametrizadas (marcadores `?`) en todas las consultas            |
| CORS abierto                | `FRONTEND_URL` restringe el origen permitido en producción                |
| BD expuesta públicamente    | Railway limita el acceso a usuarios autenticados con credenciales         |

---

## 6. Lista de capturas de pantalla requeridas

Incluir las siguientes capturas en la entrega final:

- [ ] Servicio MySQL de Railway — pestaña Connect con las credenciales (oscurecer contraseñas)
- [ ] Web Service de Render — pestaña de Variables de Entorno
- [ ] Logs de despliegue de Render mostrando "Servidor corriendo en el puerto 3000"
- [ ] Página de despliegue de Vercel con build exitoso
- [ ] Navegador — aplicación funcionando con tareas visibles
- [ ] DevTools del navegador → pestaña Network con llamadas a la API exitosas (200 OK)
- [ ] Salida de `curl /health` en la terminal

---

## 7. Lecciones aprendidas

1. **Las variables de entorno no son opcionales.** Las credenciales hardcodeadas rompen la seguridad y hacen los despliegues imposibles sin modificar el código.
2. **El pool de conexiones importa.** Abrir una nueva conexión a la BD por cada solicitud agotaría el límite de Railway con cualquier carga real.
3. **Las limitaciones del plan gratuito son reales.** El comportamiento de arranque en frío de Render requiere una solución alternativa (ping al health check) para una experiencia de usuario aceptable.
4. **CORS debe coincidir exactamente.** Una barra final o HTTP vs HTTPS de diferencia es suficiente para romper todas las llamadas a la API.
5. **Probar cada capa de forma independiente.** Verificar BD → luego API backend → luego integración con el frontend, no todo al mismo tiempo.
