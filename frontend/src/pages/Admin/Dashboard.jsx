import { useEffect, useMemo, useState } from 'react';
import '../../styles/dash.css';
import { getProductos } from '../../api/productos';
import { getResumenMovimientos } from '../../api/movimientos';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const VARIANT_STOCK_MAP_KEY = 'inventario_stock_variantes_map';
const ENTRADAS_LS_KEY = 'entradas_inventario';
const VENTAS_LS_KEY = 'ventas_punto_venta';
const LOW_STOCK_LIMIT = 30;

const readVariantStockMap = () => {
  try {
    const raw = localStorage.getItem(VARIANT_STOCK_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const readEntradasStorage = () => {
  try {
    const raw = localStorage.getItem(ENTRADAS_LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readVentasStorage = () => {
  try {
    const raw = localStorage.getItem(VENTAS_LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseDateSafe = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getEntradaUnidad = (item) => {
  const antes = Number(item?.stock_anterior);
  const despues = Number(item?.stock_nuevo);
  if (Number.isFinite(antes) && Number.isFinite(despues)) {
    const delta = Math.round(despues) - Math.round(antes);
    return delta > 0 ? delta : 0;
  }

  const cantidad = Number(item?.cantidad);
  if (Number.isFinite(cantidad)) return Math.max(0, Math.round(cantidad));

  const stock = Number(item?.stock);
  if (Number.isFinite(stock)) return Math.max(0, Math.round(stock));

  return 0;
};

const getSalidaUnidad = (detalleItem) => {
  const antes = Number(detalleItem?.stock_anterior);
  const despues = Number(detalleItem?.stock_nuevo);
  if (Number.isFinite(antes) && Number.isFinite(despues)) {
    return Math.abs(Math.round(despues) - Math.round(antes));
  }

  const cantidad = Number(detalleItem?.cantidad);
  if (Number.isFinite(cantidad)) return Math.abs(Math.round(cantidad));

  return 0;
};

const sumarEntradasPorRango = (entradas = [], inicio, finExclusivo) => {
  return entradas.reduce((acc, item) => {
    const fecha = parseDateSafe(item?.fecha_creacion || item?.created_at || item?.fechaCreacion);
    if (!fecha) return acc;
    if (fecha < inicio || fecha >= finExclusivo) return acc;
    return acc + getEntradaUnidad(item);
  }, 0);
};

const parseVentaFecha = (venta) => {
  const fechaBase = venta?.fecha || (venta?.created_at ? String(venta.created_at).slice(0, 10) : null);
  const horaBase = venta?.hora || (venta?.created_at
    ? new Date(venta.created_at).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : '00:00');

  const fecha = fechaBase ? `${fechaBase}T${horaBase}:00` : venta?.created_at;
  return parseDateSafe(fecha);
};

const sumarSalidasPorRango = (ventas = [], inicio, finExclusivo) => {
  let total = 0;

  ventas.forEach((venta) => {
    const fechaVenta = parseVentaFecha(venta);
    if (!fechaVenta) return;
    if (fechaVenta < inicio || fechaVenta >= finExclusivo) return;

    const detalle = Array.isArray(venta?.detalle) ? venta.detalle : [];
    detalle.forEach((item) => {
      total += getSalidaUnidad(item);
    });
  });

  return total;
};

const DashboardPage = () => {
  const [totalProductos, setTotalProductos] = useState(0);
  const [cambioTotalProductosMes, setCambioTotalProductosMes] = useState(0);
  const [modelosStockBajo, setModelosStockBajo] = useState([]);
  const [cambioModelosStockBajoMes, setCambioModelosStockBajoMes] = useState(0);
  const [entradasMes, setEntradasMes] = useState(0);
  const [cambioEntradasMes, setCambioEntradasMes] = useState(0);
  const [salidasMes, setSalidasMes] = useState(0);
  const [cambioSalidasMes, setCambioSalidasMes] = useState(0);
  const [movimientosData, setMovimientosData] = useState([]);
  const [topProductos, setTopProductos] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState('');
  const [mostrarAlertaLigera, setMostrarAlertaLigera] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(5);

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        const [{ data }, { data: resumen }] = await Promise.all([
          getProductos(),
          getResumenMovimientos(),
        ]);

        const productos = Array.isArray(data) ? data : [];
        const variantStockMap = readVariantStockMap();

        const totalStock = productos.reduce((acumulado, producto) => {
          const stock = Number(producto?.stock) || 0;
          return acumulado + stock;
        }, 0);

        const modelosBajos = productos
          .flatMap((producto) => {
            const stockProducto = Number(producto?.stock) || 0;
            const variantes = variantStockMap?.[producto?.id_producto];
            const entradasVariantes = variantes && typeof variantes === 'object'
              ? Object.entries(variantes)
              : [];

            if (entradasVariantes.length > 0) {
              const variantesBajas = entradasVariantes
                .map(([clave, valor]) => {
                  const stockVariante = Number(valor) || 0;
                  if (stockVariante > LOW_STOCK_LIMIT) return null;
                  const [talla, color] = String(clave).split('__');
                  return {
                    nombre: `${String(producto?.modelo || 'Modelo sin nombre')} (${talla || 'N/A'} / ${color || 'N/A'})`,
                    stock: stockVariante,
                  };
                })
                .filter(Boolean);

              return variantesBajas;
            }

            if (stockProducto <= LOW_STOCK_LIMIT) {
              return [{
                nombre: String(producto?.modelo || 'Modelo sin nombre'),
                stock: stockProducto,
              }];
            }

            return [];
          })
          .sort((a, b) => a.stock - b.stock);
        const totalModelosBajos = modelosBajos.length;

        const ahora = new Date();
        const mesActualKey = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
        const fechaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
        const mesAnteriorKey = `${fechaMesAnterior.getFullYear()}-${String(fechaMesAnterior.getMonth() + 1).padStart(2, '0')}`;

        const historialRaw = localStorage.getItem('dashboard_stock_mensual');
        const historial = historialRaw ? JSON.parse(historialRaw) : {};

        historial[mesActualKey] = totalStock;
        localStorage.setItem('dashboard_stock_mensual', JSON.stringify(historial));

        const totalMesAnterior = Number(historial[mesAnteriorKey] ?? 0);
        let variacionPorcentaje = 0;
        if (totalMesAnterior === 0) {
          variacionPorcentaje = totalStock > 0 ? 100 : 0;
        } else {
          variacionPorcentaje = ((totalStock - totalMesAnterior) / totalMesAnterior) * 100;
        }

        const historialStockBajoRaw = localStorage.getItem('dashboard_modelos_stock_bajo_mensual');
        const historialStockBajo = historialStockBajoRaw ? JSON.parse(historialStockBajoRaw) : {};
        historialStockBajo[mesActualKey] = totalModelosBajos;
        localStorage.setItem('dashboard_modelos_stock_bajo_mensual', JSON.stringify(historialStockBajo));

        const totalStockBajoMesAnterior = Number(historialStockBajo[mesAnteriorKey] ?? 0);
        let variacionStockBajo = 0;
        if (totalStockBajoMesAnterior === 0) {
          variacionStockBajo = totalModelosBajos > 0 ? 100 : 0;
        } else {
          variacionStockBajo = ((totalModelosBajos - totalStockBajoMesAnterior) / totalStockBajoMesAnterior) * 100;
        }

        setTotalProductos(totalStock);
        setCambioTotalProductosMes(variacionPorcentaje);
        setModelosStockBajo(modelosBajos);
        setCambioModelosStockBajoMes(variacionStockBajo);

        const entradasStorage = readEntradasStorage();
        const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const inicioSiguienteMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
        const inicioMesPrevio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

        const entradasMesActualStorage = sumarEntradasPorRango(entradasStorage, inicioMesActual, inicioSiguienteMes);
        const entradasMesAnteriorStorage = sumarEntradasPorRango(entradasStorage, inicioMesPrevio, inicioMesActual);

        const usarEntradasStorage = entradasStorage.length > 0;
        const entradasMesActual = usarEntradasStorage
          ? entradasMesActualStorage
          : Number(resumen?.mes?.entradasCantidad || 0);
        const entradasMesAnterior = usarEntradasStorage
          ? entradasMesAnteriorStorage
          : Number(resumen?.mesAnterior?.entradasCantidad || 0);

        let variacionEntradas = 0;
        if (entradasMesAnterior === 0) {
          variacionEntradas = entradasMesActual > 0 ? 100 : 0;
        } else {
          variacionEntradas = ((entradasMesActual - entradasMesAnterior) / entradasMesAnterior) * 100;
        }

        const ventasStorage = readVentasStorage();
        const salidasMesActualStorage = sumarSalidasPorRango(ventasStorage, inicioMesActual, inicioSiguienteMes);
        const salidasMesAnteriorStorage = sumarSalidasPorRango(ventasStorage, inicioMesPrevio, inicioMesActual);

        const usarSalidasStorage = ventasStorage.length > 0;
        const salidasMesActual = usarSalidasStorage
          ? salidasMesActualStorage
          : Number(resumen?.mes?.salidasCantidad || 0);
        const salidasMesAnterior = usarSalidasStorage
          ? salidasMesAnteriorStorage
          : Number(resumen?.mesAnterior?.salidasCantidad || 0);

        let variacionSalidas = 0;
        if (salidasMesAnterior === 0) {
          variacionSalidas = salidasMesActual > 0 ? 100 : 0;
        } else {
          variacionSalidas = ((salidasMesActual - salidasMesAnterior) / salidasMesAnterior) * 100;
        }

        const modelosValidos = new Set(
          productos
            .map((p) => String(p?.modelo || '').trim().toLowerCase())
            .filter(Boolean)
        );

        const stockPorModelo = productos.reduce((acumulado, producto) => {
          const clave = String(producto?.modelo || '').trim().toLowerCase();
          if (!clave) return acumulado;
          acumulado[clave] = Number(producto?.stock) || 0;
          return acumulado;
        }, {});

        const topOrdenado = (Array.isArray(resumen?.topProductosMes) ? resumen.topProductosMes : [])
          .map((item, idx) => ({
            ...item,
            pos: idx + 1,
            nombre: String(item?.nombre || '').trim(),
          }))
          .filter((item) => {
            const nombre = item.nombre.toLowerCase();
            if (!nombre) return false;
            if (!modelosValidos.has(nombre)) return false;
            if (item.nombre.length > 80) return false;
            if (/(.)\1{14,}/.test(item.nombre)) return false;
            return true;
          })
          .map((item) => ({
            ...item,
            stock: stockPorModelo[item.nombre.toLowerCase()] ?? null,
          }))
          .slice(0, 5);

        setEntradasMes(entradasMesActual);
        setCambioEntradasMes(variacionEntradas);
        setSalidasMes(salidasMesActual);
        setCambioSalidasMes(variacionSalidas);
        setMovimientosData(Array.isArray(resumen?.seriesInventario) ? resumen.seriesInventario : []);
        setTopProductos(topOrdenado);
        setUltimaActualizacion(new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        }));
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        setTotalProductos(0);
        setCambioTotalProductosMes(0);
        setModelosStockBajo([]);
        setCambioModelosStockBajoMes(0);
        setEntradasMes(0);
        setCambioEntradasMes(0);
        setSalidasMes(0);
        setCambioSalidasMes(0);
        setMovimientosData([]);
        setTopProductos([]);
        setUltimaActualizacion('Sin datos');
      }
    };

    const refrescarDashboard = () => cargarDashboard();
    cargarDashboard();

    window.addEventListener('storage', refrescarDashboard);
    window.addEventListener('focus', refrescarDashboard);
    window.addEventListener('ventas-pos-updated', refrescarDashboard);
    window.addEventListener('inventario-updated', refrescarDashboard);
    window.addEventListener('entradas-updated', refrescarDashboard);

    return () => {
      window.removeEventListener('storage', refrescarDashboard);
      window.removeEventListener('focus', refrescarDashboard);
      window.removeEventListener('ventas-pos-updated', refrescarDashboard);
      window.removeEventListener('inventario-updated', refrescarDashboard);
      window.removeEventListener('entradas-updated', refrescarDashboard);
    };
  }, []);

  const cambioTotalProductosFormateado = `${cambioTotalProductosMes >= 0 ? '+' : ''}${cambioTotalProductosMes.toFixed(1)}%`;
  const cambioEntradasFormateado = `${cambioEntradasMes >= 0 ? '+' : ''}${cambioEntradasMes.toFixed(1)}%`;
  const cambioSalidasFormateado = `${cambioSalidasMes >= 0 ? '+' : ''}${cambioSalidasMes.toFixed(1)}%`;
  const cambioStockBajoFormateado = `${cambioModelosStockBajoMes >= 0 ? '+' : ''}${cambioModelosStockBajoMes.toFixed(1)}%`;

  const tarjetas = useMemo(() => ([
    {
      titulo: 'Stock Total',
      valor: totalProductos.toLocaleString('es-MX'),
      cambio: cambioTotalProductosFormateado,
      positivo: cambioTotalProductosMes >= 0,
      color: 'azul',
      icono: <img src="/in-stock.png" alt="Stock total" width={18} height={18} />,
    },
    {
      titulo: 'Entradas del Mes',
      valor: entradasMes.toLocaleString('es-MX'),
      cambio: cambioEntradasFormateado,
      positivo: cambioEntradasMes >= 0,
      color: 'verde',
      icono: <img src="/punta-de-flecha-hacia-arriba.png" alt="Entradas" width={18} height={18} style={{ transform: 'rotate(180deg)' }} />,
    },
    {
      titulo: 'Salidas del Mes',
      valor: salidasMes.toLocaleString('es-MX'),
      cambio: cambioSalidasFormateado,
      positivo: cambioSalidasMes <= 0,
      color: 'naranja',
      icono: <img src="/punta-de-flecha-hacia-arriba.png" alt="Salidas" width={18} height={18} />,
      critico: cambioSalidasMes > 0,
    },
    {
      titulo: 'Stock Bajo',
      valor: modelosStockBajo.length.toLocaleString('es-MX'),
      cambio: cambioStockBajoFormateado,
      positivo: cambioModelosStockBajoMes <= 0,
      color: 'rojo',
      icono: <img src="/triangulo-de-precaucion.png" alt="Stock bajo" width={18} height={18} />,
      critico: false,
    },
  ]), [
    totalProductos,
    cambioTotalProductosMes,
    cambioTotalProductosFormateado,
    entradasMes,
    cambioEntradasMes,
    cambioEntradasFormateado,
    salidasMes,
    cambioSalidasMes,
    cambioSalidasFormateado,
    modelosStockBajo,
    cambioModelosStockBajoMes,
    cambioStockBajoFormateado,
  ]);

  const insight = useMemo(() => {
    const hayStockBajoCritico = modelosStockBajo.length >= 3;
    const salidasSubiendoFuerte = cambioSalidasMes > 15;
    const entradasDebiles = entradasMes === 0 || cambioEntradasMes < -10;

    if (hayStockBajoCritico && salidasSubiendoFuerte) {
      return {
        tipo: 'alerta',
        titulo: 'Ojo: hay señales de presión en inventario',
        texto: 'Subieron las salidas y ya hay varios modelos en stock bajo. Conviene meter reposición esta semana.',
      };
    }

    if (modelosStockBajo.length > 0) {
      return {
        tipo: 'warning',
        titulo: 'Atención',
        texto: `Tienes ${modelosStockBajo.length} modelo${modelosStockBajo.length === 1 ? '' : 's'} con stock bajo. Vale la pena revisarlos hoy.`,
      };
    }

    if (entradasDebiles) {
      return {
        tipo: 'warning',
        titulo: 'Movimiento tranquilo',
        texto: 'No hubo muchas entradas este periodo. Si vienen ventas fuertes, podrías quedarte corto.',
      };
    }

    return {
      tipo: 'ok',
      titulo: 'Todo en orden',
      texto: 'El inventario va estable y sin alertas fuertes. Buen ritmo para seguir operando normal.',
    };
  }, [modelosStockBajo, cambioSalidasMes, entradasMes, cambioEntradasMes]);

  useEffect(() => {
    if (insight.tipo !== 'warning') {
      setMostrarAlertaLigera(false);
      return;
    }

    setMostrarAlertaLigera(true);
    setSegundosRestantes(5);

    const intervalId = setInterval(() => {
      setSegundosRestantes((prev) => Math.max(0, prev - 1));
    }, 1000);

    const timeoutId = setTimeout(() => {
      setMostrarAlertaLigera(false);
      clearInterval(intervalId);
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [insight]);

  return (
    <div className="dashboard-container">

      {/* titulo de la pagina */}
      <header className="dash-header">
        <div>
          <h1 className="dashboard-title">Panel rápido del día</h1>
          <p className="dashboard-subtitle">Una vista clara para revisar cómo va la tienda sin complicarte.</p>
        </div>
        <div className="dash-update-pill">
          Última actualización: {ultimaActualizacion || 'Cargando...'}
        </div>
      </header>

      {insight.tipo !== 'warning' && (
        <section className={`dash-insight dash-insight-${insight.tipo}`}>
          <h3>{insight.titulo}</h3>
          <p>{insight.texto}</p>
        </section>
      )}

      {mostrarAlertaLigera && insight.tipo === 'warning' && (
        <aside className="dash-warning-float" role="status" aria-live="polite">
          <h3>{insight.titulo}</h3>
          <p>{insight.texto}</p>
          <span className="dash-warning-countdown">Se cierra en {segundosRestantes}s</span>
        </aside>
      )}

      {/* las 4 tarjetas de resumen */}
      <div className="dash-tarjetas">
        {tarjetas.map((t) => (
          <div className="dash-card" key={t.titulo}>

            {/* nombre de la tarjeta e icono */}
            <div className="dash-card-top">
              <span className="dash-card-titulo">{t.titulo}</span>
              <span className={`dash-card-icono dash-icono-${t.color}`}>{t.icono}</span>
            </div>

            {/* numero grande */}
            <div className="dash-card-valor">{t.valor}</div>

            {/* porcentaje o texto de estado */}
            {t.cambio && (
              <div className={`dash-card-cambio ${t.critico ? 'critico' : t.positivo ? 'positivo' : 'negativo'}`}>
                {t.cambio}
              </div>
            )}

          </div>
        ))}
      </div>

      {/* parte de abajo: grafica y top productos lado a lado */}
      <div className="dash-main">

        {/* grafica de barras */}
        <div className="dash-grafica-box">
          <h2 className="dash-section-title">Movimiento mensual</h2>
          <p className="dash-section-sub">Entradas y salidas de los últimos meses.</p>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={movimientosData} barSize={38}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 13 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 13 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(251,191,36,0.1)' }}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="valor" fill="#b06f2a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* lista del top 5 */}
        <div className="dash-top-box">
          <h2 className="dash-section-title">Lo más vendido</h2>
          <p className="dash-section-sub">Top 5 del mes según ventas reales registradas.</p>

          <ul className="dash-top-lista">
            {topProductos.length === 0 && (
              <li className="dash-top-empty">Aún no hay ventas registradas este mes.</li>
            )}
            {topProductos.map((p) => (
              <li className="dash-top-item" key={p.pos}>

                {/* numero de posicion */}
                <span className="dash-top-pos">{p.pos}</span>

                {/* nombre y stock */}
                <div className="dash-top-info">
                  <span className="dash-top-nombre">{p.nombre}</span>
                  <span className="dash-top-stock">Stock: {Number.isFinite(p.stock) ? p.stock : '—'}</span>
                </div>

                {/* ventas del mes */}
                <div className="dash-top-ventas">
                  <span className="dash-top-num">{p.ventas}</span>
                  <span className="dash-top-label">ventas</span>
                </div>

              </li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;