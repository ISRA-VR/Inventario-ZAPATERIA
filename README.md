# Inventario Zapatería – Guía de instalación y ejecución

Esta guía te lleva de cero a ejecutar el proyecto (backend + frontend) en tu máquina local, incluyendo instalación de dependencias, configuración de base de datos y seed de usuarios de prueba.

## Requisitos
- Node.js 18+ (recomendado LTS)
- npm (incluido con Node)
- MySQL/MariaDB en local (por ejemplo, Laragon/XAMPP/WAMP). Por defecto el proyecto usa:
  - Host: `localhost`
  - Puerto: `3306`
  - Usuario: `root`
  - Password: vacío
  - Base de datos: `zapateria_login`

## Estructura del proyecto
```
backend/
  index.js
  package.json
  config/
    db.js
  controllers/
    authController.js
  middleware/
    authMiddleware.js
  routes/
    auth.routes.js
  scripts/
    seed.js
frontend/
  package.json
  vite.config.js
  src/
    api/auth.js
    context/AuthContext.jsx
    components/{Captcha,ProtectedRoute,PublicRoute}.jsx
    pages/{Login,Admin,Empleado}.jsx
```

## 1) Configurar Backend
1. Crear archivo de variables de entorno:
   - Copia `backend/.env.example` a `backend/.env` y ajusta valores si es necesario.
   - Campos disponibles:
     - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
     - `JWT_SECRET` (usa un valor largo y aleatorio en producción)

2. Instalar dependencias del backend:
   ```bash
   cd backend
   npm install
   ```

3. Crear base de datos (si no existe):
   - Conéctate a MySQL y ejecuta:
     ```sql
     CREATE DATABASE IF NOT EXISTS zapateria_login CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
   - Si cambias el nombre, actualiza `DB_NAME` en `backend/.env`.

4. Cargar datos de prueba (seed):
   ```bash
   node scripts/seed.js
   ```
   Esto creará la tabla `usuarios` (si no existe) y dos cuentas:
   - Admin: `admin@demo.com` / `123456`
   - Empleado: `empleado@demo.com` / `123456`

5. Iniciar el backend:
   ```bash
   npm start
   # o
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

3. Base URL del API en frontend:
   - Actualmente el login apunta a `http://localhost:3001/api/auth/login` en `frontend/src/api/auth.js`.
   - Si cambias el puerto/host del backend, actualiza esa URL o migra a variables de entorno de Vite (por ej. `import.meta.env.VITE_API_URL`).

## Flujo de ejecución sugerido (dos terminales)
- Terminal 1 (backend):
  ```bash
  cd backend
  npm install
  node scripts/seed.js
  npm start
  ```
- Terminal 2 (frontend):
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

## Solución de problemas
- Puerto ocupado (backend 3001 / frontend 5173):
  - Backend: cambia el puerto en `backend/index.js` y ajusta la URL del frontend.
  - Frontend: Vite te ofrece otro puerto automáticamente o configura `vite.config.js`.
- Error de conexión MySQL:
  - Verifica credenciales en `backend/.env` y que el servicio MySQL esté activo.
  - Asegúrate de que la base `DB_NAME` exista.
- Error de CORS:
  - `cors` ya está habilitado en el backend. Si sirves el frontend desde otro origen no estándar, revisa configuración.
- Token inválido en rutas protegidas:
  - Unifica el secreto JWT entre `authController.js` y `middleware/authMiddleware.js` usando `process.env.JWT_SECRET`.

## Endpoints (resumen)
- `POST /api/auth/login`
  - Body: `{ "email": "string", "password": "string" }`
  - Respuesta exitosa: `{ id, nombre, role, token }`

## Stack
- Backend: Node.js, Express 5, mysql2, bcryptjs, jsonwebtoken, dotenv, cors
- Frontend: React 19, Vite 7, React Router 7, Axios, Bootstrap 5

---
¿Quieres que agregue scripts de `seed` en `backend/package.json` o parametrice la URL del API en el frontend con variables de entorno? Puedo dejarlo listo en un minuto.
