import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../../context/AuthContext"
import "../../styles/entradas.css"

function Entradas() {
  const ENTRADAS_LS_KEY = "entradas_inventario"
  const [entradas, setEntradas] = useState(() => {
    try {
      const guardado = localStorage.getItem(ENTRADAS_LS_KEY)
      return guardado ? JSON.parse(guardado) : []
    } catch (error) {
      console.error("Error parseando entradas en localStorage:", error)
      return []
    }
  })
  const { user } = useAuth()
  const [modalEliminar, setModalEliminar] = useState(false)
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [accionPendiente, setAccionPendiente] = useState(null)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("")

  useEffect(() => {
    localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify(entradas))
  }, [entradas])

  const obtenerFechaRegistro = (item) => {
    if (!item) return null
    return item.fecha_creacion || item.created_at || item.fechaCreacion || null
  }

  const parseFecha = (fecha) => {
    const date = new Date(fecha)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const esHoy = (fecha) => {
    const hoy = new Date()
    const f = parseFecha(fecha)
    if (!f) return false
    return (
      f.getDate() === hoy.getDate() &&
      f.getMonth() === hoy.getMonth() &&
      f.getFullYear() === hoy.getFullYear()
    )
  }

  const estaEnEstaSemana = (fecha) => {
    const ahora = new Date()
    const f = parseFecha(fecha)
    if (!f) return false
    const inicioSemana = new Date(ahora)
    inicioSemana.setDate(ahora.getDate() - ahora.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    return f >= inicioSemana
  }

  const estaEnEsteMes = (fecha) => {
    const ahora = new Date()
    const f = parseFecha(fecha)
    if (!f) return false
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
  }

  const pedirConfirmacion = (accion, periodo) => {
    setAccionPendiente(() => accion)
    setPeriodoSeleccionado(periodo)
    setModalConfirmar(true)
  }

  const confirmarEliminar = () => {
    if (accionPendiente) accionPendiente()
    setModalConfirmar(false)
    setModalEliminar(false)
    setAccionPendiente(null)
    setPeriodoSeleccionado("")
  }

  const cancelarConfirmacion = () => {
    setModalConfirmar(false)
    setAccionPendiente(null)
    setPeriodoSeleccionado("")
  }

  const eliminarEntradasHoy = () => {
    setEntradas((prev) =>
      prev.filter((e) => {
        const fecha = obtenerFechaRegistro(e)
        if (!parseFecha(fecha)) return false
        return !esHoy(fecha)
      })
    )
  }

  const eliminarEntradasSemana = () => {
    setEntradas((prev) =>
      prev.filter((e) => {
        const fecha = obtenerFechaRegistro(e)
        if (!parseFecha(fecha)) return false
        return !estaEnEstaSemana(fecha)
      })
    )
  }

  const eliminarEntradasMes = () => {
    setEntradas((prev) =>
      prev.filter((e) => {
        const fecha = obtenerFechaRegistro(e)
        if (!parseFecha(fecha)) return false
        return !estaEnEsteMes(fecha)
      })
    )
  }

  const baseDatosEntradas = entradas
  const entradasHoy = baseDatosEntradas.filter((p) => esHoy(obtenerFechaRegistro(p))).length
  const entradasSemana = baseDatosEntradas.filter((p) => estaEnEstaSemana(obtenerFechaRegistro(p))).length
  const entradasMes = baseDatosEntradas.filter((p) => estaEnEsteMes(obtenerFechaRegistro(p))).length

  const formatFecha = (fecha) => {
    if (!fecha) return "—"
    const parsed = parseFecha(fecha)
    if (!parsed) return "—"
    return parsed.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const formatCosto = (precio, cantidad) => {
    if (!precio) return "—"
    const total = Number(precio) * Number(cantidad || 1)
    return `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="entradas-page">
      <div className="encabezado">
        <div className="encabezado-texto">
          <h1 className="titulo-pagina">Entradas de Inventario</h1>
          <p className="subtitulo-pagina">Registra y gestiona las entradas de productos</p>
        </div>
      </div>

      <div className="tarjetas-resumen">
        <div className="tarjeta">
          <div className="tarjeta-info">
            <span className="tarjeta-titulo">Entradas Hoy</span>
            <span className="tarjeta-numero">{entradasHoy}</span>
          </div>
          <div className="tarjeta-icono verde">📦</div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <span className="tarjeta-titulo">Esta Semana</span>
            <span className="tarjeta-numero">{entradasSemana}</span>
          </div>
          <div className="tarjeta-icono azul">📅</div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <span className="tarjeta-titulo">Total Mes</span>
            <span className="tarjeta-numero">{entradasMes}</span>
          </div>
          <div className="tarjeta-icono morado">📊</div>
        </div>
      </div>

      <div className="card-tabla">
        <div className="card-header">
          <h2 className="card-titulo">Historial de Entradas</h2>
          <div className="btn-limpiar" onClick={() => setModalEliminar(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th>FECHA / HORA</th>
                <th>MODELO</th>
                <th>CANTIDAD</th>
                <th>REGISTRADO POR</th>
                <th>COSTO TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {baseDatosEntradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#aaa" }}>
                    No hay entradas registradas
                  </td>
                </tr>
              ) : (
                baseDatosEntradas.map((p) => (
                  <tr key={p.registroId || p.id_producto}>
                    <td>{formatFecha(obtenerFechaRegistro(p))}</td>
                    <td className="td-modelo">{p.modelo}</td>
                    <td>
                      <span className="badge-cantidad">+{p.cantidad ?? p.stock}</span>
                    </td>
                    <td>
                      <div className="celda-usuario">
                        <div className="avatar-mini">👤</div>
                        <span>{p.registrado_por || user?.nombre || user?.email || "—"}</span>
                      </div>
                    </td>
                    <td className="td-costo">
                      {formatCosto(p.precio, p.cantidad)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal selección de período */}
      {modalEliminar && createPortal(
        <div className="entradas-modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="entradas-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="entradas-modal-header">
              <h3>Limpiar Entradas</h3>
              <button className="entradas-modal-close" onClick={() => setModalEliminar(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="entradas-modal-body">
              <p>Selecciona el período para eliminar las entradas:</p>
              <div className="entradas-modal-opciones">
                <button className="entradas-modal-btn" onClick={() => pedirConfirmacion(eliminarEntradasHoy, "hoy")}>
                  Eliminar Entradas de Hoy
                </button>
                <button className="entradas-modal-btn" onClick={() => pedirConfirmacion(eliminarEntradasSemana, "esta semana")}>
                  Eliminar Entradas de Esta Semana
                </button>
                <button className="entradas-modal-btn" onClick={() => pedirConfirmacion(eliminarEntradasMes, "este mes")}>
                  Eliminar Entradas de Este Mes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de confirmación */}
      {modalConfirmar && createPortal(
        <div className="entradas-confirm-overlay" onClick={cancelarConfirmacion}>
          <div className="entradas-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="entradas-confirm-icono">⚠️</div>
            <h3 className="entradas-confirm-titulo">¿Estás seguro?</h3>
            <p className="entradas-confirm-texto">
              Se eliminarán todas las entradas de <strong>{periodoSeleccionado}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="entradas-confirm-acciones">
              <button className="entradas-confirm-cancelar" onClick={cancelarConfirmacion}>
                Cancelar
              </button>
              <button className="entradas-confirm-confirmar" onClick={confirmarEliminar}>
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Entradas