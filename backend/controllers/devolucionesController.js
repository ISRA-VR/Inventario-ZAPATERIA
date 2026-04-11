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
   GET /api/devoluciones/ticket/:numero
   Busca la venta por número de ticket en
   asistente_movimientos y productos.
   ================================================ */
export const getVentaPorTicket = async (req, res) => {
  try {
    const numero = String(req.params.numero || '').trim();
    if (!numero) {
      return res.status(400).json({ message: 'Número de ticket requerido.' });
    }

    /* Busca en movimientos con source='caja' cuyo event_key contiene el ticket */
    const [movRows] = await pool.query(
      `SELECT modelo, monto, cantidad
       FROM asistente_movimientos
       WHERE tipo = 'salida'
         AND source = 'caja'
         AND event_key LIKE ?
       ORDER BY fecha_evento DESC
       LIMIT 1`,
      [`salida|${numero}|%`]
    );

    if (movRows.length === 0) {
      return res.status(404).json({ message: 'Ticket no encontrado.' });
    }

    const mov = movRows[0];

    /* Intenta encontrar el producto en la tabla productos por nombre de modelo */
    const [prodRows] = await pool.query(
      `SELECT p.id_producto, p.modelo, p.tallas, p.colores, p.precio, p.stock
       FROM productos p
       WHERE p.modelo = ?
       LIMIT 1`,
      [mov.modelo]
    );

    const prod = prodRows[0] || null;

    const tallas = prod?.tallas
      ? prod.tallas.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const colores = prod?.colores
      ? prod.colores.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    return res.json({
      producto: {
        id:       prod?.id_producto ?? null,
        nombre:   mov.modelo,
        talla:    tallas[0]  ?? 'N/A',
        color:    colores[0] ?? 'N/A',
        sku:      prod ? `SKU-${prod.id_producto}` : 'N/A',
        precio:   Number(mov.monto) / Math.max(1, Number(mov.cantidad)),
        descuento: 0,
        stock:    prod?.stock ?? null,
      },
    });
  } catch (err) {
    console.error('Error en getVentaPorTicket:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET /api/devoluciones/stats/hoy
   ================================================ */
export const getStatsDevolucionesHoy = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const hoy        = inicioDia();
    const manana     = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const ayer       = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const inicioMesD = inicioMes();
    const inicioSigM = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

    const [[rowHoy]]  = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(monto), 0) AS monto
       FROM devoluciones
       WHERE fecha_devolucion >= ? AND fecha_devolucion < ?`,
      [hoy, manana]
    );

    const [[rowAyer]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM devoluciones
       WHERE fecha_devolucion >= ? AND fecha_devolucion < ?`,
      [ayer, hoy]
    );

    const [[rowMes]]  = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(monto), 0) AS monto
       FROM devoluciones
       WHERE fecha_devolucion >= ? AND fecha_devolucion < ?`,
      [inicioMesD, inicioSigM]
    );

    const devHoy  = Number(rowHoy.total  || 0);
    const devAyer = Number(rowAyer.total || 0);

    return res.json({
      devolucionesHoy:      devHoy,
      dineroRetiradoHoy:    Number(rowHoy.monto  || 0),
      devolucionesMes:      Number(rowMes.total  || 0),
      dineroRetiradoMes:    Number(rowMes.monto  || 0),
      variacionHoy:         devHoy - devAyer,
    });
  } catch (err) {
    console.error('Error en getStatsDevolucionesHoy:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET /api/devoluciones/hoy
   Últimas devoluciones del día (límite 10)
   ================================================ */
export const getDevolucionesHoy = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const hoy    = inicioDia();
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);

    const [rows] = await pool.query(
      `SELECT id, ticket_original AS ticketOriginal, producto_nombre AS productoNombre,
              talla, color, monto, motivo, estado,
              TIME_FORMAT(hora_devolucion, '%H:%i') AS hora
       FROM devoluciones
       WHERE fecha_devolucion >= ? AND fecha_devolucion < ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [hoy, manana]
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error en getDevolucionesHoy:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET /api/devoluciones/motivos/frecuentes
   Top 5 motivos del mes actual
   ================================================ */
