import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { CircleCheck, DollarSign, TrendingUp, CalendarDays } from "lucide-react";
import { getResumenMovimientos } from "../../api/movimientos";
import "../../styles/styles-POS/puntoVenta.css";

const EMPTY_RESUMEN = {
  hoy: { salidasMonto: 0, gananciaNeta: 0 },
  ayer: { salidasMonto: 0 },
  mes: { gananciaNeta: 0 },
  seriesVentasSemana: [],
  seriesVentasMes: [],
  ventasPorCategoria: [],
  topVendidoHoy: [],
  actividadReciente: [],
};

const nombreValido = (value) => {
  const txt = String(value || "").trim();
  if (!txt || txt.length > 80) return false;
  if (/(.)\1{14,}/.test(txt)) return false;
  return true;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>${p.value.toLocaleString()}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PuntoDeVenta() {
  const [periodo, setPeriodo] = useState("semana");
  const [resumen, setResumen] = useState(EMPTY_RESUMEN);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data: resumenMov } = await getResumenMovimientos();
        setResumen(resumenMov || EMPTY_RESUMEN);
      } catch (error) {
        console.error("Error cargando productos para punto de venta:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();

    const refrescar = () => cargarDatos();
    window.addEventListener("storage", refrescar);
    window.addEventListener("focus", refrescar);
    window.addEventListener("ventas-pos-updated", refrescar);

    return () => {
      window.removeEventListener("storage", refrescar);
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("ventas-pos-updated", refrescar);
    };
  }, []);

  const totalVentasHoy = Number(resumen?.hoy?.salidasMonto || 0);
  const totalVentasAyer = Number(resumen?.ayer?.salidasMonto || 0);
  const ingresosHoy = Number(resumen?.hoy?.salidasMonto || 0);
  const ingresosMes = Number(resumen?.mes?.salidasMonto || 0);

  const variacionVsAyer = totalVentasAyer === 0
    ? (totalVentasHoy > 0 ? 100 : 0)
    : ((totalVentasHoy - totalVentasAyer) / totalVentasAyer) * 100;

  const ventasSemana = useMemo(() => (
    Array.isArray(resumen?.seriesVentasSemana) ? resumen.seriesVentasSemana : []
  ), [resumen]);

  const ventasMes = useMemo(() => (
    Array.isArray(resumen?.seriesVentasMes) ? resumen.seriesVentasMes : []
  ), [resumen]);

  const ventasPorCategoria = useMemo(() => {
    const base = Array.isArray(resumen?.ventasPorCategoria) ? resumen.ventasPorCategoria : [];
    return base.map((item) => ({
      cat: nombreValido(item.cat) ? item.cat : "Sin categoría",
      hoy: Number(item.hoy || 0),
      ayer: Number(item.ayer || 0),
    }));
  }, [resumen]);

  const topVendidoHoy = useMemo(() => {
    const base = Array.isArray(resumen?.topVendidoHoy) ? resumen.topVendidoHoy : [];
    return base.map((item) => ({
      nombre: item.nombre,
      unid: Number(item.ventas || 0),
      total: Number(item.total || 0),
    }))
      .filter((item) => nombreValido(item.nombre) && item.unid > 0)
      .slice(0, 5);
  }, [resumen]);

  const actividadReciente = useMemo(() => {
    const base = Array.isArray(resumen?.actividadReciente) ? resumen.actividadReciente : [];
    return base.map((item) => ({
      ...item,
      desc: nombreValido(item?.desc) ? item.desc : "Movimiento reciente",
    }));
  }, [resumen]);

  return (
    <div className="pventa-wrapper">
      <header className="pventa-header">
        <div className="pventa-header-left">
          <div className="pventa-logo">
            <span>B</span>
          </div>
          <div>
            <h1 className="pventa-title">Punto de Venta</h1>
            <p className="pventa-subtitle">Resumen de la actividad de hoy</p>
          </div>
        </div>
        <div className="pventa-header-right">
          <span className="pventa-badge"><CircleCheck size={12} /> En línea</span>
          <span className="pventa-date">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="pventa-kpis">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon"><DollarSign size={24} /></div>
          <div>
            <p className="kpi-label">Ventas hoy</p>
            <p className="kpi-value">${totalVentasHoy.toLocaleString("es-MX")}</p>
            <p className={`kpi-delta ${variacionVsAyer >= 0 ? "positive" : "negative"}`}>
              {variacionVsAyer >= 0 ? "↑" : "↓"} {Math.abs(variacionVsAyer).toFixed(1)}% vs ayer
            </p>
          </div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-icon"><TrendingUp size={24} /></div>
          <div>
            <p className="kpi-label">Ingresos hoy</p>
            <p className="kpi-value">${ingresosHoy.toLocaleString("es-MX")}</p>
            <p className="kpi-delta positive">
              Basado en ventas registradas del día
            </p>
          </div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-icon"><CalendarDays size={24} /></div>
          <div>
            <p className="kpi-label">Ingresos del mes</p>
            <p className="kpi-value">${ingresosMes.toLocaleString("es-MX")}</p>
            <p className="kpi-delta positive">
              Basado en ventas persistidas
            </p>
          </div>
        </div>
      </div>

      {/* Graficas principales */}
      <div className="pventa-grid-main">
        {/* Ventas semana/mes con toggle */}
        <div className="chart-card chart-large">
          <div className="chart-header">
            <h2 className="chart-title">
              Ventas de la {periodo === "semana" ? "semana" : "mes"}
            </h2>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${periodo === "semana" ? "active" : ""}`}
                onClick={() => setPeriodo("semana")}
              >
                Semana
              </button>
              <button
                className={`toggle-btn ${periodo === "mes" ? "active" : ""}`}
                onClick={() => setPeriodo("mes")}
              >
                Mes
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={periodo === "semana" ? ventasSemana : ventasMes}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={periodo === "semana" ? "dia" : "mes"}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="ventas"
                name="Ventas"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#colorVentas)"
                dot={{ r: 4, fill: "#3b82f6" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Segunda fila */}
      <div className="pventa-grid-second">
        {/* Ventas por categoría */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Ventas por categoría</h2>
            <span className="chart-sub">Hoy vs Ayer</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ventasPorCategoria} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="cat" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="hoy" name="Hoy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ayer" name="Ayer" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lo más vendido tabla */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Lo más vendido hoy</h2>
          </div>
          <table className="ventas-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Unid.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {topVendidoHoy.map((p, i) => (
                <tr key={i}>
                  <td><span className="rank">{i + 1}</span></td>
                  <td>{p.nombre}</td>
                  <td><span className="unid-badge">{p.unid}</span></td>
                  <td><strong>${p.total.toLocaleString("es-MX")}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          {topVendidoHoy.length === 0 && <p className="chart-sub">Sin ventas registradas hoy</p>}
        </div>

        {/* Actividad reciente */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Actividad reciente</h2>
          </div>
          <ul className="activity-list">
            {actividadReciente.map((a, i) => (
              <li key={i} className="activity-item">
                <span className={`activity-dot ${a.tipo === "entrada" ? "entrada" : "venta"}`} />
                <div className="activity-info">
                  <span className="activity-desc">{a.desc}</span>
                  <span className="activity-hora">{a.hora}</span>
                </div>
                <span className={`activity-monto ${a.tipo === "entrada" ? "entrada" : "venta"}`}>{a.monto}</span>
              </li>
            ))}
          </ul>
          {actividadReciente.length === 0 && <p className="chart-sub">Aún no hay actividad de ventas</p>}
        </div>
      </div>
      {cargando && <p className="chart-sub">Cargando datos de inventario...</p>}
    </div>
  );
}