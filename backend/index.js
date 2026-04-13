require("dotenv").config(); // Debe ir primero — carga el archivo .env antes de que cualquier otro módulo lea process.env

const express = require("express");
const cors = require("cors");
const { pool, testConnection } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000; // Las plataformas cloud asignan el puerto dinámicamente

// ─── Middleware ────────────────────────────────────────────────────────────────

// CORS: controla qué orígenes (URLs) pueden llamar a esta API.
// En producción solo permitimos la URL del frontend desplegado.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Habilita la lectura de cuerpos JSON en las solicitudes (req.body)
app.use(express.json());

// ─── Health Check ──────────────────────────────────────────────────────────────
// Las plataformas (Render, Railway) llaman a este endpoint periódicamente
// para saber si el servicio está vivo. Responde rápido y sin lógica compleja.

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── GET /api/tasks ────────────────────────────────────────────────────────────
// Devuelve todas las tareas, las más recientes primero.
// Soporta filtros opcionales por ?status= y ?priority=

app.get("/api/tasks", async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = "SELECT * FROM tasks";
    const params = [];

    // Construye la cláusula WHERE solo si hay filtros activos
    if (status || priority) {
      const conditions = [];
      if (status) {
        conditions.push("status = ?");
        params.push(status);
      }
      if (priority) {
        conditions.push("priority = ?");
        params.push(priority);
      }
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error("Error en GET /api/tasks:", err.message);
    res.status(500).json({ success: false, message: "Error al obtener las tareas" });
  }
});

// ─── GET /api/tasks/:id ────────────────────────────────────────────────────────
// Devuelve una tarea específica por su ID

app.get("/api/tasks/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Tarea no encontrada" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Error en GET /api/tasks/:id:", err.message);
    res.status(500).json({ success: false, message: "Error al obtener la tarea" });
  }
});

// ─── POST /api/tasks ───────────────────────────────────────────────────────────
// Crea una nueva tarea. El título es obligatorio.

app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;

    // Validación de entrada — solo aceptamos en la frontera del sistema
    if (!title || title.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "El título es obligatorio" });
    }

    const [result] = await pool.query(
      "INSERT INTO tasks (title, description, status, priority) VALUES (?, ?, ?, ?)",
      [
        title.trim(),
        description || null,
        status || "pending",
        priority || "medium",
      ]
    );

    // Devolvemos la tarea recién creada con su ID y timestamps generados por la BD
    const [newTask] = await pool.query("SELECT * FROM tasks WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json({ success: true, data: newTask[0] });
  } catch (err) {
    console.error("Error en POST /api/tasks:", err.message);
    res.status(500).json({ success: false, message: "Error al crear la tarea" });
  }
});

// ─── PUT /api/tasks/:id ────────────────────────────────────────────────────────
// Actualiza todos los campos de una tarea existente

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;

    // Verificamos que la tarea exista antes de intentar actualizarla
    const [existing] = await pool.query("SELECT id FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Tarea no encontrada" });
    }

    await pool.query(
      "UPDATE tasks SET title = ?, description = ?, status = ?, priority = ? WHERE id = ?",
      [title, description, status, priority, req.params.id]
    );

    // Devolvemos la tarea actualizada para confirmar los cambios al cliente
    const [updated] = await pool.query("SELECT * FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error("Error en PUT /api/tasks/:id:", err.message);
    res.status(500).json({ success: false, message: "Error al actualizar la tarea" });
  }
});

// ─── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
// Elimina una tarea por su ID

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const [existing] = await pool.query("SELECT id FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Tarea no encontrada" });
    }

    await pool.query("DELETE FROM tasks WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Tarea eliminada correctamente" });
  } catch (err) {
    console.error("Error en DELETE /api/tasks/:id:", err.message);
    res.status(500).json({ success: false, message: "Error al eliminar la tarea" });
  }
});

// ─── Captura rutas no definidas ────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta ${req.path} no encontrada` });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
// Primero verificamos la BD, luego levantamos el servidor.
// Si la BD falla, testConnection() llama a process.exit(1) antes de llegar aquí.

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Health check disponible en: http://localhost:${PORT}/health`);
  });
});
