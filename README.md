# 🎮 Palacio Gamer (E-commerce de Hardware Premium)

[![Django](https://img.shields.io/badge/Django-5.2.15-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.2.5-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

Aplicación web premium para e-commerce de hardware desarrollada con **Django REST Framework (DRF)** en el backend, **React (v19) + Vite (v8)** en el frontend, y **MongoDB Atlas** como base de datos principal y única.

> [!NOTE]  
> **Nota sobre el nombre del repositorio:** Aunque el nombre de la carpeta raíz contenga `SQLITE`, esta versión de la plataforma utiliza **MongoDB Atlas** como base de datos única y exclusiva, permitiendo almacenamiento moderno de documentos y escalabilidad en la nube.

---

## 📋 Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu sistema:

* **Python 3.10** o superior.
* **Node.js 20** o superior (junto con `npm`).
* Un clúster de **MongoDB Atlas** activo.
  > [!IMPORTANT]  
  > Configura el acceso en Atlas (`Network Access`) para permitir la dirección IP de tu equipo y asegúrate de que el usuario de la base de datos tenga permisos de lectura y escritura (`readWrite`).

---

## 🛠️ Primera Instalación y Configuración

### 1. Configurar Variables de Entorno

Crea un archivo llamado `.env` dentro de la carpeta `backend/` tomando como referencia el archivo `backend/.env.example`:

```env
MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_NAME=palacio_gamer
MONGODB_TIMEOUT_MS=5000
```

> [!WARNING]  
> Si la contraseña de tu base de datos contiene caracteres especiales como `@`, `:`, `/` o `#`, debes codificarlos en formato URL (URL encoding) antes de ponerlos en la URI.

---

### 2. Preparar el Backend (Servidor Django)

Abre una terminal en la raíz del proyecto y ejecuta los siguientes comandos según tu consola:

#### Opción A: En PowerShell (Recomendado para Windows)
```powershell
# 1. Crear el entorno virtual
python -m venv .\backend\.venv

# 2. Actualizar pip
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip

# 3. Instalar las dependencias
.\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt

# 4. Aplicar las migraciones a MongoDB
.\backend\.venv\Scripts\python.exe .\backend\manage.py migrate

# 5. Cargar datos iniciales de prueba (Categorías y Usuarios)
.\backend\.venv\Scripts\python.exe .\backend\manage.py seed_store

# 6. Crear cuenta de administrador de Django (opcional)
.\backend\.venv\Scripts\python.exe .\backend\manage.py createsuperuser
```

#### Opción B: En Git Bash para Windows / Linux / macOS
```bash
# 1. Crear el entorno virtual
python -m venv backend/.venv

# 2. Actualizar pip
backend/.venv/Scripts/python.exe -m pip install --upgrade pip

# 3. Instalar dependencias
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt

# 4. Aplicar migraciones
backend/.venv/Scripts/python.exe backend/manage.py migrate

# 5. Cargar datos iniciales de prueba
backend/.venv/Scripts/python.exe backend/manage.py seed_store

# 6. Crear cuenta de administrador de Django (opcional)
backend/.venv/Scripts/python.exe backend/manage.py createsuperuser
```

---

### 3. Preparar el Frontend (Cliente React)

#### En PowerShell
```powershell
Set-Location .\frontend
npm install
```

#### En Git Bash / Linux / macOS
```bash
cd frontend
npm install
```

---

## 🚀 Cómo Ejecutar el Programa

Para iniciar la aplicación, necesitas abrir **dos pestañas o terminales independientes** desde la raíz del proyecto.

### 💻 Terminal 1: Backend (Django)

Inicia el servidor backend en el puerto `8000`:

* **PowerShell**:
  ```powershell
  .\backend\.venv\Scripts\python.exe .\backend\manage.py runserver
  ```
* **Git Bash / Linux / macOS**:
  ```bash
  backend/.venv/Scripts/python.exe backend/manage.py runserver
  ```

El backend estará disponible en: **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**

---

### 🎨 Terminal 2: Frontend (React + Vite)

Inicia el servidor de desarrollo frontend en el puerto `5173`:

* **PowerShell**:
  ```powershell
  Set-Location .\frontend
  npm run dev
  ```
* **Git Bash / Linux / macOS**:
  ```bash
  cd frontend
  npm run dev
  ```

El frontend estará disponible en: **[http://localhost:5173/](http://localhost:5173/)**

> [!NOTE]  
> Vite está preconfigurado para redirigir de forma transparente las solicitudes de `/api` y `/media` directamente al backend de Django en `http://127.0.0.1:8000`.

---

## 📊 Diagramas y Arquitectura Visual (Mermaid)

El proyecto incluye herramientas automáticas para la generación de diagramas Mermaid basados en el estado actual del código (modelos de Django, endpoints de API, rutas de React, etc.).

Los diagramas generados se pueden consultar en:  
📂 **[diagrams/palacio-gamer.mermaid.md](file:///C:/Users/CESAR%20PC/Documents/GitHub/PROYECTO-TESIS-PYTHON-DJANGO-REACT-SQLITE-VERSION-1.0/diagrams/palacio-gamer.mermaid.md)**

### Comandos de Diagramas (Ejecutar en la carpeta `frontend/`):
* **Generar diagramas manualmente:**
  ```bash
  npm run diagrams
  ```
* **Ejecutar en modo escucha (Watch mode) para regenerar en caliente:**
  ```bash
  npm run diagrams:watch
  ```
* **Levantar cliente de desarrollo y watch de diagramas simultáneamente:**
  ```bash
  npm run dev:with-diagrams
  ```

---

## 🔑 Accesos de Demostración

| Rol | URL de Acceso | Usuario (Username) | Contraseña (Password) |
| :--- | :--- | :--- | :--- |
| **Empleado** | [http://localhost:5173/empleado](http://localhost:5173/empleado) | `GMR-0000` | `PalacioGamer#2026!` |
| **Cliente** | [http://localhost:5173/login](http://localhost:5173/login) | `CLT-0000` | `PalacioGamerCliente#2026!` |
| **Admin Django** | [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) | *El superusuario creado* | *La contraseña ingresada* |

---

## 🛠️ Comandos de Administración Útiles

* **Verificar la conexión de Django con MongoDB**:
  ```powershell
  .\backend\.venv\Scripts\python.exe .\backend\manage.py check --database default
  ```

* **Recrear la base de datos de demostración desde cero** (Limpieza y Seed):
  ```powershell
  .\backend\.venv\Scripts\python.exe .\backend\manage.py seed_store --reset
  ```
  > [!CAUTION]  
  > El argumento `--reset` eliminará todas las categorías, productos, pedidos, notificaciones y elementos de carrito existentes en la base de datos de MongoDB. Úsalo con cuidado.

* **Construir el bundle de producción para el Frontend**:
  ```powershell
  Set-Location .\frontend
  npm run build
  ```

---

## ❓ Solución de Problemas Comunes

### ❌ El backend no puede conectar a MongoDB
1. Verifica que el archivo `backend/.env` exista y contenga los datos correctos del clúster.
2. Comprueba que la dirección IP de tu red local esté añadida en la sección de **Network Access** en la consola de MongoDB Atlas.
3. Asegúrate de codificar los caracteres especiales en tu contraseña de base de datos.

### ❌ El frontend muestra "Backend no disponible"
* Asegúrate de que el servidor de Django en la Terminal 1 esté corriendo correctamente en `http://127.0.0.1:8000`.

### ❌ El puerto 8000 ya está ocupado
Detén el proceso anterior presionando `Ctrl + C` o inicia el backend en otro puerto diferente:
```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py runserver 8001
```
*Si cambias el puerto del backend, asegúrate de actualizar la propiedad `target` del proxy en el archivo `frontend/vite.config.js`.*
