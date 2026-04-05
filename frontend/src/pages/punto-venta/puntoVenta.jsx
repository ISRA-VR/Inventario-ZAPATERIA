import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import "../../styles/styles-POS/puntoVenta.css";

const ventasSemana = [
  { dia: "Lun", ventas: 1200 },
  { dia: "Mar", ventas: 2100 },
  { dia: "Mié", ventas: 900 },
  { dia: "Jue", ventas: 3400 },
  { dia: "Vie", ventas: 4200 },
  { dia: "Sáb", ventas: 5800 },
  { dia: "Dom", ventas: 3100 },
];

const ventasMes = [
  { mes: "Ene", ventas: 18000 },
  { mes: "Feb", ventas: 22000 },
  { mes: "Mar", ventas: 19500 },
  { mes: "Abr", ventas: 27000 },
  { mes: "May", ventas: 31000 },
  { mes: "Jun", ventas: 28500 },
  { mes: "Jul", ventas: 24000 },
];

const ventasPorCategoria = [
  { cat: "Deportivo", hoy: 8, ayer: 5 },
  { cat: "Casual", hoy: 12, ayer: 9 },
  { cat: "Formal", hoy: 4, ayer: 6 },
  { cat: "Infantil", hoy: 6, ayer: 4 },
];

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
          <span className="pventa-badge">● En línea</span>
          <span className="pventa-date">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="pventa-kpis">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">💰</div>
          <div>
            <p className="kpi-label">Ventas hoy</p>
            <p className="kpi-value">$4,230.00</p>
            <p className="kpi-delta positive">↑ 18% vs ayer</p>
          </div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-icon">📈</div>
          <div>
            <p className="kpi-label">Ganancia actual</p>
            <p className="kpi-value">$1,692.00</p>
            <p className="kpi-delta positive">↑ 40% margen</p>
          </div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-icon">📅</div>
          <div>
            <p className="kpi-label">Ganancia del mes</p>
            <p className="kpi-value">$28,500.00</p>
            <p className="kpi-delta positive">↑ 12% vs mes ant.</p>
          </div>
        </div>
        <div className="kpi-card kpi-purple">
          <div className="kpi-icon">🛒</div>
          <div>
            <p className="kpi-label">Tickets hoy</p>
            <p className="kpi-value">37</p>
            <p className="kpi-delta positive">↑ 5 más que ayer</p>
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
              {[
                { nombre: "Nike Air Max 90", unid: 14, total: "$8,400" },
                { nombre: "Adidas Ultraboost", unid: 11, total: "$7,150" },
                { nombre: "Vans Old Skool", unid: 9, total: "$4,050" },
                { nombre: "Puma RS-X", unid: 6, total: "$3,300" },
                { nombre: "Converse Chuck 70", unid: 4, total: "$1,800" },
              ].map((p, i) => (
                <tr key={i}>
                  <td><span className="rank">{i + 1}</span></td>
                  <td>{p.nombre}</td>
                  <td><span className="unid-badge">{p.unid}</span></td>
                  <td><strong>{p.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actividad reciente */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Actividad reciente</h2>
          </div>
          <ul className="activity-list">
            {[
              { tipo: "venta", desc: "Nike Air Max x2", hora: "hace 3 min", monto: "+$1,200" },
              { tipo: "venta", desc: "Vans Old Skool x1", hora: "hace 11 min", monto: "+$450" },
              { tipo: "devolucion", desc: "Puma RS-X x1", hora: "hace 28 min", monto: "-$550" },
              { tipo: "venta", desc: "Adidas Ultraboost x3", hora: "hace 45 min", monto: "+$1,950" },
              { tipo: "venta", desc: "Converse Chuck x1", hora: "hace 1 hr", monto: "+$450" },
            ].map((a, i) => (
              <li key={i} className="activity-item">
                <span className={`activity-dot ${a.tipo}`} />
                <div className="activity-info">
                  <span className="activity-desc">{a.desc}</span>
                  <span className="activity-hora">{a.hora}</span>
                </div>
                <span className={`activity-monto ${a.tipo}`}>{a.monto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}