export const getMotivosFrecuentes = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const inicioMesD = inicioMes();
    const inicioSigM = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    const [rows] = await pool.query(
      `SELECT motivo, COUNT(*) AS cantidad
       FROM devoluciones
       WHERE fecha_devolucion >= ? AND fecha_devolucion < ?
       GROUP BY motivo
       ORDER BY cantidad DESC
       LIMIT 5`,
      [inicioMesD, inicioSigM]
    );

    return res.json(rows.map(r => ({
      motivo:   r.motivo,
      cantidad: Number(r.cantidad),
    })));
  } catch (err) {
    console.error('Error en getMotivosFrecuentes:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   GET /api/devoluciones/ultimo-retiro
   La devolución más reciente para la alerta
   ================================================ */
export const getUltimoRetiro = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const [rows] = await pool.query(
      `SELECT ticket_original AS ticketOriginal,
              producto_nombre AS productoNombre,
              monto,
              atendido_por    AS atendidoPor,
              TIME_FORMAT(hora_devolucion, '%I:%i %p') AS hora
       FROM devoluciones
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Sin retiros aún.' });

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error en getUltimoRetiro:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};

/* ================================================
   POST /api/devoluciones
   Registra la devolución y descuenta stock
   ================================================ */
export const registrarDevolucion = async (req, res) => {
  try {
    await ensureDevolucionesTable();

    const {
      ticketOriginal,
      productoId,
      productoNombre,
      talla        = 'N/A',
      color        = 'N/A',
      sku          = 'N/A',
      motivo,
      observaciones = '',
      tipoReembolso = 'Efectivo (retiro de caja)',
      monto,
      atendidoPor,
    } = req.body || {};

    /* Validaciones básicas */
    if (!ticketOriginal) return res.status(400).json({ message: 'El número de ticket es obligatorio.' });
    if (!motivo)         return res.status(400).json({ message: 'El motivo de devolución es obligatorio.' });
    if (!atendidoPor)    return res.status(400).json({ message: 'El campo atendido por es obligatorio.' });
    if (!monto || Number(monto) <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0.' });

    const nombreFinal = productoNombre
      || (productoId
        ? (await pool.query('SELECT modelo FROM productos WHERE id_producto = ? LIMIT 1', [productoId]))[0]?.[0]?.modelo
        : null)
      || 'Producto sin nombre';

    const ahora = new Date();
    const fechaHoy  = ahora.toISOString().slice(0, 10);
    const horaAhora = ahora.toTimeString().slice(0, 8);

    const [result] = await pool.query(
      `INSERT INTO devoluciones
        (ticket_original, producto_id, producto_nombre, talla, color, sku,
         motivo, observaciones, tipo_reembolso, monto, atendido_por,
         estado, fecha_devolucion, hora_devolucion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completada', ?, ?)`,
      [
        ticketOriginal,
        productoId || null,
        nombreFinal,
        talla,
        color,
        sku,
        motivo,
        observaciones,
        tipoReembolso,
        Number(monto),
        atendidoPor,
        fechaHoy,
        horaAhora,
      ]
    );

    /* Registra en asistente_movimientos para que aparezca en reportes */
    await pool.query(
      `INSERT IGNORE INTO asistente_movimientos
        (event_key, tipo, fecha_evento, modelo, categoria, cantidad, monto, registrado_por, source)
       VALUES (?, 'entrada', NOW(), ?, 'Devolución', 1, ?, ?, 'devolucion')`,
      [
        `devolucion|${result.insertId}|${ticketOriginal}`,
        nombreFinal,
        Number(monto),
        atendidoPor,
      ]
    );

    /* Retorna el último retiro para actualizar la alerta en el front */
    const retiro = {
      ticketOriginal,
      productoNombre: nombreFinal,
      monto: Number(monto),
      atendidoPor,
      hora: ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    return res.status(201).json({
      ok: true,
      message: 'Devolución registrada correctamente.',
      id: result.insertId,
      retiro,
    });
  } catch (err) {
    console.error('Error en registrarDevolucion:', err.message);
    return res.status(500).json({ message: 'Error del servidor.' });
  }
};