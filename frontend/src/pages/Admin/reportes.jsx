import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
    CartesianGrid,
  Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    ResponsiveContainer,
} from "recharts";
import "../../styles/reportes.css";

// datos de prueba para las graficas
const ventasMensuales = [
  { mes: "Ene", ventas: 12000 },
  { mes: "Feb", ventas: 15000 },
  { mes: "Mar", ventas: 17000 },
  { mes: "Abr", ventas: 16000 },
  { mes: "May", ventas: 21000 },
  { mes: "Jun", ventas: 19000 },
];

const stockCategorias = [
  { name: "Deportivo", value: 39 },
  { name: "Casual", value: 28 },
  { name: "Formal", value: 16 },
  { name: "Niños", value: 18 },
];

const COLORES = ["#29b6d8", "#9b59b6", "#2ecc71", "#f39c12"];

function Reportes() {
  const [exportando, setExportando] = useState(false);

  const handleExportar = () => {
    setExportando(true);
    setTimeout(() => setExportando(false), 1500);
  };

  return (
    <div className="reportes-container">
      {/* header */}
      <div className="reportes-header">
        <div>
          <h1>Reportes de Inventario</h1>
          <p>Analiza el rendimiento y estado del inventario</p>
        </div>
        <button
          className={`btn-exportar ${exportando ? "exportando" : ""}`}
          onClick={handleExportar}
        >
          <span className="icono-exportar">↓</span>
          {exportando ? "Exportando..." : "Exportar Reporte"}
        </button>
      </div>

      {/* tarjetas de reportes */}
      <div className="tarjetas-grid">
        <TarjetaReporte
          titulo="Reporte de Ventas"
          descripcion="Análisis de ventas mensual"
        />
        <TarjetaReporte
          titulo="Productos Más Vendidos"
          descripcion="Top 10 productos del mes"
        />
        <TarjetaReporte
          titulo="Estado de Stock"
          descripcion="Inventario por categoría"
        />
      </div>

      {/* graficas */}
      <div className="graficas-grid">
        {/* grafica de barras */}
        <div className="grafica-card">
          <h3>Ventas por Mes</h3>
          <p className="grafica-subtitulo">Evolución de ventas en los últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ventasMensuales} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis dataKey="mes" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(val) => [`$${val.toLocaleString()}`, "Ventas"]}
              />
              <Bar dataKey="ventas" fill="#29b6d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* grafica de pie */}
        <div className="grafica-card">
          <h3>Stock por Categoría</h3>
          <p className="grafica-subtitulo">Distribución del inventario actual.</p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={stockCategorias}
                cx="50%"
                cy="45%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}%`}
                labelLine={true}
              >
                {stockCategorias.map((entry, index) => (
                  <Cell key={index} fill={COLORES[index % COLORES.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ paddingTop: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// componente chico para las tarjetas
function TarjetaReporte({ titulo, descripcion }) {
  const [generando, setGenerando] = useState(false);

  const handleGenerar = () => {
    setGenerando(true);
    setTimeout(() => setGenerando(false), 1200);
  };

  return (
    <div className="tarjeta-reporte">
      <div className="tarjeta-top">
        <span className="tarjeta-titulo">{titulo}</span>
        <span className="tarjeta-icono"></span>
      </div>
      <p className="tarjeta-desc">{descripcion}</p>
      <button className="btn-generar" onClick={handleGenerar}>
          {generando ? "Generando..." : "Generar Reporte"}
      </button>
    </div>
  );
}

export default Reportes;