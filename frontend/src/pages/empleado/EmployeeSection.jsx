export default function EmployeeSection({ title }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
        <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">{title}</div>
        <div className="mt-2 text-sm text-white/60">Vista del panel (prototipo Stitch).</div>
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">RESUMEN</div>
          <div className="mt-2 text-2xl font-extrabold text-white/90">—</div>
          <div className="mt-2 text-sm text-white/60">Métricas internas.</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">ESTADO</div>
          <div className="mt-2 text-2xl font-extrabold text-white/90">—</div>
          <div className="mt-2 text-sm text-white/60">Operaciones y alertas.</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">ACCESOS</div>
          <div className="mt-2 text-2xl font-extrabold text-white/90">—</div>
          <div className="mt-2 text-sm text-white/60">Acciones frecuentes.</div>
        </div>
      </div>
    </div>
  )
}

