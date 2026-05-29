import { useEffect, useMemo, useState } from 'react'
import { FileText, Info } from 'lucide-react'
import {
  approveEmployeePayment,
  downloadEmployeePendingPaymentsExcel,
  getEmployeePaymentDetail,
  getEmployeePayments,
  rejectEmployeePayment,
} from '../../api/client.js'

function money(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return 'S/ 0.00'
  return `S/ ${n.toFixed(2)}`
}

function fmtDT(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function methodLabel(m) {
  if (m === 'card') return 'Tarjeta'
  if (m === 'bank_transfer') return 'Transferencia'
  if (m === 'yape_plin') return 'Yape / Plin'
  return String(m || '')
}

function shouldShowReceipt(method) {
  return method === 'bank_transfer' || method === 'yape_plin'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#050C1F] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div className="text-lg font-extrabold text-white/90">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  )
}

export default function EmployeePayments() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMode, setModalMode] = useState('details')
  const [detail, setDetail] = useState(null)

  async function refresh() {
    const res = await getEmployeePayments()
    setData(res || null)
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        await refresh()
        if (!mounted) return
        setError('')
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || 'No se pudo cargar pagos'))
        setData(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const summary = data?.summary || {}
  const pending = useMemo(() => (Array.isArray(data?.pending) ? data.pending : []), [data?.pending])
  const rejected = useMemo(() => (Array.isArray(data?.rejected) ? data.rejected : []), [data?.rejected])
  const approved = useMemo(() => (Array.isArray(data?.approved) ? data.approved : []), [data?.approved])

  async function openDetail(paymentCode, mode) {
    try {
      setLoading(true)
      const d = await getEmployeePaymentDetail(paymentCode)
      setDetail(d || null)
      setModalMode(mode)
      setModalTitle(mode === 'items' ? 'Lista de lo comprado' : 'Detalles del pedido')
      setModalOpen(true)
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo cargar detalle'))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(paymentCode) {
    try {
      setLoading(true)
      await approveEmployeePayment(paymentCode)
      await refresh()
      window.alert('Pedido aprobado')
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo aprobar'))
    } finally {
      setLoading(false)
    }
  }

  async function handleReject(paymentCode) {
    try {
      setLoading(true)
      await rejectEmployeePayment(paymentCode)
      await refresh()
      window.alert('Pedido rechazado')
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo rechazar'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadExcel() {
    try {
      setLoading(true)
      const blob = await downloadEmployeePendingPaymentsExcel()
      downloadBlob(blob, 'transacciones_pendientes.xls')
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo descargar'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">Validación de Pagos</div>
            <div className="mt-2 text-sm text-white/60">Revisa transacciones pendientes, aprueba o rechaza pedidos.</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
              disabled={loading}
            >
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="text-xs font-extrabold tracking-widest text-white/45">PAGOS POR VALIDAR</div>
            <div className="mt-2 text-2xl font-extrabold text-white/90">{Number(summary?.pending_count || 0) || 0}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="text-xs font-extrabold tracking-widest text-white/45">TOTAL PENDIENTE</div>
            <div className="mt-2 text-2xl font-extrabold text-white/90">{money(summary?.pending_total)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="text-xs font-extrabold tracking-widest text-white/45">TASA APROBACIÓN (HOY)</div>
            <div className="mt-2 text-2xl font-extrabold text-white/90">{Number(summary?.approval_rate_today || 0).toFixed(2)}%</div>
          </div>
        </div>

        {error ? <div className="px-6 pb-4 text-sm font-semibold text-red-200">{error}</div> : null}

        <div className="px-6 pb-3 text-sm font-extrabold text-white/70">
          Transacciones Pendientes
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
              <tr>
                <th className="px-6 py-4">PEDIDO</th>
                <th className="px-6 py-4">CLIENTE</th>
                <th className="px-6 py-4">MÉTODO / FECHA</th>
                <th className="px-6 py-4">MONTO</th>
                <th className="px-6 py-4">COMPROBANTE</th>
                <th className="px-6 py-4">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    Cargando…
                  </td>
                </tr>
              ) : pending.length ? (
                pending.map((p) => (
                  <tr key={p.payment_code} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.ticket}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.customer_name || '—'}</div>
                      <div className="mt-1 text-xs text-white/55">{p.customer_email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      <div className="text-sm font-extrabold text-white/85">{methodLabel(p.method)}</div>
                      <div className="mt-1 text-xs text-white/55">{p.created_at ? fmtDT(p.created_at) : '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-white/85">{money(p.total)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(p.payment_code, 'items')}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <FileText size={16} />
                        Ver
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDetail(p.payment_code, 'details')}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10"
                        >
                          <Info size={16} />
                          Detalles
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(p.payment_code)}
                          className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-extrabold text-rose-100/90 transition hover:bg-rose-400/15"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(p.payment_code)}
                          className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-extrabold text-emerald-100/90 transition hover:bg-emerald-400/15"
                        >
                          Aprobar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    No hay transacciones pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">Pagos Rechazados</div>
            <div className="mt-2 text-sm text-white/60">Historial de transacciones que fueron rechazadas.</div>
          </div>
          <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-extrabold text-rose-100/90">
            Total: {Number(summary?.rejected_count || 0) || 0}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
              <tr>
                <th className="px-6 py-4">PEDIDO</th>
                <th className="px-6 py-4">CLIENTE</th>
                <th className="px-6 py-4">MÉTODO / FECHA</th>
                <th className="px-6 py-4">MONTO</th>
                <th className="px-6 py-4">COMPROBANTE</th>
                <th className="px-6 py-4">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    Cargando…
                  </td>
                </tr>
              ) : rejected.length ? (
                rejected.map((p) => (
                  <tr key={p.payment_code} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.ticket}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.customer_name || '—'}</div>
                      <div className="mt-1 text-xs text-white/55">{p.customer_email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      <div className="text-sm font-extrabold text-white/85">{methodLabel(p.method)}</div>
                      <div className="mt-1 text-xs text-white/55">{p.created_at ? fmtDT(p.created_at) : '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-white/85">{money(p.total)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(p.payment_code, 'items')}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <FileText size={16} />
                        Ver
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(p.payment_code, 'details')}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <Info size={16} />
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    No hay pagos rechazados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
            <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">Pagos Aprobados</div>
            <div className="mt-2 text-sm text-white/60">Historial de transacciones aprobadas.</div>
          </div>
          <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-extrabold text-emerald-100/90">
            Total: {Number(summary?.approved_count || 0) || 0}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
              <tr>
                <th className="px-6 py-4">PEDIDO</th>
                <th className="px-6 py-4">CLIENTE</th>
                <th className="px-6 py-4">MÉTODO / FECHA</th>
                <th className="px-6 py-4">MONTO</th>
                <th className="px-6 py-4">COMPROBANTE</th>
                <th className="px-6 py-4">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    Cargando…
                  </td>
                </tr>
              ) : approved.length ? (
                approved.map((p) => (
                  <tr key={p.payment_code} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.ticket}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.customer_name || '—'}</div>
                      <div className="mt-1 text-xs text-white/55">{p.customer_email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      <div className="text-sm font-extrabold text-white/85">{methodLabel(p.method)}</div>
                      <div className="mt-1 text-xs text-white/55">{p.created_at ? fmtDT(p.created_at) : '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-white/85">{money(p.total)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(p.payment_code, 'items')}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <FileText size={16} />
                        Ver
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(p.payment_code, 'details')}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <Info size={16} />
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    No hay pagos aprobados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={modalTitle}
        onClose={() => {
          setModalOpen(false)
          setDetail(null)
        }}
      >
        {detail ? (
          modalMode === 'items' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70">
                Ticket: <span className="font-extrabold text-white/85">{detail.ticket}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
                    <tr>
                      <th className="px-4 py-3">PRODUCTO</th>
                      <th className="px-4 py-3">CANT.</th>
                      <th className="px-4 py-3">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {(detail.items || []).map((it) => (
                      <tr key={it.order_id}>
                        <td className="px-4 py-3 text-white/80">{it.product_name}</td>
                        <td className="px-4 py-3 text-white/80">{it.quantity}</td>
                        <td className="px-4 py-3 font-extrabold text-white/85">{money(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-xs font-extrabold tracking-widest text-white/45">CLIENTE</div>
                <div className="mt-2 text-sm font-extrabold text-white/85">{detail.customer?.name || '—'}</div>
                <div className="mt-1 text-sm text-white/70">{detail.customer?.email || '—'}</div>
                <div className="mt-1 text-sm text-white/70">{detail.customer?.phone || '—'}</div>
                <div className="mt-1 text-sm text-white/70">{detail.customer?.address || '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-xs font-extrabold tracking-widest text-white/45">PEDIDO</div>
                <div className="mt-2 text-sm font-extrabold text-white/85">{detail.ticket}</div>
                <div className="mt-2 text-xs font-extrabold tracking-widest text-white/45">MÉTODO</div>
                <div className="mt-2 text-sm text-white/70">{methodLabel(detail.method)}</div>
                <div className="mt-2 text-xs font-extrabold tracking-widest text-white/45">COSTO</div>
                <div className="mt-2 text-sm font-extrabold text-white/85">{money(detail.total)}</div>
                <div className="mt-2 text-xs font-extrabold tracking-widest text-white/45">FECHA</div>
                <div className="mt-2 text-sm text-white/70">{detail.created_at ? fmtDT(detail.created_at) : '—'}</div>
              </div>

              {shouldShowReceipt(detail.method) ? (
                <div className="md:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="text-sm font-extrabold text-white/90">Comprobante</div>
                  </div>
                  <div className="space-y-3 px-5 py-5">
                    {detail.receipt_url ? (
                      <>
                        <a
                          href={detail.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-cyan-200/90 transition hover:bg-white/10"
                        >
                          Abrir comprobante
                        </a>
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                          <img
                            src={detail.receipt_url}
                            alt=""
                            className="h-72 w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-white/60">No hay comprobante subido.</div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="md:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="text-sm font-extrabold text-white/90">Qué compró</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
                      <tr>
                        <th className="px-5 py-4">PRODUCTO</th>
                        <th className="px-5 py-4">CANT.</th>
                        <th className="px-5 py-4">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(detail.items || []).map((it) => (
                        <tr key={it.order_id}>
                          <td className="px-5 py-4 text-white/80">{it.product_name}</td>
                          <td className="px-5 py-4 text-white/80">{it.quantity}</td>
                          <td className="px-5 py-4 font-extrabold text-white/85">{money(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="text-white/60">Cargando…</div>
        )}
      </Modal>
    </div>
  )
}
