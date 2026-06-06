import { KeyRound, ShieldCheck, UserCog } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearTokens, getAccessToken, getMe, loginEmployee, setEmployeeSession } from '../api/client.js'

const BG_MEDIA_IMAGE = '/media/Gemini_Generated_Image_xf27exf27exf27ex.png'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

function normalizeAdminUsername(raw) {
  const v = String(raw || '').trim()
  if (!v) return ''
  if (v.includes('@')) return v
  if (v.toUpperCase().startsWith('GMR-')) return v
  return `GMR-${v}`
}

export default function LoginAdministradores() {
  const navigate = useNavigate()
  const [adminIdOrEmail, setAdminIdOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bg = useMemo(() => imgSrc(BG_MEDIA_IMAGE), [])

  useEffect(() => {
    async function check() {
      if (!getAccessToken()) return
      try {
        const me = await getMe()
        if (me?.is_staff && me?.is_superuser) {
          setEmployeeSession(true)
          navigate('/empleado/dashboard', { replace: true })
        } else {
          setEmployeeSession(false)
        }
      } catch {
        setEmployeeSession(false)
      }
    }
    check()
  }, [navigate])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const username = normalizeAdminUsername(adminIdOrEmail)
      await loginEmployee({ username, password })
      try {
        const me = await getMe()
        if (!me?.is_staff || !me?.is_superuser) {
          setEmployeeSession(false)
          setError('Esta cuenta no tiene rol de Administrador.')
          return
        }
        setEmployeeSession(true)
      } catch {
        clearTokens()
        setError('No se pudo conectar con el servidor.')
        return
      }
      navigate('/empleado/dashboard', { replace: true })
    } catch (err) {
      const msg = String(err?.message || '')
      if (
        msg.toLowerCase().includes('no active account') ||
        msg.toLowerCase().includes('credenciales') ||
        msg.toLowerCase().includes('incorrect') ||
        msg.toLowerCase().includes('invalid')
      ) {
        setError('Credenciales incorrectas. Verifica tu ID de administrador o código de acceso.')
      } else if (msg.toLowerCase().includes('backend no disponible') || msg.toLowerCase().includes('failed to fetch')) {
        setError('No se pudo conectar con el servidor.')
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 -z-10">
        {bg ? <img src={bg} alt="" className="h-full w-full object-cover opacity-25 blur-[2px]" /> : null}
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_20%,rgba(168,85,247,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_70%_80%,rgba(34,211,238,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/85 to-[#020617]" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="flex justify-center pt-10">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#071026]/70 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="px-6 pt-6">
              <div className="flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <ShieldCheck size={22} className="text-cyan-200" />
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-extrabold tracking-widest text-white/85">PALACIO</div>
                <div className="mt-1 text-xs font-semibold tracking-[0.28em] text-fuchsia-300/80">ADMIN TERMINAL v3.1</div>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4 px-6 pb-6 pt-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-white/55">
                  <UserCog size={14} className="text-cyan-200/80" />
                  ID de Administrador / Correo
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <span className="text-xs font-bold text-white/35">GMR-</span>
                  <input
                    value={adminIdOrEmail}
                    onChange={(e) => setAdminIdOrEmail(e.target.value)}
                    className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/35"
                    placeholder="0000 o correo"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-white/55">
                  <KeyRound size={14} className="text-fuchsia-200/80" />
                  Código de Acceso
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/35"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={[
                  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110',
                  loading ? 'cursor-not-allowed opacity-70' : '',
                ].join(' ')}
              >
                Acceder al Sistema
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-white/45">
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>Soporte IT</span>
              </div>

              <div className="pt-2 text-center text-sm">
                <Link to="/" className="text-white/55 hover:text-white">
                  Volver
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

