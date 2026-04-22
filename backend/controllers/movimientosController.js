import pool from '../config/db.js';

let movimientosTableReady = false;

const parseFecha = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseFechaVenta = (venta) => {
  const fechaBase = venta?.fecha || (venta?.created_at ? String(venta.created_at).slice(0, 10) : null);
  const horaBase = venta?.hora || (venta?.created_at
    ? new Date(venta.created_at).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : '00:00');
  const fecha = fechaBase ? `${fechaBase}T${horaBase}:00` : venta?.created_at;
  return parseFecha(fecha);
};

const ensureMovimientosTable = async () => {
  if (movimientosTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS asistente_movimientos (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_key VARCHAR(191) NOT NULL UNIQUE,
      tipo ENUM('entrada', 'salida') NOT NULL,
      fecha_evento DATETIME NOT NULL,
      modelo VARCHAR(180) NULL,
      categoria VARCHAR(120) NULL,
      cantidad INT NOT NULL DEFAULT 0,
      monto DECIMAL(12,2) NOT NULL DEFAULT 0,
      registrado_por VARCHAR(150) NULL,
      registrado_por_id BIGINT NULL,
      source VARCHAR(30) NOT NULL DEFAULT 'sistema',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fecha_evento (fecha_evento),
      INDEX idx_tipo_fecha (tipo, fecha_evento),
      INDEX idx_registrado_por_id (registrado_por_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [idColumnRows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'asistente_movimientos'
       AND COLUMN_NAME = 'registrado_por_id'`
  );

  if (!idColumnRows.length) {
    await pool.query('ALTER TABLE asistente_movimientos ADD COLUMN registrado_por_id BIGINT NULL');
    await pool.query('CREATE INDEX idx_registrado_por_id ON asistente_movimientos (registrado_por_id)');
  }

  movimientosTableReady = true;
};

const insertarMovimiento = async ({
  eventKey,
  tipo,
  fechaEvento,
  modelo,
  categoria,
  cantidad,
  monto,
  registradoPor,
  registradoPorId,
  source,
}) => {
  await pool.query(
    `INSERT IGNORE INTO asistente_movimientos
      (event_key, tipo, fecha_evento, modelo, categoria, cantidad, monto, registrado_por, registrado_por_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [eventKey, tipo, fechaEvento, modelo, categoria, cantidad, monto, registradoPor, registradoPorId ?? null, source]
  );
};

const inicioDia = (fecha = new Date()) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const inicioMes = (fecha = new Date()) => new Date(fecha.getFullYear(), fecha.getMonth(), 1);

const formatearMesCorto = (fecha) =>
  fecha
    .toLocaleString('es-MX', { month: 'short' })
    .replace('.', '')
    .replace(/^./, (m) => m.toUpperCase());

const toTotalsObject = (rows = []) => {
  const base = {
    entradasCantidad: 0,
    salidasCantidad: 0,
    entradasMonto: 0,
    salidasMonto: 0,
    gananciaNeta: 0,
  };

  rows.forEach((r) => {
    const qty = Number(r.cantidad_total || 0);
    const amount = Number(r.monto_total || 0);
    if (r.tipo === 'entrada') {
      base.entradasCantidad = qty;
      base.entradasMonto = amount;
    }
    if (r.tipo === 'salida') {
      base.salidasCantidad = qty;
      base.salidasMonto = amount;
    }
  });

  base.gananciaNeta = base.salidasMonto - base.entradasMonto;
  return base;
};

const queryTotalesPorRango = async (desde, hasta, { registradoPorId = null } = {}) => {
  const filtroEmpleadoSql = Number.isFinite(Number(registradoPorId))
    ? ' AND registrado_por_id = ?'
    : '';
  const params = Number.isFinite(Number(registradoPorId))
    ? [desde, hasta, Number(registradoPorId)]
    : [desde, hasta];

  const [rows] = await pool.query(
    `SELECT tipo, COALESCE(SUM(cantidad), 0) AS cantidad_total, COALESCE(SUM(monto), 0) AS monto_total
     FROM asistente_movimientos
     WHERE fecha_evento >= ? AND fecha_evento < ?${filtroEmpleadoSql}
     GROUP BY tipo`,
    params
  );

  return toTotalsObject(rows);
};

export const registrarEntrada = async (req, res) => {
  try {
    await ensureMovimientosTable();

    const {
      id_producto,
      modelo,
      nombre_categoria,
      cantidad,
      precio,
      fecha_creacion,
      registroId,
      registrado_por,
    } = req.body || {};

    const cant = Math.max(0, Math.round(Number(cantidad || 0)));
    if (!cant) {
      return res.status(400).json({ message: 'Cantidad inválida para entrada' });
    }

    const fecha = parseFecha(fecha_creacion || new Date().toISOString());
    if (!fecha) {
      return res.status(400).json({ message: 'Fecha inválida para entrada' });
    }

    const monto = (Number(precio) || 0) * cant;
    const modeloFinal = modelo || 'Modelo sin nombre';
    const eventKey = `entrada|${registroId || id_producto || modeloFinal}|${fecha.toISOString()}|${cant}`;

    await insertarMovimiento({
      eventKey,
      tipo: 'entrada',
      fechaEvento: fecha,
      modelo: modeloFinal,
      categoria: nombre_categoria || null,
      cantidad: cant,
      monto,
      registradoPor: req.user?.nombre || req.user?.email || registrado_por || null,
      registradoPorId: req.user?.id ?? null,
      source: 'productos',
    });

    return res.status(201).json({ ok: true, message: 'Entrada registrada en historial' });
  } catch (error) {
    console.error('Error registrando entrada:', error);
    return res.status(500).json({ message: 'No se pudo registrar la entrada' });
  }
};

export const registrarVenta = async (req, res) => {
  try {
    await ensureMovimientosTable();

    const { venta } = req.body || {};
    if (!venta || !Array.isArray(venta.detalle) || venta.detalle.length === 0) {
      return res.status(400).json({ message: 'Venta inválida para registrar movimientos' });
    }

    const fechaVenta = parseFechaVenta(venta);
    if (!fechaVenta) {
      return res.status(400).json({ message: 'Fecha inválida para venta' });
    }

    const idVenta = venta.id || venta.folio || `venta-${Date.now()}`;

    for (let i = 0; i < venta.detalle.length; i += 1) {
      const item = venta.detalle[i];
      const cant = Math.max(0, Math.round(Number(item?.cantidad || 0)));
      if (!cant) continue;

      const precio = Number(item?.precio) || 0;
      const monto = precio * cant;
      const modelo = item?.nombre || `Producto ${i + 1}`;
      const eventKey = `salida|${idVenta}|${i}|${fechaVenta.toISOString()}|${modelo}|${cant}`;

      await insertarMovimiento({
        eventKey,
        tipo: 'salida',
        fechaEvento: fechaVenta,
        modelo,
        categoria: item?.categoria || item?.marca || null,
        cantidad: cant,
        monto,
        registradoPor: req.user?.nombre || req.user?.email || venta?.registrado_por || null,
        registradoPorId: req.user?.id ?? null,
        source: 'caja',
      });
    }

    return res.status(201).json({ ok: true, message: 'Venta registrada en historial' });
  } catch (error) {
    console.error('Error registrando venta:', error);
    return res.status(500).json({ message: 'No se pudo registrar la venta en historial' });
  }
};

export const obtenerResumenMovimientos = async (req, res) => {
  try {
    await ensureMovimientosTable();

    const userId = Number(req.user?.id);
    const filtroEmpleadoId = req.user?.role === 'empleado' && Number.isFinite(userId)
      ? userId
      : null;
    const filtroEmpleadoSql = Number.isFinite(filtroEmpleadoId) ? ' AND registrado_por_id = ?' : '';
    const withEmpleadoParams = (params = []) => (
      Number.isFinite(filtroEmpleadoId)
        ? [...params, filtroEmpleadoId]
        : params
    );

    const now = new Date();
    const todayStart = inicioDia(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const monthStart = inicioMes(now);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const desdeQuery = String(req.query?.desde || '').trim();
    const hastaQuery = String(req.query?.hasta || '').trim();
    const filtroDesde = desdeQuery ? parseFecha(`${desdeQuery}T00:00:00`) : null;
    const filtroHastaBase = hastaQuery ? parseFecha(`${hastaQuery}T00:00:00`) : null;
    const filtroHasta = filtroHastaBase ? new Date(filtroHastaBase.getTime() + 24 * 60 * 60 * 1000) : null;

    const tieneRangoValido = Boolean(
      filtroDesde
      && filtroHasta
      && filtroHasta.getTime() > filtroDesde.getTime()
    );

    const periodoInicio = tieneRangoValido ? filtroDesde : monthStart;
    const periodoFin = tieneRangoValido ? filtroHasta : nextMonthStart;
    const periodoDuracionMs = periodoFin.getTime() - periodoInicio.getTime();
    const periodoAnteriorInicio = new Date(periodoInicio.getTime() - periodoDuracionMs);
    const periodoAnteriorFin = new Date(periodoInicio);

    const inicio5Meses = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    const inicio12Meses = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const inicioSemana = new Date(todayStart);
    inicioSemana.setDate(inicioSemana.getDate() - 6);

    const [hoy, ayer, mes, mesAnterior] = await Promise.all([
      queryTotalesPorRango(todayStart, tomorrowStart, { registradoPorId: filtroEmpleadoId }),
      queryTotalesPorRango(yesterdayStart, todayStart, { registradoPorId: filtroEmpleadoId }),
      queryTotalesPorRango(periodoInicio, periodoFin, { registradoPorId: filtroEmpleadoId }),
      queryTotalesPorRango(periodoAnteriorInicio, periodoAnteriorFin, { registradoPorId: filtroEmpleadoId }),
    ]);

    const [seriesMesRows, seriesSemanaRows, seriesAnualRows, categoriaRows, topRows, actividadRows] = await Promise.all([
      pool.query(
        `SELECT DATE_FORMAT(fecha_evento, '%Y-%m') AS ym, tipo, COALESCE(SUM(cantidad), 0) AS cantidad
         FROM asistente_movimientos
         WHERE fecha_evento >= ? AND fecha_evento < ?
         ${filtroEmpleadoSql}
         GROUP BY DATE_FORMAT(fecha_evento, '%Y-%m'), tipo`,
        withEmpleadoParams([tieneRangoValido ? periodoInicio : inicio5Meses, tieneRangoValido ? periodoFin : nextMonthStart])
      ),
      pool.query(
        `SELECT DATE(fecha_evento) AS dia, COALESCE(SUM(monto), 0) AS ventas
         FROM asistente_movimientos
         WHERE tipo = 'salida' AND fecha_evento >= ? AND fecha_evento < ?
         ${filtroEmpleadoSql}
         GROUP BY DATE(fecha_evento)`,
        withEmpleadoParams([tieneRangoValido ? periodoInicio : inicioSemana, tieneRangoValido ? periodoFin : tomorrowStart])
      ),
      pool.query(
        `SELECT DATE_FORMAT(fecha_evento, '%Y-%m') AS ym, COALESCE(SUM(monto), 0) AS ventas
         FROM asistente_movimientos
         WHERE tipo = 'salida' AND fecha_evento >= ? AND fecha_evento < ?
         ${filtroEmpleadoSql}
         GROUP BY DATE_FORMAT(fecha_evento, '%Y-%m')`,
        withEmpleadoParams([tieneRangoValido ? periodoInicio : inicio12Meses, tieneRangoValido ? periodoFin : nextMonthStart])
      ),
      pool.query(
        `SELECT COALESCE(categoria, 'Sin categoría') AS cat,
                COALESCE(SUM(CASE WHEN fecha_evento >= ? AND fecha_evento < ? THEN cantidad ELSE 0 END), 0) AS hoy,
                COALESCE(SUM(CASE WHEN fecha_evento >= ? AND fecha_evento < ? THEN cantidad ELSE 0 END), 0) AS ayer
         FROM asistente_movimientos
         WHERE tipo = 'salida' AND fecha_evento >= ? AND fecha_evento < ?
         ${filtroEmpleadoSql}
         GROUP BY COALESCE(categoria, 'Sin categoría')
         ORDER BY hoy DESC, ayer DESC
         LIMIT 6`,
        withEmpleadoParams([
          periodoInicio,
          periodoFin,
          periodoAnteriorInicio,
          periodoAnteriorFin,
          periodoAnteriorInicio,
          periodoFin,
        ])
      ),
      pool.query(
        `SELECT m.modelo AS nombre,
                COALESCE(SUM(m.cantidad), 0) AS ventas,
                COALESCE(SUM(m.monto), 0) AS total,
                MAX(p.stock) AS stock_actual
         FROM asistente_movimientos m
         INNER JOIN productos p ON p.modelo = m.modelo
         WHERE m.tipo = 'salida'
           AND m.fecha_evento >= ?
           AND m.fecha_evento < ?
           ${filtroEmpleadoSql ? 'AND m.registrado_por_id = ?' : ''}
           AND CHAR_LENGTH(m.modelo) <= 120
         GROUP BY m.modelo
         ORDER BY ventas DESC
         LIMIT 5`,
        withEmpleadoParams([periodoInicio, periodoFin])
      ),
      pool.query(
        `SELECT tipo, modelo, cantidad, monto, fecha_evento
         FROM asistente_movimientos
         WHERE fecha_evento >= ? AND fecha_evento < ?
         ${filtroEmpleadoSql}
         ORDER BY fecha_evento DESC
         LIMIT 8`,
        withEmpleadoParams([periodoInicio, periodoFin])
      ),
    ]);

    const seriesMesData = Array.isArray(seriesMesRows?.[0]) ? seriesMesRows[0] : [];
    const seriesSemanaData = Array.isArray(seriesSemanaRows?.[0]) ? seriesSemanaRows[0] : [];
    const seriesAnualData = Array.isArray(seriesAnualRows?.[0]) ? seriesAnualRows[0] : [];
    const categoriaData = Array.isArray(categoriaRows?.[0]) ? categoriaRows[0] : [];
    const topData = Array.isArray(topRows?.[0]) ? topRows[0] : [];
    const actividadData = Array.isArray(actividadRows?.[0]) ? actividadRows[0] : [];

    const map5Meses = {};
    const baseSeriesMesInicio = tieneRangoValido
      ? new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 4, 1);
    const baseSeriesMesFin = tieneRangoValido
      ? new Date(periodoFin.getFullYear(), periodoFin.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    for (
      let d = new Date(baseSeriesMesInicio);
      d <= baseSeriesMesFin;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    ) {
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map5Meses[ym] = { mes: formatearMesCorto(d), entradas: 0, salidas: 0, valor: 0 };
    }

    seriesMesData.forEach((row) => {
      const bucket = map5Meses[row.ym];
      if (!bucket) return;
      const qty = Number(row.cantidad || 0);
      if (row.tipo === 'entrada') bucket.entradas += qty;
      if (row.tipo === 'salida') bucket.salidas += qty;
      bucket.valor += qty;
    });

    const mapSemana = {};
    const baseSemanaInicio = tieneRangoValido ? new Date(periodoInicio) : new Date(inicioSemana);
    const baseSemanaFin = tieneRangoValido ? new Date(periodoFin.getTime() - 24 * 60 * 60 * 1000) : new Date(todayStart);

    for (let d = new Date(baseSemanaInicio); d <= baseSemanaFin; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      mapSemana[key] = {
        dia: d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''),
        ventas: 0,
      };
    }
    seriesSemanaData.forEach((row) => {
      const key = new Date(row.dia).toISOString().slice(0, 10);
      if (mapSemana[key]) mapSemana[key].ventas = Number(row.ventas || 0);
    });

    const mapAnual = {};
    const baseAnualInicio = tieneRangoValido
      ? new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const baseAnualFin = tieneRangoValido
      ? new Date(periodoFin.getFullYear(), periodoFin.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    for (
      let d = new Date(baseAnualInicio);
      d <= baseAnualFin;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    ) {
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mapAnual[ym] = { mes: formatearMesCorto(d), ventas: 0 };
    }
    seriesAnualData.forEach((row) => {
      if (mapAnual[row.ym]) mapAnual[row.ym].ventas = Number(row.ventas || 0);
    });

    const topProductosMes = topData.map((item, idx) => ({
      pos: idx + 1,
      nombre: item.nombre || 'Producto sin nombre',
      ventas: Number(item.ventas || 0),
      total: Number(item.total || 0),
      stock_actual: Number(item.stock_actual || 0),
    }));

    const actividadReciente = actividadData.map((row) => ({
      tipo: row.tipo,
      desc: row.modelo || 'Movimiento',
      hora: new Date(row.fecha_evento).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      fecha_iso: new Date(row.fecha_evento).toISOString(),
      monto_numero: Number(row.monto || 0),
      monto: `${row.tipo === 'entrada' ? '-' : '+'}$${Number(row.monto || 0).toLocaleString('es-MX')}`,
      cantidad: Number(row.cantidad || 0),
    }));

    return res.json({
      hoy,
      ayer,
      mes,
      mesAnterior,
      seriesInventario: Object.values(map5Meses),
      seriesVentasSemana: Object.values(mapSemana),
      seriesVentasMes: Object.values(mapAnual),
      ventasPorCategoria: categoriaData.map((r) => ({
        cat: r.cat,
        hoy: Number(r.hoy || 0),
        ayer: Number(r.ayer || 0),
      })),
      topProductosMes,
      topVendidoHoy: topProductosMes,
      actividadReciente,
    });
  } catch (error) {
    console.error('Error obteniendo resumen de movimientos:', error);
    return res.status(500).json({ message: 'No se pudo obtener resumen de movimientos' });
  }
};
