import { Bell, Search, ShoppingCart, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import CartDropdown from './CartDropdown.jsx'
import NotificationDropdown from './NotificationDropdown.jsx'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Header({
  cart,
  cartLoading,
  cartOpen,
  notifications,
  notificationsLoading,
  notificationsOpen,
  notifNewCount,
  onToggleCart,
  onToggleNotifications,
  onGoLogin,
  onGoAccount,
  onGoEmployeePanel,
  onLogout,
  showClientSession,
  sessionActive,
  employeeSession,
  me,
  onSearchSubmit,
  onRemoveCartItem,
  onClearCart,
}) {
  const location = useLocation()
  const [q, setQ] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (location.pathname !== '/hardware') setQ('')
  }, [location.pathname])

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!wrapRef.current) return
      if (wrapRef.current.contains(e.target)) return
      if (cartOpen) onToggleCart()
      if (notificationsOpen) onToggleNotifications()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [cartOpen, notificationsOpen, onToggleCart, onToggleNotifications])

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#050C1F]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              Palacio Gamer
            </span>
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-white/70 md:flex">
            <NavLink
              to="/hardware"
              className={({ isActive }) =>
                cx('rounded-md px-3 py-2 transition hover:text-white', isActive && 'text-white')
              }
            >
              Hardware
            </NavLink>
            <NavLink
              to="/hardware?category=perifericos"
              className="rounded-md px-3 py-2 transition hover:text-white"
            >
              Periféricos
            </NavLink>
            <NavLink
              to="/hardware?category=ensambles"
              className="rounded-md px-3 py-2 transition hover:text-white"
            >
              Ensambles
            </NavLink>
            <NavLink
              to="/hardware?search=pre-ensamblado"
              className="rounded-md px-3 py-2 transition hover:text-white"
            >
              Pre-armados
            </NavLink>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3" ref={wrapRef}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSearchSubmit(q)
            }}
            className="hidden w-full max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-[0_0_0_1px_rgba(34,211,238,0.08)] md:flex"
          >
            <Search size={16} className="text-cyan-300/80" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar tecnología…"
              className="w-full bg-transparent outline-none placeholder:text-white/40"
            />
          </form>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleNotifications}
              className={cx(
                'relative rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:text-white',
                notificationsOpen && 'border-cyan-300/30 shadow-[0_0_0_1px_rgba(34,211,238,0.20)]',
              )}
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {notifNewCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[11px] font-bold text-white shadow">
                  {notifNewCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={sessionActive ? (employeeSession ? onGoEmployeePanel : onGoAccount) : onGoLogin}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:text-white"
              aria-label="Usuario"
            >
              <User size={18} />
            </button>

            <button
              type="button"
              onClick={onToggleCart}
              className={cx(
                'relative rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:text-white',
                cartOpen && 'border-fuchsia-400/30 shadow-[0_0_0_1px_rgba(168,85,247,0.20)]',
              )}
              aria-label="Carrito"
            >
              <ShoppingCart size={18} />
              {cart?.count > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1 text-[11px] font-bold text-[#05102a] shadow">
                  {cart.count}
                </span>
              )}
            </button>

            <div className="hidden md:block">
              {sessionActive ? (
                <div className="inline-flex min-w-[230px] overflow-hidden rounded-full border border-white/10 bg-white/5">
                  <div className="inline-flex flex-1 items-center justify-center gap-2 border-r border-white/10 bg-emerald-400/10 px-4 py-2 text-[11px] font-extrabold text-emerald-100/90">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Sesión iniciada
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex-1 bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onGoLogin}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Iniciar sesión
                </button>
              )}
            </div>

            <NotificationDropdown
              open={notificationsOpen}
              loading={notificationsLoading}
              notifications={notifications}
            />
            <CartDropdown
              open={cartOpen}
              loading={cartLoading}
              cart={cart}
              onRemoveItem={onRemoveCartItem}
              onClear={onClearCart}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
