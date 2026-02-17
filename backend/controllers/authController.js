import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND activo = 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "8h" }
    );

    res.json({
      id: user.id,
      nombre: user.nombre,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error("Error en login:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Verificar si el email ya existe
    const [existingUser] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso." });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar el nuevo usuario
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, role, activo) VALUES (?, ?, ?, ?, 1)",
      [nombre, email, hashedPassword, rol || 'empleado'] // Asegurar que rol tenga un valor
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      role: rol,
    });
  } catch (err) {
    console.error("Error en register:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const getEmpleados = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, email, role, created_at FROM usuarios WHERE activo = 1");
    res.json(rows);
  } catch (err) {
    console.error("Error en getEmpleados:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const updateEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body;

    // Verificar si el email ya existe en otro usuario
    const [existingUser] = await pool.query("SELECT id FROM usuarios WHERE email = ? AND id != ?", [email, id]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso por otro usuario." });
    }

    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const fields = [];
    const params = [];

    if (nombre) {
      fields.push("nombre = ?");
      params.push(nombre);
    }
    if (email) {
      fields.push("email = ?");
      params.push(email);
    }
    if (rol) {
      fields.push("role = ?");
      params.push(rol);
    }
    if (hashedPassword) {
      fields.push("password = ?");
      params.push(hashedPassword);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar." });
    }

    params.push(id);

    const [result] = await pool.query(
      `UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }

    res.json({ message: "Empleado actualizado correctamente." });

  } catch (err) {
    console.error("Error en updateEmpleado:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const deleteEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete: marcar como inactivo
    const [result] = await pool.query(
      "UPDATE usuarios SET activo = 0 WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }

    res.json({ message: "Empleado eliminado correctamente." });
  } catch (err) {
    console.error("Error en deleteEmpleado:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};
