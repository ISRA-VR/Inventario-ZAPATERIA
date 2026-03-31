import { useState } from "react"
import "../../styles/empleados.css"

const empleadosEjemplo = [
  { id: 7, nombre: "Administrador Demo", email: "admin@gmail.com", rol: "Admin", fecha: "29/1/2026" },
  { id: 15, nombre: "castaño cruz", email: "empleado@gmail.com", rol: "Empleado", fecha: "17/2/2026" },
]

function IconoLupa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconoBasura() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export default function Empleados() {
  const [listaEmpleados, setListaEmpleados] = useState(empleadosEjemplo)
  const [textoBusqueda, setTextoBusqueda] = useState("")
  const [mostrarModal, setMostrarModal] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState(null)
  const [datosFormulario, setDatosFormulario] = useState({
    nombre: "",
    email: "",
    rol: "Empleado",
    contrasena: "",
  })

  const resultados = listaEmpleados.filter(emp => {
    const texto = textoBusqueda.toLowerCase()
    return emp.nombre.toLowerCase().includes(texto) || emp.email.toLowerCase().includes(texto)
  })

  function abrirModalCrear() {
    setEmpleadoEditando(null)
    setDatosFormulario({ nombre: "", email: "", rol: "Empleado", contrasena: "" })
    setMostrarModal(true)
  }

  function abrirModalEditar(emp) {
    setEmpleadoEditando(emp)
    setDatosFormulario({ nombre: emp.nombre, email: emp.email, rol: emp.rol, contrasena: "" })
    setMostrarModal(true)
  }

  function cerrarModal() {
    setMostrarModal(false)
    setEmpleadoEditando(null)
  }

  function guardar() {
    if (!datosFormulario.nombre || !datosFormulario.email) return

    if (empleadoEditando) {
      setListaEmpleados(prev =>
        prev.map(e => e.id === empleadoEditando.id ? { ...e, ...datosFormulario } : e)
      )
    } else {
      const nuevoId = listaEmpleados.length > 0 ? Math.max(...listaEmpleados.map(e => e.id)) + 1 : 1
      const hoy = new Date()
      const fechaFormateada = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`
      setListaEmpleados(prev => [
        ...prev,
        {
          id: nuevoId,
          nombre: datosFormulario.nombre,
          email: datosFormulario.email,
          rol: datosFormulario.rol,
          fecha: fechaFormateada,
        }
      ])
    }

    cerrarModal()
  }

  function eliminar(id) {
    const confirmado = window.confirm("¿Estás seguro de que quieres eliminar este empleado?")
    if (!confirmado) return
    setListaEmpleados(prev => prev.filter(e => e.id !== id))
  }

  function actualizarCampo(campo, valor) {
    setDatosFormulario(prev => ({ ...prev, [campo]: valor }))
  }

  return (
    <div className="pagina-empleados">
      <div className="encabezado-pagina">
        <h1>Gestión de Empleados</h1>
        <p>Administra Cuentas para los Empleados</p>
      </div>

      <div className="barra-herramientas">
        <div className="campo-busqueda">
          <IconoLupa />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={textoBusqueda}
            onChange={e => setTextoBusqueda(e.target.value)}
          />
        </div>
        <button className="boton-primario" onClick={abrirModalCrear}>
          Crear Empleado
        </button>
      </div>

      <div className="tabla-empleados">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>NOMBRE</th>
              <th>EMAIL</th>
              <th>ROL</th>
              <th>FECHA DE CREACIÓN</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {resultados.length === 0 && (
              <tr>
                <td colSpan={6} className="sin-datos">No se encontraron empleados</td>
              </tr>
            )}
            {resultados.map(emp => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td>{emp.nombre}</td>
                <td>{emp.email}</td>
                <td>
                  <span className={`etiqueta-rol ${emp.rol === "Admin" ? "rol-admin" : "rol-empleado"}`}>
                    {emp.rol}
                  </span>
                </td>
                <td>{emp.fecha}</td>
                <td>
                  <div className="botones-accion">
                    <button className="btn-editar" onClick={() => abrirModalEditar(emp)}>
                      <IconoLapiz />
                    </button>
                    <button className="btn-eliminar" onClick={() => eliminar(emp.id)}>
                      <IconoBasura />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarModal && (
        <div className="fondo-modal" onClick={cerrarModal}>
          <div className="ventana-modal" onClick={e => e.stopPropagation()}>
            <div className="cabecera-modal">
              <h2>{empleadoEditando ? "Editar Empleado" : "Crear Empleado"}</h2>
              <button className="cerrar-modal" onClick={cerrarModal}>✕</button>
            </div>

            <div className="cuerpo-modal">
              <div className="grupo-campo">
                <label>Nombre</label>
                <input
                  type="text"
                  value={datosFormulario.nombre}
                  onChange={e => actualizarCampo("nombre", e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="grupo-campo">
                <label>Email</label>
                <input
                  type="email"
                  value={datosFormulario.email}
                  onChange={e => actualizarCampo("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="grupo-campo">
                <label>Rol</label>
                <select
                  value={datosFormulario.rol}
                  onChange={e => actualizarCampo("rol", e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Empleado">Empleado</option>
                </select>
              </div>

              <div className="grupo-campo">
                <label>
                  Contraseña
                  {empleadoEditando && <span className="texto-opcional"> (opcional)</span>}
                </label>
                <input
                  type="password"
                  value={datosFormulario.contrasena}
                  onChange={e => actualizarCampo("contrasena", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pie-modal">
              <button className="boton-cancelar" onClick={cerrarModal}>Cancelar</button>
              <button className="boton-primario" onClick={guardar}>
                {empleadoEditando ? "Guardar Cambios" : "Crear Empleado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}