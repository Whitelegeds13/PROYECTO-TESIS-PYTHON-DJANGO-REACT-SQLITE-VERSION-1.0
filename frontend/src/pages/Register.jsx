import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register({ onRegister, onLoginClick, afterRegisterPath = '/' }) {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!accepted) {
      setError('Debes aceptar los términos.')
      return
    }
    setLoading(true)
    try {
      await onRegister({ full_name: fullName.trim(), address: address.trim(), phone: phone.trim(), email: email.trim(), password })
      navigate(afterRegisterPath)
    } catch (err) {
      setError(err?.message || 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mx-auto mt-10 max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/50">PALACIO GAMER</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Únete al Palacio</h1>
          <div className="mt-2 text-sm text-white/60">Configura tu perfil de alto rendimiento</div>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div>
            <label className="text-xs font-extrabold tracking-widest text-white/50">NOMBRE COMPLETO</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
              placeholder="Ej. Alex Mercer"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold tracking-widest text-white/50">CORREO ELECTRÓNICO</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold tracking-widest text-white/50">DIRECCIÓN</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
              placeholder="Ej. Av. Principal 123, Lima"
              autoComplete="street-address"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold tracking-widest text-white/50">TELÉFONO</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
              placeholder="Ej. 999888777"
              autoComplete="tel"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-extrabold tracking-widest text-white/50">CONTRASEÑA</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold tracking-widest text-white/50">CONFIRMAR</label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-cyan-300"
            />
            <span>
              Acepto el Protocolo de Privacidad y los términos del Palacio.
            </span>
          </label>

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
            {loading ? 'Creando…' : 'CREAR CUENTA'}
          </button>

          <div className="flex items-center justify-between pt-2 text-sm">
            <Link to="/" className="text-white/60 hover:text-white">
              Volver al Home
            </Link>
            <button type="button" onClick={onLoginClick} className="font-semibold text-cyan-300 hover:text-cyan-200">
              Inicia sesión aquí
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
