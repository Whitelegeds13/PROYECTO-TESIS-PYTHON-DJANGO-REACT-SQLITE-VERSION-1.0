import {
  BarChart3,
  Plus,
  Box,
  CreditCard,
  Package,
  Settings,
  Truck,
  Users,
  Search,
  Bell,
  Archive
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getMe } from '../../api/client.js'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

const NAV_EMPLOYEE = [
  { to: '/empleado/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/empleado/productos', label: 'Productos', icon: Package },
  { to: '/empleado/ventas', label: 'Ventas', icon: Box },
  { to: '/empleado/clientes', label: 'Clientes', icon: Users },
  { to: '/empleado/entregas', label: 'Entregas', icon: Truck },
  { to: '/empleado/empaquetado', label: 'Empaquetado', icon: Archive },
  { to: '/empleado/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/empleado/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/empleado/configuracion', label: 'Configuración', icon: Settings },
]

const NAV_ADMIN = [
  { to: '/empleado/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/empleado/productos', label: 'Productos', icon: Package },
  { to: '/empleado/ventas', label: 'Ventas', icon: Box },
  { to: '/empleado/clientes', label: 'Clientes', icon: Users },
  { to: '/empleado/entregas', label: 'Entregas', icon: Truck },
  { to: '/empleado/empaquetado', label: 'Empaquetado', icon: Archive },
  { to: '/empleado/pagos', label: 'Validación de Pagos', icon: CreditCard },
  { to: '/empleado/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/empleado/configuracion', label: 'Configuración', icon: Settings },
]

export default function EmployeeLayout({ me, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [localMe, setLocalMe] = useState(me)
  const [loadingMe, setLoadingMe] = useState(!me)

  useEffect(() => {
    if (me) {
      setLocalMe(me)
      setLoadingMe(false)
      return
    }
    let mounted = true
    async function load() {
      try {
        const data = await getMe()
        if (mounted) {
          setLocalMe(data)
        }
      } catch {
        if (mounted) {
          setLocalMe(null)
        }
      } finally {
        if (mounted) {
          setLoadingMe(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [me])

  const isAdmin = !!(localMe?.is_staff && localMe?.is_superuser)
  const NAV = isAdmin ? NAV_ADMIN : NAV_EMPLOYEE

  const current = NAV.find((n) => location.pathname.startsWith(n.to))?.label || 'Panel'
  const showAddProduct =
    location.pathname === '/empleado/productos' || location.pathname === '/empleado/productos/'

  if (loadingMe) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center text-white/50 font-mono">
        LOADING PROTOCOL...
      </div>
    )
  }

  return (
    <div className={cx("mx-auto max-w-6xl px-4 pb-12 transition-all duration-300", isAdmin ? "dark text-white" : "")}>
      {isAdmin && (
        <div className="fixed inset-0 -z-50 bg-[#020617] transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_20%,rgba(168,85,247,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_80%_80%,rgba(34,211,238,0.12),transparent_60%)]" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className={cx(
          "sticky top-24 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border transition-all duration-300 md:block relative",
          isAdmin 
            ? "border-white/10 bg-[#071026]/70 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            : "border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl"
        )}>
          <div className="border-b border-white/10 px-5 py-5">
            <div className="text-xs font-extrabold tracking-widest text-white/50">
              {isAdmin ? "PALACIO GAMER" : "PALACIO GAMER"}
            </div>
            <div className={cx(
              "mt-1 text-lg font-extrabold",
              isAdmin 
                ? "bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent tracking-tight font-sans"
                : "text-white/90"
            )}>
              {isAdmin ? "ADMIN PROTOCOL V1.0" : "Panel Empleado"}
            </div>
          </div>

          <nav className="space-y-1 px-3 py-3 h-[calc(100%-8rem)] overflow-y-auto">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                      isActive
                        ? isAdmin
                          ? 'border border-fuchsia-500/20 bg-fuchsia-500/10 text-white shadow-[0_0_0_1px_rgba(240,46,170,0.18)]'
                          : 'border border-cyan-300/20 bg-cyan-300/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Icon size={18} className={isAdmin ? "text-fuchsia-300/80" : "text-cyan-200/80"} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            <button
              type="button"
              onClick={onLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-200/90 transition hover:bg-rose-400/10"
            >
              <span>Cerrar sesión</span>
            </button>
          </nav>

          {/* New Entry Button for Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/empleado/productos/nuevo')}
              className="absolute bottom-4 left-3 right-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:brightness-110 active:scale-[0.98] transition px-4 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20 border border-fuchsia-400/30"
            >
              <Plus size={16} />
              <span>New Entry</span>
            </button>
          )}
        </aside>

        {/* Main Section */}
        <section className="min-h-[calc(100vh-7rem)]">
          {/* Top Bar */}
          {isAdmin ? (
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#071026]/70 px-6 py-4 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
              {/* Search input */}
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  placeholder="Search protocol database..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-xs text-white/90 outline-none focus:border-fuchsia-500/50 transition placeholder:text-white/35"
                />
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center justify-end gap-5">
                {/* Notification Bell */}
                <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition cursor-pointer">
                  <Bell size={16} className="text-white/75" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-white/90">{localMe?.first_name || localMe?.username || 'Admin_Nexus'}</div>
                    <div className="text-[9px] font-mono font-extrabold tracking-wider text-cyan-300">LEVEL 4 CLEARANCE</div>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                    alt="Admin Avatar"
                    className="h-9 w-9 rounded-full border border-cyan-400/50 object-cover shadow-lg shadow-cyan-500/20"
                  />
                  <button
                    type="button"
                    onClick={onLogout}
                    className="ml-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 px-6 py-5">
                <div>
                  <div className="text-xs font-extrabold tracking-widest text-white/40">EMPLEADO</div>
                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-white/90">{current}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-extrabold text-emerald-100/90 sm:inline-flex">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Sesión activa
                  </div>
                  {showAddProduct ? (
                    <button
                      type="button"
                      onClick={() => navigate('/empleado/productos/nuevo')}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
                    >
                      <Plus size={18} />
                      Agregar producto
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Children views */}
          <Outlet context={{ me: localMe }} />
        </section>
      </div>
    </div>
  )
}
