import { CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPaymentByCode } from '../api/client.js'

function syncLabel(v) {
  if (v === 'en_espera') return 'En espera'
  if (v === 'confirmado') return 'Confirmado'
  return 'En espera'
}

export default function PaymentConfirmation() {
  const { code } = useParams()
  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await getPaymentByCode(code)
        if (!mounted) return
        setPayment(data || null)
        setError('')
      } catch (e) {
        if (!mounted) return
        setPayment(null)
        setError(String(e?.message || 'No se pudo cargar el pago'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [code])

  const paymentCode = useMemo(() => payment?.payment_code || code || '', [payment?.payment_code, code])
  const syncStatus = useMemo(() => syncLabel(payment?.sync_status), [payment?.sync_status])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mx-auto mt-10 max-w-3xl text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <CheckCircle2 size={26} className="text-cyan-200" />
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white/90">El Pago será confirmado en 24 horas</h1>
        <p className="mt-3 text-sm text-white/60">
          Tu transacción ha sido registrada. El estado de sincronización se mantendrá en espera hasta que sea validado.
        </p>

        <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-sm shadow-black/30 backdrop-blur-xl">
          {loading ? (
            <div className="h-14 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {error}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                <div className="text-[11px] font-extrabold tracking-widest text-white/45">NÚMERO DE PEDIDO</div>
                <div className="mt-2 text-lg font-extrabold text-white/90">{paymentCode}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                <div className="text-[11px] font-extrabold tracking-widest text-white/45">ESTADO DE SINCRONIZACIÓN</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-white/85">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-300" />
                  {syncStatus}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/mis-pedidos"
              className="rounded-xl bg-indigo-400 px-6 py-3 text-center text-sm font-extrabold text-[#05102a] shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_18px_50px_rgba(99,102,241,0.25)] transition hover:brightness-110"
            >
              Ir a Mis Pedidos
            </Link>
            <Link
              to="/hardware"
              className="rounded-xl border border-fuchsia-400/40 bg-white/5 px-6 py-3 text-center text-sm font-extrabold text-fuchsia-100 transition hover:bg-white/10"
            >
              Seguir Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

