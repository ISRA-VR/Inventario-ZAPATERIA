import { useEffect, useMemo, useState } from 'react';
import '../../styles/dash.css';
import { getProductos } from '../../api/productos';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const movimientosData = [
  { mes: 'Ene', valor: 255 },
  { mes: 'Feb', valor: 275 },
  { mes: 'Mar', valor: 310 },
  { mes: 'Abr', valor: 265 },
  { mes: 'May', valor: 350 },
];

// los 5 productos que mas se vendieron este mes
const topProductos = [
  { pos: 1, nombre: 'Nike Air Max 270', stock: 145, ventas: 89 },
  { pos: 2, nombre: 'Adidas Ultraboost', stock: 98, ventas: 76 },
  { pos: 3, nombre: 'Puma RS-X', stock: 67, ventas: 65 },
  { pos: 4, nombre: 'Reebok Classic', stock: 45, ventas: 52 },
  { pos: 5, nombre: 'New Balance 574', stock: 23, ventas: 48 },
];

const DashboardPage = () => {
  const [totalProductos, setTotalProductos] = useState(0);
  const [cambioTotalProductosMes, setCambioTotalProductosMes] = useState(0);
  const [categoriasStockBajo, setCategoriasStockBajo] = useState([]);
  const [cambioCategoriasStockBajoMes, setCambioCategoriasStockBajoMes] = useState(0);
  const [entradasMes, setEntradasMes] = useState(0);
  const [cambioEntradasMes, setCambioEntradasMes] = useState(0);

  useEffect(() => {
    const cargarTotalProductos = async () => {
      try {
        const { data } = await getProductos();
        const totalStock = Array.isArray(data)
          ? data.reduce((acumulado, producto) => {
              const stock = Number(producto?.stock) || 0;
              return acumulado + stock;
            }, 0)
          : 0;

        const stockPorCategoria = Array.isArray(data)
          ? data.reduce((acumulado, producto) => {
              const nombreCategoria = producto?.nombre_categoria || 'Sin categoría';
              const stock = Number(producto?.stock) || 0;
              acumulado[nombreCategoria] = (acumulado[nombreCategoria] || 0) + stock;
              return acumulado;
            }, {})
          : {};

        const categoriasBajas = Object.entries(stockPorCategoria)
          .filter(([, stock]) => stock <= 40)
          .map(([nombre, stock]) => ({ nombre, stock }))
          .sort((a, b) => a.stock - b.stock);
        const totalCategoriasBajas = categoriasBajas.length;

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

        const historialStockBajoRaw = localStorage.getItem('dashboard_categorias_stock_bajo_mensual');
        const historialStockBajo = historialStockBajoRaw ? JSON.parse(historialStockBajoRaw) : {};
        historialStockBajo[mesActualKey] = totalCategoriasBajas;
        localStorage.setItem('dashboard_categorias_stock_bajo_mensual', JSON.stringify(historialStockBajo));

        const totalStockBajoMesAnterior = Number(historialStockBajo[mesAnteriorKey] ?? 0);
        let variacionStockBajo = 0;
        if (totalStockBajoMesAnterior === 0) {
          variacionStockBajo = totalCategoriasBajas > 0 ? 100 : 0;
        } else {
          variacionStockBajo = ((totalCategoriasBajas - totalStockBajoMesAnterior) / totalStockBajoMesAnterior) * 100;
        }

        setTotalProductos(totalStock);
        setCambioTotalProductosMes(variacionPorcentaje);
        setCategoriasStockBajo(categoriasBajas);
        setCambioCategoriasStockBajoMes(variacionStockBajo);
      } catch (error) {
        console.error('Error al cargar productos del dashboard:', error);
        setTotalProductos(0);
        setCambioTotalProductosMes(0);
        setCategoriasStockBajo([]);
        setCambioCategoriasStockBajoMes(0);
      }
    };

    const cargarEntradasMes = () => {
      try {
        const guardado = localStorage.getItem('entradas_inventario');
        const entradas = guardado ? JSON.parse(guardado) : [];
        const ahora = new Date();
        const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const inicioMesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
        const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

        const totalMesActual = entradas.filter((item) => {
          const fechaRaw = item?.fecha_creacion || item?.created_at || item?.fechaCreacion;
          const fecha = new Date(fechaRaw);
          if (Number.isNaN(fecha.getTime())) return false;
          return fecha >= inicioMesActual && fecha < inicioMesSiguiente;
        }).length;

        const totalMesAnterior = entradas.filter((item) => {
          const fechaRaw = item?.fecha_creacion || item?.created_at || item?.fechaCreacion;
          const fecha = new Date(fechaRaw);
          if (Number.isNaN(fecha.getTime())) return false;
          return fecha >= inicioMesAnterior && fecha < inicioMesActual;
        }).length;

        let variacionPorcentaje = 0;
        if (totalMesAnterior === 0) {
          variacionPorcentaje = totalMesActual > 0 ? 100 : 0;
        } else {
          variacionPorcentaje = ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100;
        }

        setEntradasMes(totalMesActual);
        setCambioEntradasMes(variacionPorcentaje);
      } catch (error) {
        console.error('Error al leer entradas del mes en dashboard:', error);
        setEntradasMes(0);
        setCambioEntradasMes(0);
      }
    };

    cargarTotalProductos();
    cargarEntradasMes();
  }, []);

  const cambioTotalProductosFormateado = `${cambioTotalProductosMes >= 0 ? '+' : ''}${cambioTotalProductosMes.toFixed(1)}%`;
  const cambioEntradasFormateado = `${cambioEntradasMes >= 0 ? '+' : ''}${cambioEntradasMes.toFixed(1)}%`;
  const cambioStockBajoFormateado = `${cambioCategoriasStockBajoMes >= 0 ? '+' : ''}${cambioCategoriasStockBajoMes.toFixed(1)}%`;

  const tarjetas = useMemo(() => ([
    {
      titulo: 'Productos Totales',
      valor: totalProductos.toLocaleString('es-MX'),
      cambio: cambioTotalProductosFormateado,
      positivo: cambioTotalProductosMes >= 0,
      color: 'azul',
      icono: '📦',
    },
    {
      titulo: 'Entradas del Mes',
      valor: entradasMes.toLocaleString('es-MX'),
      cambio: cambioEntradasFormateado,
      positivo: cambioEntradasMes >= 0,
      color: 'verde',
      icono: '📈',
    },
    {
      titulo: 'Salidas del Mes',
      valor: '289',
      cambio: '-3.1%',
      positivo: false,
      color: 'naranja',
      icono: '📉',
    },
    {
      titulo: 'Stock Bajo',
      valor: categoriasStockBajo.length.toLocaleString('es-MX'),
      cambio: cambioStockBajoFormateado,
      positivo: cambioCategoriasStockBajoMes <= 0,
      color: 'rojo',
      icono: '⚠️',
      critico: false,
    },
  ]), [
    totalProductos,
    cambioTotalProductosMes,
    cambioTotalProductosFormateado,
    entradasMes,
    cambioEntradasMes,
    cambioEntradasFormateado,
    categoriasStockBajo,
    cambioCategoriasStockBajoMes,
    cambioStockBajoFormateado,
  ]);

  return (
    <div className="dashboard-container">

      {/* titulo de la pagina */}
      <header className="dash-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Resumen general del inventario</p>
      </header>

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
          <h2 className="dash-section-title">Movimientos de Inventario</h2>
          <p className="dash-section-sub">Últimos 5 meses</p>

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
                domain={[0, 400]}
                ticks={[0, 90, 180, 270, 360]}
              />
              <Tooltip
                cursor={{ fill: 'rgba(251,191,36,0.1)' }}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                }}
              />
              {/* barras en color amarillo/dorado */}
              <Bar dataKey="valor" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* lista del top 5 */}
        <div className="dash-top-box">
          <h2 className="dash-section-title">Productos Más Vendidos</h2>
          <p className="dash-section-sub">Top 5 del mes</p>

          <ul className="dash-top-lista">
            {topProductos.map((p) => (
              <li className="dash-top-item" key={p.pos}>

                {/* numero de posicion */}
                <span className="dash-top-pos">{p.pos}</span>

                {/* nombre y stock */}
                <div className="dash-top-info">
                  <span className="dash-top-nombre">{p.nombre}</span>
                  <span className="dash-top-stock">Stock: {p.stock}</span>
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