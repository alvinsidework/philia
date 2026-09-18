import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { formatWon } from '../data'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/AppStore'

type PaymentSetting = { bank_name: string; account_number: string; account_holder: string; deposit_deadline_hours: number }
type BankOrder = { id: string; order_no: string; amount: number; depositor_name: string; payment_deadline: string; bank_snapshot: PaymentSetting }
type PreparedTossOrder = { id: string; orderId: string; orderName: string; amount: number; customerName: string; customerEmail: string }
type PaymentMethod = 'toss' | 'bank'

// Toss Payments' official public test client key. Override it with the PHILIA test key in Vercel.
const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'

const errorMessage = (error: unknown) => error instanceof Error ? error.message : '결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'

export function Checkout() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const { cart, products, clearCart } = useAppStore()
  const [method, setMethod] = useState<PaymentMethod>('toss')
  const [setting, setSetting] = useState<PaymentSetting | null>(null)
  const [settingLoaded, setSettingLoaded] = useState(false)
  const [customerName, setCustomerName] = useState(profile?.display_name ?? '')
  const [depositor, setDepositor] = useState(profile?.display_name ?? '')
  const [agreed, setAgreed] = useState(false)
  const [order, setOrder] = useState<BankOrder | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const lines = cart.flatMap(item => {
    const product = products.find(candidate => candidate.id === item.productId)
    const variant = product?.variants.find(candidate => candidate.id === item.variantId)
    return product && variant ? [{ sku: product.sku, variantId: variant.id, name: product.name, nameKo: product.nameKo, option: `${variant.color} · ${variant.size}`, quantity: item.quantity, price: product.price, image: product.image }] : []
  })
  const estimated = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)

  useEffect(() => {
    if (profile?.display_name) {
      setCustomerName(current => current || profile.display_name || '')
      setDepositor(current => current || profile.display_name || '')
    }
  }, [profile?.display_name])

  useEffect(() => {
    if (!supabase) { setSettingLoaded(true); return }
    void supabase.from('payment_settings').select('bank_name,account_number,account_holder,deposit_deadline_hours').eq('active', true).maybeSingle().then(({ data }) => {
      setSetting(data as PaymentSetting | null)
      setSettingLoaded(true)
    })
  }, [])

  const payWithToss = async () => {
    if (!supabase || !user || !lines.length || !customerName.trim() || !agreed) return
    setBusy(true)
    setMessage('')
    try {
      if (customerName.trim() !== profile?.display_name) {
        const { error: profileError } = await supabase.from('profiles').update({ display_name: customerName.trim(), updated_at: new Date().toISOString() }).eq('id', user.id)
        if (profileError) throw profileError
      }
      const items = lines.map(line => ({ variant_id: line.variantId, quantity: line.quantity }))
      const { data, error } = await supabase.rpc('create_toss_payment_order', { order_items: items })
      if (error) throw error
      const prepared = data as PreparedTossOrder
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(tossClientKey)
      const payment = tossPayments.payment({ customerKey: user.id })
      const phone = profile?.phone?.replace(/\D/g, '')
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: prepared.amount },
        orderId: prepared.orderId,
        orderName: prepared.orderName,
        successUrl: `${window.location.origin}/checkout/toss/success`,
        failUrl: `${window.location.origin}/checkout/toss/fail`,
        customerName: customerName.trim(),
        customerEmail: prepared.customerEmail,
        customerMobilePhone: phone && phone.length >= 8 ? phone : undefined,
        card: { flowMode: 'DEFAULT', useEscrow: false },
      })
    } catch (error) {
      setMessage(errorMessage(error))
      setBusy(false)
    }
  }

  const submitBank = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !lines.length) return
    setBusy(true)
    setMessage('')
    const items = lines.map(line => ({ sku: line.sku, option: line.option, quantity: line.quantity }))
    const { data, error } = await supabase.rpc('create_bank_transfer_order', { payer_name: depositor, order_items: items })
    if (error) { setBusy(false); setMessage(error.message); return }
    const created = data as BankOrder
    setOrder(created)
    clearCart()
    const { error: notifyError } = await supabase.functions.invoke('notify-bank-order', { body: { order_id: created.id } })
    if (notifyError) console.warn('Telegram notification pending:', notifyError.message)
    setBusy(false)
  }

  const copy = async () => {
    if (!setting) return
    await navigator.clipboard.writeText(setting.account_number)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (!user) return <main className="checkout-gate"><p>{t('checkout.login')}</p><Link to="/account">LOGIN →</Link></main>
  if (!lines.length && !order) return <main className="checkout-gate"><p>{t('cart.empty')}</p><Link to="/shop">SHOP →</Link></main>
  if (order) {
    const bank = order.bank_snapshot
    return <main className="checkout-complete"><section><p>ORDER {order.order_no}</p><h1>{t('checkout.complete')}</h1><span>{t('checkout.instruction', { deadline: new Date(order.payment_deadline).toLocaleString(i18n.language), amount: formatWon(order.amount) })}</span><div className="transfer-ticket"><p>{bank.bank_name}</p><strong>{bank.account_number}</strong><span>{bank.account_holder} · {order.depositor_name}</span><b>{formatWon(order.amount)}</b><button onClick={copy}>{copied ? t('checkout.copied') : t('checkout.accountCopy')}</button></div><Link to="/account?tab=orders">{t('nav.orders')} →</Link></section></main>
  }

  return <main className="checkout-page"><section className="checkout-form"><p>PAYMENT · TEST MODE</p><h1>{t('checkout.title')}</h1>
    <div className="payment-method-tabs" role="tablist" aria-label={String(t('checkout.method'))}>
      <button type="button" id="toss-payment-tab" className={method === 'toss' ? 'active' : ''} role="tab" aria-controls="toss-payment-panel" aria-selected={method === 'toss'} onClick={() => { setMethod('toss'); setMessage('') }}><span>TOSS PAYMENTS</span><small>{t('checkout.card')}</small></button>
      <button type="button" id="bank-payment-tab" className={method === 'bank' ? 'active' : ''} role="tab" aria-controls="bank-payment-panel" aria-selected={method === 'bank'} onClick={() => { setMethod('bank'); setMessage('') }}><span>BANK TRANSFER</span><small>{t('checkout.bankTransfer')}</small></button>
    </div>
    {method === 'toss' ? <section id="toss-payment-panel" className="toss-checkout-panel" role="tabpanel" aria-labelledby="toss-payment-tab"><div className="test-payment-notice"><b>TEST</b><span>{t('checkout.testNotice')}</span></div><label>{t('account.name')}<input value={customerName} onChange={event => setCustomerName(event.target.value)} required /></label><label className="checkout-agreement"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /><span>{t('checkout.agreement')}</span></label><button type="button" className="ink-button toss-pay-button" onClick={() => void payWithToss()} disabled={busy || !agreed || !customerName.trim()}>{busy ? t('common.loading') : t('checkout.tossPay', { amount: formatWon(estimated) })}</button><p>{t('checkout.testHelp')}</p></section> : null}
    {method === 'bank' ? <section id="bank-payment-panel" className="bank-checkout-panel" role="tabpanel" aria-labelledby="bank-payment-tab">{setting ? <div className="bank-preview"><span>{t('checkout.bank')}</span><strong>{setting.bank_name} · {setting.account_number}</strong><em>{setting.account_holder}</em></div> : <p>{settingLoaded ? t('checkout.unavailable') : t('common.loading')}</p>}<form onSubmit={submitBank}><label>{t('checkout.depositor')}<input value={depositor} onChange={event => setDepositor(event.target.value)} required /></label><p>{t('checkout.depositorHelp')}</p><button className="ink-button" disabled={busy || !setting}>{busy ? t('common.loading') : t('checkout.order')}</button></form></section> : null}
    <span className="checkout-message" role="status">{message}</span>
  </section><aside className="checkout-summary"><p>{t('checkout.summary')}</p>{lines.map(line => <article key={`${line.sku}-${line.option}`}><img src={line.image} alt="" /><div><h3>{i18n.language === 'en' ? line.name : line.nameKo}</h3><span>{line.option} · {line.quantity}</span></div><strong>{formatWon(line.price * line.quantity)}</strong></article>)}<div><span>{t('checkout.amount')}</span><strong>{formatWon(estimated)}</strong></div></aside></main>
}
