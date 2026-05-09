# PROYECTO-TESIS-PYTHON-DJANGO-REACT-SQLITE-VERSION-1.0

Web para gestión de ventas y almacén/inventario.

## Requisitos

- Python 3.12+ (probado con Python 3.14)
- Node.js 18+ (recomendado 20+)
- npm

## Estructura del proyecto

- `backend/` → Django + SQLite (API y panel administrativo)
- `frontend/` → React (Vite) + Tailwind CSS

## Instalación (Windows / PowerShell)

### 1) Backend (Django + SQLite)

Desde la carpeta raíz del proyecto:

```powershell
py -m venv venv
.\venv\Scripts\python -m pip install --upgrade pip
.\venv\Scripts\python -m pip install "Django<6" djangorestframework django-cors-headers djangorestframework-simplejwt
.\venv\Scripts\python backend\manage.py migrate
.\venv\Scripts\python backend\manage.py createsuperuser
.\venv\Scripts\python backend\manage.py runserver
```

URLs útiles:

- Panel Django: http://127.0.0.1:8000/admin/
- Tokens (login API):
  - `POST http://127.0.0.1:8000/api/token/`
  - `POST http://127.0.0.1:8000/api/token/refresh/`

La base de datos SQLite se guarda en `backend/db.sqlite3`.

### 2) Frontend (React + Tailwind)

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abrir:

- Frontend: http://localhost:5173/

Nota: el frontend ya está configurado para enviar `'/api/*'` al backend en `http://127.0.0.1:8000`.

## Uso

1. Inicia el backend (Django) en `http://127.0.0.1:8000`.
2. Inicia el frontend (React) en `http://localhost:5173`.
3. En el login del frontend, usa el correo/usuario y contraseña del superusuario que creaste con `createsuperuser`.
