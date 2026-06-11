import {
  Box,
  CreditCard,
  LogIn,
  Package,
  Truck,
  UserPlus,
  Database,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  Cpu
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, Link, useNavigate } from 'react-router-dom'
import { getEmployeeDashboard, getAdminDashboard, optimizeStockProtocol } from '../../api/client.js'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatInt(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return '0'
  return n.toLocaleString('es-PE')
}

function timeAgo(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `Hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  const days = Math.floor(h / 24)
  return `Hace ${days} d`
}

function DashboardCard({ icon: Icon, title, value, hint, accentBox, accentBar }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/20 backdrop-blur-xl">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold tracking-widest text-white/45">{title}</div>
            <div className="mt-2 text-3xl font-extrabold text-white/90">{value}</div>
            <div className="mt-2 truncate text-xs text-white/55">{hint}</div>
          </div>
          <div className={cx('grid h-11 w-11 place-items-center rounded-2xl border bg-white/5', accentBox)}>
            <Icon size={18} className="text-white/80" />
          </div>
        </div>
        <div className={cx('h-[3px] w-full rounded-full', accentBar)} />
      </div>
    </div>
  )
}

function activityMeta(type) {
  if (type === 'account_created') return { Icon: UserPlus, accent: 'border-cyan-300/20 bg-cyan-300/10', label: 'Cuenta' }
  if (type === 'payment') return { Icon: CreditCard, accent: 'border-emerald-300/20 bg-emerald-300/10', label: 'Pago' }
  if (type === 'order') return { Icon: Package, accent: 'border-amber-300/20 bg-amber-300/10', label: 'Pedido' }
  return { Icon: Box, accent: 'border-white/10 bg-white/5', label: 'Evento' }
}

export default function EmployeeSection({ title }) {
  const { me } = useOutletContext() || {}
  const isAdmin = !!(me?.is_staff && me?.is_superuser)
  const isDashboard = title === 'Dashboard'

  const navigate = useNavigate()

  // Standard employee dashboard state
  const [empLoading, setEmpLoading] = useState(false)
  const [empData, setEmpData] = useState(null)
  const [empError, setEmpError] = useState('')

  // Admin protocol dashboard state
  const [adminData, setAdminData] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [chartTab, setChartTab] = useState('24H')
  const [systemTime, setSystemTime] = useState('00:00:00')
  const [optimizing, setOptimizing] = useState(false)
  const [optSuccess, setOptSuccess] = useState(false)

  // Real-time clock for admin panel
  useEffect(() => {
    if (!isAdmin || !isDashboard) return
    const updateTime = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      setSystemTime(`${hh}:${mm}:${ss}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [isAdmin, isDashboard])

  // Load Admin Data
  async function loadAdminData() {
    try {
      setAdminLoading(true)
      const res = await getAdminDashboard()
      setAdminData(res)
      setAdminError('')
    } catch (e) {
      setAdminError(String(e?.message || 'Error al conectar con la base de datos de MongoDB.'))
    } finally {
      setAdminLoading(false)
    }
  }

  // Optimize stock handler
  async function handleOptimizeStock() {
    try {
      setOptimizing(true)
      setOptSuccess(false)
      const res = await optimizeStockProtocol()
      setOptSuccess(true)
      setTimeout(() => setOptSuccess(false), 4000)
      await loadAdminData()
    } catch (e) {
      alert('Error en optimización: ' + e.message)
    } finally {
      setOptimizing(false)
    }
  }

  // Load Employee Data
  useEffect(() => {
    let mounted = true
    async function loadEmp() {
      if (!isDashboard || isAdmin) return
      try {
        setEmpLoading(true)
        const res = await getEmployeeDashboard()
        if (!mounted) return
        setEmpData(res || null)
        setEmpError('')
      } catch (e) {
        if (!mounted) return
        setEmpData(null)
        setEmpError(String(e?.message || 'No se pudo cargar el dashboard'))
      } finally {
        if (mounted) setEmpLoading(false)
      }
    }
    loadEmp()
    return () => {
      mounted = false
    }
  }, [isDashboard, isAdmin])

  // Initial load for admin
  useEffect(() => {
    if (isAdmin && isDashboard) {
      loadAdminData()
    }
  }, [isAdmin, isDashboard])

  const empActivity = useMemo(() => (Array.isArray(empData?.activity) ? empData.activity : []), [empData?.activity])

  // CSV Exporter for Customer Movements
  function handleExportCSV() {
    if (!adminData?.movements) return
    const headers = ['PROTOCOL ID', 'CLIENTE', 'PRODUCTO', 'ESTADO', 'MONTO']
    const rows = adminData.movements.map(m => [
      m.protocol_id,
      m.client_name,
      m.product_name,
      m.status,
      m.amount
    ])
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `movimientos_clientes_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // RENDER SECTIONS OTHER THAN DASHBOARD (PRODUCTS, SALES, ETC.)
  if (!isDashboard) {
    return (
      <div className={cx(
        "overflow-hidden rounded-3xl border transition-all duration-300",
        isAdmin 
          ? "border-white/10 bg-[#071026]/70 shadow-2xl shadow-black/50 backdrop-blur-2xl" 
          : "border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl"
      )}>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">{title}</div>
          <div className="mt-2 text-sm text-white/60">Vista del panel (prototipo).</div>
        </div>
        <div className="p-6 text-sm text-white/60">Sección en construcción.</div>
      </div>
    )
  }

  // RENDER RANDOMLY SCI-FI CYBER ADMIN DASHBOARD
  if (isAdmin) {
    const activeChartData = adminData?.charts?.[chartTab] || []
    const maxVal = Math.max(...activeChartData.map(d => d.total), 100)

    return (
      <div className="space-y-6 animate-fadeIn pb-10">
        {/* Title Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#071026]/70 px-6 py-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Protocol Status: Optimal</span>
              </div>
              <div className="mt-2 text-xs font-bold font-mono tracking-wide text-white/45">
                System Time: <span className="text-fuchsia-400">{systemTime}</span> | Active Nodes: {adminData?.active_nodes || 24}
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-mono font-extrabold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                DATABASE LIVE
              </span>
            </div>
          </div>
        </div>

        {adminError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm font-semibold text-rose-200">{adminError}</div>
        ) : null}

        {/* Summary metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Ventas Hoy */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="text-[10px] font-mono font-black tracking-widest text-white/45">VENTAS HOY</div>
            <div className="mt-2 text-3xl font-black text-white">
              {adminLoading ? '...' : `$${parseFloat(adminData?.ventas_hoy || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[10px]">
                📈 +14%
              </span>
              <span className="text-white/45 text-[10px] font-normal">vs periodo anterior</span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            </div>
          </div>

          {/* Nuevos Clientes */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="text-[10px] font-mono font-black tracking-widest text-white/45">NUEVOS CLIENTES</div>
            <div className="mt-2 text-3xl font-black text-white">
              {adminLoading ? '...' : adminData?.new_clients || 0}
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[10px]">
                📈 +8%
              </span>
              <span className="text-white/45 text-[10px] font-normal">registrados este mes</span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            </div>
          </div>

          {/* Pendientes Pago */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="text-[10px] font-mono font-black tracking-widest text-white/45">PENDIENTES PAGO</div>
            <div className="mt-2 text-3xl font-black text-white">
              {adminLoading ? '...' : adminData?.pending_payments || 0}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                ⚠️ Action Required
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-[25%] rounded-full bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>
          </div>
        </div>

        {/* Graph & Logs Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Real-time Graph */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-white/90 tracking-wide flex items-center gap-2">
                <span>📉 Actividad de Ventas Real-Time</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-0.5 font-mono text-[10px]">
                {['1H', '24H', '7D'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setChartTab(tab)}
                    className={cx(
                      "px-2.5 py-1 rounded-lg font-bold transition",
                      chartTab === tab ? "bg-white/10 text-white" : "text-white/45 hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Bars chart */}
            {adminLoading ? (
              <div className="h-44 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-fuchsia-400" />
              </div>
            ) : (
              <div className="h-44 flex items-end justify-between gap-2.5 pt-6">
                {activeChartData.map((item, idx) => {
                  const heightPercent = maxVal > 0 ? (item.total / maxVal) * 100 : 0
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0c1630] border border-cyan-400/30 text-cyan-200 text-[9px] rounded px-1.5 py-1 z-30 font-mono shadow-xl whitespace-nowrap">
                        ${parseFloat(item.total).toFixed(2)}
                      </div>
                      {/* Bar */}
                      <div 
                        style={{ height: `${Math.max(4, heightPercent)}%` }} 
                        className="w-full rounded-t-sm bg-gradient-to-t from-fuchsia-600/30 to-cyan-400/80 group-hover:brightness-125 transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                      />
                      {/* Label */}
                      <span className="text-[8px] font-mono text-white/35 mt-2 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-white/45">
              <span>Rango activo: {chartTab}</span>
              <span>Actualizado automáticamente</span>
            </div>
          </div>

          {/* Protocol Log */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl flex flex-col justify-between h-[300px] lg:h-auto">
            <div>
              <div className="text-sm font-bold text-white/90 tracking-wide flex items-center gap-2 border-b border-white/5 pb-3">
                <Database size={16} className="text-fuchsia-400" />
                <span>Log de Protocolo</span>
              </div>
              <div className="mt-3 space-y-3 max-h-[200px] lg:max-h-[220px] overflow-y-auto pr-1 font-mono text-[9px] leading-relaxed">
                {adminLoading ? (
                  <div className="py-8 text-center text-white/35">Cargando logs...</div>
                ) : adminData?.logs?.length ? (
                  adminData.logs.map((log) => (
                    <div key={log.id} className="border-l-2 border-white/5 pl-2 py-0.5 hover:bg-white/5 transition rounded-r-md">
                      <span className="text-white/35">{log.time}</span>{' '}
                      <span className={cx(
                        "font-bold mr-1 px-1 rounded text-[8px]",
                        log.tag === '@System' ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "",
                        log.tag === '@Employee' ? "bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20" : "",
                        log.tag === '@Logistics' ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "",
                        log.tag === '@Security' ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" : ""
                      )}>
                        {log.tag}
                      </span>{' '}
                      <span className="text-white/85">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-white/35">No hay actividad reciente.</div>
                )}
              </div>
            </div>
            <button
              onClick={loadAdminData}
              className="mt-3 w-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition text-white/75 font-semibold text-[10px] py-2 rounded-xl flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>ACTUALIZAR LOGS</span>
            </button>
          </div>
        </div>

        {/* Client Movements Table */}
        <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="text-sm font-bold text-white/90 tracking-wide flex items-center gap-2">
              <span>📦 Movimientos de Clientes</span>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition text-white/75 px-3 py-1.5 rounded-xl text-[10px] font-bold"
            >
              <Download size={12} />
              <span>Exportar CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse mt-3">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-mono tracking-widest text-white/35 uppercase">
                  <th className="py-3 px-3">PROTOCOL ID</th>
                  <th className="py-3 px-3">CLIENTE</th>
                  <th className="py-3 px-3">PRODUCTO</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3">MONTO</th>
                  <th className="py-3 px-3 text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/80">
                {adminLoading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-white/35 font-mono">Cargando base de datos de MongoDB...</td>
                  </tr>
                ) : adminData?.movements?.length ? (
                  adminData.movements.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-mono font-bold text-fuchsia-300">#{item.protocol_id}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-[10px] font-black text-white shadow-md shadow-purple-500/25">
                            {item.client_initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white/90">{item.client_name}</div>
                            <div className="text-[9px] text-white/45">{item.client_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-white/75 font-medium">{item.product_name}</td>
                      <td className="py-3 px-3">
                        <span className={cx(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border",
                          item.status === 'entregado' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "",
                          item.status === 'procesando' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "",
                          item.status === 'en_camino' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "",
                          item.status === 'rechazado' || item.status === 'cancelado' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : ""
                        )}>
                          {String(item.status).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-white">${parseFloat(item.amount).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate('/empleado/ventas')}
                          className="p-1 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/75 hover:text-white transition inline-flex items-center justify-center"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-white/35">No hay movimientos de clientes registrados en MongoDB.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lower Grid (Staff activity & Inventory nexus) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Employee Activity */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
              <span>👥 Actividad de Empleados</span>
            </div>
            <div className="mt-4 space-y-4">
              {adminLoading ? (
                <div className="py-6 text-center text-white/35">Cargando personal...</div>
              ) : adminData?.employees?.length ? (
                adminData.employees.map((emp) => (
                  <div key={emp.username} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-xs font-black text-cyan-300 shadow-md">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white/90">{emp.name} <span className="text-[10px] text-white/45 font-mono">({emp.role})</span></span>
                        <span className="text-[10px] font-mono text-cyan-300 font-extrabold">{emp.metric_val} {emp.metric_label}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (emp.metric_val / 35) * 100)}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-white/35">No hay empleados activos en el sistema.</div>
              )}
            </div>
          </div>

          {/* Inventory Nexus */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
                <Cpu size={16} className="text-cyan-400" />
                <span>Inventory Nexus</span>
              </div>

              <div className="mt-4 grid gap-4 grid-cols-2">
                {/* Low Stock card */}
                <div className="bg-white/5 border border-white/15 rounded-2xl p-4 relative overflow-hidden">
                  <div className="text-[9px] font-mono font-bold tracking-wider text-rose-400/90 uppercase">LOW STOCK ALERT</div>
                  <div className="mt-2 text-xs font-bold text-white/80 truncate">{adminData?.inventory?.low_stock?.name || 'Cargando...'}</div>
                  <div className="mt-2 text-2xl font-black text-white flex items-baseline gap-1">
                    <span>{adminData?.inventory?.low_stock?.stock ?? 0}</span>
                    <span className="text-[10px] font-medium text-white/45">unidades</span>
                  </div>
                  <span className="absolute right-3 top-3 text-rose-500 animate-pulse">⚠️</span>
                </div>

                {/* Top performer card */}
                <div className="bg-white/5 border border-white/15 rounded-2xl p-4 relative overflow-hidden">
                  <div className="text-[9px] font-mono font-bold tracking-wider text-cyan-400/90 uppercase">TOP PERFORMER</div>
                  <div className="mt-2 text-xs font-bold text-white/80 truncate">{adminData?.inventory?.top_performer?.name || 'Cargando...'}</div>
                  <div className="mt-2 text-2xl font-black text-white flex items-baseline gap-1">
                    <span>{adminData?.inventory?.top_performer?.sold_count ?? 0}</span>
                    <span className="text-[10px] font-medium text-white/45">vendidos</span>
                  </div>
                  <span className="absolute right-3 top-3 text-cyan-400">🔥</span>
                </div>
              </div>
            </div>

            {/* Optimize Stock Action */}
            <div className="mt-5">
              <button
                disabled={optimizing}
                onClick={handleOptimizeStock}
                className={cx(
                  "w-full py-3 rounded-2xl font-bold text-xs font-mono border transition-all duration-300 active:scale-[0.98] shadow-md flex items-center justify-center gap-2",
                  optSuccess
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10"
                    : "bg-[#0c1630] border-cyan-500/30 hover:border-cyan-400/50 hover:bg-[#101e40] text-cyan-300 shadow-cyan-500/10"
                )}
              >
                {optimizing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>OPTIMIZANDO STOCK...</span>
                  </>
                ) : optSuccess ? (
                  <>
                    <span>✓ STOCK OPTIMIZADO EN MONGODB</span>
                  </>
                ) : (
                  <>
                    <Cpu size={14} className="text-cyan-400" />
                    <span>OPTIMIZAR STOCK PROTOCOL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // RENDER STANDARD EMPLOYEE DASHBOARD
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-6 px-6 py-6">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-cyan-200/70">METAS DEL DÍA</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Resumen de Operaciones</div>
            <div className="mt-2 text-sm text-white/60">Monitorización en tiempo real del ecosistema Palacio Gamer.</div>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 sm:flex">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/20" fill="currentColor" aria-hidden="true">
              <path d="M4 19h16v2H2V3h2v16zm3-1V9h3v9H7zm5 0V5h3v13h-3zm5 0v-7h3v7h-3z" />
            </svg>
          </div>
        </div>
      </div>

      {empError ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-semibold text-red-200">{empError}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <DashboardCard
          icon={UserPlus}
          title="CUENTAS CREADAS"
          value={empLoading ? '—' : formatInt(empData?.clients_month)}
          hint={empLoading ? 'Cargando…' : `${formatInt(empData?.clients_total)} clientes en total`}
          accentBox="border-cyan-300/20 bg-cyan-300/10"
          accentBar="bg-cyan-300/40"
        />
        <DashboardCard
          icon={LogIn}
          title="INICIOS DE SESIÓN"
          value={empLoading ? '—' : formatInt(empData?.logins_24h)}
          hint={empLoading ? 'Cargando…' : 'Actividad en las últimas 24h'}
          accentBox="border-indigo-300/20 bg-indigo-300/10"
          accentBar="bg-indigo-300/40"
        />
        <DashboardCard
          icon={Box}
          title="STOCK INGRESADO"
          value={empLoading ? '—' : formatInt(empData?.stock_units)}
          hint={empLoading ? 'Cargando…' : 'Unidades en inventario'}
          accentBox="border-fuchsia-300/20 bg-fuchsia-300/10"
          accentBar="bg-fuchsia-300/40"
        />
        <DashboardCard
          icon={CreditCard}
          title="PAGOS REALIZADOS"
          value={empLoading ? '—' : formatInt(empData?.payments_today)}
          hint={empLoading ? 'Cargando…' : 'Pagos registrados hoy'}
          accentBox="border-emerald-300/20 bg-emerald-300/10"
          accentBar="bg-emerald-300/40"
        />
        <DashboardCard
          icon={Truck}
          title="ENTREGAS"
          value={empLoading ? '—' : formatInt(empData?.deliveries_pending)}
          hint={empLoading ? 'Cargando…' : 'Pendientes de entrega'}
          accentBox="border-amber-300/20 bg-amber-300/10"
          accentBar="bg-amber-300/40"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-sm font-extrabold text-white/90">Actividad del Protocolo</div>
            <div className="mt-1 text-xs text-white/55">Últimos eventos registrados en el sistema.</div>
          </div>
          <div className="text-xs font-extrabold tracking-widest text-cyan-200/70 cursor-pointer">VER HISTORIAL</div>
        </div>

        <div className="divide-y divide-white/10">
          {empLoading ? (
            <div className="p-6">
              <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            </div>
          ) : empActivity.length ? (
            empActivity.map((a, idx) => (
              <div key={`${a.type}-${idx}`} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {(() => {
                    const meta = activityMeta(a.type)
                    const Icon = meta.Icon
                    return (
                      <div className={cx('grid h-10 w-10 place-items-center rounded-2xl border bg-white/5', meta.accent)}>
                        <Icon size={16} className="text-white/80" />
                      </div>
                    )
                  })()}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/80">{a.label}</div>
                    <div className="mt-1 text-xs text-white/45">{a.created_at ? timeAgo(a.created_at) : ''}</div>
                  </div>
                </div>
                {a.ref ? <div className="shrink-0 text-xs font-extrabold text-white/35">{a.ref}</div> : null}
              </div>
            ))
          ) : (
            <div className="p-6 text-sm text-white/55">No hay actividad reciente.</div>
          )}
        </div>
      </div>
    </div>
  )
}
