import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { addToCart, getCart, getNotifications } from './api/client.js'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import Home from './pages/Home.jsx'
import Hardware from './pages/Hardware.jsx'
import Orders from './pages/Orders.jsx'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [cartOpen, setCartOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const [cart, setCart] = useState({ count: 0, subtotal: '0.00', items: [] })
  const [cartLoading, setCartLoading] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const notifNewCount = useMemo(
    () => notifications.filter((n) => n.is_new).length,
    [notifications],
  )

  async function refreshCart() {
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

  function handleSearchSubmit(q) {
    const query = (q || '').trim()
    navigate(`/hardware${query ? `?search=${encodeURIComponent(query)}` : ''}`)
  }

  useEffect(() => {
    refreshCart()
    refreshNotifications()
  }, [])

  useEffect(() => {
    setCartOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname])

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
        onGoOrders={() => navigate('/mis-pedidos')}
        onSearchSubmit={handleSearchSubmit}
      />

      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
          <Route path="/hardware" element={<Hardware onAddToCart={handleAddToCart} />} />
          <Route path="/mis-pedidos" element={<Orders />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
