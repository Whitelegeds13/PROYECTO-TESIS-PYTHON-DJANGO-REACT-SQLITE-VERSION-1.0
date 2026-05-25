import { Building2, CreditCard, Lock, QrCode, UploadCloud } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

function money(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return 'S/ 0.00'
  return `S/ ${n.toFixed(2)}`
}

export default function Payment({ cart, loading, onConfirm }) {
  const items = cart?.items || []
  const subtotal = Number(cart?.subtotal || 0)
  const shipping = 0.0
  const igv = subtotal * 0.18
  const total = subtotal + shipping + igv

  const firstItem = items[0] || null
  const previewImg = firstItem ? imgSrc(firstItem.product_image_url || firstItem.product_image_base64) : null

  const [method, setMethod] = useState('card')
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  const [receipt, setReceipt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  const canConfirm = useMemo(() => {
    if (!items.length) return false
    if (loading || submitting) return false
    if (method === 'card') return Boolean(cardHolder.trim() && cardNumber.trim() && cardExpiry.trim() && cardCvv.trim())
    return Boolean(receipt)
  }, [items.length, loading, submitting, method, cardHolder, cardNumber, cardExpiry, cardCvv, receipt])

  async function submit() {
    setError('')
    if (!items.length) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('method', method)
      if (method === 'card') {
        fd.append('card_holder_name', cardHolder.trim())
        fd.append('card_number', cardNumber.trim())
        fd.append('card_expiry', cardExpiry.trim())
        fd.append('card_cvv', cardCvv.trim())
      } else {
        if (receipt) fd.append('receipt_file', receipt)
      }
      await onConfirm?.(fd)
    } catch (e) {
      setError(String(e?.message || 'No se pudo confirmar el pago.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Selecciona tu Método de Pago</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={[
                'flex items-center justify-center gap-3 rounded-2xl border bg-white/5 px-4 py-5 text-sm font-extrabold text-white/85 transition',
                method === 'card'
                  ? 'border-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.20)]'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10',
              ].join(' ')}
            >
              <CreditCard size={18} className="text-cyan-200" />
              Tarjeta de Crédito / Débito
            </button>
            <button
              type="button"
              onClick={() => setMethod('bank_transfer')}
              className={[
                'flex items-center justify-center gap-3 rounded-2xl border bg-white/5 px-4 py-5 text-sm font-extrabold text-white/85 transition',
                method === 'bank_transfer'
                  ? 'border-fuchsia-400/40 shadow-[0_0_0_1px_rgba(168,85,247,0.18)]'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10',
              ].join(' ')}
            >
              <Building2 size={18} className="text-fuchsia-200" />
              Transferencia Bancaria
            </button>
            <button
              type="button"
              onClick={() => setMethod('yape_plin')}
              className={[
                'flex items-center justify-center gap-3 rounded-2xl border bg-white/5 px-4 py-5 text-sm font-extrabold text-white/85 transition',
                method === 'yape_plin'
                  ? 'border-indigo-300/40 shadow-[0_0_0_1px_rgba(99,102,241,0.18)]'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10',
              ].join(' ')}
            >
              <QrCode size={18} className="text-indigo-200" />
              Yape / Plin
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="text-lg font-extrabold tracking-tight text-white/95">
                {method === 'card' ? 'Datos de la Tarjeta' : 'Detalles de Transferencia Bancaria'}
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              {error ? (
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {method === 'card' ? (
                <>
                  <div>
                    <div className="text-xs font-extrabold tracking-widest text-white/50">NOMBRE EN LA TARJETA</div>
                    <input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
                      placeholder="JUAN PEREZ"
                      autoComplete="cc-name"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold tracking-widest text-white/50">NÚMERO DE TARJETA</div>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
                      placeholder="0000 0000 0000 0000"
                      autoComplete="cc-number"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-extrabold tracking-widest text-white/50">FECHA DE EXPIRACIÓN</div>
                      <input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
                        placeholder="MM / YY"
                        autoComplete="cc-exp"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold tracking-widest text-white/50">CVV</div>
                      <input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
                        placeholder="***"
                        autoComplete="cc-csc"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </>
              ) : method === 'bank_transfer' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-[11px] font-extrabold tracking-widest text-white/45">BANCO</div>
                      <div className="mt-1 text-sm font-extrabold text-white/85">BCP Soles</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-[11px] font-extrabold tracking-widest text-white/45">TITULAR</div>
                      <div className="mt-1 text-sm font-extrabold text-white/85">PALACIO GAMER S.A.C.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-[11px] font-extrabold tracking-widest text-white/45">NÚMERO DE CUENTA</div>
                      <div className="mt-1 text-sm font-extrabold text-white/85">193-94827163-0-12</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-[11px] font-extrabold tracking-widest text-white/45">CCI</div>
                      <div className="mt-1 break-all text-sm font-extrabold text-white/85">002-193009482716301211</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-extrabold tracking-widest text-white/50">SUBIR COMPROBANTE</div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const f = e.dataTransfer?.files?.[0]
                        if (f) setReceipt(f)
                      }}
                      className="mt-3 rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-8 text-center"
                    >
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <UploadCloud size={18} className="text-cyan-200" />
                      </div>
                      <div className="mt-3 text-sm font-extrabold text-white/80">
                        {receipt ? receipt.name : 'Arrastra y suelta tu comprobante aquí'}
                      </div>
                      <div className="mt-1 text-xs text-white/55">Formatos aceptados: JPG, PNG, PDF</div>
                      <div className="mt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) setReceipt(f)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          Seleccionar Archivo
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-white/45">
                      Una vez subido el comprobante, validaremos tu pago en un plazo máximo de 2 horas hábiles.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <img src="/media/YAPE.jpeg" alt="Yape / Plin" className="h-[180px] w-full object-cover" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <div className="text-[11px] font-extrabold tracking-widest text-white/45">TITULAR</div>
                        <div className="mt-1 text-sm font-extrabold text-white/85">PALACIO GAMER S.A.C.</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <div className="text-[11px] font-extrabold tracking-widest text-white/45">CELULAR</div>
                        <div className="mt-1 text-sm font-extrabold text-white/85">987 654 321</div>
                      </div>
                      <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-white/55">
                        Escanea el código QR desde tu app favorita (Yape o Plin) para realizar el pago directamente.
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-extrabold tracking-widest text-white/50">SUBIR COMPROBANTE</div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const f = e.dataTransfer?.files?.[0]
                        if (f) setReceipt(f)
                      }}
                      className="mt-3 rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-8 text-center"
                    >
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <UploadCloud size={18} className="text-cyan-200" />
                      </div>
                      <div className="mt-3 text-sm font-extrabold text-white/80">
                        {receipt ? receipt.name : 'Arrastra y suelta tu comprobante aquí'}
                      </div>
                      <div className="mt-1 text-xs text-white/55">Formatos aceptados: JPG, PNG, PDF</div>
                      <div className="mt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) setReceipt(f)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          Seleccionar Archivo
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-white/45">
                      Una vez subido el comprobante, validaremos tu pago en un plazo máximo de 2 horas hábiles.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="h-fit overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-lg font-extrabold tracking-tight text-white/95">Resumen de Compra</div>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-white/70">
                <span className="text-white/55">Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="text-white/55">Envío</span>
                <span className="font-semibold text-emerald-200">{items.length ? 'Gratis' : 'S/ 0.00'}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="text-white/55">Impuestos (IGV)</span>
                <span>{money(igv)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-extrabold text-white/70">Total</span>
                <span className="text-2xl font-extrabold text-white/90">{money(total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={submit}
              className={[
                'w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-4 text-base font-extrabold text-[#05102a] shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_18px_50px_rgba(168,85,247,0.25)] transition hover:brightness-110',
                !canConfirm ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              Confirmar Pago
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-white/55">
              <Lock size={14} className="text-white/50" /> Transacción encriptada
            </div>

            {firstItem ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {previewImg ? <img src={previewImg} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-white/85">{firstItem.product_name}</div>
                  <div className="mt-1 text-xs text-white/55">
                    {items.length > 1 ? `${items.length} productos` : '1 producto'}
                  </div>
                </div>
              </div>
            ) : null}

            <Link to="/checkout" className="block text-center text-sm font-semibold text-white/60 hover:text-white">
              Volver al Resumen
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
