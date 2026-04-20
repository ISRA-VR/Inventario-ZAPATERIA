import pool from "../config/db.js";
import bcrypt from "bcryptjs";

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'empleado',
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
    "INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)",
    [nombre, email, hash, role]
  );
  console.log(`Usuario creado: ${email} (id ${result.insertId})`);
  return result.insertId;
}

async function upsertAdmin({ nombre, email, password }) {
  const hash = await bcrypt.hash(password, 10);
  const [rowsByEmail] = await pool.query("SELECT id, role FROM usuarios WHERE email = ? LIMIT 1", [email]);
  const [adminRows] = await pool.query("SELECT id, email FROM usuarios WHERE role = 'admin' ORDER BY id ASC LIMIT 1");

  if (rowsByEmail.length > 0) {
    const targetUser = rowsByEmail[0];
    await pool.query(
      "UPDATE usuarios SET nombre = ?, password = ?, role = 'admin' WHERE id = ?",
      [nombre, hash, targetUser.id]
    );

    if (adminRows.length > 0 && adminRows[0].id !== targetUser.id) {
      await pool.query("UPDATE usuarios SET role = 'empleado' WHERE id = ?", [adminRows[0].id]);
      console.log(`Admin anterior degradado a empleado: ${adminRows[0].email}`);
    }

    console.log(`Admin actualizado por correo existente: ${email}`);
    return targetUser.id;
  }

  if (adminRows.length > 0) {
    const admin = adminRows[0];
    await pool.query(
      "UPDATE usuarios SET nombre = ?, email = ?, password = ?, role = 'admin' WHERE id = ?",
      [nombre, email, hash, admin.id]
    );
    console.log(`Admin actualizado: ${admin.email} -> ${email}`);
    return admin.id;
  }

  const [result] = await pool.query(
    "INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, 'admin')",
    [nombre, email, hash]
  );
  console.log(`Admin creado: ${email} (id ${result.insertId})`);
  return result.insertId;
}

(async () => {
  try {
    console.log("⏳ Preparando esquema y usuarios de prueba...");
    await ensureSchema();

    await upsertAdmin({
      nombre: "Administrador Demo",
      email: "nexdemrize@gmail.com",
      password: "12345678Xd$",
    });

    await upsertUser({
      nombre: "Empleado Demo",
      email: "empleado@demo.com",
      password: "123456",
      role: "empleado",
    });

    console.log("✅ Seed completado. Credenciales de prueba:");
    console.log("- Admin: nexdemrize@gmail.com / 12345678Xd$");
    console.log("- Empleado: empleado@demo.com / 123456");
  } catch (err) {
    console.error("❌ Error en seed:", err.message);
  } finally {
    await pool.end();
  }
})();