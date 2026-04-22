import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import '../../styles/styles-POS/devoluciones.css';

/* ---- Motivos fijos ---- */
const MOTIVOS = [
  'Talla incorrecta',
  'Defecto de fábrica',
  'No era lo esperado',
  'Cambio de modelo',
  'Otro'
];

/* ---- Colores de barras ---- */
const COLORES_BARRAS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];

/* ---- Estado inicial del formulario ---- */
const FORM_INICIAL = {
  numeroVenta: '',
  motivo: '',
  observaciones: '',
  tipoReembolso: 'Efectivo (retiro de caja)',
  monto: 0, // ✅ nuevo campo manual
};

/* ---- LocalStorage Keys ---- */
const DEVOLUCIONES_KEY = "historial_devoluciones";

export default function DevolucionesPage() {
  const { user } = useAuth();

  const [form, setForm] = useState(FORM_INICIAL);
  const [ultimasDevoluciones, setUltimas] = useState([]);
  const [motivosFrecuentes, setMotivos] = useState([]);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [enviando, setEnviando] = useState(false);

  /* ---- Cargar historial desde localStorage ---- */
  useEffect(() => {
    const raw = localStorage.getItem(DEVOLUCIONES_KEY);
    const data = raw ? JSON.parse(raw) : [];
    setUltimas(data);
    calcularMotivos(data);
  }, []);

  const handleChange = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setErrorForm(null);
    setMensajeExito(null);
  };

  const confirmarDevolucion = () => {
    if (!form.numeroVenta) return setErrorForm("Ingresa el número de venta.");
    if (!form.motivo) return setErrorForm("Selecciona un motivo de devolución.");
    if (!form.monto || form.monto <= 0) return setErrorForm("Ingresa el monto de la devolución.");

    try {
      setEnviando(true);
      setErrorForm(null);

      const ahora = new Date();
      const devolucion = {
        id: Date.now(),
        ticketOriginal: form.numeroVenta,
        productoNombre: "Producto devuelto",
        talla: "N/A",
        color: "N/A",
        motivo: form.motivo,
        observaciones: form.observaciones,
        tipoReembolso: form.tipoReembolso,
        monto: Number(form.monto), // ✅ monto manual
        atendidoPor: user?.nombre || user?.email || "Usuario",
        estado: "Completada",
        fecha: ahora.toLocaleDateString("es-MX"),
        hora: ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      };

      const actualizado = [devolucion, ...ultimasDevoluciones];
      localStorage.setItem(DEVOLUCIONES_KEY, JSON.stringify(actualizado));
      setUltimas(actualizado);
      calcularMotivos(actualizado);

      setMensajeExito(`Se retiraron $${Number(form.monto).toLocaleString("es-MX")} MXN de la caja por devolución del ticket ${form.numeroVenta}.`);
      setForm(FORM_INICIAL);

      toast.success("Devolución registrada correctamente.");
    } catch (err) {
      setErrorForm("Ocurrió un error al registrar la devolución.");
      toast.error("Error al registrar devolución.");
    } finally {
      setEnviando(false);
    }
  };

  const calcularMotivos = (data) => {
    const conteo = {};
    data.forEach(d => {
      conteo[d.motivo] = (conteo[d.motivo] || 0) + 1;
    });
    const lista = Object.entries(conteo).map(([motivo, cantidad]) => ({ motivo, cantidad }));
    setMotivos(lista);
  };

  /* ================================================
     RENDER PRINCIPAL
     ================================================ */
  return (
    <div className="dev-wrap">
      {/* Topbar */}
      <div className="dev-topbar">
        <div className="dev-topbar-left">
          <div className="dev-topbar-title">Devoluciones</div>
          <div className="dev-topbar-sub">Resumen de la actividad de hoy</div>
        </div>
        <div className="dev-topbar-right">
          <div className="dev-badge-online">
            <div className="dev-dot-green" /> En línea
          </div>
          <div className="dev-date-txt">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      <div className="dev-content">
        {/* Alerta */}
        {mensajeExito && (
          <div className="dev-alert">
            <div className="dev-alert-title">Retiro de caja registrado</div>
            <div className="dev-alert-body">{mensajeExito}</div>
          </div>
        )}

        <div className="dev-cols">
          {/* Formulario */}
          <div className="dev-card">
            <div className="dev-card-hdr">
              <div className="dev-card-ttl">Registrar devolución</div>
              <div className="dev-card-sub">Nuevo</div>
            </div>

            <div className="dev-field">
              <label className="dev-lbl">No. de ticket</label>
              <input
                className="dev-inp-real"
                placeholder="#VTA-0000"
                value={form.numeroVenta}
                onChange={e => handleChange("numeroVenta", e.target.value)}
              />
            </div>

            <div className="dev-field">
              <label className="dev-lbl">Motivo de devolución</label>
              <div className="dev-tags">
                {MOTIVOS.map(m => (
                  <button
                    key={m}
                    className={`dev-tag${form.motivo === m ? " dev-tag-active" : ""}`}
                    onClick={() => handleChange("motivo", m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="dev-field">
              <label className="dev-lbl">Observaciones</label>
              <textarea
                className="dev-textarea"
                placeholder="Detalles adicionales..."
                rows={3}
                value={form.observaciones}
                onChange={e => handleChange("observaciones", e.target.value)}
              />
            </div>

            <div className="dev-field">
              <label className="dev-lbl">Tipo de reembolso</label>
              <select
                className="dev-select"
                value={form.tipoReembolso}
                onChange={e => handleChange("tipoReembolso", e.target.value)}
              >
                <option>Efectivo (retiro de caja)</option>
                <option>Transferencia bancaria</option>
                <option>Crédito en tienda</option>
              </select>
            </div>

            <div className="dev-field">
              <label className="dev-lbl">Monto de devolución</label>
              <input
                type="number"
                className="dev-inp-real"
                placeholder="0"
                value={form.monto || ""}
                onChange={e => handleChange("monto", e.target.value)}
              />
            </div>

            {errorForm && <div className="dev-error-inline">{errorForm}</div>}

            <button
              className="dev-btn-confirm"
              onClick={confirmarDevolucion}
              disabled={enviando}
            >
              {enviando ? "Procesando..." : "Confirmar devolución y retirar de caja"}
            </button>
          </div>

          {/* Panel derecho */}
          <div className="dev-right-col">
            <div className="dev-card">
              <div className="dev-card-hdr">
                <div className="dev-card-ttl">Últimas devoluciones</div>
                <div className="dev-card-sub">Hoy</div>
              </div>
              {ultimasDevoluciones.length === 0 ? (
                <p className="dev-sin-datos">Sin devoluciones registradas hoy</p>
              ) : (
                <table className="dev-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Motivo</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasDevoluciones.map((d, i) => (
                      <tr key={d.id ?? i}>
                        <td>
                          <div className="dev-td-name">{d.productoNombre}</div>
                          <div className="dev-td sub">{d.ticketOriginal} - {d.hora}</div>
                                                    <div className="dev-td-detail">T.{d.talla} · #{d.ticketOriginal}</div>
                        </td>
                        <td className="dev-td-muted">{d.motivo}</td>
                        <td className="dev-td-red">${Number(d.monto).toLocaleString("es-MX")}</td>
                        <td>
                          <span className={`dev-pill ${d.estado === "Completada" ? "dev-pill-ok" : "dev-pill-pend"}`}>
                            {d.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Barras motivos */}
            <div className="dev-card">
              <div className="dev-card-hdr">
                <div className="dev-card-ttl">Motivos frecuentes</div>
                <div className="dev-card-sub">Este mes</div>
              </div>
              {motivosFrecuentes.length === 0 ? (
                <p className="dev-sin-datos">Sin datos este mes</p>
              ) : (
                motivosFrecuentes.map((m, i) => {
                  const max = motivosFrecuentes[0]?.cantidad ?? 1;
                  const pct = Math.round((m.cantidad / max) * 100);
                  return (
                    <div className="dev-bar-row" key={i}>
                      <div className="dev-bar-hdr">
                        <span className="dev-bar-lbl">{m.motivo}</span>
                        <span className="dev-bar-val">{m.cantidad}</span>
                      </div>
                      <div className="dev-bar-track">
                        <div
                          className="dev-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: COLORES_BARRAS[i % COLORES_BARRAS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
