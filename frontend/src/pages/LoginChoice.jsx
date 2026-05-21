import { Building2, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginChoice() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mx-auto mt-10 max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/50">PALACIO GAMER</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Iniciar sesión</h1>
          <div className="mt-2 text-sm text-white/60">Elige el tipo de acceso.</div>
        </div>

        <div className="grid gap-3 px-6 py-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-cyan-300/20 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-200">
                <UserRound size={18} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white/90">Cliente</div>
                <div className="mt-1 text-xs text-white/55">Acceso para compras y pedidos.</div>
              </div>
            </div>
            <div className="mt-4 text-sm font-semibold text-cyan-300/90">Ingresar →</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/login-empleado')}
            className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-fuchsia-400/20 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-fuchsia-400/10 p-2 text-fuchsia-200">
                <Building2 size={18} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white/90">Empleado</div>
                <div className="mt-1 text-xs text-white/55">Acceso interno del sistema.</div>
              </div>
            </div>
            <div className="mt-4 text-sm font-semibold text-fuchsia-300/90">Acceder →</div>
          </button>
        </div>

        <div className="border-t border-white/10 px-6 py-4">
          <Link to="/" className="text-sm text-white/60 hover:text-white">
            Volver al Home
          </Link>
        </div>
      </div>
    </div>
  )
}

