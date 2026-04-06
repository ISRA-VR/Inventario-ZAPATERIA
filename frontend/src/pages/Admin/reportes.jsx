import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getResumenMovimientos } from "../../api/movimientos";
import { getProductos } from "../../api/productos";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import '../../styles/reportes.css';

const COLORES = ["#29b6f6", "#26a69a", "#ffa726", "#ab47bc", "#ef5350", "#8d6e63"];

const money = (value) => `$${Number(value || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;

const toSignedAmount = (tipo, montoNumero) =>
  (tipo === "entrada" ? -1 : 1) * Number(montoNumero || 0);

export default function Reportes() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const fechaInicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [cargando, setCargando] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({
    desde: fechaInicioMes,
    hasta: fechaHoy,
  });

  const cargar = async (filtroActual) => {
    try {
      setCargando(true);
      const params = {};
      if (filtroActual?.desde) params.desde = filtroActual.desde;
      if (filtroActual?.hasta) params.hasta = filtroActual.hasta;

      const [{ data: resumenData }, { data: productosData }] = await Promise.all([
        getResumenMovimientos(params),
        getProductos(),
      ]);
      setResumen(resumenData || null);
      setProductos(Array.isArray(productosData) ? productosData : []);
    } catch (error) {
      console.error("Error cargando reportes:", error);
      toast.error("No se pudieron cargar los datos del reporte.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(filtros);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const aplicarFiltros = async () => {
    if (!filtros.desde || !filtros.hasta) {
      toast.warn("Selecciona fecha inicial y final para filtrar.");
      return;
    }

    if (new Date(filtros.desde) > new Date(filtros.hasta)) {
      toast.warn("La fecha inicial no puede ser mayor a la fecha final.");
      return;
    }

    await cargar(filtros);
    toast.success("Filtros aplicados correctamente.");
  };

  const limpiarFiltros = async () => {
    const base = { desde: fechaInicioMes, hasta: fechaHoy };
    setFiltros(base);
    await cargar(base);
  };

  const ventasPorMes = useMemo(() => {
    const data = Array.isArray(resumen?.seriesVentasMes) ? resumen.seriesVentasMes : [];
    return data.map((item) => ({ mes: item.mes, ventas: Number(item.ventas || 0) }));
  }, [resumen]);

  const stockCategoria = useMemo(() => {
    if (!productos.length) return [];

    const map = {};
    productos.forEach((p) => {
      const categoria = p.nombre_categoria || "Sin categoría";
      map[categoria] = (map[categoria] || 0) + (Number(p.stock) || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [productos]);

  const stockCategoriaAll = useMemo(() => {
    if (!productos.length) return [];

    const map = {};
    productos.forEach((p) => {
      const categoria = p.nombre_categoria || "Sin categoría";
      map[categoria] = (map[categoria] || 0) + (Number(p.stock) || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [productos]);

  const tarjetas = useMemo(() => {
    const top = Array.isArray(resumen?.topProductosMes) ? resumen.topProductosMes : [];
    return [
      {
        titulo: "Ventas del Mes",
        desc: money(resumen?.mes?.salidasMonto),
      },
      {
        titulo: "Entradas del Mes",
        desc: `${Number(resumen?.mes?.entradasCantidad || 0).toLocaleString("es-MX")} unidades`,
      },
      {
        titulo: "Top Producto",
        desc: top[0]?.nombre ? `${top[0].nombre} (${top[0].ventas} ventas)` : "Sin ventas registradas",
      },
    ];
  }, [resumen]);

  const exportarExcel = () => {
    if (!resumen) return;

    try {
      setExportandoExcel(true);
      const wb = XLSX.utils.book_new();

      const resumenRows = [
        { metrica: "Entradas hoy (cantidad)", valor: Number(resumen?.hoy?.entradasCantidad || 0) },
        { metrica: "Salidas hoy (cantidad)", valor: Number(resumen?.hoy?.salidasCantidad || 0) },
        { metrica: "Entradas hoy (monto)", valor: Number(resumen?.hoy?.entradasMonto || 0) },
        { metrica: "Salidas hoy (monto)", valor: Number(resumen?.hoy?.salidasMonto || 0) },
        { metrica: "Ventas del mes", valor: Number(resumen?.mes?.salidasMonto || 0) },
        { metrica: "Entradas del mes", valor: Number(resumen?.mes?.entradasMonto || 0) },
        { metrica: "Ganancia neta mes", valor: Number(resumen?.mes?.gananciaNeta || 0) },
      ];

      const topRows = (resumen?.topProductosMes || []).map((item) => ({
        posicion: item.pos,
        producto: item.nombre,
        ventas: Number(item.ventas || 0),
        total: Number(item.total || 0),
        stock_actual: Number(item.stock_actual || 0),
      }));

      const actividadRows = (resumen?.actividadReciente || []).map((item) => ({
        tipo: item.tipo,
        descripcion: item.desc,
        fecha: item.fecha_iso || item.hora,
        cantidad: Number(item.cantidad || 0),
        monto: toSignedAmount(item.tipo, item.monto_numero),
      }));

      const stockRows = stockCategoriaAll.map((item) => ({
        categoria: item.name,
        stock_total: Number(item.value || 0),
      }));

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), "Resumen");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), "Top Productos");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actividadRows), "Actividad");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockRows), "Stock Categoria");

      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `reporte-inventario-${fecha}.xlsx`);
      toast.success("Reporte Excel generado correctamente.");
    } catch (error) {
      console.error("Error exportando Excel:", error);
      toast.error("No se pudo exportar el Excel.");
    } finally {
      setExportandoExcel(false);
    }
  };

  const exportarPdf = () => {
    if (!resumen) return;

    try {
      setExportandoPdf(true);
      const doc = new jsPDF();
      const fecha = new Date().toLocaleString("es-MX");

      doc.setFontSize(16);
      doc.text("Reporte Ejecutivo de Inventario", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generado: ${fecha}`, 14, 21);

      autoTable(doc, {
        startY: 28,
        head: [["Indicador", "Valor"]],
        body: [
          ["Ventas del mes", money(resumen?.mes?.salidasMonto)],
          ["Entradas del mes", money(resumen?.mes?.entradasMonto)],
          ["Ganancia neta del mes", money(resumen?.mes?.gananciaNeta)],
          ["Salidas hoy", `${Number(resumen?.hoy?.salidasCantidad || 0)} unidades`],
          ["Entradas hoy", `${Number(resumen?.hoy?.entradasCantidad || 0)} unidades`],
        ],
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [["#", "Producto", "Ventas", "Total", "Stock"]],
        body: (resumen?.topProductosMes || []).map((item) => ([
          item.pos,
          item.nombre,
          Number(item.ventas || 0),
          money(item.total),
          Number(item.stock_actual || 0),
        ])),
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Categoría", "Stock"]],
        body: stockCategoriaAll.map((item) => ([item.name, Number(item.value || 0)])),
      });

      const nombre = `reporte-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nombre);
      toast.success("Reporte PDF generado correctamente.");
    } catch (error) {
      console.error("Error exportando PDF:", error);
      toast.error("No se pudo exportar el PDF.");
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div className="rep-page">

      <div className="rep-header">
        <div className="rep-header-texto">
          <h1>Reportes de Inventario</h1>
          <p>Analiza el rendimiento y estado del inventario</p>
        </div>
        <div className="rep-header-actions">
          <button
            className="btn-exportar"
            onClick={exportarExcel}
            disabled={cargando || exportandoExcel || !resumen}
          >
            {exportandoExcel ? "Generando Excel..." : "Exportar Excel"}
          </button>
          <button
            className="btn-exportar"
            onClick={exportarPdf}
            disabled={cargando || exportandoPdf || !resumen}
          >
            {exportandoPdf ? "Generando PDF..." : "Exportar PDF"}
          </button>
        </div>
      </div>

      <div className="rep-filtros">
        <div className="rep-filtro-item">
          <label>Desde</label>
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => setFiltros((prev) => ({ ...prev, desde: e.target.value }))}
          />
        </div>
        <div className="rep-filtro-item">
          <label>Hasta</label>
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => setFiltros((prev) => ({ ...prev, hasta: e.target.value }))}
          />
        </div>
        <button className="rep-filtro-btn" onClick={aplicarFiltros} disabled={cargando}>
          Aplicar filtro
        </button>
        <button className="rep-filtro-btn rep-filtro-btn-light" onClick={limpiarFiltros} disabled={cargando}>
          Reiniciar
        </button>
      </div>

      <div className="rep-cards">
        {tarjetas.map((t, i) => (
          <div className="rep-card" key={i}>
            <div className="rep-card-top">
              <span className="rep-card-titulo">{t.titulo}</span>
            </div>
            <p className="rep-card-desc">{t.desc}</p>
          </div>
        ))}
      </div>

      {cargando && <p className="rep-loading">Cargando datos reales de reportes...</p>}

      <div className="rep-graficos">
        <div className="grafico-card">
          <h2>Ventas por Mes</h2>
          <p>Evolución de ventas en los últimos 12 meses</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={ventasPorMes}
              margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 13, fill: "#777" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#777" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(v) => [`$${v.toLocaleString()}`, "Ventas"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="ventas" fill="#29b6f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grafico-card">
          <h2>Stock por Categoría</h2>
          <p>Distribución del inventario actual</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stockCategoria}
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 72 : 90}
                dataKey="value"
                label={isMobile ? false : ({ name, value, cx, x, y }) => (
                  <text
                    x={x}
                    y={y}
                    fill={COLORES[stockCategoria.findIndex((d) => d.name === name) % COLORES.length]}
                    textAnchor={x > cx ? "start" : "end"}
                    fontSize={12}
                  >
                    {name} {value}
                  </text>
                )}
              >
                {stockCategoria.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ paddingTop: isMobile ? 6 : 0 }}
                formatter={(v) => (
                  <span style={{ color: "#555", fontSize: 13 }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}