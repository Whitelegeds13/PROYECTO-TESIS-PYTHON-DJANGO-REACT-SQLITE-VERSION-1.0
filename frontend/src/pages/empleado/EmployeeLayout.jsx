import {
  BarChart3,
  Box,
  CreditCard,
  Package,
  Settings,
  Truck,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

const NAV = [
  { to: '/empleado/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/empleado/productos', label: 'Productos', icon: Package },
  { to: '/empleado/ventas', label: 'Ventas', icon: Box },
  { to: '/empleado/clientes', label: 'Clientes', icon: Users },
  { to: '/empleado/entregas', label: 'Entregas', icon: Truck },
  { to: '/empleado/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/empleado/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/empleado/configuracion', label: 'Configuración', icon: Settings },
]

export default function EmployeeLayout({ onLogout }) {
  const location = useLocation()

  const current = NAV.find((n) => location.pathname.startsWith(n.to))?.label || 'Panel'

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl md:block">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="text-xs font-extrabold tracking-widest text-white/50">PALACIO GAMER</div>
            <div className="mt-1 text-lg font-extrabold text-white/90">Panel Empleado</div>
          </div>

          <nav className="space-y-1 px-3 py-3">
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
                        ? 'border border-cyan-300/20 bg-cyan-300/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Icon size={18} className="text-cyan-200/80" />
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
        </aside>

        <section className="min-h-[calc(100vh-7rem)]">
          <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/40">EMPLEADO</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-white/90">{current}</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <Outlet />
        </section>
      </div>
    </div>
  )
}
