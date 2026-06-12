import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getEmployeePackaging,
  shipEmployeePackage
} from '../../api/client.js'
import {
  Package,
  Clock,
  User,
  Phone,
  MapPin,
  Camera,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function EmployeePackaging() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [queue, setQueue] = useState([])
  const [selectedCode, setSelectedCode] = useState(null)
  const [checkedItems, setCheckedItems] = useState({}) // maps order.id -> boolean
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [shipping, setShipping] = useState(false)

  // Timer simulation for packaging selected order
  const [elapsedTime, setElapsedTime] = useState('00:00')
  const [seconds, setSeconds] = useState(0)

  async function loadQueue(selectFirst = false) {
    try {
      setLoading(true)
      const res = await getEmployeePackaging()
      const list = res?.results || []
      setQueue(list)
      if (list.length > 0) {
        if (selectFirst || !selectedCode || !list.some(q => q.payment_code === selectedCode)) {
          setSelectedCode(list[0].payment_code)
        }
      } else {
        setSelectedCode(null)
      }
      setError('')
    } catch (e) {
      setError(String(e?.message || 'Error al cargar la cola de empaque'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue(true)
  }, [])

  // Selected packaging data
  const selected = useMemo(() => {
    return queue.find(q => q.payment_code === selectedCode) || null
  }, [queue, selectedCode])

  // Reset checkboxes and timer when selection changes
  useEffect(() => {
    if (selected) {
      const initial = {}
      selected.orders.forEach(o => {
        initial[o.id] = false
      })
      setCheckedItems(initial)
      setFile(null)
      setFilePreview('')
      setSeconds(0)
      setElapsedTime('00:00')
    }
  }, [selectedCode])

  // Timer effect
  useEffect(() => {
    if (!selected) return
    const interval = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1
        const min = String(Math.floor(next / 60)).padStart(2, '0')
        const sec = String(next % 60).padStart(2, '0')
        setElapsedTime(`${min}:${sec}`)
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [selected])

  const allChecked = useMemo(() => {
    if (!selected || !selected.orders.length) return false
    return selected.orders.every(o => checkedItems[o.id])
  }, [selected, checkedItems])

  const canShip = allChecked && file && !shipping

  function toggleCheck(id) {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result)
      }
      reader.readAsDataURL(f)
    } else {
      setFilePreview('')
    }
  }

  async function handleShip() {
    if (!selected || !canShip) return
    try {
      setShipping(true)
      await shipEmployeePackage(selected.payment_code, file)
      setSuccessMsg(`¡Pedido ${selected.payment_code} empaquetado y transferido a entregas exitosamente!`)
      setTimeout(() => {
        setSuccessMsg('')
        navigate('/empleado/entregas')
      }, 2000)
      await loadQueue()
    } catch (e) {
      setError(String(e?.message || 'Error al despachar el paquete'))
    } finally {
      setShipping(false)
    }
  }



  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-6 px-6 py-6">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-cyan-300">ESTACIÓN DE EMPAQUE</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Gestión de Empaquetado</div>
            <div className="mt-2 text-sm text-white/60">
              Confirma ítems y prepara envíos para logística. Los pedidos requieren estar pagados antes de empaquetar.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadQueue(false)}
              disabled={loading}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-mono font-extrabold text-fuchsia-300">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(240,70,170,0.8)] animate-pulse" />
              {queue.length} PENDIENTES
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-semibold text-red-200 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-sm font-semibold text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Side: Queue List */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#071026]/70 shadow-2xl backdrop-blur-2xl p-5 space-y-4">
          <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3">
            Cola de Empaque
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {queue.map(q => {
              const isSelected = q.payment_code === selectedCode
              return (
                <button
                  key={q.payment_code}
                  onClick={() => setSelectedCode(q.payment_code)}
                  className={cx(
                    "w-full rounded-2xl border text-left p-4 transition-all duration-300",
                    isSelected
                      ? "border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/5"
                      : "border-white/5 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">{q.payment_code}</span>
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Clock size={10} />
                      Hace poco
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-white/90">{q.customer_name}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-white/55">
                    <span>{q.items_count} {q.items_count === 1 ? 'Producto' : 'Productos'}</span>
                    <span className="font-semibold text-white/70">S/. {parseFloat(q.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </button>
              )
            })}

            {queue.length === 0 && !loading ? (
              <div className="py-12 text-center text-white/35 text-sm">
                No hay pedidos en la cola de empaque.
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Side: Packaging Detail workspace */}
        <div className="space-y-6">
          {selected ? (
            <div className="rounded-3xl border border-white/10 bg-[#071026]/70 shadow-2xl backdrop-blur-2xl overflow-hidden">
              <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-white/45">ESTACIÓN DE TRABAJO #04</div>
                  <div className="mt-1 text-xl font-extrabold text-white flex items-center gap-2">
                    <span>Empaquetando:</span>
                    <span className="text-cyan-300 font-mono">{selected.payment_code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-white/45">TIEMPO TRANSCURRIDO</div>
                    <div className="text-sm font-mono font-bold text-fuchsia-400">{elapsedTime}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    PAGADO
                  </span>
                </div>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-2">
                {/* Verification Checklist */}
                <div className="space-y-4">
                  <div className="text-xs font-mono font-bold tracking-widest text-white/45 uppercase flex items-center gap-1.5">
                    <Info size={12} className="text-cyan-400" />
                    <span>Verificación de Productos</span>
                  </div>
                  <div className="space-y-3">
                    {selected.orders.map(o => {
                      const isChecked = checkedItems[o.id]
                      return (
                        <div
                          key={o.id}
                          onClick={() => toggleCheck(o.id)}
                          className={cx(
                            "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer select-none transition-all duration-300",
                            isChecked
                              ? "border-cyan-500/30 bg-cyan-500/5 text-white"
                              : "border-white/5 bg-white/5 hover:bg-white/10 text-white/70"
                          )}
                        >
                          <div className={cx(
                            "h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200",
                            isChecked ? "bg-cyan-500 border-cyan-500 text-slate-900" : "border-white/30 bg-transparent"
                          )}>
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{o.product_name}</div>
                            <div className="mt-1 text-[10px] text-white/45 font-mono">
                              CANTIDAD: x{o.quantity} • S/. {parseFloat(o.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>


                </div>

                {/* Evidence & Dispatch */}
                <div className="space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold tracking-widest text-white/45 uppercase flex items-center gap-1.5">
                      <Camera size={12} className="text-cyan-400" />
                      <span>Evidencia Fotográfica</span>
                    </div>

                    <div className="space-y-3">
                      {filePreview ? (
                        <div className="relative h-44 w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden group shadow-lg shadow-black/25">
                          <img src={filePreview} alt="Package preview" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <label className="cursor-pointer text-xs font-bold bg-white/10 border border-white/20 hover:bg-white/25 px-4 py-2 rounded-xl text-white">
                              Cambiar foto
                              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="h-44 w-full rounded-2xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition-all text-center px-4">
                          <Camera size={28} className="text-white/40" />
                          <div className="text-xs font-bold text-white/70">Adjuntar Foto del Paquete</div>
                          <div className="text-[10px] text-white/40">Formatos JPG o PNG hasta 10MB</div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Summary & Ship Action */}
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-mono text-white/45 uppercase">TOTAL PEDIDO</div>
                        <div className="mt-1 text-lg font-black text-white">
                          S/. {parseFloat(selected.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-white/45 uppercase">MÉTODO</div>
                        <div className="mt-1 text-xs font-bold text-white/80 uppercase">
                          {selected.method === 'card' ? 'Tarjeta' : selected.method === 'yape_plin' ? 'Yape/Plin' : 'Transferencia'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleShip}
                      disabled={!canShip}
                      className={cx(
                        "w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2",
                        canShip
                          ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:brightness-110 active:scale-[0.99] text-white shadow-lg shadow-fuchsia-500/25 border border-fuchsia-400/20"
                          : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                      )}
                    >
                      {shipping ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>ENVIANDO...</span>
                        </>
                      ) : (
                        <>
                          <Package size={16} />
                          <span>FINALIZAR Y ENVIAR</span>
                        </>
                      )}
                    </button>

                    {!allChecked && (
                      <p className="text-[10px] text-center text-amber-400/75">
                        * Debes marcar todos los productos para verificar la orden.
                      </p>
                    )}
                    {allChecked && !file && (
                      <p className="text-[10px] text-center text-cyan-300/75">
                        * Toma y adjunta una foto del paquete listo para despachar.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Profile details at bottom */}
              <div className="bg-white/5 border-t border-white/10 px-6 py-5 grid gap-4 sm:grid-cols-3 text-xs">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-cyan-400 shrink-0" />
                  <span className="text-white/60 truncate">
                    Cliente: <strong className="text-white/95">{selected.customer_name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-cyan-400 shrink-0" />
                  <span className="text-white/60">
                    Teléfono: <strong className="text-white/95">{selected.customer_phone || '—'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-cyan-400 shrink-0" />
                  <span className="text-white/60 truncate" title={selected.customer_address}>
                    Dirección: <strong className="text-white/95">{selected.customer_address || '—'}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-[#071026]/70 shadow-2xl p-12 text-center text-white/40">
              Selecciona un pedido de la cola para empezar el empaquetado.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
