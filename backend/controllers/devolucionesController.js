import pool from '../config/db.js';

/* ================================================
   UTILIDADES
   ================================================ */
const inicioDia  = (f = new Date()) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
const inicioMes  = (f = new Date()) => new Date(f.getFullYear(), f.getMonth(), 1);

let tableReady = false;

const ensureDevolucionesTable = async () => {
  if (tableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS devoluciones (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      ticket_original VARCHAR(60)  NOT NULL,
      producto_id     INT          NULL,
      producto_nombre VARCHAR(200) NOT NULL,
      talla           VARCHAR(20)  NOT NULL DEFAULT 'N/A',
      color           VARCHAR(60)  NOT NULL DEFAULT 'N/A',
      sku             VARCHAR(100) NOT NULL DEFAULT 'N/A',
      motivo          VARCHAR(100) NOT NULL,
      observaciones   TEXT         NULL,
      tipo_reembolso  VARCHAR(80)  NOT NULL DEFAULT 'Efectivo (retiro de caja)',
      monto           DECIMAL(12,2) NOT NULL DEFAULT 0,
      atendido_por    VARCHAR(150) NOT NULL,
      estado          ENUM('Completada','Pendiente') NOT NULL DEFAULT 'Completada',
      fecha_devolucion DATE        NOT NULL,
      hora_devolucion  TIME        NOT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fecha (fecha_devolucion),
      INDEX idx_ticket (ticket_original)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  tableReady = true;
};

/* ================================================
   GET DEVOLUCIONES (últimas de hoy)
   ================================================ */
export const getDevolucionesHoy = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const [rows] = await pool.query(
      `SELECT id, ticket_original AS ticketOriginal, producto_nombre AS productoNombre,
              talla, color, monto, motivo, estado,
              TIME_FORMAT(hora_devolucion, '%H:%i') AS hora
       FROM devoluciones
       WHERE DATE(fecha_devolucion) = CURDATE()
       ORDER BY created_at DESC
       LIMIT 10`
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error en getDevolucionesHoy:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET ÚLTIMO RETIRO
   ================================================ */
export const getUltimoRetiro = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const [rows] = await pool.query(
      `SELECT ticket_original AS ticketOriginal,
              producto_nombre AS productoNombre,
              monto,
              atendido_por AS atendidoPor,
              TIME_FORMAT(hora_devolucion, '%I:%i %p') AS hora
       FROM devoluciones
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Sin retiros aún.' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error en getUltimoRetiro:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET MOTIVOS FRECUENTES (del mes)
   ================================================ */
export const getMotivosFrecuentes = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const [rows] = await pool.query(`
      SELECT motivo, COUNT(*) as total
      FROM devoluciones
      WHERE MONTH(fecha_devolucion) = MONTH(CURDATE())
      AND YEAR(fecha_devolucion) = YEAR(CURDATE())
      GROUP BY motivo
      ORDER BY total DESC
      LIMIT 5
    `);

    return res.json(rows);
  } catch (err) {
    console.error('Error en getMotivosFrecuentes:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET STATS HOY
   ================================================ */
export const getStatsDevolucionesHoy = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const [rows] = await pool.query(
      `SELECT COUNT(*) as total, IFNULL(SUM(monto),0) as monto
       FROM devoluciones
       WHERE DATE(fecha_devolucion) = CURDATE()`
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error en getStatsDevolucionesHoy:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET VENTA POR TICKET
   ================================================ */
export const getVentaPorTicket = async (req, res) => {
  try {
    const { numero } = req.params;

    const [rows] = await pool.query(
      `SELECT * FROM devoluciones WHERE ticket_original = ?`,
      [numero]
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error en getVentaPorTicket:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   POST REGISTRAR DEVOLUCIÓN
   ================================================ */
export const registrarDevolucion = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const {
      ticket_original,
      producto_nombre,
      talla,
      color,
      motivo,
      monto
    } = req.body;

    if (!ticket_original || !producto_nombre || !motivo) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const now = new Date();

    await pool.query(
      `INSERT INTO devoluciones 
      (ticket_original, producto_nombre, talla, color, motivo, monto, atendido_por, fecha_devolucion, hora_devolucion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket_original,
        producto_nombre,
        talla || 'N/A',
        color || 'N/A',
        motivo,
        monto || 0,
        req.user?.nombre || 'Desconocido',
        now,
        now
      ]
    );

    return res.json({ message: 'Devolución registrada correctamente' });
  } catch (err) {
    console.error('Error en registrarDevolucion:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};