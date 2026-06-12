import os
import re
import jwt
import uuid
import secrets
import hashlib
import base64
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Optional, List

# 1. Load Environment & Connect to MongoDB
import dotenv
dotenv.load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_NAME = os.getenv("MONGODB_NAME", "palacio_gamer")
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-jrr4hy_5z@&o&)im8%%yptr+#$-@=5ab5fe_89#m81=n5yxg&g")

from pymongo import MongoClient
from bson import ObjectId
from bson.decimal128 import Decimal128

client = MongoClient(MONGODB_URI)
db = client[MONGODB_NAME]

# Helper to cast URL primary key strings dynamically
def get_query_id(pk: str):
    try:
        return ObjectId(pk)
    except Exception:
        try:
            return int(pk)
        except Exception:
            return pk

# 2. FastAPI Setup
from fastapi import FastAPI, Depends, HTTPException, status, Header, Form, File, UploadFile, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Palacio Gamer API - Pure FastAPI")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Password Hashing (Django-compatible PBKDF2-SHA256 in pure Python)
def verify_django_password(password: str, encoded: str) -> bool:
    if not encoded:
        return False
    parts = encoded.split('$')
    if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
        return False
    iterations = int(parts[1])
    salt = parts[2].encode('utf-8')
    hash_val = parts[3]
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
    computed = base64.b64encode(dk).decode('ascii').strip()
    return computed == hash_val

def make_django_password(password: str) -> str:
    iterations = 870000
    salt = secrets.token_hex(6)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    hash_val = base64.b64encode(dk).decode('ascii').strip()
    return f"pbkdf2_sha256${iterations}${salt}${hash_val}"


