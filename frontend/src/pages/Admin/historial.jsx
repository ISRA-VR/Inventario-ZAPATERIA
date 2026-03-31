import { useState } from "react"
import "../../styles/historial.css"

// datos de prueba
const movimientosEjemplo = [
  { id: 1, producto: "Nike Air Max 90", fecha: "2024-01-30 14:32", empleado: "Juan Pérez", tipo: "Entrada", cantidad: 24, referencia: "#ENT-2024-045" },
  { id: 2, producto: "Adidas Superstar", fecha: "2024-01-30 12:15", empleado: "Maria López", tipo: "Salida", cantidad: -12, referencia: "#VTA-2024-089" },
  { id: 3, producto: "Puma RS-X", fecha: "2024-01-30 10:45", empleado: "Carlos Ruiz", tipo: "Entrada", cantidad: 18, referencia: "#ENT-2024-044" },
  { id: 4, producto: "Converse Chuck Taylor", fecha: "2024-01-29 16:20", empleado: "Ana Garcia", tipo: "Salida", cantidad: -6, referencia: "#VTA-2024-088" },
  { id: 5, producto: "Vans Old Skool", fecha: "2024-01-29 11:00", empleado: "Juan Pérez", tipo: "Entrada", cantidad: 30, referencia: "#ENT-2024-043" },
  { id: 6, producto: "Nike Air Force 1", fecha: "2024-01-28 15:30", empleado: "Maria López", tipo: "Salida", cantidad: -8, referencia: "#VTA-2024-087" },
  { id: 7, producto: "Adidas Stan Smith", fecha: "2024-01-28 09:15", empleado: "Carlos Ruiz", tipo: "Entrada", cantidad: 20, referencia: "#ENT-2024-042" },
  { id: 8, producto: "Puma Suede Classic", fecha: "2024-01-27 14:00", empleado: "Ana Garcia", tipo: "Salida", cantidad: -3, referencia: "#VTA-2024-086" },
]

export default function Historial() {
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)

  const totalEntradas = movimientosEjemplo.filter(m => m.tipo === "Entrada").length
  const totalSalidas = movimientosEjemplo.filter(m => m.tipo === "Salida").length

  const movimientosFiltrados = movimientosEjemplo.filter(m => {
    const coincideBusqueda = m.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.referencia.toLowerCase().includes(busqueda.toLowerCase())
    const coincideTipo = filtroTipo === "Todos" || m.tipo === filtroTipo
    return coincideBusqueda && coincideTipo
  })

  function seleccionarFiltro(tipo) {
    setFiltroTipo(tipo)
    setDropdownAbierto(false)
  }

  return (
    <div className="pagina-historial">
      <div className="encabezado-pagina">
        <h1>Historial Completo</h1>
        <p>Todos los movimientos del inventario</p>
      </div>

      {/* tarjetas resumen */}
      <div className="tarjetas-resumen">
        <div className="tarjeta-resumen">
          <p className="resumen-label">Total Movimientos</p>
          <h2 className="resumen-numero">{movimientosEjemplo.length}</h2>
        </div>

        <div className="tarjeta-resumen">
          <div className="resumen-icono icono-entrada">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <p className="resumen-label">Entradas</p>
          <h2 className="resumen-numero verde">{totalEntradas}</h2>
        </div>

        <div className="tarjeta-resumen">
          <div className="resumen-icono icono-salida">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>
          <p className="resumen-label">Salidas</p>
          <h2 className="resumen-numero naranja">{totalSalidas}</h2>
        </div>
      </div>

      {/* filtros */}
      <div className="seccion-filtros">
        <div className="filtros-header">
          <h2>Filtrar Movimientos</h2>
          <p>Busca y filtra el historial completo</p>
        </div>

        <div className="barra-filtros">
          <div className="campo-busqueda">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por producto o referencia..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          <div className="dropdown-wrapper">
            <button className="dropdown-btn" onClick={() => setDropdownAbierto(!dropdownAbierto)}>
              {filtroTipo}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {dropdownAbierto && (
              <div className="dropdown-menu">
                {["Todos", "Entradas", "Salidas"].map(op => (
                  <button
                    key={op}
                    className={`dropdown-opcion ${filtroTipo === op ? "opcion-activa" : ""}`}
                    onClick={() => seleccionarFiltro(op)}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* lista de movimientos */}
      <div className="seccion-lista">
        <div className="lista-header">
          <h2>Historial Completo</h2>
          <p>{movimientosFiltrados.length} movimientos encontrados</p>
        </div>

        <div className="lista-movimientos">
          {movimientosFiltrados.length === 0 ? (
            <p className="sin-datos">No se encontraron movimientos</p>
          ) : (
            movimientosFiltrados.map(m => (
              <div key={m.id} className="fila-movimiento">
                <div className={`icono-movimiento ${m.tipo === "Entrada" ? "icono-entrada" : "icono-salida"}`}>
                  {m.tipo === "Entrada" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                  )}
                </div>

                <div className="info-movimiento">
                  <p className="nombre-producto">{m.producto}</p>
                  <p className="meta-movimiento">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {m.fecha} • {m.empleado}
                  </p>
                </div>

                <div className="lado-derecho">
                  <span className={`badge-cantidad ${m.tipo === "Entrada" ? "badge-entrada" : "badge-salida"}`}>
                    {m.tipo === "Entrada" ? `+${m.cantidad}` : m.cantidad}
                  </span>
                  <span className="referencia">{m.referencia}</span>
                  <button className="boton-detalle" onClick={() => setModalDetalle(m)}>
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* modal detalle */}
      {modalDetalle && (
        <div className="fondo-modal" onClick={() => setModalDetalle(null)}>
          <div className="ventana-modal" onClick={e => e.stopPropagation()}>
            <h2>Detalle del Movimiento</h2>
            <p className="subtitulo-modal">{modalDetalle.referencia}</p>

            <div className="detalle-fila">
              <span className="detalle-label">Producto</span>
              <span className="detalle-valor">{modalDetalle.producto}</span>
            </div>
            <div className="detalle-fila">
              <span className="detalle-label">Tipo</span>
              <span className={`detalle-valor ${modalDetalle.tipo === "Entrada" ? "verde" : "naranja"}`}>{modalDetalle.tipo}</span>
            </div>
            <div className="detalle-fila">
              <span className="detalle-label">Cantidad</span>
              <span className="detalle-valor">{modalDetalle.tipo === "Entrada" ? `+${modalDetalle.cantidad}` : modalDetalle.cantidad}</span>
            </div>
            <div className="detalle-fila">
              <span className="detalle-label">Empleado</span>
              <span className="detalle-valor">{modalDetalle.empleado}</span>
            </div>
            <div className="detalle-fila">
              <span className="detalle-label">Fecha</span>
              <span className="detalle-valor">{modalDetalle.fecha}</span>
            </div>

            <div className="pie-modal">
              <button className="boton-cerrar" onClick={() => setModalDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}