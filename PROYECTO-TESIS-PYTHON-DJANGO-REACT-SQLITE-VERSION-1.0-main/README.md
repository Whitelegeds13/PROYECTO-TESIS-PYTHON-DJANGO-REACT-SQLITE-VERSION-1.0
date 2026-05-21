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
.\venv\Scripts\python backend\manage.py makemigrations
.\venv\Scripts\python backend\manage.py migrate
.\venv\Scripts\python backend\manage.py seed_store
.\venv\Scripts\python backend\manage.py runserver
```

URLs útiles:

- Panel Django: http://127.0.0.1:8000/admin/
- Tokens (login API):
  - `POST http://127.0.0.1:8000/api/token/`
  - `POST http://127.0.0.1:8000/api/token/refresh/`

La base de datos SQLite se guarda en `backend/db.sqlite3`.

Si necesitas entrar al admin, crea un superusuario (opcional):

```powershell
.\venv\Scripts\python backend\manage.py createsuperuser
```

Seed (Palacio Gamer):

- Comando: `python manage.py seed_store`
- Qué hace: borra y recrea datos de la app `store` (categorías destacadas, 32 productos, pedidos, notificaciones y carrito) con imágenes en base64 guardadas en SQLite.

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

## Ejecución (Linux / macOS - Bash)

### 1) Backend (Django + SQLite)

Desde la carpeta raíz del proyecto:

```bash
sudo apt update
# En Ubuntu/Debian (si falla `python3 -m venv` por ensurepip):
sudo apt install -y python3-venv
# Si tu Python es 3.12 y sigue fallando, usa:
# sudo apt install -y python3.12-venv

python3 -m venv venv
. venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install "Django<6" djangorestframework django-cors-headers djangorestframework-simplejwt
python3 backend/manage.py makemigrations
python3 backend/manage.py migrate
python3 backend/manage.py seed_store
python3 backend/manage.py runserver
```

Si el backend está arriba, deberías poder abrir:

- API: http://127.0.0.1:8000/api/categories/
- Admin: http://127.0.0.1:8000/admin/

Si necesitas entrar al admin, crea un superusuario (opcional):

```bash
python backend/manage.py createsuperuser
```

### 2) Frontend (React + Tailwind)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrir:

- Frontend: http://localhost:5173/

Notas:

- Si ves `ECONNREFUSED 127.0.0.1:8000` en Vite, es porque el backend no está corriendo aún en ese host/puerto.
- El proxy de Vite envía `/api/*` a `http://127.0.0.1:8000`.
- Si te sale `source: no se encontró la orden`, usa `. venv/bin/activate` (punto + espacio) o abre una shell bash.

## Uso

1. Inicia el backend (Django) en `http://127.0.0.1:8000`.
2. Inicia el frontend (React) en `http://localhost:5173`.
3. Abre el Home en `http://localhost:5173/` y navega a `/hardware` y `/mis-pedidos`.
