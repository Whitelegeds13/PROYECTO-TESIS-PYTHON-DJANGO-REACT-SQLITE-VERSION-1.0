# Palacio Gamer - Plataforma de E-Commerce

Plataforma web moderna de comercio electrónico (E-commerce) y administración para **Palacio Gamer**, desarrollada utilizando una arquitectura desacoplada: un backend de alto rendimiento con **FastAPI (Python)** y un frontend interactivo con **React** (empaquetado con **Vite**). Todo esto conectado a una base de datos NoSQL escalable en **MongoDB Atlas**.

---

## 🛠️ Requisitos del Sistema

Para ejecutar este proyecto de manera local, asegúrate de tener instalado:

- **Python 3.10+** (junto con el administrador de paquetes `pip`).
- **Node.js 20+** (junto con `npm`).
- **Git / Git Bash** (especialmente recomendado para usuarios de Windows).
- Acceso a un clúster de **MongoDB Atlas** (con su IP habilitada en el Network Access y un usuario con permisos de lectura/escritura).

---

## ⚙️ Configuración Inicial

### 1. Variables de Entorno del Backend
Dentro del directorio `backend/`, crea un archivo llamado `.env` tomando como base la plantilla `backend/.env.example`. 

Configura tus credenciales de MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<tu-cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_NAME=palacio_gamer
MONGODB_TIMEOUT_MS=5000
```
> [!WARNING]
> Si la contraseña de MongoDB Atlas contiene caracteres especiales como `@`, `:`, `/` o `#`, asegúrate de codificarlos en formato URL (URL encoding) antes de colocarlos en el URI.

---

## 🚀 Guía de Instalación y Ejecución (Solo en Bash)

Sigue estos pasos en tu terminal compatible con Bash (como Git Bash en Windows, o la terminal nativa de macOS y Linux).

### Paso 1: Preparar e Instalar el Backend

Abre una terminal en la raíz del proyecto y ejecuta la siguiente secuencia de comandos:

```bash
# 1. Crear el entorno virtual en la carpeta del backend
python -m venv backend/.venv

# 2. Activar el entorno virtual en Bash
# (Funciona para Git Bash en Windows, macOS y Linux)
source backend/.venv/Scripts/activate || source backend/.venv/bin/activate

# 3. Actualizar pip e instalar dependencias requeridas para FastAPI
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Paso 2: Preparar e Instalar el Frontend

En una nueva terminal o cambiando de directorio en tu terminal actual:

```bash
# 1. Entrar al directorio del frontend
cd frontend

# 2. Instalar los paquetes de Node.js
npm install
```

---

## 💻 Ejecución del Proyecto en Desarrollo

Para ejecutar el programa de manera simultánea en modo desarrollo, necesitarás abrir **dos terminales de Bash** desde la raíz del proyecto:

### 🔴 Terminal 1: Servidor Backend (FastAPI + PyMongo)
Desde la raíz del proyecto:
```bash
# 1. Activar el entorno virtual
source backend/.venv/Scripts/activate || source backend/.venv/bin/activate

# 2. Ejecutar el backend con Uvicorn
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- El servidor FastAPI se levantará en: `http://127.0.0.1:8000`
- La documentación interactiva de la API (Swagger UI) estará disponible en: `http://127.0.0.1:8000/docs`

### 🔵 Terminal 2: Servidor Frontend (React + Vite)
Desde la raíz del proyecto:
```bash
# 1. Entrar al directorio del frontend
cd frontend

# 2. Iniciar el servidor de desarrollo de Vite
npm run dev
```
- El frontend se ejecutará en: `http://localhost:5173`
- Vite redirigirá de manera transparente las peticiones `/api` y `/media` al backend local de FastAPI configurado en el puerto `8000`.

---

## 🔑 Credenciales de Demostración

Una vez que ambos servidores estén activos, puedes probar el sistema usando las siguientes cuentas:

### 👤 Panel de Cliente (Tienda)
- **URL de acceso:** `http://localhost:5173/login`
- **Usuario (Client ID):** `CLT-0000`
- **Contraseña:** `PalacioGamerCliente#2026!`

### 💼 Panel de Empleado (Ventas / Entregas)
- **URL de acceso:** `http://localhost:5173/empleado`
- **Usuario (Employee ID):** `GMR-0000`
- **Contraseña:** `PalacioGamer#2026!`

---

## 🔧 Resolución de Problemas Comunes

### 1. El backend no logra conectar a MongoDB Atlas
- Comprueba que tu dirección IP externa actual esté habilitada en la pestaña **Network Access** en la consola de MongoDB Atlas.
- Verifica que el archivo `backend/.env` se llame exactamente así y que contenga las credenciales correctas.

### 2. Error de puerto ocupado (puerto 8000)
Si el puerto 8000 está en uso por otro proceso, puedes indicarle a Uvicorn que se ejecute en un puerto alternativo (por ejemplo, `8001`):
```bash
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```
*Nota: Si modificas el puerto del backend, asegúrate de actualizar la dirección de proxy de destino en el archivo `frontend/vite.config.js`.*
