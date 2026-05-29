import { useEffect, useMemo, useState } from 'react'
import {
  assignEmployeeDelivery,
  confirmEmployeeDelivery,
  getEmployeeDeliveryStaff,
  getEmployeeDeliveries,
  getEmployeeDeliveryById,
  uploadEmployeeDeliveryEvidence,
} from '../../api/client.js'

function fmtDT(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(st) {
  if (st === 'en_camino') return 'En camino'
  if (st === 'entregado') return 'Entregado'
  if (st === 'procesando') return 'Procesando'
  if (st === 'rechazado') return 'Rechazado'
  return String(st || '')
}

function statusBadge(st) {
  if (st === 'entregado') return 'bg-emerald-300 text-emerald-950'
  if (st === 'en_camino') return 'bg-amber-300 text-amber-950'
  if (st === 'rechazado') return 'bg-rose-300 text-rose-950'
  return 'bg-white/20 text-white'
}

export default function EmployeeDeliveries() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [staff, setStaff] = useState([])
  const [assigning, setAssigning] = useState(false)

  const [list, setList] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null)

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const enCamino = useMemo(() => list.filter((o) => o.status === 'en_camino'), [list])
  const historial = useMemo(() => list.filter((o) => o.status === 'entregado' || o.status === 'rechazado'), [list])

  async function refreshList() {
    const res = await getEmployeeDeliveries()
    const items = Array.isArray(res?.results) ? res.results : []
    setList(items)
    if (!selectedId && items.length) {
      const first = items.find((x) => x.status === 'en_camino') || items[0]
      setSelectedId(first?.id || null)
    }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const staffRes = await getEmployeeDeliveryStaff()
        if (!mounted) return
        setStaff(Array.isArray(staffRes?.results) ? staffRes.results : [])
        await refreshList()
        if (!mounted) return
        setError('')
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || 'No se pudo cargar entregas'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadDetail() {
      if (!selectedId) {
        setSelected(null)
        return
      }
      try {
        setLoading(true)
        const res = await getEmployeeDeliveryById(selectedId)
        if (!mounted) return
        setSelected(res || null)
        setFile(null)
        setError('')
      } catch (e) {
        if (!mounted) return
        setSelected(null)
        setError(String(e?.message || 'No se pudo cargar el pedido'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadDetail()
    return () => {
      mounted = false
    }
  }, [selectedId])

  const evidenceUrl = selected?.evidence_url || ''
  const canConfirm = Boolean(selected?.status === 'en_camino' && evidenceUrl && !confirming && !uploading)
  const canAssign = Boolean(
    selectedId && selected?.status !== 'entregado' && selected?.status !== 'rechazado' && !assigning && !uploading && !confirming,
  )

  async function handleAssign(assigneeId) {
    if (!selectedId) return
    if (!canAssign) return
    try {
      setAssigning(true)
      const res = await assignEmployeeDelivery({ orderId: selectedId, assigneeId })
      setSelected((prev) => (prev ? { ...prev, driver: res?.driver || prev.driver, assigned_at: res?.assigned_at || prev.assigned_at, status: res?.status || prev.status } : prev))
      await refreshList()
      const detail = await getEmployeeDeliveryById(selectedId)
      setSelected(detail || null)
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo asignar repartidor'))
    } finally {
      setAssigning(false)
    }
  }

  async function handleUploadEvidence(fileToUpload) {
    if (!selectedId) return
    if (!selected || selected.status !== 'en_camino') return
    const f = fileToUpload || file
    if (!f) return
    try {
      setUploading(true)
      const res = await uploadEmployeeDeliveryEvidence(selectedId, f)
      const url = String(res?.evidence_url || '')
      setSelected((prev) => (prev ? { ...prev, evidence_url: url } : prev))
      const detail = await getEmployeeDeliveryById(selectedId)
      setSelected(detail || null)
      await refreshList()
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo subir evidencia'))
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirmDelivery() {
    if (!selectedId) return
    if (!canConfirm) return
    try {
      setConfirming(true)
      await confirmEmployeeDelivery(selectedId)
      const detail = await getEmployeeDeliveryById(selectedId)
      setSelected(detail || null)
      await refreshList()
      setError('')
    } catch (e) {
      setError(String(e?.message || 'No se pudo confirmar entrega'))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">Consola de Despacho</div>
          <div className="mt-2 text-sm text-white/60">
            Asigna un repartidor y gestiona pedidos en camino (evidencia obligatoria para confirmar).
          </div>
        </div>

        {error ? <div className="px-6 py-4 text-sm font-semibold text-red-200">{error}</div> : null}

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold text-white/90">Asignar Repartidor</div>
                <div className="mt-1 text-xs text-white/55">Selecciona un repartidor para el pedido activo.</div>
              </div>
              <div className="grid gap-3 px-5 py-5 sm:grid-cols-5">
                {(staff || []).slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleAssign(s.id)}
                    disabled={!selectedId || !canAssign}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="text-[11px] font-extrabold tracking-widest text-white/45">CÓDIGO</div>
                    <div className="mt-1 text-sm font-extrabold text-white/85">{s.username}</div>
                    <div className="mt-1 text-xs text-white/55">{s.name}</div>
                  </button>
                ))}
                {(!staff || staff.length === 0) && !loading ? (
                  <div className="sm:col-span-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
                    No hay repartidores registrados (ENT-0001…).
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold text-white/90">Pedidos en Camino</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
                    <tr>
                      <th className="px-5 py-4">TICKET</th>
                      <th className="px-5 py-4">CLIENTE</th>
                      <th className="px-5 py-4">REPARTIDOR</th>
                      <th className="px-5 py-4">HORA ASIGNACIÓN</th>
                      <th className="px-5 py-4">FECHA</th>
                      <th className="px-5 py-4">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-6 text-white/60">
                          Cargando…
                        </td>
                      </tr>
                    ) : enCamino.length ? (
                      enCamino.map((o) => (
                        <tr
                          key={o.id}
                          className={[
                            'cursor-pointer hover:bg-white/5',
                            selectedId === o.id ? 'bg-white/5' : '',
                          ].join(' ')}
                          onClick={() => setSelectedId(o.id)}
                        >
                          <td className="px-5 py-4">
                            <div className="text-sm font-extrabold text-white/85">{o.reference}</div>
                            {o.payment_code ? <div className="mt-1 text-xs text-white/45">{o.payment_code}</div> : null}
                          </td>
                          <td className="px-5 py-4 text-white/70">{o.customer || '—'}</td>
                          <td className="px-5 py-4 text-white/70">{o.driver || '—'}</td>
                          <td className="px-5 py-4 text-white/70">{o.assigned_at ? fmtDT(o.assigned_at) : '—'}</td>
                          <td className="px-5 py-4 text-white/70">{o.created_at ? fmtDT(o.created_at) : '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${statusBadge(o.status)}`}>
                              {statusLabel(o.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-6 text-white/60">
                          No hay pedidos en camino.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold text-white/90">Historial Reciente</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
                    <tr>
                      <th className="px-5 py-4">TICKET</th>
                      <th className="px-5 py-4">CLIENTE</th>
                      <th className="px-5 py-4">REPARTIDOR</th>
                      <th className="px-5 py-4">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-white/60">
                          Cargando…
                        </td>
                      </tr>
                    ) : historial.length ? (
                      historial.slice(0, 6).map((o) => (
                        <tr
                          key={o.id}
                          className={[
                            'cursor-pointer hover:bg-white/5',
                            selectedId === o.id ? 'bg-white/5' : '',
                          ].join(' ')}
                          onClick={() => setSelectedId(o.id)}
                        >
                          <td className="px-5 py-4 text-white/70">{o.reference}</td>
                          <td className="px-5 py-4 text-white/70">{o.customer || '—'}</td>
                          <td className="px-5 py-4 text-white/70">{o.driver || '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${statusBadge(o.status)}`}>
                              {statusLabel(o.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-white/60">
                          Sin historial.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold text-white/90">Detalles del Pedido</div>
              </div>
              <div className="space-y-3 px-5 py-5 text-sm">
                {selected ? (
                  <>
                    <div className="text-xs font-extrabold tracking-widest text-white/45">CLIENTE</div>
                    <div className="font-extrabold text-white/85">{selected.customer_name || '—'}</div>
                    <div className="text-white/70">{selected.customer_email || '—'}</div>
                    <div className="text-white/70">{selected.customer_phone || '—'}</div>

                    <div className="pt-2 text-xs font-extrabold tracking-widest text-white/45">DIRECCIÓN</div>
                    <div className="text-white/70">{selected.customer_address || '—'}</div>

                    <div className="pt-2 text-xs font-extrabold tracking-widest text-white/45">REFERENCIA DE PEDIDO</div>
                    <div className="text-white/70">{selected.reference || '—'}</div>

                    <div className="pt-2 text-xs font-extrabold tracking-widest text-white/45">REPARTIDOR</div>
                    <div className="text-white/70">
                      {selected.driver || '—'}
                      {selected.assigned_at ? ` • ${fmtDT(selected.assigned_at)}` : ''}
                    </div>

                    <div className="pt-2 text-xs font-extrabold tracking-widest text-white/45">PRODUCTO</div>
                    <div className="text-white/70">
                      {selected.product_name} • x{selected.quantity}
                    </div>

                    <div className="pt-2 text-xs font-extrabold tracking-widest text-white/45">ESTADO</div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${statusBadge(selected.status)}`}>
                        {statusLabel(selected.status)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-white/60">Selecciona un pedido.</div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold text-white/90">Evidencia</div>
              </div>
              <div className="space-y-4 px-5 py-5">
                {evidenceUrl ? (
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-cyan-200/90 hover:bg-white/10"
                  >
                    Ver evidencia subida
                  </a>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                    Sube una foto como evidencia.
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  disabled={!selected || selected.status !== 'en_camino' || uploading || confirming}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setFile(f)
                    if (f) handleUploadEvidence(f)
                  }}
                  className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white/80 hover:file:bg-white/15"
                />

                <button
                  type="button"
                  onClick={() => handleUploadEvidence()}
                  disabled={!selected || selected.status !== 'en_camino' || !file || uploading || confirming}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? 'Subiendo…' : 'Subir evidencia'}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  disabled={!canConfirm}
                  className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirming ? 'Confirmando…' : 'Confirmar entrega'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
