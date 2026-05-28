const API_BASE = ''

const ACCESS_KEY = 'pg_access'
const REFRESH_KEY = 'pg_refresh'
const EMPLOYEE_KEY = 'pg_employee'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || ''
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function setEmployeeSession(enabled) {
  if (enabled) localStorage.setItem(EMPLOYEE_KEY, '1')
  else localStorage.removeItem(EMPLOYEE_KEY)
}

export function isEmployeeSession() {
  return (localStorage.getItem(EMPLOYEE_KEY) || '') === '1'
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EMPLOYEE_KEY)
}

function safeJsonParse(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractErrorMessage(data, fallback) {
  if (data?.detail) return String(data.detail)
  if (data && typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length) {
      const k = keys[0]
      const v = data[k]
      if (Array.isArray(v) && v.length) return `${k}: ${String(v[0])}`
      if (typeof v === 'string') return `${k}: ${v}`
    }
  }
  return fallback
}

function normalizePath(path) {
  return String(path || '').split('?')[0]
}

const NO_REFRESH_PATHS = new Set(['/api/token/', '/api/token/refresh/', '/api/auth/register/'])
const NO_AUTH_HEADER_PATHS = new Set(['/api/token/', '/api/token/refresh/'])

async function fetchJson(path, options, attempt = 0) {
  const normalizedPath = normalizePath(path)
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && !NO_AUTH_HEADER_PATHS.has(normalizedPath) ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (res.status === 204) return null

  const text = await res.text()
  const data = safeJsonParse(text)

  if (res.status === 401) {
    const refresh = localStorage.getItem(REFRESH_KEY) || ''
    if (attempt === 0 && refresh && !NO_REFRESH_PATHS.has(normalizedPath)) {
      try {
        const refreshed = await fetchJson(
          '/api/token/refresh/',
          {
          method: 'POST',
          body: JSON.stringify({ refresh }),
          },
          1
        )
        if (refreshed?.access) {
          setTokens({ access: refreshed.access })
          return fetchJson(path, options, 1)
        }
      } catch {
        clearTokens()
      }
    }
  }

  if (!res.ok) {
    const message = extractErrorMessage(data, `HTTP ${res.status}`)
    throw new Error(message)
  }

  return data
}

async function fetchFormData(path, formData, options = {}, attempt = 0) {
  const normalizedPath = normalizePath(path)
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'POST',
    headers: {
      ...(token && !NO_AUTH_HEADER_PATHS.has(normalizedPath) ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: formData,
  })

  if (res.status === 204) return null

  const text = await res.text()
  const data = safeJsonParse(text)

  if (res.status === 401) {
    const refresh = localStorage.getItem(REFRESH_KEY) || ''
    if (attempt === 0 && refresh && !NO_REFRESH_PATHS.has(normalizedPath)) {
      try {
        const refreshed = await fetchJson(
          '/api/token/refresh/',
          {
          method: 'POST',
          body: JSON.stringify({ refresh }),
          },
          1
        )
        if (refreshed?.access) {
          setTokens({ access: refreshed.access })
          return fetchFormData(path, formData, options, 1)
        }
      } catch {
        clearTokens()
      }
    }
  }

  if (!res.ok) {
    const message = extractErrorMessage(data, `HTTP ${res.status}`)
    throw new Error(message)
  }

  return data
}

export async function login({ username, password }) {
  const data = await fetchJson('/api/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setTokens({ access: data?.access, refresh: data?.refresh })
  return data
}

export async function loginEmployee({ username, password }) {
  return login({ username, password })
}

export async function refreshToken() {
  const refresh = localStorage.getItem(REFRESH_KEY) || ''
  if (!refresh) throw new Error('No refresh token')
  const data = await fetchJson('/api/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
  setTokens({ access: data?.access })
  return data
}

export async function register({ full_name, email, password }) {
  return fetchJson('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ full_name, email, password }),
  })
}

export async function getMe() {
  return fetchJson('/api/auth/me/')
}

export async function getCategories() {
  return fetchJson('/api/categories/')
}

export async function getProducts(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.category) searchParams.set('category', params.category)
  if (params.sort) searchParams.set('sort', params.sort)
  const qs = searchParams.toString()
  return fetchJson(`/api/products/${qs ? `?${qs}` : ''}`)
}

export async function getProductBySlug(slug) {
  if (!slug) throw new Error('Falta slug')
  return fetchJson(`/api/products/${encodeURIComponent(String(slug))}/`)
}

export async function getOrders() {
  return fetchJson('/api/orders/')
}

export async function getNotifications() {
  return fetchJson('/api/notifications/')
}

export async function getCart() {
  return fetchJson('/api/cart/')
}

export async function addToCart({ product_id, product_slug, quantity = 1 }) {
  return fetchJson('/api/cart/add/', {
    method: 'POST',
    body: JSON.stringify({ product_id, product_slug, quantity }),
  })
}

export async function clearCart() {
  return fetchJson('/api/cart/clear/', { method: 'DELETE' })
}

export async function deleteCartItem(id) {
  return fetchJson(`/api/cart/items/${id}/`, { method: 'DELETE' })
}

export async function updateCartItemQuantity(id, quantity) {
  return fetchJson(`/api/cart/items/${id}/update/`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

export async function checkout() {
  return fetchJson('/api/checkout/', { method: 'POST' })
}

export async function createPayment(formData) {
  return fetchFormData('/api/payments/', formData)
}

export async function getPaymentByCode(code) {
  if (!code) throw new Error('Falta código de pago')
  return fetchJson(`/api/payments/${encodeURIComponent(String(code))}/`)
}

export async function getEmployeeDashboard() {
  return fetchJson('/api/employee/dashboard/')
}

export async function getEmployeeSales() {
  return fetchJson('/api/employee/sales/')
}

export async function getEmployeeProducts() {
  return fetchJson('/api/employee/products/')
}

export async function createEmployeeProduct(formData) {
  return fetchFormData('/api/employee/products/', formData)
}
