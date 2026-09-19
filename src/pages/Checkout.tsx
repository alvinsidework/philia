import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { formatWon } from '../data'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/AppStore'

type PaymentSetting = { bank_name: string; account_number: string; account_holder: string; deposit_deadline_hours: number }
type ShippingInfo = { recipient_name: string; phone: string; postal_code: string; address_line1: string; address_line2: string; delivery_message: string }
type BankOrder = { id: string; order_no: string; amount: number; depositor_name: string; payment_deadline: string; bank_snapshot: PaymentSetting }
type PreparedTossOrder = { id: string; orderId: string; orderName: string; amount: number; subtotal: number; shippingFee: number; customerName: string; customerEmail: string }
type PaymentMethod = 'toss' | 'bank'
type PostcodeResult = { zonecode: string; roadAddress: string; jibunAddress: string; userSelectedType: 'R' | 'J' }

declare global {
  interface Window {
    kakao?: { Postcode: new (options: { oncomplete: (data: PostcodeResult) => void }) => { open: () => void } }
  }
}

const FREE_SHIPPING_THRESHOLD = 100000
const BASE_SHIPPING_FEE = 3000
const POSTCODE_SCRIPT = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let postcodeLoader: Promise<void> | null = null
const loadPostcode = () => {
  if (window.kakao?.Postcode) return Promise.resolve()
  if (postcodeLoader) return postcodeLoader
  postcodeLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${POSTCODE_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Address search could not be loaded.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = POSTCODE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Address search could not be loaded.'))
    document.head.appendChild(script)
  })
  return postcodeLoader
}

// Toss Payments' official public test client key. Override it with the PHILIA test key in Vercel.
const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'

