import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'empleado',
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function upsertUser({ nombre, email, password, role }) {
  const [rows] = await pool.query("SELECT id FROM usuarios WHERE email = ? LIMIT 1", [email]);
  if (rows.length > 0) {
    console.log(`Usuario ya existe: ${email}`);
    return rows[0].id;
  }
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO usuarios (nombre, email, password, role, activo) VALUES (?, ?, ?, ?, 1)",
    [nombre, email, hash, role]
  );
  console.log(`Usuario creado: ${email} (id ${result.insertId})`);
  return result.insertId;
}

(async () => {
  try {
    console.log("⏳ Preparando esquema y usuarios de prueba...");
    await ensureSchema();

    await upsertUser({
      nombre: "Administrador Demo",
      email: "admin@demo.com",
      password: "123456",
      role: "admin",
    });

    await upsertUser({
      nombre: "Empleado Demo",
      email: "empleado@demo.com",
      password: "123456",
      role: "empleado",
    });

    console.log("✅ Seed completado. Credenciales de prueba:");
    console.log("- Admin: admin@demo.com / 123456");
    console.log("- Empleado: empleado@demo.com / 123456");
  } catch (err) {
    console.error("❌ Error en seed:", err.message);
  } finally {
    await pool.end();
  }
})();
