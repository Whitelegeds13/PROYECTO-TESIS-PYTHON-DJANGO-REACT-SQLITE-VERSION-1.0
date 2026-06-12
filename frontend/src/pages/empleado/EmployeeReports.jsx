import { useEffect, useState, useMemo } from 'react'
import { getEmployeeReports } from '../../api/client.js'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Percent,
  Download,
  Calendar,
  RefreshCw,
  ShoppingBag,
  Award
} from 'lucide-react'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function StatCard({ icon: Icon, title, value, change, isPositive, color }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-white/45 block uppercase">{title}</span>
          <span className="text-2xl font-black text-white/95 mt-2 block">{value}</span>
        </div>
        <div className={cx("h-11 w-11 rounded-2xl border flex items-center justify-center bg-white/5", color)}>
          <Icon size={18} className="text-white/90" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <span className={cx(
          "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border",
          isPositive 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {change}
        </span>
        <span className="text-[10px] text-white/45">vs periodo anterior</span>
      </div>
    </div>
  )
}

export default function EmployeeReports() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState('30days')
  const [data, setData] = useState(null)

  async function loadData() {
    try {
      setLoading(true)
      const res = await getEmployeeReports({ range })
      setData(res)
      setError('')
    } catch (e) {
      setError(String(e?.message || 'Error al obtener reporte'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [range])

  const chartPoints = useMemo(() => {
    if (!data?.chart_data || data.chart_data.length === 0) return []
    return data.chart_data
  }, [data])

  const maxChartVal = useMemo(() => {
    if (!chartPoints.length) return 1000
    const vals = chartPoints.map(p => Math.max(p.total, p.meta))
    return Math.max(...vals, 100)
  }, [chartPoints])

  // Simple SVG Line path generator
  const svgLinePaths = useMemo(() => {
    if (chartPoints.length < 2) return { real: '', meta: '' }
    const width = 600
    const height = 150
    const padding = 20
    const usableHeight = height - padding * 2
    const usableWidth = width - padding * 2

    const pointsCount = chartPoints.length
    const stepX = usableWidth / (pointsCount - 1)

    const realCoords = chartPoints.map((p, idx) => {
      const x = padding + idx * stepX
      const yPercent = maxChartVal > 0 ? p.total / maxChartVal : 0
      const y = height - padding - yPercent * usableHeight
      return { x, y }
    })

    const metaCoords = chartPoints.map((p, idx) => {
      const x = padding + idx * stepX
      const yPercent = maxChartVal > 0 ? p.meta / maxChartVal : 0
      const y = height - padding - yPercent * usableHeight
      return { x, y }
    })

    const realLine = realCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    const metaLine = metaCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

    // Generar path de área cerrada
    const realArea = `${realLine} L ${realCoords[realCoords.length - 1].x} ${height - padding} L ${realCoords[0].x} ${height - padding} Z`

    return { realLine, metaLine, realArea, realCoords, metaCoords }
  }, [chartPoints, maxChartVal])

  function handleExportPDF() {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Upper Panel */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-6">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-cyan-300">ANÁLISIS COMERCIAL</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Reportes y Estadísticas</div>
            <div className="mt-2 text-sm text-white/60">
              Análisis detallado de rendimiento comercial y operativo de Palacio Gamer.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Range Selector */}
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/80">
              <Calendar size={14} className="text-cyan-300" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="bg-transparent outline-none cursor-pointer border-none font-bold text-white pr-2"
              >
                <option value="30days" className="bg-[#0c1630] text-white">Últimos 30 días</option>
                <option value="7days" className="bg-[#0c1630] text-white">Últimos 7 días</option>
              </select>
            </div>
            
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:brightness-110 active:scale-[0.98] transition px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-fuchsia-500/10 border border-fuchsia-400/20"
            >
              <Download size={14} />
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-white/40 font-mono text-sm">
          <RefreshCw className="animate-spin text-cyan-300" size={32} />
          <span>CARGANDO PROTOCOL DE REPORTES...</span>
        </div>
      ) : (
        <>
          {/* Quick Metrics grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={DollarSign}
              title="Ventas Totales"
              value={`S/. ${parseFloat(data?.summary?.total_sales || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              change="+12.5%"
              isPositive={true}
              color="border-cyan-500/20 bg-cyan-500/5 text-cyan-300"
            />
            <StatCard
              icon={ShoppingBag}
              title="Ticket Promedio"
              value={`S/. ${parseFloat(data?.summary?.avg_ticket || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              change="+5.2%"
              isPositive={true}
              color="border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300"
            />
            <StatCard
              icon={Users}
              title="Clientes Nuevos"
              value={data?.summary?.new_clients || 0}
              change="-2.1%"
              isPositive={false}
              color="border-amber-500/20 bg-amber-500/5 text-amber-300"
            />
            <StatCard
              icon={Percent}
              title="Tasa de Conversión"
              value={`${data?.summary?.conversion_rate || 4.8}%`}
              change="+0.4%"
              isPositive={true}
              color="border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
            />
          </div>

          {/* Graph & Top products Grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Sales performance chart */}
            <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="text-sm font-bold text-white/90 tracking-wide">
                  Rendimiento: Ventas vs Metas
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    <span className="text-white/60">Ventas Reales</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15 border border-dashed border-white/40" />
                    <span className="text-white/60">Meta Mensual</span>
                  </div>
                </div>
              </div>

              {/* Vector Chart render */}
              {chartPoints.length > 1 ? (
                <div className="mt-6">
                  <svg viewBox="0 0 600 150" className="w-full overflow-visible">
                    <defs>
                      <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Area path */}
                    <path d={svgLinePaths.realArea} fill="url(#chartAreaGrad)" />

                    {/* Meta dotted path */}
                    <path
                      d={svgLinePaths.metaLine}
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {/* Real Line path */}
                    <path
                      d={svgLinePaths.realLine}
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="3"
                      className="drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                    />

                    {/* Points dots */}
                    {svgLinePaths.realCoords.map((c, i) => (
                      <circle
                        key={i}
                        cx={c.x}
                        cy={c.y}
                        r="3.5"
                        fill="#071026"
                        stroke="#22D3EE"
                        strokeWidth="2"
                        className="cursor-pointer hover:r-5 transition-all"
                      />
                    ))}
                  </svg>
                  <div className="mt-4 flex items-center justify-between text-[8px] font-mono text-white/30 px-4">
                    <span>{chartPoints[0].label}</span>
                    <span>{chartPoints[Math.floor(chartPoints.length / 2)].label}</span>
                    <span>{chartPoints[chartPoints.length - 1].label}</span>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-white/30 text-xs">
                  Sin datos suficientes para renderizar gráfico.
                </div>
              )}
            </div>

            {/* Top Products checklist list */}
            <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
                  <Award size={16} className="text-fuchsia-400" />
                  <span>Productos más Vendidos</span>
                </div>
                <div className="mt-4 space-y-4">
                  {(data?.top_products || []).map((p, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white/95 truncate pr-2 max-w-[200px]">{p.name}</span>
                        <span className="font-mono text-cyan-300 font-extrabold shrink-0">{p.quantity} unid.</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          style={{ width: `${p.percent}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                        />
                      </div>
                    </div>
                  ))}
                  {(!data?.top_products || data.top_products.length === 0) && (
                    <div className="py-12 text-center text-white/35 text-xs">
                      No hay transacciones de productos en el rango de fecha.
                    </div>
                  )}
                </div>
              </div>

              <button className="mt-4 w-full border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-2xl text-xs font-bold transition">
                Ver Listado Completo
              </button>
            </div>
          </div>

          {/* Transactions list table */}
          <div className="rounded-3xl border border-white/10 bg-[#071026]/70 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="text-sm font-bold text-white/90 tracking-wide border-b border-white/5 pb-4">
              Historial de Transacciones Recientes
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse mt-3">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-mono tracking-widest text-white/35 uppercase">
                    <th className="py-3 px-3">ID TRANSACCIÓN</th>
                    <th className="py-3 px-3">CLIENTE</th>
                    <th className="py-3 px-3">PRODUCTO PRINCIPAL</th>
                    <th className="py-3 px-3">FECHA</th>
                    <th className="py-3 px-3">ESTADO</th>
                    <th className="py-3 px-3 text-right">MONTO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-white/80">
                  {(data?.recent_transactions || []).map((t, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-mono font-bold text-fuchsia-300">{t.payment_code}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-[10px] font-black text-white shadow-md shadow-purple-500/25">
                            {t.customer_initials}
                          </div>
                          <span className="font-bold text-white/90">{t.customer_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-white/70 font-medium truncate max-w-[200px]" title={t.product_name}>
                        {t.product_name}
                      </td>
                      <td className="py-3 px-3 text-white/55 font-mono">{t.created_at}</td>
                      <td className="py-3 px-3">
                        <span className={cx(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border",
                          t.status === 'confirmado' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "",
                          t.status === 'en_espera' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "",
                          t.status === 'rechazado' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : ""
                        )}>
                          {t.status === 'confirmado' ? 'COMPLETADO' : t.status === 'en_espera' ? 'PENDIENTE' : 'CANCELADO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-white text-right">
                        S/. {parseFloat(t.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {(!data?.recent_transactions || data.recent_transactions.length === 0) && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-white/35">No hay transacciones registradas en MongoDB.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
