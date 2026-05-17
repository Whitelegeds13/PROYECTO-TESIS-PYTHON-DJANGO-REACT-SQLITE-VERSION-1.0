import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login({ onLogin, onRegisterClick, afterLoginPath = '/' }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin({ username: username.trim(), password })
      navigate(afterLoginPath)
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mx-auto mt-10 max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/50">PALACIO GAMER</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Iniciar sesión</h1>
          <div className="mt-2 text-sm text-white/60">Accede con tu usuario para continuar.</div>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div>
            <label className="text-xs font-extrabold tracking-widest text-white/50">USUARIO</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
              placeholder="tu_usuario"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold tracking-widest text-white/50">CONTRASEÑA</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={[
              'w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110',
              loading ? 'cursor-not-allowed opacity-70' : '',
            ].join(' ')}
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <div className="flex items-center justify-between pt-2 text-sm">
            <Link to="/" className="text-white/60 hover:text-white">
              Volver al Home
            </Link>
            <button type="button" onClick={onRegisterClick} className="font-semibold text-cyan-300 hover:text-cyan-200">
              Crear cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

