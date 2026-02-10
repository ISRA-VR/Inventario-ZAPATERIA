# Inventario Zapatería – Guía de instalación y ejecución
## Requisitos
- Node.js 18+ (recomendado LTS)
- npm (incluido con Node)
- MySQL/MariaDB en local (por ejemplo, Laragon/XAMPP/WAMP). Por defecto el proyecto usa:
  - Host: `localhost`
  - Puerto: `3306`
  - Usuario: `root`
  - Password: vacío
  - Base de datos: `zapateria_login`

## 1) Configurar Backend
1. Instalar dependencias del backend:
   ```bash
   cd backend
   npm install
   ```

2. Crear base de datos (si no existe):
   - Conéctate a MySQL y ejecuta:
     ```sql
     CREATE DATABASE IF NOT EXISTS zapateria_login CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```

3. Cargar datos de prueba (seed):
   ```bash
   node scripts/seed.js
   ```
   Esto creará la tabla `usuarios` (si no existe) y dos cuentas:
   - Admin: `admin@demo.com` / `123456`
   - Empleado: `empleado@demo.com` / `123456`

4. Iniciar el backend:
   ```bash
   node index.js
   ```
   - URL: http://localhost:3001
   - Endpoint de login: `POST /api/auth/login` con body JSON: `{ "email": "...", "password": "..." }`

> Nota importante JWT: actualmente `authController.js` firma el token con `process.env.JWT_SECRET` (o `SECRET_KEY` por defecto), mientras que `middleware/authMiddleware.js` usa un `SECRET` hardcodeado distinto. Para evitar inconsistencias cuando empieces a proteger rutas, cambia el middleware para que use el mismo `JWT_SECRET` del `.env`.

## 2) Configurar Frontend
1. Instalar dependencias del frontend:
   ```bash
   cd frontend
   npm install
   ```

2. Ejecutar el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   - Vite mostrará la URL (p.ej. http://localhost:5173). Asegúrate que el backend siga activo en `http://localhost:3001`.

## Flujo de ejecución sugerido (dos terminales)
- Terminal 1 (backend):
  ```bash
  cd backend
  npm install
  node scripts/seed.js
  npm index.js
  ```
- Terminal 2 (frontend):
  ```bash
  cd frontend
  npm install lucide-react react-router-dom
  npm install
  npm run dev
  ```
  - lucide-react es una libreria para los iconos,
  - (Opcional pero recomendado) Verificar que se instaló:
  - Abre el archivo frontend/package.json y busca en "dependencies". Deberían aparecer ahí.

## Stack
- Backend: Node.js, Express 5, mysql2, bcryptjs, jsonwebtoken, dotenv, cors
- Frontend: React 19, Vite 7, React Router 7, Axios, Bootstrap 5
