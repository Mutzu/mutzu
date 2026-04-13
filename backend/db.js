const mysql = require("mysql2/promise");

// Pool de conexiones: reutiliza conexiones abiertas en lugar de
// abrir y cerrar una nueva por cada solicitud HTTP.
// Esto mejora el rendimiento y evita agotar el límite de conexiones
// del servidor de base de datos (Railway permite ~10 en el plan gratuito).
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,   // Máximo de conexiones simultáneas al pool
  queueLimit: 0,         // Sin límite de solicitudes en cola
  // SSL es obligatorio para bases de datos en la nube (Railway, PlanetScale, etc.)
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

// Verifica la conexión al arrancar el servidor.
// Si la BD no responde, el proceso termina de inmediato ("fail fast"):
// es mejor un error claro al inicio que un crash misterioso en producción.
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("Conexión a la base de datos establecida correctamente");
    conn.release(); // Devuelve la conexión al pool para que otros puedan usarla
  } catch (err) {
    console.error("Error al conectar con la base de datos:", err.message);
    process.exit(1); // Detiene el servidor — sin BD no hay app
  }
}

module.exports = { pool, testConnection };
