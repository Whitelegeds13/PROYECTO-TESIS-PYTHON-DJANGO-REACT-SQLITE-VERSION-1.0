import { useEffect, useState } from 'react'
import { getEmployeeSettings, saveEmployeeSettings } from '../../api/client.js'
import {
  Settings,
  ShieldAlert,
  Palette,
  CreditCard,
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Cpu,
  Save
} from 'lucide-react'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function EmployeeSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form State
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')

  // Accepted Payments Checkboxes
  const [payments, setPayments] = useState({
    tarjetas: true,
    crypto: true,
    transferencia: false
  })

  // Notifications Checkboxes
  const [notifications, setNotifications] = useState({
    stock_bajo: true,
    reportes: true,
    logins: false
  })

  // Appearance Local Settings (saved in localStorage for visual persistence)
  const [theme, setTheme] = useState(() => localStorage.getItem('pg_admin_theme') || 'cyber_dark')
  const [animations, setAnimations] = useState(() => localStorage.getItem('pg_animations') !== 'false')
  const [density, setDensity] = useState(() => localStorage.getItem('pg_density') || 'compact')

  async function loadSettings() {
    try {
      setLoading(true)
      const res = await getEmployeeSettings()
      if (res?.admin) {
        setUsername(res.admin.username || '')
        setEmail(res.admin.email || '')
        setBio(res.admin.bio || '')
      }
      if (res?.payments) {
        setPayments(res.payments)
      }
      if (res?.notifications) {
        setNotifications(res.notifications)
      }
      setError('')
    } catch (e) {
      setError(String(e?.message || 'Error al obtener configuraciones'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  // Handle local appearance theme click
  function handleThemeChange(t) {
    setTheme(t)
    localStorage.setItem('pg_admin_theme', t)
    // Add theme class to body or wrapper if needed
  }

  function handleDensityChange(d) {
    setDensity(d)
    localStorage.setItem('pg_density', d)
  }

  function handleAnimationsChange(val) {
    setAnimations(val)
    localStorage.setItem('pg_animations', val ? 'true' : 'false')
  }

  async function handleSave() {
    try {
      setSaving(true)
      await saveEmployeeSettings({
        admin: { username, email, bio },
        payments,
        notifications
      })
      setSuccess('¡Configuración guardada exitosamente en MongoDB!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError(String(e?.message || 'Error al guardar configuración'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Panel */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-6 px-6 py-6">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-cyan-300">ADMINISTRACIÓN SISTEMA</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Configuración de Sistema</div>
            <div className="mt-2 text-sm text-white/60">
              Gestione los parámetros globales de la tienda Palacio Gamer y personalice el entorno de trabajo.
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:brightness-110 active:scale-[0.98] transition px-5 py-3 text-xs font-bold text-white shadow-md shadow-fuchsia-500/10 border border-fuchsia-400/20"
          >
            {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-semibold text-red-200 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-sm font-semibold text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="py-12 flex justify-center text-white/30 text-xs font-mono tracking-widest">
          CARGANDO CONFIGURACIÓN...
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Side: System & Security (Disabled) */}
          <div className="space-y-6">
            {/* System Status Card */}
            <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
                <Cpu size={16} className="text-cyan-400" />
                <span>Estado del Sistema</span>
              </div>
              <div className="mt-4 space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Latencia de Red</span>
                  <span className="font-mono text-emerald-400 font-bold">22ms</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[25%] bg-emerald-400" />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white/60">Uso Base de Datos (Read/Write)</span>
                  <span className="font-mono text-cyan-400 font-bold">42%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[42%] bg-cyan-400" />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2">
                  <div className="text-[9px] font-mono text-white/45 uppercase">ÚLTIMO BACKUP EXITOSO</div>
                  <div className="text-xs font-bold text-white/90 mt-1">
                    Hace 14 min - AWS S3 Cluster-A
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Security Card - DISABLED BY USER */}
            <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-6 text-center">
                <Lock size={28} className="text-amber-400 animate-pulse mb-3" />
                <span className="text-xs font-mono font-bold text-amber-300 tracking-wider">MÓDULO DESHABILITADO</span>
                <p className="text-[10px] text-white/55 mt-1 leading-relaxed max-w-[240px]">
                  La sección de seguridad avanzada aún no se encuentra activa en esta versión.
                </p>
              </div>

              <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
                <ShieldAlert size={16} className="text-fuchsia-400" />
                <span>Seguridad Avanzada</span>
              </div>
              <div className="mt-4 space-y-4 opacity-30 select-none">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/80">Verificación en dos pasos (2FA)</span>
                  <div className="w-8 h-4 bg-white/20 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/80">Historial de Accesos</span>
                  <span className="text-xs text-cyan-400">Revisar</span>
                </div>
                <button className="w-full bg-white/5 border border-white/10 text-xs py-2 rounded-xl text-white">
                  Cambiar Contraseña Maestra
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Admin Profile Form */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl flex flex-col justify-between">
            <div className="space-y-5">
              <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
                <Settings size={16} className="text-fuchsia-400" />
                <span>Perfil del Administrador</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/50 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/50 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
                    Biografía Corta
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Escribe detalles sobre tu rol o biografía..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/50 transition resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full py-3 rounded-2xl bg-[#0c1630] border border-cyan-500/30 hover:border-cyan-400 hover:bg-[#101e40] text-cyan-300 font-bold text-xs transition"
            >
              {saving ? 'GUARDANDO...' : 'GUARDAR PERFIL'}
            </button>
          </div>
        </div>
      )}

      {/* Lower Settings Blocks */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Appearance Config */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
              <Palette size={16} className="text-cyan-400" />
              <span>Apariencia del Panel</span>
            </div>
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <span className="text-white/50 block">Tema Principal</span>
                <div className="grid grid-cols-3 gap-2 font-bold text-[10px]">
                  <button
                    onClick={() => handleThemeChange('cyber_dark')}
                    className={cx(
                      "py-2 rounded-xl border text-center transition",
                      theme === 'cyber_dark' ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/5 bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    CYBER DARK
                  </button>
                  <button
                    onClick={() => handleThemeChange('neon_blue')}
                    className={cx(
                      "py-2 rounded-xl border text-center transition",
                      theme === 'neon_blue' ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/5 bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    NEON BLUE
                  </button>
                  <button
                    onClick={() => handleThemeChange('matrix')}
                    className={cx(
                      "py-2 rounded-xl border text-center transition",
                      theme === 'matrix' ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/5 bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    MATRIX
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/50">Animaciones de Interfaz</span>
                <button
                  onClick={() => handleAnimationsChange(!animations)}
                  className={cx(
                    "w-10 h-5 rounded-full border transition-all relative",
                    animations ? "bg-cyan-500/20 border-cyan-500" : "bg-white/5 border-white/10"
                  )}
                >
                  <span className={cx(
                    "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all bg-white",
                    animations ? "right-1 bg-cyan-300" : "left-1 bg-white/30"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/50">Densidad de Información</span>
                <button
                  onClick={() => handleDensityChange(density === 'compact' ? 'standard' : 'compact')}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg font-bold text-[10px] text-white/80 hover:bg-white/10"
                >
                  {density === 'compact' ? 'COMPACTA' : 'ESTÁNDAR'}
                </button>
              </div>
            </div>
          </div>

          {/* Accept Payments Config */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-cyan-400" />
              <span>Métodos de Pago Aceptados</span>
            </div>
            <div className="space-y-3">
              {[
                { key: 'tarjetas', label: 'Tarjetas de Crédito/Débito' },
                { key: 'crypto', label: 'Criptomonedas (BTC/USDT)' },
                { key: 'transferencia', label: 'Transferencia Bancaria directa' }
              ].map(item => (
                <div
                  key={item.key}
                  onClick={() => setPayments(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={cx(
                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all",
                    payments[item.key] ? "border-cyan-500/20 bg-cyan-500/5 text-white" : "border-white/5 bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  <span className="text-xs">{item.label}</span>
                  <div className={cx(
                    "h-4 w-4 rounded border flex items-center justify-center text-[10px] font-black",
                    payments[item.key] ? "bg-cyan-500 border-cyan-500 text-slate-900" : "border-white/20 bg-transparent"
                  )}>
                    {payments[item.key] && '✓'}
                  </div>
                </div>
              ))}
              <button className="w-full border border-dashed border-white/15 hover:border-white/20 bg-transparent text-[10px] font-bold py-2 rounded-xl text-white/40 hover:text-white/60 transition">
                + AGREGAR MÉTODO
              </button>
            </div>
          </div>

          {/* Notifications Config */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
              <Bell size={16} className="text-cyan-400" />
              <span>Centro de Notificaciones</span>
            </div>
            <div className="space-y-3">
              {[
                { key: 'stock_bajo', label: 'Alertas de Stock Bajo' },
                { key: 'reportes', label: 'Reportes Diarios de Ventas' },
                { key: 'logins', label: 'Intentos de Login Fallidos' }
              ].map(item => (
                <div
                  key={item.key}
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={cx(
                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all",
                    notifications[item.key] ? "border-cyan-500/20 bg-cyan-500/5 text-white" : "border-white/5 bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  <span className="text-xs">{item.label}</span>
                  <div className={cx(
                    "h-4 w-4 rounded border flex items-center justify-center text-[10px] font-black",
                    notifications[item.key] ? "bg-cyan-500 border-cyan-500 text-slate-900" : "border-white/20 bg-transparent"
                  )}>
                    {notifications[item.key] && '✓'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Build info */}
      <div className="text-center text-[10px] text-white/20 font-mono">
        PALACIO GAMER v4.0.2 - STABLE BUILD 2026
      </div>
    </div>
  )
}
