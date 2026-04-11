import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  getStatsDevolucionesHoy,
  getDevolucionesHoy,
  getMotivosFrecuentes,
  getUltimoRetiro,
  getVentaPorTicket,
  registrarDevolucion,
} from '../../api/devoluciones';
import '../../styles/styles-POS/devoluciones.css';

/* ---- Motivos fijos ---- */
const MOTIVOS = [
  'Talla incorrecta',
  'Defecto de fábrica',
  'No era lo esperado',
  'Cambio de modelo',
  'Otro',
];

/* ---- Colores de barras ---- */
const COLORES_BARRAS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];

/* ---- Estado inicial del formulario ---- */
const FORM_INICIAL = {
  ticketOriginal: '',
  motivo: '',
  observaciones: '',
  tipoReembolso: 'Efectivo (retiro de caja)',
};

/* ================================================
   ÍCONOS SVG INLINE
   ================================================ */
const IconoDevolucion = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2.5L3 7v10.5h4.5V13H13v4.5H17V7L10 2.5z" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7.5 13v4.5M12.5 13v4.5" stroke="#6366f1" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconoZapato = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 13c0-1 .5-2 1.5-2.5L8 8l5 1 3 2.5c.5.5.5 1.5 0 2l-1 1H3l-1-1.5z" stroke="#6366f1" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 8V6c0-1 .5-1.5 1.5-1.5h1c1 0 1.5.5 1.5 1.5v2" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconoAlerta = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2L2 17h16L10 2z" fill="#f59e0b" />
    <path d="M10 8v4M10 14.5v.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ================================================
   COMPONENTE PRINCIPAL
   ================================================ */
