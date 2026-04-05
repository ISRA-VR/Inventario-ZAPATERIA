import { useState } from "react";
import "../../styles/styles-POS/caja.css";


const productosDisponibles = [
  { id: 1, nombre: "Zapatilla para dama", precio: 150, stock: 10, marca: "Nike" },
  { id: 2, nombre: "Tennis deportivo", precio: 150, stock: 10, marca: "Adidas" },
  { id: 3, nombre: "Vans Old Skool", precio: 200, stock: 8, marca: "Vans" },
  { id: 4, nombre: "Puma RS-X", precio: 220, stock: 5, marca: "Puma" },
  { id: 5, nombre: "Converse Chuck 70", precio: 180, stock: 12, marca: "Converse" },
  { id: 6, nombre: "New Balance 574", precio: 250, stock: 7, marca: "New Balance" },
];

export default function NuevaVenta() {
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([
    { ...productosDisponibles[0], cantidad: 2 },
    { ...productosDisponibles[1], cantidad: 1 },
  ]);
  const [pagoCon, setPagoCon] = useState(500);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [sugerencias, setSugerencias] = useState([]);

  const subtotal = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const cambio = pagoCon - subtotal > 0 ? pagoCon - subtotal : 0;

  const handleBusqueda = (val) => {
    setBusqueda(val);
    if (val.trim().length > 0) {
      setSugerencias(
        productosDisponibles.filter((p) =>
          p.nombre.toLowerCase().includes(val.toLowerCase()) ||
          p.marca.toLowerCase().includes(val.toLowerCase())
        )
      );
    } else {
      setSugerencias([]);
    }
  };

  const agregarProducto = (prod) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === prod.id);
      if (existe) {
        return prev.map((p) =>
          p.id === prod.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
    setBusqueda("");
    setSugerencias([]);
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, cantidad: p.cantidad + delta } : p))
        .filter((p) => p.cantidad > 0)
    );
  };

  const eliminar = (id) => setCarrito((prev) => prev.filter((p) => p.id !== id));

  const cancelar = () => {
    setCarrito([]);
    setBusqueda("");
    setSugerencias([]);
  };

  return (
    <div className="nv-wrapper">
      {/* Header */}
      <div className="nv-header">
        <div className="nv-header-left">
          <div className="nv-logo">B</div>
          <div>
            <span className="nv-breadcrumb">Ventas</span>
            <span className="nv-breadcrumb-sep"> / </span>
            <span className="nv-breadcrumb-active">Nueva venta</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="nv-body">
        {/* Panel izquierdo */}
        <div className="nv-left">
          {/* Barra búsqueda */}
          <div className="nv-search-row">
            <div className="nv-search-wrap">
              <span className="nv-search-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                className="nv-search-input"
                placeholder="Buscar producto o marca..."
                value={busqueda}
                onChange={(e) => handleBusqueda(e.target.value)}
              />
              {sugerencias.length > 0 && (
                <ul className="nv-sugerencias">
                  {sugerencias.map((s) => (
                    <li key={s.id} onClick={() => agregarProducto(s)}>
                      <span className="sug-nombre">{s.nombre}</span>
                      <span className="sug-info">{s.marca} · Stock: {s.stock}</span>
                      <span className="sug-precio">${s.precio}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="nv-btn-cancelar" onClick={cancelar}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
              Cancelar venta
            </button>
          </div>

          {/* Tabla carrito */}
          {carrito.length > 0 ? (
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="prod-nombre">{p.nombre}</p>
                        <p className="prod-stock">Stock: {p.stock}</p>
                      </td>
                      <td className="td-precio">${p.precio}</td>
                      <td>
                        <div className="qty-control">
                          <button onClick={() => cambiarCantidad(p.id, -1)}>−</button>
                          <span>{p.cantidad}</span>
                          <button onClick={() => cambiarCantidad(p.id, 1)}>+</button>
                        </div>
                      </td>
                      <td className="td-total">${p.precio * p.cantidad}</td>
                      <td>
                        <button className="btn-delete" onClick={() => eliminar(p.id)}>
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="nv-empty">
              <svg width="56" height="56" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p>El carrito está vacío</p>
              <span>Busca un producto para agregarlo</span>
            </div>
          )}
        </div>

        {/* Panel derecho — resumen */}
        <div className="nv-right">
          <h2 className="nv-resumen-title">Resumen de venta</h2>

          <div className="nv-resumen-rows">
            <div className="resumen-row">
              <span>Subtotal</span>
              <span>${subtotal}</span>
            </div>
            <div className="resumen-row">
              <span>Pago con</span>
              <input
                className="pago-input"
                type="number"
                value={pagoCon}
                onChange={(e) => setPagoCon(Number(e.target.value))}
              />
            </div>
            <div className="resumen-row">
              <span>Cambio</span>
              <span className="cambio-val">${cambio}</span>
            </div>
            <div className="resumen-divider" />
            <div className="resumen-row resumen-total">
              <span>Total</span>
              <span>${subtotal}</span>
            </div>
          </div>

          <div className="nv-metodo">
            <p className="nv-metodo-label">Método de pago</p>
            <div className="nv-metodo-btns">
              {[
                { key: "efectivo", label: "Efectivo", icon: "💵" },
                { key: "tarjeta", label: "Tarjeta", icon: "💳" },
                { key: "transferencia", label: "Transferencia", icon: "📲" },
              ].map((m) => (
                <button
                  key={m.key}
                  className={`metodo-btn ${metodoPago === m.key ? "active" : ""}`}
                  onClick={() => setMetodoPago(m.key)}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button className="nv-btn-finalizar" disabled={carrito.length === 0}>
            Finalizar venta
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}