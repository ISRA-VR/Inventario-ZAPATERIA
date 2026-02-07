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
