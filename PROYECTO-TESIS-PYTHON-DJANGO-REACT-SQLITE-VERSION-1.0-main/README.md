# Cómo correr el programa (solo Bash)

## 1) Backend (Django + SQLite)

Desde la carpeta raíz del proyecto:

```bash
python3 -m venv backend/venv
. backend/venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install "Django<6" djangorestframework django-cors-headers djangorestframework-simplejwt
python3 backend/manage.py migrate
python3 backend/manage.py seed_store
python3 backend/manage.py runserver
```

Si tu terminal está dentro de `backend/` (tu prompt dice `.../backend$`), entonces usa:

```bash
. venv/bin/activate
python3 manage.py migrate
python3 manage.py seed_store
python3 manage.py runserver
```

Si aparece `Error: That port is already in use.` detén el backend que ya está corriendo con `Ctrl + C` y vuelve a ejecutar `runserver`.

## 2) Frontend (React + Vite)

En otra terminal (desde la raíz del proyecto):

```bash
cd frontend
npm install
npm run dev
```

## Abrir

- Frontend: http://localhost:5173/
- Backend: http://127.0.0.1:8000/

## Cómo funciona el programa

### Cliente

1) Registro e inicio de sesión:
- Registro: `http://localhost:5173/registro` (crea el usuario en SQLite).
- Login: `http://localhost:5173/login` (ingresas con **correo + contraseña**).
  - En registro ahora se pide: nombre completo, correo, dirección y teléfono.

2) Compra:
- Catálogo: `http://localhost:5173/hardware`
- Agregar al carrito (requiere sesión de cliente).
- Carrito: `http://localhost:5173/carrito`
- Resumen de compra: `http://localhost:5173/checkout` (requiere sesión).
- Pago: `http://localhost:5173/pago` (requiere sesión).
  - Métodos: Tarjeta / Transferencia Bancaria / Yape-Plin.
  - Transferencia y Yape/Plin: permite subir comprobante (imagen/PDF).

3) Confirmación y pedidos:
- Al confirmar el pago, se crea un pago con **código único** `PG-XXXX-XX-AAAA` y se redirige a la confirmación:
  - `http://localhost:5173/pago/confirmacion/<codigo>`
- Estado de sincronización inicial: **En espera** (luego se cambiará desde el panel de empleado).
- Mis pedidos: `http://localhost:5173/mis-pedidos`

4) Stock automático:
- Cuando se confirma un pago, el sistema descuenta el **stock** del producto en la base de datos (SQLite).
- Si intentas comprar más unidades que el stock disponible, el sistema lo bloquea.

### Empleado

1) Login de empleado:
- `http://localhost:5173/login-empleado`
- Usuario (seed): `GMR-0000`
- Contraseña (seed): `PalacioGamer#2026!`
  - Repartidores creados: `ENT-0001` … `ENT-0005`

2) Panel de empleado:
- Dashboard (métricas desde BD): `http://localhost:5173/empleado/dashboard`
- Productos (CRUD): `http://localhost:5173/empleado/productos`
- Ventas (datos reales, 24h y top productos disponibles): `http://localhost:5173/empleado/ventas`
- Clientes (listar/borrar, estado por horas): `http://localhost:5173/empleado/clientes`
- Entregas (asignar repartidor, evidencia y confirmar entrega): `http://localhost:5173/empleado/entregas`