export function Checkout() {
  const { t, i18n } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const { cart, products, clearCart } = useAppStore()
  const detailAddressRef = useRef<HTMLInputElement>(null)
  const [method, setMethod] = useState<PaymentMethod>('toss')
  const [setting, setSetting] = useState<PaymentSetting | null>(null)
  const [settingLoaded, setSettingLoaded] = useState(false)
  const [recipientName, setRecipientName] = useState(profile?.display_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? '')
  const [addressLine1, setAddressLine1] = useState(profile?.address_line1 ?? '')
  const [addressLine2, setAddressLine2] = useState(profile?.address_line2 ?? '')
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [saveToProfile, setSaveToProfile] = useState(true)
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
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE
  const estimatedTotal = subtotal + shippingFee
  const shippingInfo: ShippingInfo = {
    recipient_name: recipientName.trim(), phone: phone.trim(), postal_code: postalCode.trim(),
    address_line1: addressLine1.trim(), address_line2: addressLine2.trim(), delivery_message: deliveryMessage.trim(),
  }
  const shippingComplete = recipientName.trim().length >= 2 && phone.replace(/\D/g, '').length >= 9 && postalCode.trim().length >= 3 && addressLine1.trim().length >= 3

  useEffect(() => {
    if (!profile) return
    setRecipientName(current => current || profile.display_name || '')
    setDepositor(current => current || profile.display_name || '')
    setPhone(current => current || profile.phone || '')
    setPostalCode(current => current || profile.postal_code || '')
    setAddressLine1(current => current || profile.address_line1 || '')
    setAddressLine2(current => current || profile.address_line2 || '')
  }, [profile])

  useEffect(() => {
    if (!supabase) { setSettingLoaded(true); return }
    void supabase.from('payment_settings').select('bank_name,account_number,account_holder,deposit_deadline_hours').eq('active', true).maybeSingle().then(({ data }) => {
      setSetting(data as PaymentSetting | null)
      setSettingLoaded(true)
    })
  }, [])

  const openAddressSearch = async () => {
    setMessage('')
    try {
      await loadPostcode()
      if (!window.kakao?.Postcode) throw new Error(String(t('checkout.addressSearchError')))
      new window.kakao.Postcode({
        oncomplete: data => {
          setPostalCode(data.zonecode)
          setAddressLine1(data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress)
          window.setTimeout(() => detailAddressRef.current?.focus(), 0)
        },
      }).open()
    } catch {
      setMessage(String(t('checkout.addressSearchError')))
    }
  }

  const syncProfile = async () => {
    if (!saveToProfile || !supabase || !user) return
    const { error } = await supabase.from('profiles').update({
      display_name: shippingInfo.recipient_name,
      phone: shippingInfo.phone,
      postal_code: shippingInfo.postal_code,
      address_line1: shippingInfo.address_line1,
      address_line2: shippingInfo.address_line2,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (error) throw error
    await refreshProfile()
  }

  const payWithToss = async () => {
    if (!supabase || !user || !lines.length || !shippingComplete || !agreed) return
    await syncProfile()
    const items = lines.map(line => ({ variant_id: line.variantId, quantity: line.quantity }))
    const { data, error } = await supabase.rpc('create_toss_payment_order', { order_items: items, shipping_info: shippingInfo })
    if (error) throw error
    const prepared = data as PreparedTossOrder
    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
    const tossPayments = await loadTossPayments(tossClientKey)
    const payment = tossPayments.payment({ customerKey: user.id })
    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: prepared.amount },
      orderId: prepared.orderId,
      orderName: prepared.orderName,
      successUrl: `${window.location.origin}/checkout/toss/success`,
      failUrl: `${window.location.origin}/checkout/toss/fail`,
      customerName: prepared.customerName,
      customerEmail: prepared.customerEmail,
      customerMobilePhone: shippingInfo.phone.replace(/\D/g, ''),
      card: { flowMode: 'DEFAULT', useEscrow: false },
    })
  }

  const placeBankOrder = async () => {
    if (!supabase || !user || !lines.length || !setting || depositor.trim().length < 2) return
    await syncProfile()
    const items = lines.map(line => ({ sku: line.sku, option: line.option, quantity: line.quantity }))
    const { data, error } = await supabase.rpc('create_bank_transfer_order', { payer_name: depositor.trim(), order_items: items, shipping_info: shippingInfo })
    if (error) throw error
    const created = data as BankOrder
    setOrder(created)
    clearCart()
    const { error: notifyError } = await supabase.functions.invoke('notify-bank-order', { body: { order_id: created.id } })
    if (notifyError) console.warn('Telegram notification pending:', notifyError.message)
  }

  const submitCheckout = async (event: FormEvent) => {
    event.preventDefault()
    if (!shippingComplete) { setMessage(String(t('checkout.shippingRequired'))); return }
    if (method === 'toss' && !agreed) { setMessage(String(t('checkout.agreementRequired'))); return }
    if (method === 'bank' && depositor.trim().length < 2) { setMessage(String(t('checkout.depositorRequired'))); return }
    setBusy(true)
    setMessage('')
    try {
      if (method === 'toss') await payWithToss()
      else await placeBankOrder()
    } catch (error) {
      setMessage(errorMessage(error))
      setBusy(false)
    }
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

  return <main className="checkout-page">
    <form className="checkout-form" onSubmit={submitCheckout}>
      <p>PAYMENT · TEST MODE</p><h1>{t('checkout.title')}</h1>
      <fieldset className="checkout-section">
        <legend><span>01</span>{t('checkout.customerInfo')}</legend>
        <label>{t('checkout.email')}<input value={user.email ?? ''} readOnly autoComplete="email" /></label>
      </fieldset>
      <fieldset className="checkout-section">
        <legend><span>02</span>{t('checkout.shippingInfo')}</legend>
        <div className="checkout-fields-two">
          <label>{t('checkout.recipient')}<input name="name" value={recipientName} onChange={event => setRecipientName(event.target.value)} autoComplete="name" required /></label>
          <label>{t('checkout.phone')}<input name="tel" type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="010-0000-0000" required /></label>
        </div>
        <label>{t('checkout.postalCode')}<span className="postcode-field"><input name="postal-code" value={postalCode} onChange={event => setPostalCode(event.target.value)} autoComplete="postal-code" required /><button type="button" onClick={() => void openAddressSearch()}>{t('checkout.findAddress')}</button></span></label>
        <label>{t('checkout.address')}<input name="address-line1" value={addressLine1} onChange={event => setAddressLine1(event.target.value)} autoComplete="address-line1" required /></label>
        <label>{t('checkout.addressDetail')}<input ref={detailAddressRef} name="address-line2" value={addressLine2} onChange={event => setAddressLine2(event.target.value)} autoComplete="address-line2" /></label>
        <label>{t('checkout.deliveryMessage')}<textarea value={deliveryMessage} onChange={event => setDeliveryMessage(event.target.value)} maxLength={200} placeholder={String(t('checkout.deliveryPlaceholder'))} /></label>
        <label className="checkout-profile-save"><input type="checkbox" checked={saveToProfile} onChange={event => setSaveToProfile(event.target.checked)} /><span>{t('checkout.saveProfile')}</span></label>
      </fieldset>
      <fieldset className="checkout-section">
        <legend><span>03</span>{t('checkout.method')}</legend>
        <div className="payment-method-tabs" role="tablist" aria-label={String(t('checkout.method'))}>
          <button type="button" id="toss-payment-tab" className={method === 'toss' ? 'active' : ''} role="tab" aria-controls="toss-payment-panel" aria-selected={method === 'toss'} onClick={() => { setMethod('toss'); setMessage('') }}><span>TOSS PAYMENTS</span><small>{t('checkout.card')}</small></button>
          <button type="button" id="bank-payment-tab" className={method === 'bank' ? 'active' : ''} role="tab" aria-controls="bank-payment-panel" aria-selected={method === 'bank'} onClick={() => { setMethod('bank'); setMessage('') }}><span>BANK TRANSFER</span><small>{t('checkout.bankTransfer')}</small></button>
        </div>
        {method === 'toss' ? <section id="toss-payment-panel" className="toss-checkout-panel" role="tabpanel" aria-labelledby="toss-payment-tab"><div className="test-payment-notice"><b>TEST</b><span>{t('checkout.testNotice')}</span></div><label className="checkout-agreement"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /><span>{t('checkout.agreement')}</span></label><button type="submit" className="ink-button toss-pay-button" disabled={busy || !agreed || !shippingComplete}>{busy ? t('common.loading') : t('checkout.tossPay', { amount: formatWon(estimatedTotal) })}</button><p>{t('checkout.testHelp')}</p></section> : null}
        {method === 'bank' ? <section id="bank-payment-panel" className="bank-checkout-panel" role="tabpanel" aria-labelledby="bank-payment-tab">{setting ? <div className="bank-preview"><span>{t('checkout.bank')}</span><strong>{setting.bank_name} · {setting.account_number}</strong><em>{setting.account_holder}</em></div> : <p>{settingLoaded ? t('checkout.unavailable') : t('common.loading')}</p>}<label>{t('checkout.depositor')}<input value={depositor} onChange={event => setDepositor(event.target.value)} required /></label><p>{t('checkout.depositorHelp')}</p><button type="submit" className="ink-button" disabled={busy || !setting || !shippingComplete}>{busy ? t('common.loading') : t('checkout.order')}</button></section> : null}
      </fieldset>
      <span className="checkout-message" role="status">{message}</span>
    </form>
    <aside className="checkout-summary"><p>{t('checkout.summary')}</p>{lines.map(line => <article key={`${line.sku}-${line.option}`}><img src={line.image} alt="" /><div><h3>{i18n.language === 'en' ? line.name : line.nameKo}</h3><span>{line.option} · {line.quantity}</span></div><strong>{formatWon(line.price * line.quantity)}</strong></article>)}<dl className="checkout-totals"><div><dt>{t('checkout.subtotal')}</dt><dd>{formatWon(subtotal)}</dd></div><div><dt>{t('checkout.shippingFee')}</dt><dd>{shippingFee ? formatWon(shippingFee) : t('checkout.free')}</dd></div><small>{t('checkout.freeShippingHelp', { amount: formatWon(FREE_SHIPPING_THRESHOLD) })}</small><div className="checkout-total"><dt>{t('checkout.amount')}</dt><dd>{formatWon(estimatedTotal)}</dd></div></dl></aside>
  </main>
}