export default function DevolucionesPage() {
  const { user } = useAuth();

  /* ---- Datos remotos ---- */
  const [stats, setStats]                     = useState(null);
  const [ultimasDevoluciones, setUltimas]     = useState([]);
  const [motivosFrecuentes, setMotivos]       = useState([]);
  const [ultimoRetiro, setUltimoRetiro]       = useState(null);
  const [cargando, setCargando]               = useState(true);
  const [error, setError]                     = useState(null);

  /* ---- Formulario ---- */
  const [form, setForm]                         = useState(FORM_INICIAL);
  const [productoEncontrado, setProducto]       = useState(null);
  const [buscandoTicket, setBuscandoTicket]     = useState(false);
  const [enviando, setEnviando]                 = useState(false);
  const [mensajeExito, setMensajeExito]         = useState(null);
  const [errorForm, setErrorForm]               = useState(null);

  /* ================================================
     CARGA INICIAL
     ================================================ */
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const [resStats, resUltimas, resMotivos, resRetiro] = await Promise.allSettled([
        getStatsDevolucionesHoy(),
        getDevolucionesHoy(),
        getMotivosFrecuentes(),
        getUltimoRetiro(),
      ]);

      if (resStats.status   === 'fulfilled') setStats(resStats.value.data);
      if (resUltimas.status === 'fulfilled') setUltimas(resUltimas.value.data);
      if (resMotivos.status === 'fulfilled') setMotivos(resMotivos.value.data);
      if (resRetiro.status  === 'fulfilled') setUltimoRetiro(resRetiro.value.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /* ================================================
     BUSCAR TICKET CON DEBOUNCE (500ms)
     ================================================ */
  useEffect(() => {
    if (!form.ticketOriginal || form.ticketOriginal.length < 3) {
      setProducto(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setBuscandoTicket(true);
        const { data } = await getVentaPorTicket(form.ticketOriginal);
        setProducto(data.producto ?? null);
      } catch {
        setProducto(null);
      } finally {
        setBuscandoTicket(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.ticketOriginal]);

  /* ================================================
     CAMBIOS DEL FORMULARIO
     ================================================ */
  const handleChange = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setErrorForm(null);
    setMensajeExito(null);
  };

  /* ================================================
     ENVIAR DEVOLUCIÓN
     ================================================ */
  const confirmarDevolucion = async () => {
    if (!form.ticketOriginal)    return setErrorForm('Ingresa el número de ticket.');
    if (!productoEncontrado)     return setErrorForm('No se encontró el producto del ticket.');
    if (!form.motivo)            return setErrorForm('Selecciona un motivo de devolución.');

    const monto = productoEncontrado.precio - (productoEncontrado.descuento ?? 0);

    try {
      setEnviando(true);
      setErrorForm(null);

      const payload = {
        ticketOriginal:  form.ticketOriginal,
        productoId:      productoEncontrado.id,
        productoNombre:  productoEncontrado.nombre,
        talla:           productoEncontrado.talla,
        color:           productoEncontrado.color,
        sku:             productoEncontrado.sku,
        motivo:          form.motivo,
        observaciones:   form.observaciones,
        tipoReembolso:   form.tipoReembolso,
        monto,
        atendidoPor:     user?.nombre || user?.email || 'Sin especificar',
      };

      const { data } = await registrarDevolucion(payload);

      const msg = `Se retiraron $${monto.toLocaleString('es-MX')} MXN de caja por devolución del ticket ${form.ticketOriginal}.`;
      setMensajeExito(msg);
      setUltimoRetiro(data.retiro ?? null);
      setForm(FORM_INICIAL);
      setProducto(null);

      toast.success('Devolución registrada correctamente.');
      await cargarDatos();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Ocurrió un error al registrar la devolución.';
      setErrorForm(msg);
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  /* ---- Monto a reembolsar ---- */
  const montoReembolso = productoEncontrado
    ? productoEncontrado.precio - (productoEncontrado.descuento ?? 0)
    : 0;

  /* ================================================
     PANTALLA DE CARGA
     ================================================ */
  if (cargando) {
    return (
      <div className="dev-wrap dev-centrado">
        <div className="dev-spinner" />
        <p className="dev-cargando-txt">Cargando módulo de devoluciones...</p>
      </div>
    );
  }

  /* ================================================
     PANTALLA DE ERROR
     ================================================ */
  if (error) {
    return (
      <div className="dev-wrap dev-centrado">
        <div className="dev-error-box">
          <p className="dev-error-ttl">No se pudo cargar el módulo</p>
          <p className="dev-error-msg">{error}</p>
          <button className="dev-btn-reintentar" onClick={cargarDatos}>Reintentar</button>
        </div>
      </div>
    );
  }

  /* ================================================
     RENDER PRINCIPAL
     ================================================ */
  return (
    <div className="dev-wrap">

      {/* Topbar */}
      <div className="dev-topbar">
        <div className="dev-topbar-left">
          <div className="dev-topbar-icon"><IconoDevolucion /></div>
          <div>
            <div className="dev-topbar-title">Devoluciones</div>
            <div className="dev-topbar-sub">Resumen de la actividad de hoy</div>
          </div>
        </div>
        <div className="dev-topbar-right">
          <div className="dev-badge-online">
            <div className="dev-dot-green" />
            En línea
          </div>
          <div className="dev-date-txt">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </div>
        </div>
      </div>

      <div className="dev-content">

        {/* Alerta de retiro */}
        {(ultimoRetiro || mensajeExito) && (
          <div className="dev-alert">
            <div className="dev-alert-icon"><IconoAlerta /></div>
            <div>
              <div className="dev-alert-title">Retiro de caja registrado</div>
              <div className="dev-alert-body">
                {mensajeExito ? mensajeExito : (
                  <>
                    Se retiraron <strong>${Number(ultimoRetiro.monto).toLocaleString('es-MX')} MXN</strong> de
                    caja por devolución del ticket <strong>{ultimoRetiro.ticketOriginal}</strong> —{' '}
                    {ultimoRetiro.productoNombre} · Autorizado por: {ultimoRetiro.atendidoPor} · {ultimoRetiro.hora}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="dev-stats">
          <div className="dev-stat dev-stat-red">
            <div className="dev-stat-lbl">Devoluciones hoy</div>
            <div className="dev-stat-val dev-val-red">{stats?.devolucionesHoy ?? 0}</div>
            <div className={`dev-stat-meta ${(stats?.variacionHoy ?? 0) > 0 ? 'dev-meta-red' : 'dev-meta-green'}`}>
              {(stats?.variacionHoy ?? 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.variacionHoy ?? 0)} vs ayer
            </div>
          </div>
          <div className="dev-stat dev-stat-red">
            <div className="dev-stat-lbl">Dinero retirado hoy</div>
            <div className="dev-stat-val dev-val-red">
              ${Number(stats?.dineroRetiradoHoy ?? 0).toLocaleString('es-MX')}
            </div>
            <div className="dev-stat-meta">MXN · por devoluciones</div>
          </div>
          <div className="dev-stat dev-stat-amber">
            <div className="dev-stat-lbl">Devoluciones del mes</div>
            <div className="dev-stat-val dev-val-amber">{stats?.devolucionesMes ?? 0}</div>
            <div className="dev-stat-meta">
              ${Number(stats?.dineroRetiradoMes ?? 0).toLocaleString('es-MX')} MXN retirados
            </div>
          </div>
        </div>

        {/* Columnas */}
        <div className="dev-cols">

          {/* Formulario */}
          <div className="dev-card">
            <div className="dev-card-hdr">
              <div className="dev-card-ttl">Registrar devolución</div>
              <div className="dev-card-sub">Nuevo</div>
            </div>

            <div className="dev-field-grid">
              <div className="dev-field">
                <label className="dev-lbl">No. de ticket</label>
                <input
                  className="dev-inp-real"
                  placeholder="#VTA-0000"
                  value={form.ticketOriginal}
                  onChange={e => handleChange('ticketOriginal', e.target.value)}
                />
              </div>
              <div className="dev-field">
                <label className="dev-lbl">Fecha</label>
                <div className="dev-inp">{new Date().toLocaleDateString('es-MX')}</div>
              </div>
            </div>

            <div className="dev-field-grid">
              <div className="dev-field">
                <label className="dev-lbl">Hora</label>
                <div className="dev-inp">
                  {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="dev-field">
                <label className="dev-lbl">Atendido por</label>
                <div className="dev-inp">{user?.nombre || user?.email || '—'}</div>
              </div>
            </div>

            {/* Producto */}
            <div className="dev-lbl" style={{ marginBottom: 6 }}>Producto devuelto</div>
            {buscandoTicket ? (
              <div className="dev-product-buscando">Buscando ticket...</div>
            ) : productoEncontrado ? (
              <div className="dev-product-row">
                <div className="dev-prod-thumb"><IconoZapato /></div>
                <div className="dev-prod-info">
                  <div className="dev-prod-name">{productoEncontrado.nombre}</div>
                  <div className="dev-prod-detail">
                    Talla {productoEncontrado.talla} · {productoEncontrado.color} · SKU: {productoEncontrado.sku}
                  </div>
                </div>
                <div className="dev-prod-price">
                  ${Number(productoEncontrado.precio).toLocaleString('es-MX')}
                </div>
              </div>
            ) : (
              <div className="dev-product-vacio">
                Ingresa un número de ticket para buscar el producto
              </div>
            )}

            {/* Motivo */}
            <div className="dev-lbl" style={{ marginBottom: 7 }}>Motivo de devolución</div>
            <div className="dev-tags">
              {MOTIVOS.map(m => (
                <button
                  key={m}
                  className={`dev-tag${form.motivo === m ? ' dev-tag-active' : ''}`}
                  onClick={() => handleChange('motivo', m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="dev-field" style={{ marginBottom: 12 }}>
              <label className="dev-lbl">Observaciones</label>
              <textarea
                className="dev-textarea"
                placeholder="Detalles adicionales sobre la devolución..."
                rows={3}
                value={form.observaciones}
                onChange={e => handleChange('observaciones', e.target.value)}
              />
            </div>

            <div className="dev-field" style={{ marginBottom: 14 }}>
              <label className="dev-lbl">Tipo de reembolso</label>
              <select
                className="dev-select"
                value={form.tipoReembolso}
                onChange={e => handleChange('tipoReembolso', e.target.value)}
              >
                <option>Efectivo (retiro de caja)</option>
                <option>Transferencia bancaria</option>
                <option>Crédito en tienda</option>
              </select>
            </div>

            {/* Totales — solo si hay producto */}
            {productoEncontrado && (
              <div className="dev-total-box">
                <div className="dev-tot-row">
                  <span>Precio original</span>
                  <span>${Number(productoEncontrado.precio).toLocaleString('es-MX')}</span>
                </div>
                <div className="dev-tot-row">
                  <span>Descuento en venta</span>
                  <span>${Number(productoEncontrado.descuento ?? 0).toLocaleString('es-MX')}</span>
                </div>
                <div className="dev-tot-row">
                  <span>Cargo por devolución</span>
                  <span className="dev-tot-green">$0.00</span>
                </div>
                <div className="dev-tot-final">
                  <span>Total a reembolsar</span>
                  <span className="dev-tot-red">
                    ${montoReembolso.toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>
            )}

            {errorForm && <div className="dev-error-inline">{errorForm}</div>}

            <button
              className="dev-btn-confirm"
              onClick={confirmarDevolucion}
              disabled={enviando}
            >
              {enviando ? 'Procesando...' : 'Confirmar devolución y retirar de caja'}
            </button>
          </div>

          {/* Columna derecha */}
          <div className="dev-right-col">

            {/* Tabla */}
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
                          <div className="dev-td-detail">T.{d.talla} · #{d.ticketOriginal}</div>
                        </td>
                        <td className="dev-td-muted">{d.motivo}</td>
                        <td className="dev-td-red">${Number(d.monto).toLocaleString('es-MX')}</td>
                        <td>
                          <span className={`dev-pill ${d.estado === 'Completada' ? 'dev-pill-ok' : 'dev-pill-pend'}`}>
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
                          style={{ width: `${pct}%`, background: COLORES_BARRAS[i % COLORES_BARRAS.length] }}
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
