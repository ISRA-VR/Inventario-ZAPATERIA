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
const REPORTE_SNAPSHOTS_KEY = "reportes_periodos_snapshots";
const ENTRADAS_LS_KEY = "entradas_inventario";
const VENTAS_LS_KEY = "ventas_punto_venta";

const money = (value) => `$${Number(value || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;

const toSignedAmount = (tipo, montoNumero) =>
  (tipo === "entrada" ? -1 : 1) * Number(montoNumero || 0);

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
    return Math.abs(Math.round(despues) - Math.round(antes));
  }

  const cantidad = Number(item?.cantidad);
  if (Number.isFinite(cantidad)) return Math.abs(Math.round(cantidad));

  const stock = Number(item?.stock);
  if (Number.isFinite(stock)) return Math.abs(Math.round(stock));

  return 0;
};

const getEntradaMonto = (item) => getEntradaUnidad(item) * (Number(item?.precio) || 0);

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

const getSalidaMonto = (detalleItem) => getSalidaUnidad(detalleItem) * (Number(detalleItem?.precio) || 0);

const parseVentaFecha = (venta) => {
  const fechaBase = venta?.fecha || (venta?.created_at ? String(venta.created_at).slice(0, 10) : null);
  const horaBase = venta?.hora || (venta?.created_at
    ? new Date(venta.created_at).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    : "00:00");

  const fecha = fechaBase ? `${fechaBase}T${horaBase}:00` : venta?.created_at;
  return parseDateSafe(fecha);
};

const getRangoPeriodo = (periodoActivo, filtros) => {
  if (!filtros?.desde) return null;

  const desde = parseDateSafe(`${filtros.desde}T00:00:00`);
  if (!desde) return null;

  const hastaBase = periodoActivo === "dia"
    ? parseDateSafe(`${filtros.desde}T00:00:00`)
    : parseDateSafe(`${(filtros.hasta || filtros.desde)}T00:00:00`);

  if (!hastaBase) return null;

  const finExclusivo = new Date(hastaBase);
  finExclusivo.setDate(finExclusivo.getDate() + 1);

  return {
    inicio: desde,
    finExclusivo,
  };
};

const readSnapshots = () => {
  try {
    const raw = localStorage.getItem(REPORTE_SNAPSHOTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveSnapshot = ({ periodo, desde, hasta, resumenData }) => {
  if (!resumenData) return;

  const top = Array.isArray(resumenData?.topProductosMes) ? resumenData.topProductosMes : [];
  const key = `${periodo}|${desde}|${hasta}`;
  const snap = {
    periodo,
    desde,
    hasta,
    ventasMonto: Number(resumenData?.mes?.salidasMonto || 0),
    entradasCantidad: Number(resumenData?.mes?.entradasCantidad || 0),
    topProducto: top[0]?.nombre || null,
    topVentas: Number(top[0]?.ventas || 0),
    createdAt: new Date().toISOString(),
  };

  const current = readSnapshots();
  current[key] = snap;
  localStorage.setItem(REPORTE_SNAPSHOTS_KEY, JSON.stringify(current));
};

export default function Reportes() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const fechaInicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [cargando, setCargando] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [mostrarModalPeriodo, setMostrarModalPeriodo] = useState(false);
  const [periodoActivo, setPeriodoActivo] = useState("mes");
  const [resumen, setResumen] = useState(null);
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({
    desde: fechaInicioMes,
    hasta: fechaHoy,
  });

  const cargar = async (filtroActual, periodo = "mes") => {
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

      if (filtroActual?.desde && filtroActual?.hasta) {
        saveSnapshot({
          periodo,
          desde: filtroActual.desde,
          hasta: filtroActual.hasta,
          resumenData,
        });
      }

      return resumenData;
    } catch (error) {
      console.error("Error cargando reportes:", error);
      toast.error("No se pudieron cargar los datos del reporte.");
      return null;
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(filtros, "mes");
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

    const filtrosEfectivos =
      periodoActivo === "dia"
        ? { ...filtros, hasta: filtros.desde }
        : filtros;

    if (periodoActivo === "dia" && filtros.hasta !== filtros.desde) {
      setFiltros((prev) => ({ ...prev, hasta: prev.desde }));
    }

    const hoy = new Date();
    const hoyLimite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    const fechaDesde = new Date(`${filtrosEfectivos.desde}T00:00:00`);
    const fechaHasta = new Date(`${filtrosEfectivos.hasta}T00:00:00`);

    if (fechaDesde > hoyLimite || fechaHasta > hoyLimite) {
      toast.warn("No se puede generar reporte con fechas futuras.");
      return;
    }

    if (new Date(filtrosEfectivos.desde) > new Date(filtrosEfectivos.hasta)) {
      toast.warn("La fecha inicial no puede ser mayor a la fecha final.");
      return;
    }

    const periodoPersistente = ["dia", "semana", "mes"].includes(periodoActivo)
      ? periodoActivo
      : "personalizado";

    await cargar(filtrosEfectivos, periodoPersistente);
    setPeriodoActivo(periodoPersistente);
    toast.success("Filtros aplicados correctamente.");
  };

  const limpiarFiltros = async () => {
    const filtrosPrevios = { ...filtros };
    const periodoPrevio = periodoActivo;
    const base = { desde: fechaInicioMes, hasta: fechaHoy };

    if (
      filtrosPrevios.desde === base.desde &&
      filtrosPrevios.hasta === base.hasta &&
      periodoPrevio === "mes"
    ) {
      return;
    }

    setFiltros(base);
    await cargar(base, "mes");
    setPeriodoActivo("mes");

    toast.info(
      ({ closeToast }) => (
        <div className="undo-toast-row">
          <span className="undo-toast-text">Filtros reiniciados.</span>
          <button
            type="button"
            onClick={async () => {
              const restaurados = periodoPrevio === "dia"
                ? { ...filtrosPrevios, hasta: filtrosPrevios.desde }
                : filtrosPrevios;
              setFiltros(restaurados);
              setPeriodoActivo(periodoPrevio);
              await cargar(restaurados, periodoPrevio);
              closeToast?.();
            }}
            className="undo-toast-btn"
          >
            Deshacer
          </button>
        </div>
      ),
      { autoClose: 3000 }
    );
  };

  const etiquetaPeriodo = useMemo(() => {
    if (periodoActivo === "dia") return "del Dia";
    if (periodoActivo === "semana") return "de la Semana";
    if (periodoActivo === "mes") return "del Mes";
    return "del Periodo";
  }, [periodoActivo]);

  const etiquetaPeriodoLarga = useMemo(() => {
    if (periodoActivo === "dia") return "Dia";
    if (periodoActivo === "semana") return "Semana";
    if (periodoActivo === "mes") return "Mes";
    return "Personalizado";
  }, [periodoActivo]);

  const toDateInput = (date) => {
    const anio = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  };

  const aplicarPeriodo = async (tipo) => {
    const hoy = new Date();
    let hasta = new Date(hoy);
    let desde = new Date(hoy);

    if (tipo === "semana") {
      const diaSemana = (hoy.getDay() + 6) % 7;
      desde.setDate(hoy.getDate() - diaSemana);
      hasta = new Date(desde);
      hasta.setDate(desde.getDate() + 6);
    } else if (tipo === "mes") {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }

    const hoyLimite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    if (hasta > hoyLimite) {
      hasta = new Date(hoyLimite);
    }

    if (desde > hoyLimite) {
      toast.warn("No se puede generar reporte con fechas futuras.");
      return;
    }

    const base = { desde: toDateInput(desde), hasta: toDateInput(hasta) };
    setFiltros(base);
    await cargar(base, tipo);
    setPeriodoActivo(tipo);
    setMostrarModalPeriodo(false);
    toast.success("Periodo aplicado correctamente.");
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

  const entradasPeriodo = useMemo(() => {
    const entradas = readEntradasStorage();
    const rango = getRangoPeriodo(periodoActivo, filtros);

    if (!rango) {
      return {
        hayDatosLocales: entradas.length > 0,
        cantidad: 0,
        monto: 0,
      };
    }

    const cantidad = entradas.reduce((acc, item) => {
      const fecha = parseDateSafe(item?.fecha_creacion || item?.created_at || item?.fechaCreacion);
      if (!fecha) return acc;
      if (fecha < rango.inicio || fecha >= rango.finExclusivo) return acc;
      return acc + getEntradaUnidad(item);
    }, 0);

    const monto = entradas.reduce((acc, item) => {
      const fecha = parseDateSafe(item?.fecha_creacion || item?.created_at || item?.fechaCreacion);
      if (!fecha) return acc;
      if (fecha < rango.inicio || fecha >= rango.finExclusivo) return acc;
      return acc + getEntradaMonto(item);
    }, 0);

    return {
      hayDatosLocales: entradas.length > 0,
      cantidad,
      monto,
    };
  }, [periodoActivo, filtros]);

  const entradasCantidadPeriodo = entradasPeriodo.hayDatosLocales
    ? Number(entradasPeriodo.cantidad || 0)
    : Number(resumen?.mes?.entradasCantidad || 0);

  const entradasMontoPeriodo = entradasPeriodo.hayDatosLocales
    ? Number(entradasPeriodo.monto || 0)
    : Number(resumen?.mes?.entradasMonto || 0);

  const salidasPeriodo = useMemo(() => {
    const ventas = readVentasStorage();
    const rango = getRangoPeriodo(periodoActivo, filtros);

    if (!rango) {
      return {
        hayDatosLocales: ventas.length > 0,
        cantidad: 0,
        monto: 0,
      };
    }

    let cantidad = 0;
    let monto = 0;

    ventas.forEach((venta) => {
      const fechaVenta = parseVentaFecha(venta);
      if (!fechaVenta) return;
      if (fechaVenta < rango.inicio || fechaVenta >= rango.finExclusivo) return;

      const detalle = Array.isArray(venta?.detalle) ? venta.detalle : [];
      detalle.forEach((item) => {
        cantidad += getSalidaUnidad(item);
        monto += getSalidaMonto(item);
      });
    });

    return {
      hayDatosLocales: ventas.length > 0,
      cantidad,
      monto,
    };
  }, [periodoActivo, filtros]);

  const salidasCantidadPeriodo = salidasPeriodo.hayDatosLocales
    ? Number(salidasPeriodo.cantidad || 0)
    : Number(resumen?.mes?.salidasCantidad || 0);

  const salidasMontoPeriodo = salidasPeriodo.hayDatosLocales
    ? Number(salidasPeriodo.monto || 0)
    : Number(resumen?.mes?.salidasMonto || 0);

  const tarjetas = useMemo(() => {
    const top = Array.isArray(resumen?.topProductosMes) ? resumen.topProductosMes : [];
    return [
      {
        titulo: `Ventas ${etiquetaPeriodo}`,
        desc: money(salidasMontoPeriodo),
      },
      {
        titulo: `Entradas ${etiquetaPeriodo}`,
        desc: `${entradasCantidadPeriodo.toLocaleString("es-MX")} unidades`,
      },
      {
        titulo: `Top Producto ${etiquetaPeriodo}`,
        desc: top[0]?.nombre ? `${top[0].nombre} (${top[0].ventas} ventas)` : "Sin ventas registradas",
      },
    ];
  }, [resumen, etiquetaPeriodo, entradasCantidadPeriodo, salidasMontoPeriodo]);

  const exportarExcel = () => {
    if (!resumen) return;

    try {
      setExportandoExcel(true);
      const wb = XLSX.utils.book_new();

      const resumenRows = [
        { metrica: `Entradas ${etiquetaPeriodo.toLowerCase()} (cantidad)`, valor: entradasCantidadPeriodo },
        { metrica: `Salidas ${etiquetaPeriodo.toLowerCase()} (cantidad)`, valor: salidasCantidadPeriodo },
        { metrica: `Entradas ${etiquetaPeriodo.toLowerCase()} (monto)`, valor: entradasMontoPeriodo },
        { metrica: `Salidas ${etiquetaPeriodo.toLowerCase()} (monto)`, valor: salidasMontoPeriodo },
        { metrica: `Ventas ${etiquetaPeriodo.toLowerCase()}`, valor: salidasMontoPeriodo },
        { metrica: `Entradas ${etiquetaPeriodo.toLowerCase()}`, valor: entradasMontoPeriodo },
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
          [`Ventas ${etiquetaPeriodo.toLowerCase()}`, money(salidasMontoPeriodo)],
          [`Entradas ${etiquetaPeriodo.toLowerCase()}`, money(entradasMontoPeriodo)],
          [`Salidas ${etiquetaPeriodo.toLowerCase()}`, `${salidasCantidadPeriodo} unidades`],
          [`Entradas ${etiquetaPeriodo.toLowerCase()}`, `${entradasCantidadPeriodo} unidades`],
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
        <button
          className="rep-filtro-btn rep-filtro-btn-periodo"
          onClick={() => setMostrarModalPeriodo(true)}
          disabled={cargando}
        >
          Elegir periodo
        </button>
        <div className="rep-filtro-item">
          <label>Desde</label>
          <input
            type="date"
            value={filtros.desde}
            max={fechaHoy}
            onChange={(e) =>
              setFiltros((prev) => ({
                ...prev,
                desde: e.target.value,
                hasta: periodoActivo === "dia" ? e.target.value : prev.hasta,
              }))
            }
          />
        </div>
        <div className="rep-filtro-item">
          <label>Hasta</label>
          <input
            type="date"
            value={filtros.hasta}
            max={fechaHoy}
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

      <p className="rep-loading">Periodo actual: {etiquetaPeriodoLarga}</p>

      {mostrarModalPeriodo && (
        <div className="rep-modal-overlay" onClick={() => setMostrarModalPeriodo(false)}>
          <div className="rep-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Seleccionar periodo</h3>
            <p>Quieres el reporte por dia, semana o mes?</p>

            <div className="rep-modal-actions">
              <button className="rep-modal-btn" onClick={() => aplicarPeriodo("dia")} disabled={cargando}>
                Dia
              </button>
              <button className="rep-modal-btn" onClick={() => aplicarPeriodo("semana")} disabled={cargando}>
                Semana
              </button>
              <button className="rep-modal-btn" onClick={() => aplicarPeriodo("mes")} disabled={cargando}>
                Mes
              </button>
            </div>

            <button
              type="button"
              className="rep-modal-close"
              onClick={() => setMostrarModalPeriodo(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
          <h2>Ventas {etiquetaPeriodo}</h2>
          <p>Comportamiento de ventas en el periodo seleccionado</p>
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