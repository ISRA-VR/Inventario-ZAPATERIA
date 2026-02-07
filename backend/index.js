import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import { pool } from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.listen(3001, async () => {
  console.log("Backend corriendo en http://localhost:3001");
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("Conexión a MySQL exitosa (zapateria_login)");
  } catch (err) {
    console.error("Error conectando a MySQL:", err.message);
  }
});