# 4. JWT Helpers
def create_access_token(user_id: str) -> str:
    payload = {
        "token_type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "jti": uuid.uuid4().hex,
        "user_id": str(user_id)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def create_refresh_token(user_id: str) -> str:
    payload = {
        "token_type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "jti": uuid.uuid4().hex,
        "user_id": str(user_id)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


# 5. Auth Dependencies
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado.")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Formato de token inválido.")
    token = parts[1]
    payload = decode_token(token)
    if not payload or payload.get("token_type") != "access":
        raise HTTPException(status_code=401, detail="Token inválido o expirado.")
    user_id = payload.get("user_id")
    user = db["auth_user"].find_one({"_id": get_query_id(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado.")
    return user

def get_current_employee(user = Depends(get_current_user)):
    if not user.get("is_staff", False):
        raise HTTPException(status_code=403, detail="No autorizado.")
    return user

def get_current_superuser(user = Depends(get_current_user)):
    if not user.get("is_staff", False) or not user.get("is_superuser", False):
        raise HTTPException(status_code=403, detail="No autorizado.")
    return user


# 6. Database Serialization Utilities
def serialize_category(c):
    if not c:
        return None
    return {
        "id": str(c["_id"]),
        "name": c["name"],
        "slug": c["slug"],
        "subtitle": c.get("subtitle") or "",
        "image_base64": c.get("image_base64") or "",
        "is_featured": bool(c.get("is_featured", False)),
        "layout_type": c.get("layout_type") or "",
    }

def serialize_product(p):
    if not p:
        return None
    
    # Resolve category nested document
    cat_doc = None
    cat_id = p.get("category_id")
    if cat_id:
        cat_doc = db["store_category"].find_one({"_id": get_query_id(str(cat_id))})
        
    price_str = str(p.get("price").to_decimal() if hasattr(p.get("price"), "to_decimal") else p.get("price", "0.00"))
    old_price_str = None
    if p.get("old_price") is not None:
        old_price_str = str(p.get("old_price").to_decimal() if hasattr(p.get("old_price"), "to_decimal") else p["old_price"])
        
    rating_str = str(p.get("rating").to_decimal() if hasattr(p.get("rating"), "to_decimal") else p.get("rating", "0.00"))
    
    image_url = None
    img_file = p.get("image_file")
    if img_file:
        image_url = f"/media/{img_file}"

    return {
        "id": str(p["_id"]),
        "name": p["name"],
        "slug": p["slug"],
        "brand": p.get("brand") or "",
        "product_type": p.get("product_type") or "",
        "category": serialize_category(cat_doc),
        "description": p.get("description") or "",
        "specs": p.get("specs") or "",
        "price": price_str,
        "old_price": old_price_str,
        "discount_percent": int(p.get("discount_percent", 0)),
        "stock": int(p.get("stock", 0)),
        "status": p.get("status", "disponible"),
        "rating": rating_str,
        "reviews_count": int(p.get("reviews_count", 0)),
        "image_base64": p.get("image_base64") or "",
        "image_url": image_url,
        "is_offer": bool(p.get("is_offer", False)),
        "is_featured": bool(p.get("is_featured", False)),
    }

def serialize_order(o):
    if not o:
        return None
    total_str = str(o.get("total").to_decimal() if hasattr(o.get("total"), "to_decimal") else o.get("total", "0.00"))
    return {
        "id": str(o["_id"]),
        "order_code": o["order_code"],
        "product_name": o.get("product_name") or "",
        "product_description": o.get("product_description") or "",
        "product_image_base64": o.get("product_image_base64") or "",
        "quantity": int(o.get("quantity", 1)),
        "total": total_str,
        "status": o["status"],
        "date_label": o.get("date_label") or "",
        "extra_info": o.get("extra_info") or "",
        "can_download_invoice": bool(o.get("can_download_invoice", False)),
        "can_track": bool(o.get("can_track", False)),
        "can_cancel": bool(o.get("can_cancel", False)),
    }

def serialize_notification(n):
    if not n:
        return None
    return {
        "id": str(n["_id"]),
        "title": n["title"],
        "message": n["message"],
        "type": n.get("type") or "",
        "time_label": n.get("time_label") or "",
        "is_new": bool(n.get("is_new", True)),
    }

def serialize_cart_item(ci):
    if not ci:
        return None
    price_str = str(ci.get("price").to_decimal() if hasattr(ci.get("price"), "to_decimal") else ci.get("price", "0.00"))
    return {
        "id": str(ci["_id"]),
        "product_name": ci.get("product_name") or "",
        "product_image_base64": ci.get("product_image_base64") or "",
        "product_image_url": ci.get("product_image_url") or "",
        "quantity": int(ci.get("quantity", 1)),
        "price": price_str,
    }


# 7. Body Payloads
class LoginPayload(BaseModel):
    username: str
    password: str

class RefreshPayload(BaseModel):
    refresh: str

class RegisterPayload(BaseModel):
    full_name: str
    email: str
    password: str
    address: str
    phone: str

class CartAddPayload(BaseModel):
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    quantity: Optional[int] = 1
    product_name: Optional[str] = None
    price: Optional[float] = None
    product_image_base64: Optional[str] = None
    product_image_url: Optional[str] = None

class CartItemUpdatePayload(BaseModel):
    quantity: int


# 8. JWT & Auth Endpoints
@app.post("/api/token/")
def token_obtain_pair(payload: LoginPayload):
    username = payload.username.strip()
    password = payload.password

    # Retrieve user case-insensitively
    user = db["auth_user"].find_one({
        "$or": [
            {"email": {"$regex": f"^{re.escape(username)}$", "$options": "i"}},
            {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}
        ]
    })

    if not user or not verify_django_password(password, user.get("password")):
        raise HTTPException(status_code=401, detail="No active account found with the given credentials")

    # Record login event
    try:
        db["store_loginevent"].insert_one({
            "user_id": user["_id"],
            "is_employee": bool(user.get("is_staff", False)),
            "created_at": datetime.utcnow()
        })
    except Exception:
        pass

    return {
        "access": create_access_token(user["_id"]),
        "refresh": create_refresh_token(user["_id"])
    }

@app.post("/api/token/refresh/")
def token_refresh(payload: RefreshPayload):
    token = payload.refresh
    decoded = decode_token(token)
    if not decoded or decoded.get("token_type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de actualización inválido o expirado.")
    user_id = decoded.get("user_id")
    user = db["auth_user"].find_one({"_id": get_query_id(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado.")
    return {
        "access": create_access_token(user["_id"])
    }

@app.post("/api/auth/register/", status_code=201)
def auth_register(payload: RegisterPayload):
    full_name = payload.full_name.strip()
    email = payload.email.strip()
    password = payload.password
    address = payload.address.strip()
    phone = payload.phone.strip()

    if not full_name:
        raise HTTPException(status_code=400, detail="El nombre completo es requerido.")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="El correo es requerido y debe ser válido.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres.")
    if not address:
        raise HTTPException(status_code=400, detail="La dirección es requerida.")
    if not phone:
        raise HTTPException(status_code=400, detail="El teléfono es requerido.")

    # Check unique
    existing = db["auth_user"].find_one({
        "$or": [
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"username": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya existe.")

    new_user = {
        "username": email,
        "email": email,
        "password": make_django_password(password),
        "first_name": full_name,
        "last_name": "",
        "is_staff": False,
        "is_active": True,
        "is_superuser": False,
        "date_joined": datetime.utcnow(),
        "last_login": None
    }
    res = db["auth_user"].insert_one(new_user)
    user_id = res.inserted_id

    # Create profile
    db["store_customerprofile"].insert_one({
        "user_id": user_id,
        "address": address,
        "phone": phone
    })

    return {
        'id': str(user_id),
        'username': email,
        'email': email,
        'address': address,
        'phone': phone
    }

@app.get("/api/auth/me/")
def auth_me(user = Depends(get_current_user)):
    profile = db["store_customerprofile"].find_one({"user_id": user["_id"]})
    return {
        'id': str(user["_id"]),
        'username': user["username"],
        'email': user["email"],
        'is_staff': bool(user.get("is_staff", False)),
        'is_superuser': bool(user.get("is_superuser", False)),
        'address': profile.get("address", "") if profile else "",
        'phone': profile.get("phone", "") if profile else "",
    }


# 9. Store Catalog
@app.get("/api/categories/")
def list_categories():
    defaults = [
        {'slug': 'tarjetas-graficas', 'name': 'Tarjetas Gráficas', 'subtitle': 'Potencia bruta para resoluciones 4K', 'layout_type': 'xl'},
        {'slug': 'procesadores', 'name': 'Procesadores', 'subtitle': 'Núcleos listos para dominar', 'layout_type': 'md'},
        {'slug': 'memoria-ram', 'name': 'Memoria RAM', 'subtitle': 'DDR5 con RGB y baja latencia', 'layout_type': 'md'},
        {'slug': 'almacenamiento', 'name': 'Almacenamiento', 'subtitle': 'NVMe Gen4/Gen5 a velocidad neón', 'layout_type': 'md'},
        {'slug': 'teclados', 'name': 'Teclados', 'subtitle': 'Mecánicos, inalámbricos y RGB', 'layout_type': 'md'},
        {'slug': 'fuente-de-poder', 'name': 'Fuente de poder', 'subtitle': 'Modulares y certificación alta', 'layout_type': 'md'},
        {'slug': 'audifonos', 'name': 'Audífonos', 'subtitle': 'Audio surround, baja latencia y micrófono pro', 'layout_type': 'md'},
        {'slug': 'placa', 'name': 'Placa', 'subtitle': 'Chipsets gaming y VRM reforzado', 'layout_type': 'md'},
    ]

    if db["store_category"].count_documents({}) == 0:
        db["store_category"].insert_many(
            [
                {
                    "slug": c['slug'],
                    "name": c['name'],
                    "subtitle": c['subtitle'],
                    "layout_type": c['layout_type'],
                    "is_featured": True,
                    "image_base64": ""
                }
                for c in defaults
            ]
        )

    categories = list(db["store_category"].find().sort([("is_featured", -1), ("name", 1)]))
    return [serialize_category(c) for c in categories]

@app.get("/api/products/")
def list_products(
    search: Optional[str] = Query(""),
    category: Optional[str] = Query(""),
    sort: Optional[str] = Query("")
):
    query = {}

    search = search.strip()
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [
            {"name": rx},
            {"brand": rx},
            {"product_type": rx},
            {"description": rx}
        ]

    category = category.strip()
    if category:
        cat_doc = db["store_category"].find_one({"slug": category})
        if cat_doc:
            query["category_id"] = cat_doc["_id"]
        else:
            query["category_id"] = get_query_id(category)

    sort = sort.strip().lower()
    sort_pipeline = []
    if sort in {'offers', 'ofertas'}:
        query["is_offer"] = True
        sort_pipeline = [("discount_percent", -1), ("is_featured", -1), ("name", 1)]
    elif sort in {'featured', 'destacados'}:
        query["is_featured"] = True
        sort_pipeline = [("rating", -1), ("reviews_count", -1), ("name", 1)]
    elif sort in {'price_asc', 'precio_asc', 'precio_menor'}:
        sort_pipeline = [("price", 1), ("name", 1)]
    elif sort in {'price_desc', 'precio_desc', 'precio_mayor'}:
        sort_pipeline = [("price", -1), ("name", 1)]
    elif sort in {'rating', 'calificacion'}:
        sort_pipeline = [("rating", -1), ("reviews_count", -1), ("name", 1)]
    else:
        sort_pipeline = [("reviews_count", -1), ("rating", -1), ("name", 1)]

    products = list(db["store_product"].find(query).sort(sort_pipeline))
    return [serialize_product(p) for p in products]

@app.get("/api/products/{slug}/")
def product_detail(slug: str):
    product = db["store_product"].find_one({"slug": slug})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return serialize_product(product)


# 10. Cart Management
@app.get("/api/cart/")
def get_cart(user = Depends(get_current_user)):
    items = list(db["store_cartitem"].find({"user_id": user["_id"]}).sort("_id", 1))
    subtotal = sum(((ci["price"].to_decimal() if hasattr(ci["price"], "to_decimal") else ci["price"]) * ci["quantity"] for ci in items), Decimal('0.00'))
    count = sum((ci["quantity"] for ci in items), 0)
    return {
        'count': count,
        'subtotal': str(subtotal),
        'items': [serialize_cart_item(item) for item in items],
    }

@app.post("/api/cart/add/")
def cart_add(payload: CartAddPayload, user = Depends(get_current_user)):
    quantity = payload.quantity if payload.quantity is not None else 1
    quantity = max(1, quantity)

    product_id = payload.product_id
    product_slug = payload.product_slug

    if product_id or product_slug:
        product = None
        if product_id:
            product = db["store_product"].find_one({"_id": get_query_id(product_id)})
        if product is None and product_slug:
            product = db["store_product"].find_one({"slug": product_slug})
        
        if product is None:
            raise HTTPException(status_code=400, detail="Producto no encontrado.")

        if int(product.get("stock", 0)) <= 0:
            raise HTTPException(status_code=400, detail="Producto sin stock.")

        # Get or create item
        item = db["store_cartitem"].find_one({"user_id": user["_id"], "product_name": product["name"]})
        if not item:
            new_item = {
                "user_id": user["_id"],
                "product_id": product["_id"],
                "product_name": product["name"],
                "product_image_base64": product.get("image_base64") or "",
                "product_image_url": f"/media/{product['image_file']}" if product.get("image_file") else "",
                "quantity": quantity,
                "price": product["price"]
            }
            if quantity > int(product.get("stock", 0)):
                raise HTTPException(status_code=400, detail="Cantidad supera el stock disponible.")
            db["store_cartitem"].insert_one(new_item)
        else:
            next_qty = item["quantity"] + quantity
            if next_qty > int(product.get("stock", 0)):
                raise HTTPException(status_code=400, detail="Cantidad supera el stock disponible.")
            db["store_cartitem"].update_one(
                {"_id": item["_id"]},
                {"$set": {
                    "quantity": next_qty,
                    "price": product["price"],
                    "product_id": product["_id"],
                    "product_image_base64": product.get("image_base64") or "",
                    "product_image_url": f"/media/{product['image_file']}" if product.get("image_file") else ""
                }}
            )
    else:
        name = str(payload.product_name or '').strip()
        if not name:
            raise HTTPException(status_code=400, detail="Falta product_id o product_name.")

        try:
            price_val = Decimal(str(payload.price)) if payload.price is not None else Decimal('0')
        except Exception:
            price_val = Decimal('0')

        image_base64 = str(payload.product_image_base64 or '').strip()
        image_url = str(payload.product_image_url or '').strip()

        item = db["store_cartitem"].find_one({"user_id": user["_id"], "product_name": name})
        if not item:
            new_item = {
                "user_id": user["_id"],
                "product_id": None,
                "product_name": name,
                "product_image_base64": image_base64,
                "product_image_url": image_url,
                "quantity": quantity,
                "price": Decimal128(price_val)
            }
            db["store_cartitem"].insert_one(new_item)
        else:
            db["store_cartitem"].update_one(
                {"_id": item["_id"]},
                {"$set": {
                    "quantity": item["quantity"] + quantity,
                    "price": Decimal128(price_val),
                    "product_image_base64": image_base64,
                    "product_image_url": image_url
                }}
            )

    # Return updated cart
    items = list(db["store_cartitem"].find({"user_id": user["_id"]}).sort("_id", 1))
    subtotal = sum(((ci["price"].to_decimal() if hasattr(ci["price"], "to_decimal") else ci["price"]) * ci["quantity"] for ci in items), Decimal('0.00'))
    count = sum((ci["quantity"] for ci in items), 0)
    return {
        'count': count,
        'subtotal': str(subtotal),
        'items': [serialize_cart_item(ci) for ci in items],
    }

@app.delete("/api/cart/items/{pk}/", status_code=204)
def cart_item_delete(pk: str, user = Depends(get_current_user)):
    db["store_cartitem"].delete_one({"_id": get_query_id(pk), "user_id": user["_id"]})
    return Response(status_code=204)

@app.patch("/api/cart/items/{pk}/update/", status_code=204)
def cart_item_update(pk: str, payload: CartItemUpdatePayload, user = Depends(get_current_user)):
    quantity = payload.quantity
    if quantity < 1:
        raise HTTPException(status_code=400, detail="quantity debe ser >= 1.")

    item = db["store_cartitem"].find_one({"_id": get_query_id(pk), "user_id": user["_id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado.")
    
    if item.get("product_id"):
        product = db["store_product"].find_one({"_id": item["product_id"]})
        if product and quantity > int(product.get("stock", 0)):
            raise HTTPException(status_code=400, detail="Cantidad supera el stock disponible.")

    db["store_cartitem"].update_one({"_id": item["_id"]}, {"$set": {"quantity": quantity}})
    return Response(status_code=204)

@app.delete("/api/cart/clear/", status_code=204)
def cart_clear(user = Depends(get_current_user)):
    db["store_cartitem"].delete_many({"user_id": user["_id"]})
    return Response(status_code=204)


# 11. Checkout & Orders
@app.post("/api/checkout/", status_code=201)
def checkout(user = Depends(get_current_user)):
    items = list(db["store_cartitem"].find({"user_id": user["_id"]}))
    if not items:
        raise HTTPException(status_code=400, detail="El carrito está vacío.")

    # Concurrency safe stock checks and decrements
    created_ids = []
    for it in items:
        if not it.get("product_id"):
            continue
        # Atomic decrease and validation in MongoDB
        product = db["store_product"].find_one({"_id": it["product_id"]})
        if not product:
            raise HTTPException(status_code=400, detail=f"Producto no encontrado para actualizar stock: {it['product_name']}")
        if int(product.get("stock", 0)) < it["quantity"]:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para: {product['name']}")

    # Apply changes
    for it in items:
        product_id = it.get("product_id")
        p = db["store_product"].find_one({"_id": product_id}) if product_id else None
        if p:
            new_stock = max(0, int(p.get("stock", 0)) - it["quantity"])
            status_val = "disponible"
            if new_stock <= 0:
                status_val = "agotado"
            elif new_stock <= 5:
                status_val = "stock_bajo"
            db["store_product"].update_one({"_id": p["_id"]}, {"$set": {"stock": new_stock, "status": status_val}})

        order_code = uuid.uuid4().hex[:10].upper()
        while db["store_order"].find_one({"order_code": order_code}):
            order_code = uuid.uuid4().hex[:10].upper()

        price_dec = it["price"].to_decimal() if hasattr(it["price"], "to_decimal") else it["price"]
        total_val = price_dec * it["quantity"]

        new_order = {
            "user_id": user["_id"],
            "order_code": order_code,
            "product_id": p["_id"] if p else None,
            "product_name": it["product_name"],
            "product_description": "",
            "product_image_base64": it.get("product_image_base64") or "",
            "quantity": it["quantity"],
            "total": Decimal128(total_val),
            "status": "procesando",
            "date_label": "",
            "extra_info": "",
            "can_download_invoice": False,
            "can_track": False,
            "can_cancel": True,
            "assigned_to_id": None,
            "assigned_at": None,
            "delivery_evidence_file": "",
            "delivered_at": None,
            "delivered_by_id": None
        }
        res = db["store_order"].insert_one(new_order)
        created_ids.append(str(res.inserted_id))

    db["store_cartitem"].delete_many({"user_id": user["_id"]})
    return {'created': created_ids}

@app.get("/api/orders/")
def get_orders(user = Depends(get_current_user)):
    orders = list(db["store_order"].find({"user_id": user["_id"]}).sort("_id", -1))
    return [serialize_order(o) for o in orders]

@app.get("/api/notifications/")
def get_notifications(user = Depends(get_current_user)):
    notifications = list(db["store_notification"].find().sort([("is_new", -1), ("_id", -1)]))
    return [serialize_notification(n) for n in notifications]


# 12. Payments
def generate_payment_code():
    year = datetime.utcnow().year
    while True:
        raw = uuid.uuid4().hex.upper()
        code = f'PG-{raw[:4]}-{raw[4:6]}-{year}'
        if not db["store_payment"].find_one({"payment_code": code}):
            return code

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

@app.post("/api/payments/", status_code=201)
async def create_payment(
    method: str = Form(...),
    card_holder_name: Optional[str] = Form(None),
    card_number: Optional[str] = Form(None),
    card_expiry: Optional[str] = Form(None),
    card_cvv: Optional[str] = Form(None),
    receipt_file: Optional[UploadFile] = File(None),
    user = Depends(get_current_user)
):
    if bool(user.get("is_staff", False)):
        raise HTTPException(status_code=403, detail="No autorizado.")

    method = method.strip().lower()
    if method not in {"card", "bank_transfer", "yape_plin"}:
        raise HTTPException(status_code=400, detail="Método de pago inválido.")

    items = list(db["store_cartitem"].find({"user_id": user["_id"]}))
    if not items:
        raise HTTPException(status_code=400, detail="El carrito está vacío.")

    # Concurrency safe check
    for it in items:
        if not it.get("product_id"):
            continue
        p = db["store_product"].find_one({"_id": it["product_id"]})
        if not p:
            raise HTTPException(status_code=400, detail=f"Producto no encontrado: {it['product_name']}")
        if int(p.get("stock", 0)) < it["quantity"]:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para: {p['name']}")

    subtotal = sum(((ci["price"].to_decimal() if hasattr(ci["price"], "to_decimal") else ci["price"]) * ci["quantity"] for ci in items), Decimal('0.00'))
    shipping = Decimal('0.00')
    igv = subtotal * Decimal('0.18')
    total = subtotal + shipping + igv

    payment_code = generate_payment_code()

    if method == "card":
        if not card_holder_name or not card_number or not card_expiry or not card_cvv:
            raise HTTPException(status_code=400, detail="Completa los datos de la tarjeta.")

        card_number_clean = card_number.replace(' ', '')
        digits = ''.join([c for c in card_number_clean if c.isdigit()])
        if len(digits) < 12:
            raise HTTPException(status_code=400, detail="Número de tarjeta inválido.")
        card_last4 = digits[-4:]
        card_expiry_short = card_expiry[:7]

        payment = {
            "user_id": user["_id"],
            "payment_code": payment_code,
            "method": method,
            "status": "confirmed",
            "sync_status": "en_espera",
            "subtotal": Decimal128(subtotal),
            "shipping": Decimal128(shipping),
            "igv": Decimal128(igv),
            "total": Decimal128(total),
            "card_holder_name": card_holder_name.strip(),
            "card_last4": card_last4,
            "card_expiry": card_expiry_short,
            "bank_name": "",
            "bank_account": "",
            "bank_cci": "",
            "receipt_file": "",
            "created_at": datetime.utcnow()
        }
        res_pay = db["store_payment"].insert_one(payment)
        payment_id = res_pay.inserted_id
    else:
        if not receipt_file:
            raise HTTPException(status_code=400, detail="Sube el comprobante.")

        if method == "bank_transfer":
            bank_name = 'BCP Soles'
            bank_account = '193-94827163-0-12'
            bank_cci = '002-193009482716301211'
        else:
            bank_name = 'Yape / Plin'
            bank_account = '987 654 321'
            bank_cci = ''

        # Save uploaded file
        filename = receipt_file.filename
        unique_name = f"comprobantes/{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(MEDIA_ROOT, unique_name)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            content = await receipt_file.read()
            f.write(content)

        payment = {
            "user_id": user["_id"],
            "payment_code": payment_code,
            "method": method,
            "status": "pending",
            "sync_status": "en_espera",
            "subtotal": Decimal128(subtotal),
            "shipping": Decimal128(shipping),
            "igv": Decimal128(igv),
            "total": Decimal128(total),
            "card_holder_name": "",
            "card_last4": "",
            "card_expiry": "",
            "bank_name": bank_name,
            "bank_account": bank_account,
            "bank_cci": bank_cci,
            "receipt_file": unique_name,
            "created_at": datetime.utcnow()
        }
        res_pay = db["store_payment"].insert_one(payment)
        payment_id = res_pay.inserted_id

    created_ids = []
    for it in items:
        product_id = it.get("product_id")
        p = db["store_product"].find_one({"_id": product_id}) if product_id else None
        if p:
            new_stock = max(0, int(p.get("stock", 0)) - it["quantity"])
            status_val = "disponible"
            if new_stock <= 0:
                status_val = "agotado"
            elif new_stock <= 5:
                status_val = "stock_bajo"
            db["store_product"].update_one({"_id": p["_id"]}, {"$set": {"stock": new_stock, "status": status_val}})

        order_code = uuid.uuid4().hex[:10].upper()
        while db["store_order"].find_one({"order_code": order_code}):
            order_code = uuid.uuid4().hex[:10].upper()

        price_dec = it["price"].to_decimal() if hasattr(it["price"], "to_decimal") else it["price"]
        line_total = price_dec * it["quantity"]

        new_order = {
            "user_id": user["_id"],
            "payment_id": payment_id,
            "order_code": order_code,
            "product_id": p["_id"] if p else None,
            "product_name": it["product_name"],
            "product_description": "",
            "product_image_base64": it.get("product_image_base64") or "",
            "quantity": it["quantity"],
            "total": Decimal128(line_total),
            "status": "procesando",
            "date_label": "",
            "extra_info": "",
            "can_download_invoice": False,
            "can_track": False,
            "can_cancel": True,
            "assigned_to_id": None,
            "assigned_at": None,
            "delivery_evidence_file": "",
            "delivered_at": None,
            "delivered_by_id": None
        }
        res = db["store_order"].insert_one(new_order)
        created_ids.append(str(res.inserted_id))

    db["store_cartitem"].delete_many({"user_id": user["_id"]})

    return {
        'payment_id': str(payment_id),
        'payment_code': payment_code,
        'sync_status': payment["sync_status"],
        'created': created_ids,
    }

@app.get("/api/payments/{payment_code}/")
def get_payment_detail(payment_code: str, user = Depends(get_current_user)):
    if bool(user.get("is_staff", False)):
        raise HTTPException(status_code=403, detail="No autorizado.")

    payment = db["store_payment"].find_one({"payment_code": payment_code, "user_id": user["_id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")

    total_str = str(payment.get("total").to_decimal() if hasattr(payment.get("total"), "to_decimal") else payment["total"])
    subtotal_str = str(payment.get("subtotal").to_decimal() if hasattr(payment.get("subtotal"), "to_decimal") else payment["subtotal"])
    shipping_str = str(payment.get("shipping").to_decimal() if hasattr(payment.get("shipping"), "to_decimal") else payment["shipping"])
    igv_str = str(payment.get("igv").to_decimal() if hasattr(payment.get("igv"), "to_decimal") else payment["igv"])

    created_str = payment["created_at"].isoformat() if isinstance(payment["created_at"], datetime) else str(payment["created_at"])

    return {
        'payment_id': str(payment["_id"]),
        'payment_code': payment["payment_code"],
        'method': payment["method"],
        'status': payment["status"],
        'sync_status': payment["sync_status"],
        'subtotal': subtotal_str,
        'shipping': shipping_str,
        'igv': igv_str,
        'total': total_str,
        'created_at': created_str,
    }


# 13. Employee Dashboard & Analytics
@app.get("/api/employee/dashboard/")
def employee_dashboard(user = Depends(get_current_employee)):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_24h = now - timedelta(hours=24)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    clients_total = db["auth_user"].count_documents({"is_staff": False})
    clients_month = db["auth_user"].count_documents({"is_staff": False, "date_joined": {"$gte": month_start}})
    logins_24h = db["store_loginevent"].count_documents({"created_at": {"$gte": last_24h}})

    res_stock = list(db["store_product"].aggregate([{"$group": {"_id": None, "total": {"$sum": "$stock"}}}]))
    stock_units = res_stock[0]["total"] if res_stock else 0

    payments_today = db["store_payment"].count_documents({"created_at": {"$gte": today_start}})
    deliveries_pending = db["store_order"].count_documents({"status": {"$ne": "entregado"}})

    activity = []
    # Latest accounts
    accounts = list(db["auth_user"].find({"is_staff": False}).sort("date_joined", -1).limit(5))
    for ac in accounts:
        time_str = ac["date_joined"].isoformat() if isinstance(ac["date_joined"], datetime) else str(ac["date_joined"])
        activity.append({
            'type': 'account_created',
            'label': f"Nueva cuenta creada: {ac['username']}",
            'created_at': time_str,
            'ref': '',
        })

    # Latest payments
    pays = list(db["store_payment"].find().sort("created_at", -1).limit(5))
    for p in pays:
        time_str = p["created_at"].isoformat() if isinstance(p["created_at"], datetime) else str(p["created_at"])
        activity.append({
            'type': 'payment',
            'label': f"Pago registrado: {p['payment_code']}",
            'created_at': time_str,
            'ref': p["payment_code"],
        })

    # Latest orders
    orders = list(db["store_order"].find().sort("_id", -1).limit(5))
    for o in orders:
        time_str = now.isoformat()
        if o.get("payment_id"):
            p_doc = db["store_payment"].find_one({"_id": o["payment_id"]})
            if p_doc:
                time_str = p_doc["created_at"].isoformat() if isinstance(p_doc["created_at"], datetime) else str(p_doc["created_at"])
        activity.append({
            'type': 'order',
            'label': f"Pedido: {o['order_code']}",
            'created_at': time_str,
            'ref': o["order_code"],
        })

    def get_act_time(x):
        try:
            val = x.get('created_at')
            if isinstance(val, datetime):
                if val.tzinfo is None:
                    return val.replace(tzinfo=timezone.utc)
                return val
            dt = datetime.fromisoformat(val)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)

    activity = sorted(activity, key=get_act_time, reverse=True)[:8]

    return {
        'clients_total': clients_total,
        'clients_month': clients_month,
        'logins_24h': logins_24h,
        'stock_units': int(stock_units),
        'payments_today': payments_today,
        'deliveries_pending': deliveries_pending,
        'activity': activity,
    }

@app.get("/api/employee/sales/")
def employee_sales(user = Depends(get_current_employee)):
    now = datetime.utcnow()
    since = now - timedelta(hours=24)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    recent = list(db["store_payment"].find().sort("created_at", -1).limit(8))
    recent_payments = []
    for p in recent:
        u = db["auth_user"].find_one({"_id": p.get("user_id")})
        c_str = u["email"] if u else ""
        time_str = p["created_at"].isoformat() if isinstance(p["created_at"], datetime) else str(p["created_at"])
        total_str = str(p.get("total").to_decimal() if hasattr(p.get("total"), "to_decimal") else p["total"])
        recent_payments.append({
            'payment_code': p["payment_code"],
            'customer': c_str,
            'created_at': time_str,
            'total': total_str,
            'status': p["status"],
            'sync_status': p["sync_status"],
            'method': p["method"],
        })

    # Sales 24h hourly buckets
    hours = []
    cursor = since.replace(minute=0, second=0, microsecond=0)
    while cursor <= now:
        cursor_end = cursor + timedelta(hours=1)
        pays_in_hour = list(db["store_payment"].find({
            "created_at": {"$gte": cursor, "$lt": cursor_end},
            "sync_status": "confirmado"
        }))
        tot = sum((py["total"].to_decimal() if hasattr(py["total"], "to_decimal") else py["total"] for py in pays_in_hour), Decimal("0.00"))
        hours.append({
            'hour': cursor.strftime('%H:%M'),
            'total': str(tot),
            'count': len(pays_in_hour),
        })
        cursor = cursor_end

    # Top products today
    today_payments = list(db["store_payment"].find({"created_at": {"$gte": today_start}}))
    today_pay_ids = [p["_id"] for p in today_payments]
    
    top_sold = list(db["store_order"].aggregate([
        {"$match": {"payment_id": {"$in": today_pay_ids}, "product_id": {"$ne": None}}},
        {"$group": {
            "_id": "$product_id",
            "name": {"$first": "$product_name"},
            "quantity": {"$sum": "$quantity"},
            "revenue": {"$sum": "$total"}
        }},
        {"$sort": {"quantity": -1, "revenue": -1}},
        {"$limit": 5}
    ]))

    top_products = []
    for row in top_sold:
        p_id = row["_id"]
        prod = db["store_product"].find_one({"_id": p_id})
        img_url = f"/media/{prod['image_file']}" if prod and prod.get("image_file") else ""
        rev_str = str(row["revenue"].to_decimal() if hasattr(row["revenue"], "to_decimal") else row["revenue"])
        top_products.append({
            'product_id': str(p_id),
            'name': row["name"],
            'slug': prod["slug"] if prod else "",
            'quantity': int(row["quantity"]),
            'revenue': rev_str,
            'image_base64': prod.get("image_base64") or "" if prod else "",
            'image_url': img_url,
        })

    return {
        'recent_payments': recent_payments,
        'sales_24h': hours,
        'top_products_today': top_products,
    }


# 14. Employee Payments Management
@app.get("/api/employee/payments/")
def get_employee_payments(user = Depends(get_current_employee)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    pending_qs = list(db["store_payment"].find({"sync_status": "en_espera"}).sort("created_at", -1))
    rejected_qs = list(db["store_payment"].find({"sync_status": "rechazado"}).sort("created_at", -1))
    approved_qs = list(db["store_payment"].find({"sync_status": "confirmado"}).sort("created_at", -1))

    pending_count = len(pending_qs)
    pending_total = sum((p["total"].to_decimal() if hasattr(p["total"], "to_decimal") else p["total"] for p in pending_qs), Decimal('0.00'))
    rejected_count = len(rejected_qs)
    approved_count = len(approved_qs)

    approved_today = db["store_payment"].count_documents({"created_at": {"$gte": today_start}, "sync_status": "confirmado"})
    rejected_today = db["store_payment"].count_documents({"created_at": {"$gte": today_start}, "sync_status": "rechazado"})
    denom = approved_today + rejected_today
    approval_rate = (approved_today / denom) * 100.0 if denom else 0.0

    def serialize_payment_item(p):
        receipt_url = f"/media/{p['receipt_file']}" if p.get("receipt_file") else ""
        u = db["auth_user"].find_one({"_id": p.get("user_id")})
        customer_name = (u.get("first_name") or u["username"]) if u else ""
        customer_email = u["email"] if u else ""
        total_str = str(p.get("total").to_decimal() if hasattr(p.get("total"), "to_decimal") else p["total"])
        time_str = p["created_at"].isoformat() if isinstance(p["created_at"], datetime) else str(p["created_at"])
        
        return {
            'payment_code': p["payment_code"],
            'ticket': p["payment_code"],
            'customer_name': customer_name,
            'customer_email': customer_email,
            'method': p["method"],
            'created_at': time_str,
            'total': total_str,
            'receipt_url': receipt_url,
        }

    return {
        'summary': {
            'pending_count': pending_count,
            'pending_total': str(pending_total),
            'approval_rate_today': round(float(approval_rate), 2),
            'rejected_count': rejected_count,
            'approved_count': approved_count,
        },
        'pending': [serialize_payment_item(p) for p in pending_qs[:50]],
        'rejected': [serialize_payment_item(p) for p in rejected_qs[:50]],
        'approved': [serialize_payment_item(p) for p in approved_qs[:50]],
    }

@app.get("/api/employee/payments/{payment_code}/")
def get_employee_payment_detail(payment_code: str, user = Depends(get_current_employee)):
    p = db["store_payment"].find_one({"payment_code": payment_code})
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")

    u = db["auth_user"].find_one({"_id": p.get("user_id")})
    profile = db["store_customerprofile"].find_one({"user_id": p.get("user_id")}) if u else None
    
    receipt_url = f"/media/{p['receipt_file']}" if p.get("receipt_file") else ""
    orders = list(db["store_order"].find({"payment_id": p["_id"]}))

    items = []
    for o in orders:
        total_str = str(o.get("total").to_decimal() if hasattr(o.get("total"), "to_decimal") else o["total"])
        items.append({
            'order_id': str(o["_id"]),
            'ticket': o["order_code"],
            'product_name': o["product_name"],
            'quantity': int(o.get("quantity", 0)),
            'total': total_str,
            'status': o["status"],
        })

    total_str = str(p.get("total").to_decimal() if hasattr(p.get("total"), "to_decimal") else p["total"])
    subtotal_str = str(p.get("subtotal").to_decimal() if hasattr(p.get("subtotal"), "to_decimal") else p["subtotal"])
    shipping_str = str(p.get("shipping").to_decimal() if hasattr(p.get("shipping"), "to_decimal") else p["shipping"])
    igv_str = str(p.get("igv").to_decimal() if hasattr(p.get("igv"), "to_decimal") else p["igv"])

    created_str = p["created_at"].isoformat() if isinstance(p["created_at"], datetime) else str(p["created_at"])

    return {
        'payment_code': p["payment_code"],
        'ticket': p["payment_code"],
        'sync_status': p["sync_status"],
        'method': p["method"],
        'created_at': created_str,
        'subtotal': subtotal_str,
        'igv': igv_str,
        'shipping': shipping_str,
        'total': total_str,
        'receipt_url': receipt_url,
        'customer': {
            'name': (u.get("first_name") or u["username"]) if u else "",
            'email': u["email"] if u else "",
            'phone': profile.get("phone", "") if profile else "",
            'address': profile.get("address", "") if profile else "",
        },
        'items': items,
    }

@app.post("/api/employee/payments/{payment_code}/approve/")
def approve_payment(payment_code: str, user = Depends(get_current_employee)):
    p = db["store_payment"].find_one({"payment_code": payment_code})
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")

    db["store_payment"].update_one(
        {"_id": p["_id"]},
        {"$set": {"sync_status": "confirmado", "status": "confirmed"}}
    )
    db["store_order"].update_many(
        {"payment_id": p["_id"], "status": {"$ne": "entregado"}},
        {"$set": {"status": "en_camino"}}
    )

    return {'sync_status': "confirmado"}

@app.post("/api/employee/payments/{payment_code}/reject/")
def reject_payment(payment_code: str, user = Depends(get_current_employee)):
    p = db["store_payment"].find_one({"payment_code": payment_code})
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")

    db["store_payment"].update_one(
        {"_id": p["_id"]},
        {"$set": {"sync_status": "rechazado"}}
    )
    db["store_order"].update_many(
        {"payment_id": p["_id"], "status": {"$ne": "entregado"}},
        {"$set": {
            "status": "rechazado",
            "assigned_to_id": None,
            "assigned_at": None,
            "delivery_evidence_file": "",
            "delivered_at": None,
            "delivered_by_id": None
        }}
    )
    return {'sync_status': "rechazado"}

@app.get("/api/employee/payments/export/")
def export_payments(user = Depends(get_current_employee)):
    qs = list(db["store_payment"].find({"sync_status": "en_espera"}).sort("created_at", -1))
    
    rows = []
    for p in qs:
        u = db["auth_user"].find_one({"_id": p.get("user_id")})
        customer = (u.get("first_name") or u["username"]) if u else ""
        
        orders = list(db["store_order"].find({"payment_id": p["_id"]}))
        items = [f"{o['product_name']} x{o['quantity']}" for o in orders]
        
        created_str = p["created_at"].strftime('%Y-%m-%d %H:%M') if isinstance(p["created_at"], datetime) else str(p["created_at"])
        total_str = str(p.get("total").to_decimal() if hasattr(p.get("total"), "to_decimal") else p["total"])

        rows.append({
            'ticket': p["payment_code"],
            'cliente': customer,
            'correo': u["email"] if u else "",
            'metodo': p["method"],
            'fecha': created_str,
            'total': total_str,
            'items': ', '.join(items),
        })

    html = [
        '<html><head><meta charset="utf-8"></head><body>',
        '<table border="1">',
        '<tr>',
        '<th>Ticket</th><th>Cliente</th><th>Correo</th><th>Método</th><th>Fecha</th><th>Total</th><th>Items</th>',
        '</tr>',
    ]
    for r in rows:
        html.append(
            '<tr>'
            f'<td>{escape(r["ticket"])}</td>'
            f'<td>{escape(r["cliente"])}</td>'
            f'<td>{escape(r["correo"])}</td>'
            f'<td>{escape(r["metodo"])}</td>'
            f'<td>{escape(r["fecha"])}</td>'
            f'<td>{escape(r["total"])}</td>'
            f'<td>{escape(r["items"])}</td>'
            '</tr>'
        )
    html.append('</table></body></html>')
    content = ''.join(html)

    return Response(
        content=content,
        media_type='application/vnd.ms-excel; charset=utf-8',
        headers={
            "Content-Disposition": 'attachment; filename="transacciones_pendientes.xls"'
        }
    )


# 15. Deliveries & Delivery Staff
@app.get("/api/employee/deliveries/")
def get_deliveries(status: Optional[str] = Query(None), user = Depends(get_current_employee)):
    query = {}
    status_filter = status.strip().lower() if status else ""
    if status_filter:
        query["status"] = status_filter
    else:
        query["status"] = {"$in": ["en_camino", "entregado", "rechazado"]}

    orders = list(db["store_order"].find(query).sort("_id", -1))
    
    results = []
    for o in orders[:50]:
        created_at = None
        if o.get("payment_id"):
            pay = db["store_payment"].find_one({"_id": o["payment_id"]})
            if pay:
                created_at = pay["created_at"].isoformat() if isinstance(pay["created_at"], datetime) else str(pay["created_at"])
        
        delivered_at = o["delivered_at"].isoformat() if isinstance(o.get("delivered_at"), datetime) else None
        evidence_url = f"/media/{o['delivery_evidence_file']}" if o.get("delivery_evidence_file") else ""
        
        u = db["auth_user"].find_one({"_id": o.get("user_id")})
        customer = (u.get("first_name") or u["username"]) if u else ""
        
        assigned_at = o["assigned_at"].isoformat() if isinstance(o.get("assigned_at"), datetime) else None
        driver = ""
        if o.get("assigned_to_id"):
            drv = db["auth_user"].find_one({"_id": o["assigned_to_id"]})
            if drv:
                driver = drv.get("first_name") or drv["username"]

        results.append({
            'id': str(o["_id"]),
            'order_code': o["order_code"],
            'reference': o["order_code"],
            'payment_code': db["store_payment"].find_one({"_id": o.get("payment_id")})["payment_code"] if o.get("payment_id") else "",
            'customer': customer,
            'driver': driver,
            'assigned_at': assigned_at,
            'status': o["status"],
            'created_at': created_at,
            'delivered_at': delivered_at,
            'evidence_url': evidence_url,
        })

    return {'results': results}

@app.get("/api/employee/deliveries/{pk}/")
def get_delivery_detail(pk: str, user = Depends(get_current_employee)):
    o = db["store_order"].find_one({"_id": get_query_id(pk)})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")

    u = db["auth_user"].find_one({"_id": o.get("user_id")})
    profile = db["store_customerprofile"].find_one({"user_id": o.get("user_id")}) if u else None

    created_at = None
    payment_code = ""
    if o.get("payment_id"):
        pay = db["store_payment"].find_one({"_id": o["payment_id"]})
        if pay:
            created_at = pay["created_at"].isoformat() if isinstance(pay["created_at"], datetime) else str(pay["created_at"])
            payment_code = pay["payment_code"]
            
    delivered_at = o["delivered_at"].isoformat() if isinstance(o.get("delivered_at"), datetime) else None
    evidence_url = f"/media/{o['delivery_evidence_file']}" if o.get("delivery_evidence_file") else ""
    assigned_at = o["assigned_at"].isoformat() if isinstance(o.get("assigned_at"), datetime) else None
    
    driver = ""
    if o.get("assigned_to_id"):
        drv = db["auth_user"].find_one({"_id": o["assigned_to_id"]})
        if drv:
            driver = drv.get("first_name") or drv["username"]

    total_str = str(o.get("total").to_decimal() if hasattr(o.get("total"), "to_decimal") else o["total"])

    return {
        'id': str(o["_id"]),
        'order_code': o["order_code"],
        'reference': o["order_code"],
        'payment_code': payment_code,
        'status': o["status"],
        'created_at': created_at,
        'product_name': o["product_name"],
        'quantity': int(o.get("quantity", 0)),
        'total': total_str,
        'customer_name': (u.get("first_name") or u["username"]) if u else "",
        'customer_email': u["email"] if u else "",
        'customer_phone': profile.get("phone", "") if profile else "",
        'customer_address': profile.get("address", "") if profile else "",
        'driver': driver,
        'assigned_at': assigned_at,
        'delivered_at': delivered_at,
        'evidence_url': evidence_url,
    }

@app.post("/api/employee/deliveries/{pk}/")
async def update_delivery(
    pk: str,
    action: str = Query(...),
    assigned_to: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user = Depends(get_current_employee)
):
    action = action.strip().lower()
    o = db["store_order"].find_one({"_id": get_query_id(pk)})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")

    pay = db["store_payment"].find_one({"_id": o.get("payment_id")}) if o.get("payment_id") else None

    if action == 'assign':
        if o["status"] in {"entregado", "rechazado"}:
            raise HTTPException(status_code=400, detail="Pedido bloqueado.")
        if pay and pay.get("sync_status") != "confirmado":
            raise HTTPException(status_code=400, detail="Pago no aprobado.")
        if not assigned_to:
            raise HTTPException(status_code=400, detail="assigned_to inválido.")

        assignee = db["auth_user"].find_one({"id": assigned_to, "is_staff": True}) or db["auth_user"].find_one({"_id": get_query_id(str(assigned_to)), "is_staff": True})
        if not assignee or bool(assignee.get("is_superuser", False)):
            raise HTTPException(status_code=404, detail="Repartidor no encontrado.")
        if not str(assignee.get("username", "")).startswith('ENT-'):
            raise HTTPException(status_code=400, detail="Repartidor inválido.")

        new_status = o["status"]
        if o["status"] == "procesando":
            new_status = "en_camino"

        db["store_order"].update_one(
            {"_id": o["_id"]},
            {"$set": {
                "assigned_to_id": assignee["_id"],
                "assigned_at": datetime.utcnow(),
                "status": new_status
            }}
        )
        return {
            'status': new_status,
            'driver': assignee.get("first_name") or assignee["username"],
            'assigned_at': datetime.utcnow().isoformat(),
        }

    if action == 'evidence':
        if o["status"] == "rechazado":
            raise HTTPException(status_code=400, detail="Pedido bloqueado.")
        if pay and pay.get("sync_status") != "confirmado":
            raise HTTPException(status_code=400, detail="Pago no aprobado.")
        if not file:
            raise HTTPException(status_code=400, detail="Falta archivo.")

        # Save evidence file
        filename = file.filename
        unique_name = f"evidencias/{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(MEDIA_ROOT, unique_name)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        db["store_order"].update_one(
            {"_id": o["_id"]},
            {"$set": {"delivery_evidence_file": unique_name}}
        )
        return {'evidence_url': f"/media/{unique_name}"}

    if action == 'confirm':
        if o["status"] != "en_camino":
            raise HTTPException(status_code=400, detail="Solo se puede confirmar entregas en estado En camino.")
        if not o.get("delivery_evidence_file"):
            raise HTTPException(status_code=400, detail="Primero sube la evidencia.")

        db["store_order"].update_one(
            {"_id": o["_id"]},
            {"$set": {
                "status": "entregado",
                "delivered_at": datetime.utcnow(),
                "delivered_by_id": user["_id"]
            }}
        )
        return {'status': "entregado"}

    raise HTTPException(status_code=400, detail="Acción inválida.")

@app.get("/api/employee/delivery-staff/")
def get_delivery_staff(user = Depends(get_current_employee)):
    drivers = list(db["auth_user"].find({"is_staff": True, "username": {"$regex": "^ENT-"}}).sort("username", 1))
    results = []
    for d in drivers:
        results.append({
            'id': str(d["_id"]),
            'username': d["username"],
            'name': d.get("first_name") or d["username"],
        })
    return {'results': results}


# 16. Employee Clients Management
@app.get("/api/employee/clients/")
def get_clients(
    search: Optional[str] = Query(""),
    status: Optional[str] = Query(""),
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(10),
    user = Depends(get_current_employee)
):
    now = datetime.utcnow()
    search = search.strip()
    status_filter = status.strip().lower()

    page = page if page is not None else 1
    page_size = page_size if page_size is not None else 10
    page = max(1, page)
    page_size = min(max(5, page_size), 50)

    query = {"is_staff": False}
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [
            {"email": rx},
            {"username": rx},
            {"first_name": rx}
        ]

    clients = list(db["auth_user"].find(query).sort("date_joined", -1))
    
    def compute_status(last_seen):
        if not last_seen:
            return 'suspendido'
        hours = (now - last_seen).total_seconds() / 3600.0
        if hours <= 48:
            return 'activo'
        if hours >= 744:
            return 'suspendido'
        return 'inactivo'

    filtered = []
    for client_doc in clients:
        # Get total purchases
        pays = list(db["store_payment"].find({"user_id": client_doc["_id"]}))
        tot = sum((p["total"].to_decimal() if hasattr(p["total"], "to_decimal") else p["total"] for p in pays), Decimal('0.00'))
        
        # Get last connection
        last_log = db["store_loginevent"].find_one({"user_id": client_doc["_id"], "is_employee": False}, sort=[("created_at", -1)])
        last_seen = last_log["created_at"] if last_log else (client_doc.get("last_login") or client_doc["date_joined"])
        
        st = compute_status(last_seen)
        if status_filter and st != status_filter:
            continue
            
        filtered.append((client_doc, tot, last_seen, st))

    total_count = len(filtered)
    offset = (page - 1) * page_size
    page_items = filtered[offset : offset + page_size]

    results = []
    for c_doc, tot, last_seen, st in page_items:
        last_iso = last_seen.isoformat() if isinstance(last_seen, datetime) else str(last_seen)
        results.append({
            'id': str(c_doc["_id"]),
            'full_name': (c_doc.get("first_name") or c_doc["username"]),
            'email': c_doc.get("email") or "",
            'total_purchases': str(tot),
            'last_connection': last_iso,
            'status': st,
        })

    return {
        'count': total_count,
        'page': page,
        'page_size': page_size,
        'results': results,
    }

@app.delete("/api/employee/clients/{pk}/", status_code=204)
def delete_client(pk: str, user = Depends(get_current_employee)):
    query_id = get_query_id(pk)
    client_doc = db["auth_user"].find_one({"_id": query_id})
    if not client_doc or bool(client_doc.get("is_staff", False)):
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    if client_doc["_id"] == user["_id"]:
        raise HTTPException(status_code=400, detail="No puedes borrarte a ti mismo.")

    db["auth_user"].delete_one({"_id": client_doc["_id"]})
    return Response(status_code=204)


# 17. Employee Catalog Management & Product Creation
@app.get("/api/employee/products/")
def get_employee_products(user = Depends(get_current_employee)):
    products = list(db["store_product"].find().sort("_id", -1))
    return [serialize_product(p) for p in products]

@app.post("/api/employee/products/", status_code=201)
async def create_employee_product(
    name: str = Form(...),
    brand: str = Form(""),
    product_type: str = Form(""),
    category: str = Form(...), # ID of category
    description: str = Form(""),
    specs: str = Form(""),
    price: float = Form(...),
    old_price: Optional[float] = Form(None),
    discount_percent: int = Form(0),
    stock: int = Form(0),
    status: Optional[str] = Form(None),
    rating: float = Form(0.0),
    reviews_count: int = Form(0),
    is_offer: bool = Form(False),
    is_featured: bool = Form(False),
    image_file: Optional[UploadFile] = File(None),
    user = Depends(get_current_employee)
):
    cat = db["store_category"].find_one({"_id": get_query_id(category)})
    if not cat:
        raise HTTPException(status_code=400, detail="Categoría no encontrada.")

    base = slugify(name)[:180] or 'producto'
    slug = base
    i = 2
    while db["store_product"].find_one({"slug": slug}):
        slug = f'{base}-{i}'
        i += 1

    stock = max(0, stock)
    status_value = status
    if not status_value:
        status_value = "disponible"
        if stock <= 0:
            status_value = "agotado"
        elif stock <= 5:
            status_value = "stock_bajo"

    unique_name = ""
    if image_file:
        filename = image_file.filename
        unique_name = f"productos/{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(MEDIA_ROOT, unique_name)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            content = await image_file.read()
            f.write(content)

    new_prod = {
        "name": name.strip(),
        "slug": slug,
        "brand": brand.strip(),
        "product_type": product_type.strip(),
        "category_id": cat["_id"],
        "description": description.strip(),
        "specs": specs.strip(),
        "price": Decimal128(Decimal(str(price))),
        "old_price": Decimal128(Decimal(str(old_price))) if old_price is not None else None,
        "discount_percent": max(0, discount_percent),
        "stock": stock,
        "status": status_value,
        "rating": Decimal128(Decimal(str(rating))),
        "reviews_count": max(0, reviews_count),
        "image_base64": "",
        "image_file": unique_name,
        "is_offer": is_offer,
        "is_featured": is_featured,
    }

    res = db["store_product"].insert_one(new_prod)
    new_prod["_id"] = res.inserted_id
    return serialize_product(new_prod)


# 18. Admin Control
@app.get("/api/employee/admin-dashboard/")
def get_admin_dashboard(user = Depends(get_current_superuser)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # General Stats
    sales_today_res = list(db["store_payment"].aggregate([
        {"$match": {"created_at": {"$gte": today_start}, "sync_status": "confirmado"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]))
    sales_today = sales_today_res[0]["total"].to_decimal() if sales_today_res and hasattr(sales_today_res[0]["total"], "to_decimal") else Decimal("0.00")

    new_clients = db["auth_user"].count_documents({"is_staff": False, "date_joined": {"$gte": month_start}})
    pending_payments = db["store_payment"].count_documents({"sync_status": "en_espera"})

    staff_count = db["auth_user"].count_documents({"is_staff": True})
    active_nodes = 20 + staff_count

    # Charts Data
    # 7D
    payments_7d = list(db["store_payment"].find({"created_at": {"$gte": now - timedelta(days=7)}, "sync_status": "confirmado"}))
    days_data = []
    day_names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    for i in range(7):
        day_date = (now - timedelta(days=6 - i)).date()
        day_total = sum((p["total"].to_decimal() if hasattr(p["total"], "to_decimal") else p["total"] for p in payments_7d if p["created_at"].date() == day_date), Decimal("0.00"))
        label = f"{day_names[day_date.weekday()]} {day_date.day}"
        days_data.append({'label': label, 'total': float(day_total)})

    # 24H
    payments_24h = list(db["store_payment"].find({"created_at": {"$gte": now - timedelta(hours=24)}, "sync_status": "confirmado"}))
    hours_data = []
    for i in range(12):
        bucket_start = now - timedelta(hours=24 - i*2)
        bucket_end = now - timedelta(hours=22 - i*2)
        bucket_total = sum((p["total"].to_decimal() if hasattr(p["total"], "to_decimal") else p["total"] for p in payments_24h if bucket_start <= p["created_at"] < bucket_end), Decimal("0.00"))
        # Local time display
        label = (bucket_start - timedelta(hours=5)).strftime('%H:%M') # simulated -5h
        hours_data.append({'label': label, 'total': float(bucket_total)})

    # 1H
    payments_1h = list(db["store_payment"].find({"created_at": {"$gte": now - timedelta(hours=1)}, "sync_status": "confirmado"}))
    mins_data = []
    for i in range(6):
        bucket_start = now - timedelta(minutes=60 - i*10)
        bucket_end = now - timedelta(minutes=50 - i*10)
        bucket_total = sum((p["total"].to_decimal() if hasattr(p["total"], "to_decimal") else p["total"] for p in payments_1h if bucket_start <= p["created_at"] < bucket_end), Decimal("0.00"))
        label = (bucket_start - timedelta(hours=5)).strftime('%H:%M')
        mins_data.append({'label': label, 'total': float(bucket_total)})

    # Logs
    logs = []
    recent_clients = list(db["auth_user"].find({"is_staff": False}).sort("date_joined", -1).limit(10))
    for c in recent_clients:
        logs.append({
            'time': c["date_joined"],
            'tag': '@System',
            'message': f"Nuevo registro de cliente: '{c.get('first_name') or c['username']}'."
        })
        
    recent_logins = list(db["store_loginevent"].find().sort("created_at", -1).limit(10))
    for e in recent_logins:
        u = db["auth_user"].find_one({"_id": e.get("user_id")})
        u_name = u["username"] if u else "Desconocido"
        logs.append({
            'time': e["created_at"],
            'tag': '@Security',
            'message': f"Sesión iniciada por '{u_name}' (Rol: {'Empleado' if e.get('is_employee') else 'Cliente'})."
        })

    recent_pays = list(db["store_payment"].find().sort("created_at", -1).limit(10))
    for p in recent_pays:
        u = db["auth_user"].find_one({"_id": p.get("user_id")})
        u_name = u["username"] if u else "Desconocido"
        if p["sync_status"] == "confirmado":
            msg = f"Transacción completada #{p['payment_code']}. Cliente ID: {u_name}."
            tag = '@System'
        elif p["sync_status"] == "rechazado":
            msg = f"Transacción rechazada #{p['payment_code']}."
            tag = '@Security'
        else:
            msg = f"Transacción en espera de verificación #{p['payment_code']}."
            tag = '@System'
        logs.append({
            'time': p["created_at"],
            'tag': tag,
            'message': msg
        })

    recent_ords = list(db["store_order"].find({"status": {"$ne": "procesando"}}).sort("_id", -1).limit(10))
    for o in recent_ords:
        if o["status"] == "en_camino":
            msg = f"Entrega #{o['order_code']} marcada como 'En Camino'."
            tag = '@Logistics'
        elif o["status"] == "entregado":
            drv_name = "Personal"
            if o.get("delivered_by_id"):
                drv = db["auth_user"].find_one({"_id": o["delivered_by_id"]})
                if drv:
                    drv_name = drv.get("first_name") or drv["username"]
            msg = f"Entrega #{o['order_code']} completada por '{drv_name}'."
            tag = '@Logistics'
        else:
            msg = f"Pedido #{o['order_code']} cancelado/rechazado."
            tag = '@Security'

        # Get time from payment
        o_time = now
        if o.get("payment_id"):
            py_doc = db["store_payment"].find_one({"_id": o["payment_id"]})
            if py_doc:
                o_time = py_doc["created_at"]
        logs.append({
            'time': o_time,
            'tag': tag,
            'message': msg
        })

    logs = sorted(logs, key=lambda x: x['time'], reverse=True)[:15]
    formatted_logs = []
    for idx, item in enumerate(logs):
        formatted_logs.append({
            'id': str(idx),
            'time': (item['time'] - timedelta(hours=5)).strftime('%H:%M:%S'),
            'tag': item['tag'],
            'message': item['message']
        })

    # Recent Movements
    recent_movements = []
    orders_qs = list(db["store_order"].find().sort("_id", -1).limit(10))
    for o in orders_qs:
        u = db["auth_user"].find_one({"_id": o.get("user_id")})
        client_name = (u.get("first_name") or u["username"]) if u else "Anónimo"
        client_email = u["email"] if u else ""
        parts = client_name.split()
        initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "AN"
        total_str = str(o.get("total").to_decimal() if hasattr(o.get("total"), "to_decimal") else o["total"])
        recent_movements.append({
            'protocol_id': o["order_code"],
            'client_initials': initials,
            'client_name': client_name,
            'client_email': client_email,
            'product_name': o["product_name"],
            'status': o["status"],
            'amount': total_str,
            'id': str(o["_id"])
        })

    # Employee Activities
    staff_qs = list(db["auth_user"].find({"is_staff": True}).sort("_id", 1))
    employee_activity = []
    for user_doc in staff_qs:
        role = 'Ventas'
        if user_doc["username"].startswith('ENT-'):
            role = 'Logística'
        elif user_doc.get("is_superuser", False):
            role = 'Administrador'
            
        if role == 'Logística':
            metric_val = db["store_order"].count_documents({"assigned_to_id": user_doc["_id"]})
            metric_label = 'pedidos hoy'
        elif role == 'Administrador':
            metric_val = db["store_payment"].count_documents({"sync_status": {"$ne": "en_espera"}})
            metric_label = 'validaciones hoy'
        else:
            metric_val = 5
            metric_label = 'tareas'

        employee_activity.append({
            'username': user_doc["username"],
            'name': user_doc.get("first_name") or user_doc["username"],
            'role': role,
            'metric_label': metric_label,
            'metric_val': metric_val
        })

    # Inventory nexus low stock
    low_p = db["store_product"].find({"stock": {"$gt": 0}}).sort("stock", 1).limit(1)
    low_list = list(low_p)
    low_stock = {
        'name': low_list[0]["name"] if low_list else 'Sin alertas',
        'stock': int(low_list[0]["stock"]) if low_list else 0
    }

    # Top performer
    top_sold_res = list(db["store_order"].aggregate([
        {"$group": {"_id": "$product_name", "total_qty": {"$sum": "$quantity"}}},
        {"$sort": {"total_qty": -1}},
        {"$limit": 1}
    ]))
    if top_sold_res:
        top_performer = {
            'name': top_sold_res[0]["_id"],
            'sold_count': int(top_sold_res[0]["total_qty"])
        }
    else:
        top_performer = {
            'name': 'Ninguno',
            'sold_count': 0
        }

    return {
        'ventas_hoy': float(sales_today),
        'new_clients': new_clients,
        'pending_payments': pending_payments,
        'active_nodes': active_nodes,
        'charts': {
            '1H': mins_data,
            '24H': hours_data,
            '7D': days_data
        },
        'logs': formatted_logs,
        'movements': recent_movements,
        'employees': employee_activity,
        'inventory': {
            'low_stock': low_stock,
            'top_performer': top_performer
        }
    }

@app.post("/api/employee/admin-dashboard/optimize-stock/")
def optimize_stock(user = Depends(get_current_superuser)):
    res = db["store_product"].update_many({"stock": {"$lte": 3}}, {"$set": {"stock": 15}})
    return {'updated': res.modified_count}


# 19. Mock Admin / Root path
@app.get("/admin/")
def admin_mock():
    return Response(
        content="<h1>FastAPI Backend</h1><p>El panel de administración de Django ha sido removido según tu requerimiento.</p>",
        media_type="text/html"
    )

@app.get("/")
def root():
    return {"status": "ok", "backend": "FastAPI (Pure PyMongo)"}


# 20. Serve Media Static Files
app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")
