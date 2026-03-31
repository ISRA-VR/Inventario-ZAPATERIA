import { useState } from "react"
import "../../styles/categorias.css"

const categoriasEjemplo = [
  { id: 1, nombre: "Deportivos", descripcion: "Calzado para actividades deportivas", productos: 145 },
  { id: 2, nombre: "Casuales", descripcion: "Calzado de uso diario", productos: 230 },
  { id: 3, nombre: "Formales", descripcion: "Calzado elegante para ocasiones especiales", productos: 89 },
  { id: 4, nombre: "Botas", descripcion: "Botas para diferentes usos", productos: 67 },
  { id: 5, nombre: "Sandalias", descripcion: "Calzado abierto para clima cálido", productos: 102 },
]

const formularioVacio = { nombre: "", descripcion: "" }

export default function Categorias() {
  const [listaCategorias, setListaCategorias] = useState(categoriasEjemplo)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null)
  const [formulario, setFormulario] = useState(formularioVacio)

  function abrirModalNueva() {
    setCategoriaEditando(null)
    setFormulario(formularioVacio)
    setModalAbierto(true)
  }

  function abrirModalEditar(cat) {
    setCategoriaEditando(cat)
    setFormulario({ nombre: cat.nombre, descripcion: cat.descripcion })
    setModalAbierto(true)
  }

  function abrirModalEliminar(cat) {
    setCategoriaAEliminar(cat)
    setModalEliminar(true)
  }

  function cerrarModales() {
    setModalAbierto(false)
    setModalEliminar(false)
    setCategoriaEditando(null)
    setCategoriaAEliminar(null)
  }

  function guardar() {
    if (!formulario.nombre.trim()) return

    if (categoriaEditando) {
      setListaCategorias(prev =>
        prev.map(c =>
          c.id === categoriaEditando.id
            ? { ...c, nombre: formulario.nombre, descripcion: formulario.descripcion }
            : c
        )
      )
    } else {
      const nuevoId = listaCategorias.length > 0 ? Math.max(...listaCategorias.map(c => c.id)) + 1 : 1
      setListaCategorias(prev => [
        ...prev,
        { id: nuevoId, nombre: formulario.nombre, descripcion: formulario.descripcion, productos: 0 }
      ])
    }

    cerrarModales()
  }

  function eliminar() {
    setListaCategorias(prev => prev.filter(c => c.id !== categoriaAEliminar.id))
    cerrarModales()
  }

  function actualizar(campo, valor) {
    setFormulario(prev => ({ ...prev, [campo]: valor }))
  }

  return (
    <div className="pagina-categorias">
      <div className="encabezado-pagina">
        <div>
          <h1>Gestión de Categorías</h1>
          <p>Administra las categorías de productos</p>
        </div>
        <button className="boton-nueva" onClick={abrirModalNueva}>
          + Nueva Categoría
        </button>
      </div>

      <div className="seccion-tabla">
        <div className="tabla-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          <h2>Categorías Registradas</h2>
        </div>

        <table className="tabla-categorias">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listaCategorias.length === 0 ? (
              <tr>
                <td colSpan={4} className="sin-datos">No hay categorías registradas</td>
              </tr>
            ) : (
              listaCategorias.map(cat => (
                <tr key={cat.id}>
                  <td className="nombre-categoria">{cat.nombre}</td>
                  <td className="descripcion-categoria">{cat.descripcion}</td>
                  <td>
                    <span className="badge-productos">{cat.productos}</span>
                  </td>
                  <td>
                    <div className="botones-accion">
                      <button className="btn-editar" onClick={() => abrirModalEditar(cat)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="btn-eliminar" onClick={() => abrirModalEliminar(cat)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* modal crear / editar */}
      {modalAbierto && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal" onClick={e => e.stopPropagation()}>
            <h2>{categoriaEditando ? "Editar Categoría" : "Nueva Categoría"}</h2>
            <p className="subtitulo-modal">
              {categoriaEditando ? "Modifica los datos de la categoría" : "Agrega una nueva categoría de productos"}
            </p>

            <div className="grupo-campo">
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Ej: Deportivos"
                value={formulario.nombre}
                onChange={e => actualizar("nombre", e.target.value)}
              />
            </div>

            <div className="grupo-campo">
              <label>Descripción</label>
              <input
                type="text"
                placeholder="Describe la categoría..."
                value={formulario.descripcion}
                onChange={e => actualizar("descripcion", e.target.value)}
              />
            </div>

            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-guardar" onClick={guardar}>
                {categoriaEditando ? "Guardar Cambios" : "Crear Categoría"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal eliminar */}
      {modalEliminar && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal ventana-chica" onClick={e => e.stopPropagation()}>
            <h2>¿Eliminar la categoría "{categoriaAEliminar?.nombre}"?</h2>
            <p className="subtitulo-modal">Esta acción no se puede deshacer</p>
            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-eliminar-confirm" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}