# Palacio Gamer

Aplicacion web desarrollada con Django REST Framework, React, Vite y
MongoDB Atlas. MongoDB es la unica base de datos utilizada por el proyecto.

## Requisitos

- Python 3.10 o superior.
- Node.js 20 o superior.
- npm.
- Un cluster de MongoDB Atlas.

En MongoDB Atlas, la direccion IP del equipo debe estar permitida en
`Network Access` y el usuario de la base de datos debe tener permisos de
lectura y escritura.

## Primera instalacion

### 1. Configurar MongoDB

Dentro de `backend`, cree el archivo `.env` tomando como referencia
`backend/.env.example`:

```env
MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_NAME=palacio_gamer
MONGODB_TIMEOUT_MS=5000
```

No publique `backend/.env`. El archivo ya esta excluido mediante
`.gitignore`.

Si la contrasena contiene caracteres especiales como `@`, `:`, `/` o `#`,
deben codificarse para poder usarlos dentro de una URI.

### 2. Preparar el backend en PowerShell

Desde la raiz del proyecto:

```powershell
python -m venv .\backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
.\backend\.venv\Scripts\python.exe .\backend\manage.py migrate
```

Para crear o actualizar los usuarios y categorias de demostracion:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py seed_store
```

Para crear una cuenta que pueda ingresar al Admin de Django:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py createsuperuser
```

### 3. Preparar el backend en Git Bash para Windows

Desde la raiz del proyecto:

```bash
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install --upgrade pip
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe backend/manage.py migrate
backend/.venv/Scripts/python.exe backend/manage.py seed_store
```

Aunque se use Git Bash, el entorno virtual pertenece a Windows. Por eso los
ejecutables estan en `Scripts` y no en `bin`.

En Linux o macOS, la ruta equivalente si es:

```bash
backend/.venv/bin/python
```

### 4. Preparar el frontend

```powershell
Set-Location .\frontend
npm install
```

En Bash:

```bash
cd frontend
npm install
```

## Como ejecutar el programa

Se necesitan dos terminales abiertas desde la raiz del proyecto.

### Inicio rapido en Git Bash para Windows

Desde la raiz del proyecto, ejecute primero:

```bash
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe backend/manage.py migrate
```

Después abra dos terminales.

### Terminal 1: backend

PowerShell:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py runserver
```

Git Bash para Windows:

```bash
backend/.venv/Scripts/python.exe backend/manage.py runserver
```

El backend quedara disponible en:

```text
http://127.0.0.1:8000/
```

### Terminal 2: frontend

PowerShell:

```powershell
Set-Location .\frontend
npm run dev
```

Git Bash, Linux o macOS:

```bash
cd frontend
npm run dev
```

El frontend quedara disponible en:

```text
http://localhost:5173/
```

Vite redirige automaticamente las solicitudes `/api` y `/media` al backend
en `http://127.0.0.1:8000`.

## Accesos de demostracion

Empleado:

```text
URL: http://localhost:5173/empleado
Usuario: GMR-0000
Contrasena: PalacioGamer#2026!
```

Cliente:

```text
URL: http://localhost:5173/login
Usuario: CLT-0000
Contrasena: PalacioGamerCliente#2026!
```

Admin de Django:

```text
http://127.0.0.1:8000/admin/
```

El Admin requiere la cuenta creada con `createsuperuser`.

## Comandos utiles

Comprobar la configuracion del backend:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py check --database default
```

Aplicar nuevas migraciones:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py migrate
```

Recrear los datos de demostracion:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py seed_store --reset
```

`--reset` elimina categorias, productos, pedidos, notificaciones y elementos
del carrito antes de ejecutar el seed. No debe utilizarse sobre informacion
que se quiera conservar.

Construir el frontend para produccion:

```powershell
Set-Location .\frontend
npm run build
```

## Problemas comunes

### El backend no conecta con MongoDB

Revise:

- que `backend/.env` exista;
- que `MONGODB_URI` no conserve los textos `USUARIO`, `CONTRASENA` o
  `CLUSTER`;
- que la IP del equipo este permitida en MongoDB Atlas;
- que el usuario de Atlas tenga permisos sobre la base configurada;
- que la contrasena tenga sus caracteres especiales codificados.

### El frontend muestra "Backend no disponible"

Compruebe que Django este ejecutandose en:

```text
http://127.0.0.1:8000/
```

### El puerto ya esta ocupado

Detenga el proceso anterior con `Ctrl + C` o ejecute Django en otro puerto:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py runserver 8001
```

Si cambia el puerto del backend, tambien debe actualizar el destino del proxy
en `frontend/vite.config.js`.
