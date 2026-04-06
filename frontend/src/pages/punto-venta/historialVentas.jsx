import { Fragment, useEffect, useState } from "react";
import "../../styles/styles-POS/historialVentas.css";

const VENTAS_LS_KEY = "ventas_punto_venta";

const METODO_COLOR = {
  Efectivo: { bg: "#dcfce7", color: "#16a34a" },
  Tarjeta: { bg: "#dbeafe", color: "#1d4ed8" },
  Transferencia: { bg: "#fef9c3", color: "#ca8a04" },
};

export default function HistorialVentas() {
  const [fecha, setFecha] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [ventasBase, setVentasBase] = useState([]);

  const cargarVentas = () => {
    try {
      const raw = localStorage.getItem(VENTAS_LS_KEY);
      const ventas = raw ? JSON.parse(raw) : [];
      setVentasBase(Array.isArray(ventas) ? ventas : []);
    } catch (error) {
      console.error("Error leyendo historial de ventas:", error);
      setVentasBase([]);
    }
  };

  useEffect(() => {
    cargarVentas();

    const sincronizarVentas = () => cargarVentas();
    window.addEventListener("storage", sincronizarVentas);
    window.addEventListener("focus", sincronizarVentas);
    window.addEventListener("ventas-pos-updated", sincronizarVentas);

    return () => {
      window.removeEventListener("storage", sincronizarVentas);
      window.removeEventListener("focus", sincronizarVentas);
      window.removeEventListener("ventas-pos-updated", sincronizarVentas);
    };
  }, []);

  const ventas = ventasBase.filter((v) => {
    const matchFecha = fecha ? v.fecha === fecha : true;
    const matchBusq = busqueda
      ? v.detalle.some((d) => d.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      : true;
    return matchFecha && matchBusq;
  });

  const totalDelDia = ventas.reduce((a, v) => a + v.total, 0);

  return (
    <div className="hv-wrapper">
      {/* Header */}
      <div className="hv-header">
        <div className="hv-header-left">
          <div className="hv-logo">B</div>
          <div>
            <span className="hv-breadcrumb">Ventas</span>
            <span className="hv-sep"> / </span>
            <span className="hv-breadcrumb-active">Historial de ventas</span>
          </div>
        </div>
      </div>

      {/* Page title + filtros */}
      <div className="hv-top">
        <div>
          <h1 className="hv-title">Historial de ventas</h1>
          <p className="hv-subtitle">Registro completo de las ventas</p>
        </div>
        <div className="hv-filtros">
          <div className="hv-search-wrap">
            <svg className="hv-search-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="hv-search-input"
              placeholder="Buscar por producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="hv-date-wrap">
            <svg width="15" height="15" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <input
              type="date"
              className="hv-date-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            {fecha && (
              <button
                className="hv-clear-date"
                onClick={() => setFecha("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resumen rápido */}
      {ventas.length > 0 && (
        <div className="hv-resumen">
          <div className="hv-resumen-item">
            <span className="hv-resumen-label">Ventas encontradas</span>
            <span className="hv-resumen-val">{ventas.length}</span>
          </div>
          <div className="hv-resumen-divider" />
          <div className="hv-resumen-item">
            <span className="hv-resumen-label">Total acumulado</span>
            <span className="hv-resumen-val blue">${totalDelDia.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="hv-table-wrap">
        {ventas.length === 0 ? (
          <div className="hv-empty">
            <svg width="52" height="52" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <p>No se encontraron ventas</p>
            <span>Finaliza una venta en Caja para verla aquí</span>
          </div>
        ) : (
          <table className="hv-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Detalle</th>
                <th>Método</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <Fragment key={v.id || `${v.fecha}-${v.hora}`}>
                  <tr key={v.id} className={expandido === v.id ? "row-expanded" : ""}>
                    <td>
                      <p className="fecha">{v.fecha.split("-").reverse().join("/")}</p>
                      <p className="hora">{v.hora}</p>
                    </td>
                    <td>
                      <span className="detalle-resumen">
                        {v.detalle.map((d) => d.nombre).join(", ")}
                      </span>
                      <span className="detalle-items"> · {v.detalle.reduce((a, d) => a + d.cantidad, 0)} artículo(s)</span>
                    </td>
                    <td>
                      <span
                        className="metodo-badge"
                        style={{
                          background: METODO_COLOR[v.metodo]?.bg,
                          color: METODO_COLOR[v.metodo]?.color,
                        }}
                      >
                        {v.metodo}
                      </span>
                    </td>
                    <td className="td-total">${v.total.toLocaleString()}</td>
                    <td>
                      <div className="acciones-wrap">
                        <button
                          className="btn-ver"
                          onClick={() => setExpandido(expandido === v.id ? null : v.id)}
                        >
                          {expandido === v.id ? "Ocultar" : "Ver detalle"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandido === v.id && (
                    <tr key={`${v.id}-detail`} className="row-detail">
                      <td colSpan={5}>
                        <div className="detalle-expandido">
                          <table className="detalle-table">
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Precio unit.</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {v.detalle.map((d, i) => (
                                <tr key={i}>
                                  <td>{d.nombre}</td>
                                  <td>{d.cantidad}</td>
                                  <td>${d.precio}</td>
                                  <td><strong>${d.cantidad * d.precio}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="detalle-total">
                            Total de la venta: <strong>${v.total.toLocaleString()}</strong>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}