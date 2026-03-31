import { useState } from "react";
import "../../styles/busquedas.css";

const productos = [
  {
    id: "PRD-001",
    nombre: "Nike Air Max 270",
    sku: "NIK-270-001",
    categoria: "Deportivos",
    talla: 27,
    color: "Negro",
    precio: "$2499.99",
    stock: 145,
    almacen: "Almacén A - Estante 3",
  },
  {
    id: "PRD-002",
    nombre: "Adidas Ultraboost 22",
    sku: "ADI-ULT-002",
    categoria: "Deportivos",
    talla: 26,
    color: "Blanco",
    precio: "$2799.99",
    stock: 98,
    almacen: "Almacén A - Estante 5",
  },
  {
    id: "PRD-003",
    nombre: "Puma RS-X",
    sku: "PUM-RSX-003",
    categoria: "Casual",
    talla: 28,
    color: "Gris",
    precio: "$1899.99",
    stock: 67,
    almacen: "Almacén B - Estante 2",
  },
  {
    id: "PRD-004",
    nombre: "Vans Old Skool",
    sku: "VAN-OLD-004",
    categoria: "Casual",
    talla: 25,
    color: "Negro",
    precio: "$1299.99",
    stock: 34,
    almacen: "Almacén B - Estante 7",
  },
  {
    id: "PRD-005",
    nombre: "New Balance 574",
    sku: "NB-574-005",
    categoria: "Deportivos",
    talla: 27,
    color: "Azul",
    precio: "$2199.99",
    stock: 12,
    almacen: "Almacén C - Estante 1",
  },
];

function TarjetaProducto({ producto }) {
  const getStockClass = (stock) => {
    if (stock > 80) return "verde";
    if (stock > 30) return "naranja";
    return "rojo";
  };

  return (
    <div className="producto-card">
      <span className={`badge-stock ${getStockClass(producto.stock)}`}>
        Stock: {producto.stock}
      </span>

      <div className="producto-icono">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>

      <h3 className="producto-nombre">{producto.nombre}</h3>
      <p className="producto-sku">{producto.sku}</p>

      <hr className="producto-separador" />

      <div className="producto-info">
        <div className="info-fila">
          <span>ID:</span>
          <span>{producto.id}</span>
        </div>
        <div className="info-fila">
          <span>Categoría:</span>
          <span className="badge-categoria">{producto.categoria}</span>
        </div>
        <div className="info-fila">
          <span>Talla:</span>
          <span>{producto.talla}</span>
        </div>
        <div className="info-fila">
          <span>Color:</span>
          <span>{producto.color}</span>
        </div>
        <div className="info-fila">
          <span>Precio:</span>
          <span className="precio">{producto.precio}</span>
        </div>
      </div>

      <div className="producto-ubicacion">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {producto.almacen}
      </div>
    </div>
  );
}

export default function Busquedas() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [resultados, setResultados] = useState(productos);

  const handleBuscar = () => {
    const filtrados = productos.filter((p) => {
      const textoOk = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.sku.toLowerCase().includes(busqueda.toLowerCase());
      const catOk = categoria === "Todas" || p.categoria === categoria;
      return textoOk && catOk;
    });
    setResultados(filtrados);
  };

  return (
    <div className="busquedas-pagina">
      <div className="busquedas-encabezado">
        <h1>Consultas y Búsquedas</h1>
        <p>Encuentra productos rápidamente en el inventario</p>
      </div>

      <div className="buscador-contenedor">
        <h2>Buscador Avanzado</h2>
        <div className="buscador-fila">
          <div className="input-wrapper">
            <input
              type="text"
              className="buscador-input"
              placeholder="Buscar por nombre o ID"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
          </div>

          <select className="buscador-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="Todas">Todas</option>
            <option value="Deportivos">Deportivos</option>
            <option value="Casual">Casual</option>
            <option value="Formal">Formal</option>
          </select>

          <button className="btn-buscar" onClick={handleBuscar}>
            Buscar
          </button>
        </div>
      </div>

      <p className="resultados-titulo">Resultados ({resultados.length})</p>

      {resultados.length > 0 ? (
        <div className="productos-grid">
          {resultados.map((p) => (
            <TarjetaProducto key={p.id} producto={p} />
          ))}
        </div>
      ) : (
        <p className="sin-resultados">No se encontraron productos</p>
      )}
    </div>
  );
}