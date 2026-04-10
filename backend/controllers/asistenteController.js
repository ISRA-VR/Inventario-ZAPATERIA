import Producto from '../models/Producto.js';
import pool from '../config/db.js';

let movimientosTableReady = false;
const VARIANT_LOW_STOCK_LIMIT = 30;

const normalizarTexto = (texto = '') =>
  texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const formatearNumero = (valor) =>
  Number(valor || 0).toLocaleString('es-MX');

const formatearMoneda = (valor) =>
  `$${Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inicioDia = (fecha = new Date()) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const inicioMes = (fecha = new Date()) => new Date(fecha.getFullYear(), fecha.getMonth(), 1);

const parseFechaSegura = (valor) => {
  const date = new Date(valor);
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
  return parseFechaSegura(fecha);
};

const parseFechaEntrada = (entrada) =>
  parseFechaSegura(entrada?.fecha_creacion || entrada?.created_at || entrada?.fechaCreacion);

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
      source VARCHAR(30) NOT NULL DEFAULT 'widget',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fecha_evento (fecha_evento),
      INDEX idx_tipo_fecha (tipo, fecha_evento)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  movimientosTableReady = true;
};

const insertarMovimiento = async (movimiento) => {
  await pool.query(
    `INSERT IGNORE INTO asistente_movimientos
      (event_key, tipo, fecha_evento, modelo, categoria, cantidad, monto, registrado_por, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movimiento.event_key,
      movimiento.tipo,
      movimiento.fecha_evento,
      movimiento.modelo,
      movimiento.categoria,
      movimiento.cantidad,
      movimiento.monto,
      movimiento.registrado_por,
      movimiento.source,
    ]
  );
};

const sincronizarMovimientosCliente = async (clientEvents = {}) => {
  const entradas = Array.isArray(clientEvents?.entradas) ? clientEvents.entradas : [];
  const ventas = Array.isArray(clientEvents?.ventas) ? clientEvents.ventas : [];

  for (const entrada of entradas) {
    const fecha = parseFechaEntrada(entrada);
    if (!fecha) continue;

    const cantidad = Math.max(0, Math.round(Number(entrada?.cantidad ?? entrada?.stock ?? 0) || 0));
    if (cantidad <= 0) continue;

    const precio = Number(entrada?.precio || 0);
    const monto = Number.isFinite(precio) ? precio * cantidad : 0;
    const modelo = entrada?.modelo || 'Modelo sin nombre';
    const idBase = entrada?.registroId || entrada?.id_producto || modelo;
    const key = `entrada|${idBase}|${fecha.toISOString()}|${cantidad}`;

    await insertarMovimiento({
      event_key: key,
      tipo: 'entrada',
      fecha_evento: fecha,
      modelo,
      categoria: entrada?.nombre_categoria || null,
      cantidad,
      monto,
      registrado_por: entrada?.registrado_por || null,
      source: 'frontend',
    });
  }

  for (const venta of ventas) {
    const fechaVenta = parseFechaVenta(venta);
    if (!fechaVenta) continue;

    const detalle = Array.isArray(venta?.detalle) ? venta.detalle : [];
    for (let i = 0; i < detalle.length; i += 1) {
      const item = detalle[i];
      const cantidad = Math.max(0, Math.round(Number(item?.cantidad || 0) || 0));
      if (cantidad <= 0) continue;

      const precio = Number(item?.precio || 0);
      const monto = Number.isFinite(precio) ? precio * cantidad : 0;
      const modelo = item?.nombre || `Producto ${i + 1}`;
      const idVenta = venta?.id || venta?.folio || `${venta?.fecha || 'sin-fecha'}-${i}`;
      const key = `salida|${idVenta}|${i}|${fechaVenta.toISOString()}|${modelo}|${cantidad}`;

      await insertarMovimiento({
        event_key: key,
        tipo: 'salida',
        fecha_evento: fechaVenta,
        modelo,
        categoria: item?.categoria || null,
        cantidad,
        monto,
        registrado_por: venta?.registrado_por || null,
        source: 'frontend',
      });
    }
  }
};

