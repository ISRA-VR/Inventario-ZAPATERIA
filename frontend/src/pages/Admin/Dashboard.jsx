import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import "../../styles/dashboard.css"

// datos para la grafica
const datosMovimientos = [
  { mes: "Ene", cantidad: 260 },
  { mes: "Feb", cantidad: 275 },
  { mes: "Mar", cantidad: 320 },
  { mes: "Abr", cantidad: 305 },
  { mes: "May", cantidad: 350 },
]

// top 5 productos mas vendidos
const productosTop = [
  { posicion: 1, nombre: "Nike Air Max 270", stock: 145, ventas: 89 },
  { posicion: 2, nombre: "Adidas Ultraboost", stock: 98, ventas: 76 },
  { posicion: 3, nombre: "Puma RS-X", stock: 67, ventas: 65 },
  { posicion: 4, nombre: "Reebok Classic", stock: 45, ventas: 52 },
  { posicion: 5, nombre: "New Balance 574", stock: 23, ventas: 48 },
]

export default function Dashboard() {
  return (
    <div className="pagina-dashboard">
      <div className="encabezado-pagina">
        <h1>Dashboard</h1>
        <p>Resumen general del inventario</p>
      </div>

      {/* tarjetas de resumen */}
      <div className="tarjetas-resumen">
        <div className="tarjeta">
          <div className="tarjeta-info">
            <p className="tarjeta-label">Productos Totales</p>
            <h2 className="tarjeta-numero">1,245</h2>
            <span className="tarjeta-cambio positivo">+12.5%</span>
          </div>
          <div className="tarjeta-icono icono-azul">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <p className="tarjeta-label">Entradas del Mes</p>
            <h2 className="tarjeta-numero">342</h2>
            <span className="tarjeta-cambio positivo">+8.2%</span>
          </div>
          <div className="tarjeta-icono icono-verde">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <p className="tarjeta-label">Salidas del Mes</p>
            <h2 className="tarjeta-numero">289</h2>
            <span className="tarjeta-cambio negativo">-3.1%</span>
          </div>
          <div className="tarjeta-icono icono-naranja">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <p className="tarjeta-label">Stock Bajo</p>
            <h2 className="tarjeta-numero">23</h2>
            <span className="tarjeta-cambio critico">Crítico</span>
          </div>
          <div className="tarjeta-icono icono-rojo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        </div>
      </div>

      {/* seccion inferior */}
      <div className="seccion-inferior">

        {/* grafica */}
        <div className="card-grafica">
          <div className="card-header">
            <h2>Movimientos de Inventario</h2>
            <p>Últimos 5 meses</p>
          </div>
          <div className="grafica-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={datosMovimientos} barSize={40}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} domain={[0, 400]} ticks={[0, 90, 180, 270, 360]} />
                <Bar dataKey="cantidad" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* productos top */}
        <div className="card-top">
          <div className="card-header">
            <h2>Productos Más Vendidos</h2>
            <p>Top 5 del mes</p>
          </div>
          <div className="lista-top">
            {productosTop.map(p => (
              <div key={p.posicion} className="fila-top">
                <div className="numero-posicion">{p.posicion}</div>
                <div className="info-producto">
                  <p className="nombre-producto">{p.nombre}</p>
                  <p className="stock-producto">Stock: {p.stock}</p>
                </div>
                <div className="ventas-producto">
                  <p className="numero-ventas">{p.ventas}</p>
                  <p className="label-ventas">ventas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}