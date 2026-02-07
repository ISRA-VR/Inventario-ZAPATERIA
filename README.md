# Inventario Zapatería — Guía de instalación

Este proyecto tiene un **backend** en Express + MySQL y un **frontend** en React (Vite).

## Requisitos
- Node.js 18 o superior (recomendado 20+).
- npm (incluido con Node).
- MySQL 5.7+ / 8.0 (local, Laragon o Docker).
- Puertos usados: backend 3001, frontend 5173.

## Estructura
- Backend: [backend](backend)
- Frontend: [frontend](frontend)

## Configuración del backend
1) Copia el archivo de ejemplo y ajusta tus credenciales:

```
cd backend
copy .env.example .env
```

Edita [backend/.env](backend/.env) según tu entorno:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=zapateria_login
DB_PORT=3306
```

## Base de datos
1) Crear la base de datos (si no existe):

```bash
mysql -u root -p -e "CREATE DATABASE zapateria_login CHARACTER SET utf8mb4;"
```

2) Semilla de datos (crea tabla `usuarios` y dos usuarios demo):

```bash
cd backend
node scripts/seed.js
```

Usuarios de prueba:
- Admin: `admin@demo.com` / `123456`
- Empleado: `empleado@demo.com` / `123456`

## Instalación de dependencias
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Ejecución
```bash
# Iniciar backend (http://localhost:3001)
cd backend
npm start

# Iniciar frontend (http://localhost:5173)
cd ../frontend
npm run dev
```

El frontend llama al backend en [frontend/src/api/auth.js](frontend/src/api/auth.js). Si cambias el host/puerto del backend, actualiza ese archivo.

## Docker (opcional para MySQL)
Si no quieres instalar MySQL local, puedes usar Docker:

```bash
docker run -d --name mysql-zapateria \
  -e MYSQL_ROOT_PASSWORD=tu_password \
  -e MYSQL_DATABASE=zapateria_login \
  -p 3306:3306 mysql:8.0
```

Luego ajusta [backend/.env](backend/.env):

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=zapateria_login
DB_PORT=3306
```

## Solución de problemas
- MySQL no conecta: verifica servicio activo y credenciales de [backend/.env](backend/.env).
- Puertos ocupados: cambia puerto del backend en [backend/index.js](backend/index.js) y actualiza el frontend.
- CORS: el backend ya usa `cors()`. Asegúrate de iniciar ambos servicios.

## Notas
- Revisa [backend/config/db.js](backend/config/db.js) para detalles de conexión.
- Scripts del backend: `npm start` inicia el servidor; el seed se ejecuta con `node scripts/seed.js`.