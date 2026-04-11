import { Fragment, useEffect, useState } from "react";
import { toast } from "react-toastify";
import "../../styles/styles-POS/historialVentas.css";

const VENTAS_LS_KEY = "ventas_punto_venta";
const DEVOLUCIONES_LS_KEY = "devoluciones_punto_venta";

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
  const [mostrarModalDevolucion, setMostrarModalDevolucion] = useState(false);
  const [devolucionForm, setDevolucionForm] = useState({
    ventaId: "",
    producto: "",
    cantidad: "1",
    motivo: "",
  });

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const formatearIdVenta = (venta, index) => {
    const digits = String(venta?.id ?? "").replace(/\D/g, "");
    if (digits) return digits.slice(-3).padStart(3, "0");
    return String(index + 1).padStart(3, "0");
  };

  const abrirModalDevolucion = () => {
    setDevolucionForm({ ventaId: "", producto: "", cantidad: "1", motivo: "" });
    setMostrarModalDevolucion(true);
  };

  const cerrarModalDevolucion = () => {
    setMostrarModalDevolucion(false);
  };

  const registrarDevolucionLocal = (e) => {
    e.preventDefault();

    const cantidad = Math.max(1, Math.round(Number(devolucionForm.cantidad) || 0));
    const ventaId = String(devolucionForm.ventaId || "").replace(/\D/g, "").slice(-3);
    const producto = String(devolucionForm.producto || "").trim();
    const motivo = String(devolucionForm.motivo || "").trim();

    if (!ventaId) {
      toast.warn("El ID de venta es obligatorio.");
      return;
    }

    if (ventaId.length !== 3) {
      toast.warn("El ID de venta debe tener 3 digitos.");
      return;
    }

    if (!producto) {
      toast.warn("Ingresa el producto para registrar la devolución.");
      return;
    }

    if (!motivo) {
      toast.warn("Agrega un motivo de devolución.");
      return;
    }

    try {
      const raw = localStorage.getItem(DEVOLUCIONES_LS_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(prev) ? prev : [];

      const record = {
        id: `D-${Date.now()}`,
        venta_id: ventaId ? ventaId.padStart(3, "0") : null,
        producto,
        cantidad,
        motivo,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(DEVOLUCIONES_LS_KEY, JSON.stringify([record, ...list]));
      window.dispatchEvent(new Event("devoluciones-pos-updated"));
      toast.success("Devolución registrada.");
      cerrarModalDevolucion();
    } catch (error) {
      console.error("No se pudo registrar la devolución local:", error);
      toast.error("No se pudo registrar la devolución.");
    }
  };

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
          <button className="hv-btn-devolucion" onClick={abrirModalDevolucion}>
            Registrar devolución
          </button>
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
                <th>ID venta</th>
                <th>Fecha / Hora</th>
                <th>Detalle</th>
                <th>Método</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v, index) => (
                <Fragment key={v.id || `${v.fecha}-${v.hora}`}>
                  <tr key={v.id} className={expandido === v.id ? "row-expanded" : ""}>
                    <td>
                      <span className="venta-id">{formatearIdVenta(v, index)}</span>
                    </td>
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
                      <td colSpan={6}>
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

      {mostrarModalDevolucion && (
        <div className="hv-modal-overlay" onClick={cerrarModalDevolucion}>
          <div className="hv-modal-box" onClick={(evt) => evt.stopPropagation()}>
            <div className="hv-modal-header">
              <div>
                <h3>Registrar devolución</h3>
                <p>Completa los datos para mantener trazabilidad en ventas y stock.</p>
              </div>
              <button type="button" className="hv-modal-close" onClick={cerrarModalDevolucion} aria-label="Cerrar modal">
                ×
              </button>
            </div>

            <form className="hv-modal-form" onSubmit={registrarDevolucionLocal}>
              <div className="hv-modal-grid">
                <label>
                  ID de venta *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={devolucionForm.ventaId}
                    onChange={(evt) => setDevolucionForm((prev) => ({ ...prev, ventaId: String(evt.target.value || "").replace(/\D/g, "").slice(-3) }))}
                    placeholder="Ej. 007"
                  />
                </label>

                <label>
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={devolucionForm.cantidad}
                    onChange={(evt) => setDevolucionForm((prev) => ({ ...prev, cantidad: evt.target.value }))}
                  />
                </label>

                <label className="hv-field-full">
                  Producto
                  <input
                    type="text"
                    value={devolucionForm.producto}
                    onChange={(evt) => setDevolucionForm((prev) => ({ ...prev, producto: evt.target.value }))}
                    placeholder="Modelo o nombre del producto"
                  />
                </label>

                <label className="hv-field-full">
                  Motivo
                  <textarea
                    rows={3}
                    value={devolucionForm.motivo}
                    onChange={(evt) => setDevolucionForm((prev) => ({ ...prev, motivo: evt.target.value }))}
                    placeholder="Ej. Talla incorrecta, defecto de fábrica..."
                  />
                </label>
              </div>

              <div className="hv-modal-actions">
                <button type="button" className="hv-modal-cancel" onClick={cerrarModalDevolucion}>Cancelar</button>
                <button type="submit" className="hv-modal-save">Guardar devolución</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}