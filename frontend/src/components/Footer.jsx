export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#050C1F]/60 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-lg font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              Palacio Gamer
            </span>
          </div>
          <div className="mt-2 text-sm text-white/55">Optimized for High Performance.</div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm text-white/60 md:col-span-2 md:grid-cols-3">
          <a className="hover:text-white" href="#">
            Soporte
          </a>
          <a className="hover:text-white" href="#">
            Política de Privacidad
          </a>
          <a className="hover:text-white" href="#">
            Términos de Servicio
          </a>
          <a className="hover:text-white" href="#">
            Envíos
          </a>
          <a className="hover:text-white" href="#">
            Carreras
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/45">
        © 2024 Palacio Gamer. All rights reserved. Protocol Secured.
      </div>
    </footer>
  )
}

