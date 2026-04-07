# 📦 StockFlow - Sistema de Gestión de Inventario

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)

StockFlow es una plataforma integral de gestión de inventarios diseñada para tiendas de calzado. Permite la administración eficiente de productos, control de modelos, seguimiento de tallas y gestión de usuarios (empleados/administradores) bajo un entorno seguro y responsivo.

## 🚀 Funcionalidades Principales

* **Gestión de Productos:** Registro, actualización y eliminación de modelos de calzado con sus respectivas categorías y precios.
* **Control de Variantes y Tallas:** Administración dinámica del stock inicial por cada talla específica vinculada a un modelo.
* **Gestión de Empleados:** Sistema de autenticación con roles (Admin/Empleado) y control de acceso.
* **Validación Estricta:** Formularios protegidos contra ingresos inválidos (solo números positivos en campos financieros y de stock).
* **Interfaz Reactiva:** Diseño moderno, retroalimentación inmediata (Toastify) y modales interactivos para una experiencia de usuario fluida.

## 🛠️ Stack Tecnológico

El proyecto está construido bajo una arquitectura Cliente-Servidor (Frontend y Backend separados).

**Frontend:**

* [React.js](https://reactjs.org/) (Vite)
* [Axios](https://axios-http.com/) para el consumo de la API REST.
* [Lucide React](https://lucide.dev/) para la iconografía.
* [React Toastify](https://fkhadra.github.io/react-toastify/) para notificaciones.

**Backend:**

* [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
* [MySQL2](https://www.npmjs.com/package/mysql2) con *Connection Pools* para manejo de base de datos.
* JWT (JSON Web Tokens) para autenticación y protección de rutas.

## ⚙️ Requisitos Previos

Asegúrate de tener instalado en tu máquina local:

* [Node.js](https://nodejs.org/) (v16 o superior)
* [MySQL](https://www.mysql.com/) (o un servidor local como XAMPP/Laragon)

## 💻 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
cd tu-repositorio