# Diagramas (Mermaid) - Palacio Gamer

Este archivo se genera automáticamente.

## ERD (SQLite / Django Models)
```mermaid
erDiagram
  Category {
    string name
    string slug
    string subtitle
    text image_base64
    bool is_featured
    string layout_type
  }
  Product {
    string name
    string slug
    string brand
    string product_type
    FK Category category
    text description
    text specs
    decimal price
    decimal old_price
    int discount_percent
    int stock
    string status
    decimal rating
    int reviews_count
    text image_base64
    bool is_offer
    bool is_featured
  }
  Order {
    string order_code
    string product_name
    text product_description
    text product_image_base64
    int quantity
    decimal total
    string status
    string date_label
    text extra_info
    bool can_download_invoice
    bool can_track
    bool can_cancel
  }
  Notification {
    string title
    string message
    string type
    string time_label
    bool is_new
  }
  CartItem {
    string product_name
    text product_image_base64
    int quantity
    decimal price
  }
  Category ||--o{ Product : category
```

## Arquitectura (Frontend → Backend → DB)
```mermaid
flowchart LR
  FE[Frontend (Vite/React)] -->|/api/* proxy| BE[Backend (Django/DRF)]
  BE --> DB[(SQLite)]
  subgraph API[API Endpoints]
    api["/api/"]
    api_token["/api/token/"]
    api_token_refresh["/api/token/refresh/"]
    api_auth_me["/api/auth/me/"]
    api_auth_register["/api/auth/register/"]
    api_cart["/api/cart/"]
    api_cart_add["/api/cart/add/"]
    api_cart_clear["/api/cart/clear/"]
    api_categories["/api/categories/"]
    api_notifications["/api/notifications/"]
    api_orders["/api/orders/"]
    api_products["/api/products/"]
  end
```

## Rutas (React Router)
```mermaid
flowchart TB
  R[Router] --> H[/ /]
  R --> hardware["/hardware"]
  R --> mis_pedidos["/mis-pedidos"]
  R --> login["/login"]
  R --> crear_cuenta["/crear-cuenta"]
  R --> route["*"]
```

## Auth (Registro + JWT + Me)
```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as Frontend
  participant BE as Backend (DRF)
  participant DB as SQLite
  U->>FE: Crear cuenta
  FE->>BE: POST /api/auth/register/
  BE->>DB: Crear User
  DB-->>BE: OK
  BE-->>FE: 201 Created
  U->>FE: Iniciar sesión
  FE->>BE: POST /api/token/
  BE-->>FE: access + refresh
  FE->>BE: GET /api/auth/me/ (Bearer access)
  BE-->>FE: usuario
```

## Consumo de API (frontend/src/api/client.js)
```mermaid
flowchart LR
  FE[Frontend] --> C[api/client.js]
  C --> api_auth_me["/api/auth/me/"]
  C --> api_auth_register["/api/auth/register/"]
  C --> api_cart["/api/cart/"]
  C --> api_cart_add["/api/cart/add/"]
  C --> api_cart_clear["/api/cart/clear/"]
  C --> api_categories["/api/categories/"]
  C --> api_notifications["/api/notifications/"]
  C --> api_orders["/api/orders/"]
  C --> api_token["/api/token/"]
  C --> api_token_refresh["/api/token/refresh/"]
```
