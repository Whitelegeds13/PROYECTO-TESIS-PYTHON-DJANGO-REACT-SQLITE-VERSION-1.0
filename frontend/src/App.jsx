import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  addToCart,
  clearCart,
  clearTokens,
  deleteCartItem,
  getAccessToken,
  getCart,
  getMe,
  getNotifications,
  isEmployeeSession,
  login,
  setEmployeeSession,
} from './api/client.js'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import Home from './pages/Home.jsx'
import Hardware from './pages/Hardware.jsx'
import LoginChoice from './pages/LoginChoice.jsx'
import Login from './pages/Login.jsx'
import LoginEmpleado from './pages/LoginEmpleado.jsx'
import Orders from './pages/Orders.jsx'
import Cart from './pages/Cart.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import EmployeeLayout from './pages/empleado/EmployeeLayout.jsx'
import EmployeeSection from './pages/empleado/EmployeeSection.jsx'
import EmployeeProductCreate from './pages/empleado/EmployeeProductCreate.jsx'
import EmployeeProducts from './pages/empleado/EmployeeProducts.jsx'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [cartOpen, setCartOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const [cart, setCart] = useState({ count: 0, subtotal: '0.00', items: [] })
  const [cartLoading, setCartLoading] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const [me, setMe] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const notifNewCount = useMemo(
    () => notifications.filter((n) => n.is_new).length,
    [notifications],
  )

  async function refreshCart() {
    if (!getAccessToken()) {
      setCart({ count: 0, subtotal: '0.00', items: [] })
      return
    }
    try {
      setCartLoading(true)
      const data = await getCart()
      if (data) setCart(data)
    } catch {
      setCart({ count: 0, subtotal: '0.00', items: [] })
    } finally {
      setCartLoading(false)
    }
  }

  async function refreshNotifications() {
    if (!getAccessToken()) {
      setNotifications([])
      return
    }
    try {
      setNotificationsLoading(true)
      const data = await getNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }

  async function handleAddToCart(product) {
    try {
      await addToCart({ product_id: product.id, quantity: 1 })
      await refreshCart()
      setCartOpen(true)
      setNotificationsOpen(false)
    } catch {
      setCartOpen(true)
      setNotificationsOpen(false)
    }
  }

  async function handleRemoveCartItem(id) {
    try {
      await deleteCartItem(id)
    } finally {
      await refreshCart()
    }
  }

  async function handleClearCart() {
    try {
      await clearCart()
    } finally {
      await refreshCart()
    }
  }

  function handleSearchSubmit(q) {
    const query = (q || '').trim()
    navigate(`/hardware${query ? `?search=${encodeURIComponent(query)}` : ''}`)
  }

  useEffect(() => {
    refreshCart()
    refreshNotifications()
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadMe() {
      if (!getAccessToken()) {
        setMe(null)
        setAuthReady(true)
        return
      }
      try {
        const data = await getMe()
        if (!mounted) return
        setMe(data || null)
        if (data?.is_staff) setEmployeeSession(true)
        else setEmployeeSession(false)
        setAuthReady(true)
      } catch {
        if (!mounted) return
        clearTokens()
        setMe(null)
        setAuthReady(true)
      }
    }
    loadMe()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setCartOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname])

  async function handleClientLogin({ username, password }) {
    await login({ username, password })
    setEmployeeSession(false)
    try {
      const data = await getMe()
      setMe(data || null)
    } catch {
      setMe(null)
    }
  }

  function ProtectedEmployeeRoute({ children }) {
    if (!getAccessToken() || !isEmployeeSession()) return <Navigate to="/login-empleado" replace />
    return children
  }

  const clientLoggedIn = Boolean(authReady && getAccessToken() && !isEmployeeSession())

  return (
    <div className="min-h-full">
      <Header
        cart={cart}
        cartLoading={cartLoading}
        cartOpen={cartOpen}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsOpen={notificationsOpen}
        notifNewCount={notifNewCount}
        onToggleCart={() => {
          const next = !cartOpen
          setCartOpen(next)
          setNotificationsOpen(false)
          if (next) refreshCart()
        }}
        onToggleNotifications={() => {
          const next = !notificationsOpen
          setNotificationsOpen(next)
          setCartOpen(false)
          if (next) refreshNotifications()
        }}
        onGoLogin={() => navigate('/iniciar-sesion')}
        onGoAccount={() => navigate('/mis-pedidos')}
        onLogout={() => {
          clearTokens()
          setMe(null)
          navigate('/', { replace: true })
        }}
        showClientSession={clientLoggedIn}
        me={me}
        onSearchSubmit={handleSearchSubmit}
        onRemoveCartItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
      />

      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
          <Route path="/hardware" element={<Hardware onAddToCart={handleAddToCart} />} />
          <Route path="/producto/:slug" element={<ProductDetail onAddToCart={handleAddToCart} />} />
          <Route path="/carrito" element={<Cart cart={cart} loading={cartLoading} onRemoveItem={handleRemoveCartItem} onClear={handleClearCart} />} />
          <Route path="/mis-pedidos" element={<Orders />} />
          <Route path="/iniciar-sesion" element={<LoginChoice />} />
          <Route
            path="/login"
            element={<Login onLogin={handleClientLogin} afterLoginPath="/" />}
          />
          <Route path="/login-empleado" element={<LoginEmpleado />} />

          <Route
            path="/empleado"
            element={
              <ProtectedEmployeeRoute>
                <EmployeeLayout
                  onLogout={() => {
                    clearTokens()
                    setMe(null)
                    navigate('/login-empleado', { replace: true })
                  }}
                />
              </ProtectedEmployeeRoute>
            }
          >
            <Route path="dashboard" element={<EmployeeSection title="Dashboard" />} />
            <Route path="productos" element={<EmployeeProducts />} />
            <Route path="productos/nuevo" element={<EmployeeProductCreate />} />
            <Route path="ventas" element={<EmployeeSection title="Ventas" />} />
            <Route path="clientes" element={<EmployeeSection title="Clientes" />} />
            <Route path="entregas" element={<EmployeeSection title="Entregas" />} />
            <Route path="pagos" element={<EmployeeSection title="Pagos" />} />
            <Route path="reportes" element={<EmployeeSection title="Reportes" />} />
            <Route path="configuracion" element={<EmployeeSection title="Configuración" />} />
            <Route path="*" element={<Navigate to="/empleado/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
