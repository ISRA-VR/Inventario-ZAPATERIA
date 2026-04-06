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

### Recuperación de contraseña con Gmail (Google)
Para enviar correos reales de recuperación, crea/actualiza el archivo `backend/.env` con lo siguiente:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=zapateria_login
DB_PORT=3306

JWT_SECRET=tu_jwt_secret
JWT_RESET_SECRET=tu_jwt_reset_secret

GMAIL_USER=tu_correo@gmail.com
GMAIL_APP_PASSWORD=tu_app_password_de_google
FRONTEND_URL=http://localhost:5173
```

Pasos en Google:
1. Activa verificación en dos pasos en tu cuenta.
2. Crea una "Contraseña de aplicación" para "Correo".
3. Usa esa contraseña en `GMAIL_APP_PASSWORD` (no tu contraseña normal).

Endpoints disponibles:
- `POST /api/auth/forgot-password` con body `{ "email": "correo@dominio.com" }`
- `POST /api/auth/reset-password` con body `{ "token": "...", "password": "nuevaPassword" }`

El enlace enviado por correo abre:
- `FRONTEND_URL/reset-password?token=...`

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

## Compartir Un Link De Prueba (Frontend + Backend)
Si quieres que otra persona pruebe tu app desde su celular/computadora, la forma mas directa es:

1. Subir backend en Render (o Railway)
2. Subir frontend en Vercel
3. Conectar el frontend al backend con variable `VITE_API_BASE_URL`

### Backend En Render
1. Sube este repo a GitHub.
2. En Render, crea un `Web Service` apuntando a la carpeta `backend`.
3. Build command:
   - `npm install`
4. Start command:
   - `node index.js`
5. Variables de entorno minimas:
   - `PORT=3001` (Render puede inyectar su propio puerto)
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
   - `JWT_SECRET`, `JWT_RESET_SECRET`
   - `FRONTEND_URL=https://TU_FRONTEND.vercel.app`
6. Guarda la URL publica del backend, por ejemplo:
   - `https://tu-backend.onrender.com`

### Frontend En Vercel
1. En Vercel, importa el mismo repo y selecciona carpeta `frontend`.
2. Framework: Vite.
3. Agrega variable de entorno:
   - `VITE_API_BASE_URL=https://tu-backend.onrender.com`
4. Deploy.

Con eso ya tendras un link publico para compartir.

### Prueba Local Con Variables
En local puedes seguir usando `localhost` con:

1. Copia `frontend/.env.example` a `frontend/.env`.
2. Ajusta:
   - `VITE_API_BASE_URL=http://localhost:3001`
3. Corre frontend:
   - `npm run dev`
