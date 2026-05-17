const API_BASE = ''

const ACCESS_KEY = 'pg_access'
const REFRESH_KEY = 'pg_refresh'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || ''
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function fetchJson(path, options) {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (res.status === 204) return null

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.detail || `HTTP ${res.status}`
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

export async function register({ username, email, password }) {
  return fetchJson('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
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