const obtenerResumenMovimientos = async ({ desde, hasta }) => {
  const [rows] = await pool.query(
    `SELECT tipo, COALESCE(SUM(cantidad), 0) AS cantidad_total, COALESCE(SUM(monto), 0) AS monto_total
     FROM asistente_movimientos
     WHERE fecha_evento >= ? AND fecha_evento < ?
     GROUP BY tipo`,
    [desde, hasta]
  );

  const base = {
    entradasCantidad: 0,
    salidasCantidad: 0,
    entradasMonto: 0,
    salidasMonto: 0,
  };

  rows.forEach((r) => {
    if (r.tipo === 'entrada') {
      base.entradasCantidad = Number(r.cantidad_total || 0);
      base.entradasMonto = Number(r.monto_total || 0);
    }
    if (r.tipo === 'salida') {
      base.salidasCantidad = Number(r.cantidad_total || 0);
      base.salidasMonto = Number(r.monto_total || 0);
    }
  });

  return base;
};

const extraerRangoDesdePregunta = (pregunta = '') => {
  const q = normalizarTexto(pregunta);

  const regexIso = /(\d{4}-\d{2}-\d{2})\s*(?:a|al|hasta)\s*(\d{4}-\d{2}-\d{2})/;
  const mIso = q.match(regexIso);
  if (mIso) {
    const ini = parseFechaSegura(`${mIso[1]}T00:00:00`);
    const fin = parseFechaSegura(`${mIso[2]}T23:59:59`);
    if (ini && fin && ini <= fin) {
      return { desde: ini, hasta: new Date(fin.getTime() + 1000), etiqueta: `${mIso[1]} a ${mIso[2]}` };
    }
  }

  const regexLatam = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(?:a|al|hasta)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const mLatam = q.match(regexLatam);
  if (mLatam) {
    const y1 = mLatam[3].length === 2 ? `20${mLatam[3]}` : mLatam[3];
    const y2 = mLatam[6].length === 2 ? `20${mLatam[6]}` : mLatam[6];
    const iniTxt = `${y1}-${String(mLatam[2]).padStart(2, '0')}-${String(mLatam[1]).padStart(2, '0')}`;
    const finTxt = `${y2}-${String(mLatam[5]).padStart(2, '0')}-${String(mLatam[4]).padStart(2, '0')}`;
    const ini = parseFechaSegura(`${iniTxt}T00:00:00`);
    const fin = parseFechaSegura(`${finTxt}T23:59:59`);
    if (ini && fin && ini <= fin) {
      return { desde: ini, hasta: new Date(fin.getTime() + 1000), etiqueta: `${iniTxt} a ${finTxt}` };
    }
  }

  return null;
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const parseCsvList = (value = '') =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const isPlaceholderVariant = (talla, color) => {
  const t = String(talla || '').trim().toUpperCase();
  const c = String(color || '').trim().toUpperCase();
  return (!t || t === 'N/A') && (!c || c === 'N/A');
};

const construirResumenInventario = (productos = [], clientContext = {}) => {
  const snapshot = clientContext?.systemSnapshot || {};
  const variantStockMap = isPlainObject(snapshot?.stockVariantesMap) ? snapshot.stockVariantesMap : {};
  const colorMap = isPlainObject(snapshot?.coloresMap) ? snapshot.coloresMap : {};

  const stockTotal = productos.reduce((acc, p) => acc + (Number(p?.stock) || 0), 0);
  const stockBajo = productos
    .filter((p) => (Number(p?.stock) || 0) > 0 && (Number(p?.stock) || 0) <= 15)
    .sort((a, b) => (Number(a?.stock) || 0) - (Number(b?.stock) || 0));

  const stockBajoVariantes = [];

  productos.forEach((p) => {
    const idProducto = Number(p?.id_producto);
    const categoria = p?.nombre_categoria || 'Sin categoría';
    const modelo = p?.modelo || 'Modelo sin nombre';
    const tallas = parseCsvList(p?.tallas);
    const colores = Array.isArray(colorMap?.[idProducto]) ? colorMap[idProducto] : [];
    const varianteMapRaw = variantStockMap?.[idProducto] || variantStockMap?.[String(idProducto)];
    const varianteMap = isPlainObject(varianteMapRaw) ? varianteMapRaw : {};
    const keys = Object.keys(varianteMap);

    if (keys.length > 0) {
      keys.forEach((key) => {
        const [talla = 'N/A', color = 'N/A'] = String(key).split('__');
        if (isPlaceholderVariant(talla, color)) return;

        const stock = Math.max(0, Number(varianteMap[key]) || 0);
        if (stock > VARIANT_LOW_STOCK_LIMIT) return;

        stockBajoVariantes.push({
          id_producto: idProducto,
          modelo,
          categoria,
          talla,
          color,
          stock,
          agotado: stock === 0,
        });
      });
      return;
    }

    const stockModelo = Math.max(0, Number(p?.stock) || 0);
    if (stockModelo <= VARIANT_LOW_STOCK_LIMIT) {
      stockBajoVariantes.push({
        id_producto: idProducto,
        modelo,
        categoria,
        talla: tallas[0] || 'N/A',
        color: colores[0] || 'N/A',
        stock: stockModelo,
        agotado: stockModelo === 0,
      });
    }
  });

  stockBajoVariantes.sort((a, b) => {
    if (a.stock !== b.stock) return a.stock - b.stock;
    return String(a.modelo).localeCompare(String(b.modelo), 'es', { sensitivity: 'base' });
  });

  const porCategoria = productos.reduce((acc, p) => {
    const nombre = p?.nombre_categoria || 'Sin categoría';
    acc[nombre] = (acc[nombre] || 0) + (Number(p?.stock) || 0);
    return acc;
  }, {});

  const categoriasOrdenadas = Object.entries(porCategoria)
    .map(([nombre, stock]) => ({ nombre, stock }))
    .sort((a, b) => b.stock - a.stock);

  return {
    stockTotal,
    totalModelos: productos.length,
    stockBajo,
    stockBajoVariantes,
    categoriasOrdenadas,
  };
};

const construirResumenSistema = ({ categorias = [], usuarios = [] }) => {
  const totalCategorias = categorias.length;
  const categoriasSinStock = categorias.filter((c) => Number(c?.cantidad_productos || 0) <= 0).length;

  const totalUsuarios = usuarios.length;
  const totalAdmins = usuarios.filter((u) => u?.role === 'admin').length;
  const totalEmpleados = usuarios.filter((u) => u?.role === 'empleado').length;

  return {
    totalCategorias,
    categoriasSinStock,
    totalUsuarios,
    totalAdmins,
    totalEmpleados,
  };
};

const construirResumenOperativo = ({ productos = [], clientContext = {} }) => {
  const totalActivos = productos.filter((p) => String(p?.estado || 'activo').toLowerCase() === 'activo').length;
  const totalInactivos = productos.length - totalActivos;
  const modelosConTallas = productos.filter((p) => {
    const tallas = String(p?.tallas || '').trim();
    return tallas && tallas.toUpperCase() !== 'N/A';
  }).length;

  const liquidaciones = Array.isArray(clientContext?.systemSnapshot?.liquidaciones)
    ? clientContext.systemSnapshot.liquidaciones
    : [];

  const descuentos = clientContext?.systemSnapshot?.descuentosLiquidacion || {};
  const promedioDescuento = liquidaciones.length
    ? (liquidaciones.reduce((acc, id) => acc + (Number(descuentos[id] || 0) || 0), 0) / liquidaciones.length)
    : 0;

  return {
    totalActivos,
    totalInactivos,
    modelosConTallas,
    modelosEnLiquidacion: liquidaciones.length,
    descuentoPromedioLiquidacion: promedioDescuento,
    totalVariantesRegistradas: Number(clientContext?.systemSnapshot?.totalVariantesRegistradas || 0),
    totalMapeosColor: Number(clientContext?.systemSnapshot?.totalMapeosColor || 0),
  };
};

const responderAsistente = ({ pregunta, inventario, sistema, operativo, metricasCliente, metricasBD, userRole }) => {
  const q = normalizarTexto(pregunta);
  const esAdmin = userRole === 'admin';

  const entradasHoy = Number(metricasBD?.hoy?.entradasCantidad ?? metricasCliente?.entradasHoy ?? 0);
  const salidasHoy = Number(metricasBD?.hoy?.salidasCantidad ?? metricasCliente?.salidasHoy ?? 0);
  const ventasHoyMonto = Number(metricasBD?.hoy?.salidasMonto ?? metricasCliente?.ventasHoyMonto ?? 0);
  const entradasHoyMonto = Number(metricasBD?.hoy?.entradasMonto ?? 0);

  const construirReporteDelDia = () => ([
    'Reporte del día:',
    `- Stock total actual: ${formatearNumero(inventario.stockTotal)}`,
    `- Entradas de hoy: ${formatearNumero(entradasHoy)} unidades (${formatearMoneda(entradasHoyMonto)})`,
    `- Salidas de hoy: ${formatearNumero(salidasHoy)} unidades (${formatearMoneda(ventasHoyMonto)})`,
    `- Balance de unidades hoy (entradas - salidas): ${formatearNumero(entradasHoy - salidasHoy)}`,
    `- Modelos en liquidación activos: ${formatearNumero(operativo.modelosEnLiquidacion)}`,
  ].join('\n'));

  const sugerenciasBase = [
    'Muéstrame productos con stock bajo',
    'Resumen del día',
    '¿Qué categoría tiene más stock?',
    '¿Cuánto salió este mes?',
    'Resumen del sistema',
  ];

  if (!q.trim()) {
    return {
      answer: 'Puedo ayudarte con inventario, entradas y salidas. Escribe algo como: "resumen del día" o "stock bajo".',
      suggestions: sugerenciasBase,
    };
  }

  const topCategoria = inventario.categoriasOrdenadas[0];
  const topStockBajo = inventario.stockBajo.slice(0, 5);

  if (
    q.includes('reporte del dia')
    || q.includes('reporte de hoy')
    || q.includes('corte del dia')
    || q.includes('corte de hoy')
  ) {
    return {
      answer: construirReporteDelDia(),
      suggestions: ['Muéstrame productos con stock bajo', 'Resumen del sistema'],
    };
  }

  if (q.includes('stock bajo') || q.includes('bajo inventario') || q.includes('bajo')) {
    if (inventario.stockBajoVariantes.length === 0) {
      return {
        answer: `Todo bien por ahora: no hay variantes (talla/color) con stock bajo o agotado (umbral <= ${VARIANT_LOW_STOCK_LIMIT}).`,
        suggestions: ['Resumen del día', '¿Qué categoría tiene más stock?'],
      };
    }

    const totalVariantesBajas = inventario.stockBajoVariantes.length;
    const totalAgotadas = inventario.stockBajoVariantes.filter((v) => v.agotado).length;
    const titulo = totalVariantesBajas === 1
      ? 'Encontré 1 variante con stock bajo:'
      : `Encontré ${formatearNumero(totalVariantesBajas)} variantes con stock bajo:`;

    const lista = inventario.stockBajoVariantes
      .slice(0, 12)
      .map((v) => [
        `- Producto: ${v.modelo}`,
        `  Categoria: ${v.categoria}`,
        `  Variante: Talla ${v.talla} / Color ${v.color}`,
        `  Stock actual: ${formatearNumero(v.stock)}${v.agotado ? ' (agotado)' : ''}`,
      ].join('\n'))
      .join('\n');

    const resumen = [
      titulo,
      `- Agotadas: ${formatearNumero(totalAgotadas)}`,
      `- Stock bajo (pero con existencia): ${formatearNumero(totalVariantesBajas - totalAgotadas)}`,
      '',
      lista,
    ].join('\n');

    return {
      answer: resumen,
      suggestions: ['¿Qué categoría tiene más stock?', '¿Cuánto salió este mes?'],
    };
  }

  if (q.includes('categoria') && (q.includes('mas') || q.includes('top'))) {
    if (!topCategoria) {
      return {
        answer: 'Todavía no tengo categorías con stock para mostrar.',
        suggestions: sugerenciasBase,
      };
    }

    return {
      answer: `La categoría con más stock es ${topCategoria.nombre} con ${formatearNumero(topCategoria.stock)} unidades.` ,
      suggestions: ['Muéstrame productos con stock bajo', 'Resumen del día'],
    };
  }

  if (q.includes('categoria') || q.includes('categorias')) {
    return {
      answer: [
        `Actualmente hay ${formatearNumero(sistema.totalCategorias)} categorías registradas.`,
        `Categorías sin stock acumulado: ${formatearNumero(sistema.categoriasSinStock)}.`,
        topCategoria
          ? `La categoría con mayor stock es ${topCategoria.nombre} con ${formatearNumero(topCategoria.stock)} unidades.`
          : 'Aún no hay stock por categoría para comparar.',
      ].join('\n'),
      suggestions: ['Muéstrame productos con stock bajo', 'Resumen del sistema'],
    };
  }

  if (q.includes('empleado') || q.includes('usuarios') || q.includes('usuario') || q.includes('admin')) {
    if (!esAdmin) {
      return {
        answer: 'Ese dato está disponible solo para administradores. Si lo necesitas, pídele a un admin que consulte el resumen de usuarios.',
        suggestions: ['Resumen del día', 'Muéstrame productos con stock bajo'],
      };
    }

    return {
      answer: [
        'Resumen de usuarios del sistema:',
        `- Total de usuarios: ${formatearNumero(sistema.totalUsuarios)}`,
        `- Administradores: ${formatearNumero(sistema.totalAdmins)}`,
        `- Empleados: ${formatearNumero(sistema.totalEmpleados)}`,
      ].join('\n'),
      suggestions: ['Resumen del sistema', 'Resumen del día'],
    };
  }

  if (q.includes('resumen') || q.includes('hoy') || q.includes('dia')) {
    return {
      answer: construirReporteDelDia(),
      suggestions: ['Muéstrame productos con stock bajo', '¿Cuánto salió este mes?'],
    };
  }

  if (q.includes('salio') || q.includes('salidas') || q.includes('mes')) {
    const salidasMes = Number(metricasBD?.mes?.salidasCantidad ?? metricasCliente?.salidasMes ?? 0);
    const entradasMes = Number(metricasBD?.mes?.entradasCantidad ?? metricasCliente?.entradasMes ?? 0);

    return {
      answer: [
        'Corte mensual actual:',
        `- Entradas del mes: ${formatearNumero(entradasMes)}`,
        `- Salidas del mes: ${formatearNumero(salidasMes)}`,
        `- Balance neto (entradas - salidas): ${formatearNumero(entradasMes - salidasMes)}`,
      ].join('\n'),
      suggestions: ['Resumen del día', '¿Qué categoría tiene más stock?'],
    };
  }

  if (q.includes('rango') || q.includes('periodo') || q.includes('historial') || q.includes('reporte')) {
    if (!metricasBD?.rango) {
      return {
        answer: [
          construirReporteDelDia(),
          '',
          'Si quieres un rango específico, escribe algo como: "reporte del 2026-04-01 al 2026-04-05" o "historial del 01/04/2026 al 05/04/2026".',
        ].join('\n'),
        suggestions: ['Resumen del día', 'Salidas del mes'],
      };
    }

    return {
      answer: [
        `Historial para ${metricasBD.rangoEtiqueta}:`,
        `- Entradas: ${formatearNumero(metricasBD.rango.entradasCantidad)} unidades (${formatearMoneda(metricasBD.rango.entradasMonto)})`,
        `- Salidas: ${formatearNumero(metricasBD.rango.salidasCantidad)} unidades (${formatearMoneda(metricasBD.rango.salidasMonto)})`,
        `- Balance neto: ${formatearNumero(metricasBD.rango.entradasCantidad - metricasBD.rango.salidasCantidad)} unidades`,
      ].join('\n'),
      suggestions: ['Resumen del sistema', 'Muéstrame productos con stock bajo'],
    };
  }

  if (q.includes('resumen del sistema') || q.includes('sistema completo') || q.includes('todo el sistema') || q.includes('resumen general')) {
    const base = [
      'Resumen del sistema:',
      `- Modelos en inventario: ${formatearNumero(inventario.totalModelos)}`,
      `- Modelos activos: ${formatearNumero(operativo.totalActivos)}`,
      `- Modelos inactivos: ${formatearNumero(operativo.totalInactivos)}`,
      `- Stock total: ${formatearNumero(inventario.stockTotal)}`,
      `- Categorías registradas: ${formatearNumero(sistema.totalCategorias)}`,
      `- Modelos con stock bajo: ${formatearNumero(inventario.stockBajo.length)}`,
      `- Modelos con tallas configuradas: ${formatearNumero(operativo.modelosConTallas)}`,
      `- Modelos en liquidación: ${formatearNumero(operativo.modelosEnLiquidacion)}`,
      `- Variantes talla/color registradas: ${formatearNumero(operativo.totalVariantesRegistradas)}`,
      `- Entradas del mes: ${formatearNumero(metricasBD?.mes?.entradasCantidad ?? metricasCliente?.entradasMes ?? 0)}`,
      `- Salidas del mes: ${formatearNumero(metricasBD?.mes?.salidasCantidad ?? metricasCliente?.salidasMes ?? 0)}`,
    ];

    if (esAdmin) {
      base.push(`- Usuarios activos en sistema: ${formatearNumero(sistema.totalUsuarios)}`);
    }

    return {
      answer: base.join('\n'),
      suggestions: ['Muéstrame productos con stock bajo', '¿Qué categoría tiene más stock?'],
    };
  }

  if (q.includes('liquidacion') || q.includes('descuento') || q.includes('rebaja') || q.includes('oferta')) {
    return {
      answer: [
        'Estado de liquidaciones:',
        `- Modelos en liquidación: ${formatearNumero(operativo.modelosEnLiquidacion)}`,
        `- Descuento promedio aplicado: ${Number(operativo.descuentoPromedioLiquidacion || 0).toFixed(1)}%`,
      ].join('\n'),
      suggestions: ['Resumen del sistema', 'Resumen del día'],
    };
  }

  if (q.includes('caja') || q.includes('venta') || q.includes('punto de venta')) {
    const salidasHoy = Number(metricasBD?.hoy?.salidasCantidad ?? metricasCliente?.salidasHoy ?? 0);
    const ventasHoyMonto = Number(metricasBD?.hoy?.salidasMonto ?? metricasCliente?.ventasHoyMonto ?? 0);
    const salidasMes = Number(metricasBD?.mes?.salidasCantidad ?? metricasCliente?.salidasMes ?? 0);

    return {
      answer: [
        'Resumen de caja / punto de venta:',
        `- Unidades vendidas hoy: ${formatearNumero(salidasHoy)}`,
        `- Venta acumulada hoy: ${formatearMoneda(ventasHoyMonto)}`,
        `- Unidades vendidas en el mes: ${formatearNumero(salidasMes)}`,
        `- Modelos en liquidación activos: ${formatearNumero(operativo.modelosEnLiquidacion)}`,
      ].join('\n'),
      suggestions: ['Resumen del sistema', '¿Cuánto salió este mes?'],
    };
  }

  return {
    answer: [
      'Puedo ayudarte con preguntas de inventario y movimiento.',
      `Ahora mismo tienes ${formatearNumero(inventario.totalModelos)} modelos y ${formatearNumero(inventario.stockTotal)} unidades en stock total.`,
      'Prueba con: "stock bajo", "resumen del día" o "salidas del mes".',
    ].join('\n'),
    suggestions: sugerenciasBase,
  };
};

export const chatAsistente = async (req, res) => {
  try {
    const { question, clientMetrics, clientEvents, clientContext } = req.body || {};
    const role = req.user?.role || 'empleado';

    await ensureMovimientosTable();
    await sincronizarMovimientosCliente(clientEvents || {});

    const now = new Date();
    const inicioHoyDate = inicioDia(now);
    const inicioMananaDate = new Date(inicioHoyDate);
    inicioMananaDate.setDate(inicioMananaDate.getDate() + 1);
    const inicioMesDate = inicioMes(now);
    const inicioMesSiguienteDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const rangoPregunta = extraerRangoDesdePregunta(question || '');

    const [productos, categoriasRes, usuariosRes] = await Promise.all([
      Producto.findAll(),
      pool.query('SELECT c.id_categoria AS id_categoria, c.nombre_categoria AS nombre_categoria, COALESCE(SUM(p.stock), 0) AS cantidad_productos FROM categorias c LEFT JOIN productos p ON c.id_categoria = p.id_categoria GROUP BY c.id_categoria, c.nombre_categoria ORDER BY c.nombre_categoria ASC'),
      role === 'admin'
        ? pool.query('SELECT id, nombre, role FROM usuarios')
        : Promise.resolve([[]]),
    ]);

    const categorias = Array.isArray(categoriasRes?.[0]) ? categoriasRes[0] : [];
    const usuarios = Array.isArray(usuariosRes?.[0]) ? usuariosRes[0] : [];

    const [hoyBD, mesBD, rangoBD] = await Promise.all([
      obtenerResumenMovimientos({ desde: inicioHoyDate, hasta: inicioMananaDate }),
      obtenerResumenMovimientos({ desde: inicioMesDate, hasta: inicioMesSiguienteDate }),
      rangoPregunta
        ? obtenerResumenMovimientos({ desde: rangoPregunta.desde, hasta: rangoPregunta.hasta })
        : Promise.resolve(null),
    ]);

    const inventario = construirResumenInventario(Array.isArray(productos) ? productos : [], clientContext || {});
    const sistema = construirResumenSistema({ categorias, usuarios });
    const operativo = construirResumenOperativo({
      productos: Array.isArray(productos) ? productos : [],
      clientContext: clientContext || {},
    });

    const respuesta = responderAsistente({
      pregunta: question || '',
      inventario,
      sistema,
      operativo,
      metricasCliente: clientMetrics || {},
      metricasBD: {
        hoy: hoyBD,
        mes: mesBD,
        rango: rangoBD,
        rangoEtiqueta: rangoPregunta?.etiqueta,
      },
      userRole: role,
    });

    return res.json({
      answer: respuesta.answer,
      suggestions: respuesta.suggestions,
      snapshot: {
        stockTotal: inventario.stockTotal,
        totalModelos: inventario.totalModelos,
        stockBajo: inventario.stockBajo.length,
        categorias: sistema.totalCategorias,
        usuarios: sistema.totalUsuarios,
      },
    });
  } catch (error) {
    console.error('Error en asistente de inventario:', error);
    return res.status(500).json({ message: 'No se pudo generar respuesta del asistente' });
  }
};
