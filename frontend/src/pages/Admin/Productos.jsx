import { useState } from "react"
import "../../styles/productos.css"

// datos de prueba para ver como se ve
const productosEjemplo = [
    { id: 1, descripcion: "Tenis para niño", modelo: 1000, categoria: "Casual", stock: 40, precio: 4000, estado: "Activo" },
    { id: 2, descripcion: "Tenis para niña", modelo: 1100, categoria: "Deportivo", stock: 55, precio: 3450, estado: "Activo" },
    { id: 3, descripcion: "Tenis para caballero", modelo: 1000, categoria: "Casual", stock: 18, precio: 1450, estado: "Stock Bajo" },
    { id: 4, descripcion: "Tenis para dama", modelo: 1100, categoria: "Zapatilla", stock: 117, precio: 13500, estado: "Activo" },
    { id: 5, descripcion: "Zapatos", modelo: 1100, categoria: "Deportivo", stock: 5, precio: 1300, estado: "Stock Bajo" },
]

const categorias = ["Todas las categorías", "Casual", "Deportivo", "Zapatilla"]

const formularioVacio = {
    descripcion: "",
    categoria: "",
  modelo: "",
  precio: "",
  numeroPares: "",
  estado: "Activo",
}

export default function Productos() {
  const [listaProductos, setListaProductos] = useState(productosEjemplo)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas las categorías")

  // modales
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)

  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [formulario, setFormulario] = useState(formularioVacio)

  // filtros
  const productosFiltrados = listaProductos.filter(p => {
    const coincideBusqueda = p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === "Todas las categorías" || p.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  function abrirCrear() {
    setFormulario(formularioVacio)
    setModalCrear(true)
  }

  function abrirEditar(producto) {
    setProductoSeleccionado(producto)
    setFormulario({
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      modelo: producto.modelo,
      precio: producto.precio,
      numeroPares: producto.stock,
      estado: producto.estado,
    })
    setModalEditar(true)
  }

  function abrirEliminar(producto) {
    setProductoSeleccionado(producto)
    setModalEliminar(true)
  }

  function cerrarModales() {
    setModalCrear(false)
    setModalEditar(false)
    setModalEliminar(false)
    setProductoSeleccionado(null)
  }

  function guardarNuevo() {
    if (!formulario.descripcion || !formulario.precio) return

    const nuevo = {
      id: listaProductos.length > 0 ? Math.max(...listaProductos.map(p => p.id)) + 1 : 1,
      descripcion: formulario.descripcion,
      modelo: formulario.modelo || "0000",
      categoria: formulario.categoria || "Sin categoría",
      stock: Number(formulario.numeroPares) || 0,
      precio: Number(formulario.precio) || 0,
      estado: formulario.estado,
    }

    setListaProductos(prev => [...prev, nuevo])
    cerrarModales()
  }

  function guardarEdicion() {
    if (!formulario.descripcion || !formulario.precio) return

    setListaProductos(prev =>
      prev.map(p =>
        p.id === productoSeleccionado.id
          ? {
              ...p,
              descripcion: formulario.descripcion,
              categoria: formulario.categoria,
              modelo: formulario.modelo,
              stock: Number(formulario.numeroPares),
              precio: Number(formulario.precio),
              estado: formulario.estado,
            }
          : p
      )
    )
    cerrarModales()
  }

  function confirmarEliminar() {
    setListaProductos(prev => prev.filter(p => p.id !== productoSeleccionado.id))
    cerrarModales()
  }

  function actualizarCampo(campo, valor) {
    setFormulario(prev => ({ ...prev, [campo]: valor }))
  }

  function formatearPrecio(precio) {
    return `$${Number(precio).toLocaleString("es-MX")}`
  }

  return (
    <div className="pagina-productos">
      <div className="encabezado-pagina">
        <div>
          <h1>Gestión de Productos</h1>
          <p>Administra el catálogo completo de productos</p>
        </div>
        <button className="boton-nuevo" onClick={abrirCrear}>
          + Nuevo Producto
        </button>
      </div>

      <div className="seccion-lista">
        <div className="lista-header">
          <div>
            <h2>Lista de Productos</h2>
            <span className="total-productos">{listaProductos.length} productos en total</span>
          </div>
        </div>

        <div className="filtros">
          <div className="campo-busqueda">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="select-categoria"
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value)}
          >
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-productos">
            <thead>
              <tr>
                <th>Descripcion</th>
                <th>Modelo</th>
                <th>Categoria</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="sin-datos">No se encontraron productos</td>
                </tr>
              ) : (
                productosFiltrados.map(producto => (
                  <tr key={producto.id}>
                    <td>{producto.descripcion}</td>
                    <td>{producto.modelo}</td>
                    <td>{producto.categoria}</td>
                    <td>{producto.stock}</td>
                    <td>{formatearPrecio(producto.precio)}</td>
                    <td>
                      <span className={`estado-badge ${producto.estado === "Activo" ? "estado-activo" : "estado-bajo"}`}>
                        {producto.estado}
                      </span>
                    </td>
                    <td>
                      <div className="botones-accion">
                        <button className="btn-editar" onClick={() => abrirEditar(producto)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-eliminar" onClick={() => abrirEliminar(producto)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal crear */}
      {modalCrear && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal" onClick={e => e.stopPropagation()}>
            <h2>Agregar Nuevo Producto</h2>
            <p className="subtitulo-modal">Completa la información del producto</p>

            <div className="grupo-campo">
              <label>Descripcion</label>
              <input
                type="text"
                placeholder="Descripción del producto"
                value={formulario.descripcion}
                onChange={e => actualizarCampo("descripcion", e.target.value)}
              />
            </div>

            <div className="fila-dos-campos">
              <div className="grupo-campo">
                <label>Categoria</label>
                <select value={formulario.categoria} onChange={e => actualizarCampo("categoria", e.target.value)}>
                  <option value="">Selecciona categoría</option>
                  <option value="Casual">Casual</option>
                  <option value="Deportivo">Deportivo</option>
                  <option value="Zapatilla">Zapatilla</option>
                </select>
              </div>
              <div className="grupo-campo">
                <label>Modelo</label>
                <input
                  type="text"
                  placeholder="0000"
                  value={formulario.modelo}
                  onChange={e => actualizarCampo("modelo", e.target.value)}
                />
              </div>
            </div>

            <div className="fila-dos-campos">
              <div className="grupo-campo">
                <label>Precio individual</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formulario.precio}
                  onChange={e => actualizarCampo("precio", e.target.value)}
                />
              </div>
              <div className="grupo-campo">
                <label>Numero de pares</label>
                <input
                  type="number"
                  placeholder="0000"
                  value={formulario.numeroPares}
                  onChange={e => actualizarCampo("numeroPares", e.target.value)}
                />
              </div>
            </div>

            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-guardar" onClick={guardarNuevo}>Guardar Producto</button>
            </div>
          </div>
        </div>
      )}

      {/* modal editar */}
      {modalEditar && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal" onClick={e => e.stopPropagation()}>
            <h2>Editar el producto</h2>
            <p className="subtitulo-modal">Actualiza los datos del producto</p>

            <div className="grupo-campo">
              <label>Descripcion</label>
              <input
                type="text"
                value={formulario.descripcion}
                onChange={e => actualizarCampo("descripcion", e.target.value)}
              />
            </div>

            <div className="fila-dos-campos">
              <div className="grupo-campo">
                <label>Categoria</label>
                <select value={formulario.categoria} onChange={e => actualizarCampo("categoria", e.target.value)}>
                  <option value="Casual">Casual</option>
                  <option value="Deportivo">Deportivo</option>
                  <option value="Zapatilla">Zapatilla</option>
                </select>
              </div>
              <div className="grupo-campo">
                <label>Modelo</label>
                <input
                  type="text"
                  value={formulario.modelo}
                  onChange={e => actualizarCampo("modelo", e.target.value)}
                />
              </div>
            </div>

            <div className="fila-dos-campos">
              <div className="grupo-campo">
                <label>Precio individual</label>
                <input
                  type="number"
                  value={formulario.precio}
                  onChange={e => actualizarCampo("precio", e.target.value)}
                />
              </div>
              <div className="grupo-campo">
                <label>Numero de pares</label>
                <input
                  type="number"
                  value={formulario.numeroPares}
                  onChange={e => actualizarCampo("numeroPares", e.target.value)}
                />
              </div>
            </div>

            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-guardar" onClick={guardarEdicion}>Guardar Producto</button>
            </div>
          </div>
        </div>
      )}

      {/* modal eliminar */}
      {modalEliminar && (
        <div className="fondo-modal" onClick={cerrarModales}>
          <div className="ventana-modal ventana-eliminar" onClick={e => e.stopPropagation()}>
            <h2>¿Estas seguro de eliminar este producto?</h2>
            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModales}>Cancelar</button>
              <button className="boton-aceptar" onClick={confirmarEliminar}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}