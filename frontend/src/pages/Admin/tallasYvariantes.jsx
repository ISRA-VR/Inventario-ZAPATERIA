import { useState } from "react"
import "../../styles/tallasYvariantes.css"

// datos de prueba
const tallasEjemplo = [
  { id: 1, talla: 38, unidades: 24 },
  { id: 2, talla: 39, unidades: 18 },
  { id: 3, talla: 40, unidades: 32 },
  { id: 4, talla: 41, unidades: 45 },
  { id: 5, talla: 42, unidades: 28 },
  { id: 6, talla: 43, unidades: 12 },
]

export default function TallasYvariantes() {
  const [listaTallas, setListaTallas] = useState(tallasEjemplo)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [tallaEditando, setTallaEditando] = useState(null)
  const [tallaAEliminar, setTallaAEliminar] = useState(null)
  const [formulario, setFormulario] = useState({ talla: "", unidades: "" })

  function abrirModalNueva() {
    setTallaEditando(null)
    setFormulario({ talla: "", unidades: "" })
    setModalAbierto(true)
  }

  function abrirModalEditar(t) {
    setTallaEditando(t)
    setFormulario({ talla: t.talla, unidades: t.unidades })
    setModalAbierto(true)
  }

  function abrirModalEliminar(t) {
    setTallaAEliminar(t)
    setModalEliminar(true)
  }

  function cerrarModales() {
    setModalAbierto(false)
    setModalEliminar(false)
    setTallaEditando(null)
    setTallaAEliminar(null)
  }

  function guardar() {
    if (!formulario.talla || !formulario.unidades) return

    if (tallaEditando) {
      setListaTallas(prev =>
        prev.map(t =>
          t.id === tallaEditando.id
            ? { ...t, talla: Number(formulario.talla), unidades: Number(formulario.unidades) }
            : t
        )
      )
    } else {
      const nuevoId = listaTallas.length > 0 ? Math.max(...listaTallas.map(t => t.id)) + 1 : 1
      setListaTallas(prev => [
        ...prev,
        { id: nuevoId, talla: Number(formulario.talla), unidades: Number(formulario.unidades) }
      ])
    }

    cerrarModales()
  }

  function eliminar() {
    setListaTallas(prev => prev.filter(t => t.id !== tallaAEliminar.id))
    cerrarModales()
  }

  function actualizar(campo, valor) {
    setFormulario(prev => ({ ...prev, [campo]: valor }))
  }

  return (
    <div className="pagina-tallas">
      <div className="encabezado-pagina">
        <div>
          <h1>Tallas y Variantes</h1>
          <p>Gestiona las tallas disponibles y sus colores</p>
        </div>
        <button className="boton-nueva-talla" onClick={abrirModalNueva}>
          + Nueva Talla
        </button>
      </div>

      <div className="grid-tallas">
        {listaTallas.map(t => (
          <div key={t.id} className="tarjeta-talla">
            <div className="tarjeta-header">
              <h2>Talla {t.talla}</h2>
              <div className="tarjeta-acciones">
                <button className="btn-icono btn-editar" onClick={() => abrirModalEditar(t)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn-icono btn-eliminar" onClick={() => abrirModalEliminar(t)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
            <p className="stock-talla">Stock total: {t.unidades} unidades</p>
          </div>
        ))}
      </div>

      {/* modal crear / editar */}
      {modalAbierto && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal" onClick={e => e.stopPropagation()}>
            <h2>{tallaEditando ? "Editar Talla" : "Agregar Nueva Talla"}</h2>
            <p className="subtitulo-modal">
              {tallaEditando ? "Modifica los datos de la talla" : "Define la talla y sus variantes de color"}
            </p>

            <div className="fila-campos">
              <div className="grupo-campo">
                <label>Talla</label>
                <input
                  type="number"
                  placeholder="Ej: 40"
                  value={formulario.talla}
                  onChange={e => actualizar("talla", e.target.value)}
                />
              </div>
              <div className="grupo-campo">
                <label>Unidades</label>
                <input
                  type="number"
                  placeholder="Ej: 32"
                  value={formulario.unidades}
                  onChange={e => actualizar("unidades", e.target.value)}
                />
              </div>
            </div>

            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-guardar" onClick={guardar}>Guardar Talla</button>
            </div>
          </div>
        </div>
      )}

      {/* modal eliminar */}
      {modalEliminar && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal ventana-chica" onClick={e => e.stopPropagation()}>
            <h2>¿Estás seguro de eliminar la Talla {tallaAEliminar?.talla}?</h2>
            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-aceptar" onClick={eliminar}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}