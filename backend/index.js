import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
import tallasRoutes from "./routes/tallas.routes.js";
import asistenteRoutes from "./routes/asistente.routes.js";
import movimientosRoutes from "./routes/movimientos.routes.js";
import pool from "./config/db.js";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/tallas", tallasRoutes);
app.use("/api/asistente", asistenteRoutes);
app.use("/api/movimientos", movimientosRoutes);

const hasConfiguredEnvValue = (value) => {
  const normalized = String(value || "").trim();
  return normalized.length > 0 && !normalized.includes("PEGA_AQUI");
};

const ensureProductosColoresColumn = async () => {
  const sqlCheck = `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'colores'
    LIMIT 1`;

  const [rows] = await pool.query(sqlCheck);
  if (rows.length > 0) return;

  await pool.query("ALTER TABLE productos ADD COLUMN colores VARCHAR(255) NULL");
  console.log("Migración aplicada: columna productos.colores creada.");
};

app.listen(port, async () => {
  console.log(`Backend corriendo en http://localhost:${port}`);

  const smtpVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const smtpConfigured = smtpVars.every((key) => hasConfiguredEnvValue(process.env[key]));
  const gmailConfigured =
    hasConfiguredEnvValue(process.env.GMAIL_USER) && hasConfiguredEnvValue(process.env.GMAIL_APP_PASSWORD);

  if (!smtpConfigured && !gmailConfigured) {
    console.warn("Recuperación por correo no configurada. Usa SMTP_* o GMAIL_USER + GMAIL_APP_PASSWORD.");
  } else if (smtpConfigured) {
    console.log("Recuperación por correo configurada con SMTP.");
  } else {
    console.log("Recuperación por correo con Gmail configurada.");
  }

  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("Conexión a MySQL exitosa (zapateria_login)");

    try {
      await ensureProductosColoresColumn();
    } catch (migrationError) {
      console.error("No se pudo validar/migrar productos.colores:", migrationError.message);
    }
  } catch (err) {
    console.error("Error conectando a MySQL:", err.message);
  }
});