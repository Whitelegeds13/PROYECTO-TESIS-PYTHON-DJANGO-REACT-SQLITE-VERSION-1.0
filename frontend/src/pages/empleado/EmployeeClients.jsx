import { useEffect, useMemo, useState } from 'react'
import { deleteEmployeeClient, getEmployeeClients } from '../../api/client.js'

function money(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return 'S/ 0.00'
  return `S/ ${n.toFixed(2)}`
}

function fmtDT(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(st) {
  if (st === 'activo') return 'Activo'
  if (st === 'inactivo') return 'Inactivo'
  if (st === 'suspendido') return 'Suspendido'
  return String(st || '')
}

function statusBadge(st) {
  if (st === 'activo') return 'bg-emerald-300 text-emerald-950'
  if (st === 'inactivo') return 'bg-amber-300 text-amber-950'
  if (st === 'suspendido') return 'bg-rose-300 text-rose-950'
  return 'bg-white/20 text-white'
}

export default function EmployeeClients() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)

  const pageSize = 10

  const results = useMemo(() => (Array.isArray(data?.results) ? data.results : []), [data?.results])
  const totalCount = useMemo(() => Number(data?.count || 0) || 0, [data?.count])
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount])

  useEffect(() => {
    setPage(1)
  }, [search, status])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        const res = await getEmployeeClients({
          search: search.trim(),
          status: status || '',
          page,
          page_size: pageSize,
        })
        if (!mounted) return
        setData(res || null)
        setError('')
      } catch (e) {
        if (!mounted) return
        setData(null)
        setError(String(e?.message || 'No se pudo cargar clientes'))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const id = setTimeout(load, 250)
    return () => {
      mounted = false
      clearTimeout(id)
    }
  }, [search, status, page, reloadToken])

  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages)
  }, [loading, page, totalPages])

  async function handleDelete(u) {
    const id = u?.id
    const label = u?.email || u?.full_name || 'este usuario'
    if (!window.confirm(`¿Deseas borrar ${label}?`)) return
    try {
      setLoading(true)
      await deleteEmployeeClient(id)
      setReloadToken((x) => x + 1)
    } catch (e) {
      setError(String(e?.message || 'No se pudo borrar el usuario'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">Clientes</div>
          <div className="mt-2 text-sm text-white/60">Listado de usuarios tipo cliente con estado y acciones.</div>
        </div>

        <div className="grid gap-3 px-6 py-5 md:grid-cols-[1fr_220px]">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-white/45">BUSCAR</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, correo o usuario…"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
            />
          </div>

          <div>
            <div className="text-xs font-extrabold tracking-widest text-white/45">ESTADO</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/85 outline-none focus:border-cyan-300/30"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>
        </div>

        {error ? <div className="px-6 pb-4 text-sm font-semibold text-red-200">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
              <tr>
                <th className="px-6 py-4">NOMBRE</th>
                <th className="px-6 py-4">CORREO</th>
                <th className="px-6 py-4">TOTAL COMPRAS</th>
                <th className="px-6 py-4">ÚLTIMA CONEXIÓN</th>
                <th className="px-6 py-4">ESTADO</th>
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
              ) : results.length ? (
                results.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{u.full_name}</div>
                    </td>
                    <td className="px-6 py-4 text-white/70">{u.email}</td>
                    <td className="px-6 py-4 font-extrabold text-white/85">{money(u.total_purchases)}</td>
                    <td className="px-6 py-4 text-white/70">{u.last_connection ? fmtDT(u.last_connection) : '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${statusBadge(u.status)}`}
                      >
                        {statusLabel(u.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs font-extrabold text-rose-100/90 transition hover:bg-rose-400/15"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-white/60">
                    No hay clientes para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-white/60">
            {totalCount ? `${totalCount} clientes` : '0 clientes'} • Página {page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
