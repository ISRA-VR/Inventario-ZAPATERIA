import "../styles/Sidebar.css";

const menuItems = [
  "Punto de venta",
  "Historial de ventas",
  "Inventario",
  "Ir a la caja",
  "Facturas",
  "Configuración",
];

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div>
        <h2 className="logo">Beni Van Zapateria</h2>

        <ul className="menu">
          {menuItems.map((item, index) => (
            <li key={index} className={index === 0 ? "active" : ""}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="user">
        <div>
          <p className="name">Andres Lopez Labrador</p>
          <span className="email">admin@gmail.com</span>
        </div>
        <button className="logout">⟵</button>
      </div>
    </div>
  );
}