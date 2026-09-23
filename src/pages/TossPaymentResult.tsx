import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatWon } from '../data'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/AppStore'

type ConfirmResult = {
  approved: boolean
  order?: { order_no?: string }
  payment?: { orderId: string; method: string; totalAmount: number; receiptUrl: string | null }
  error?: string
}

export function TossPaymentSuccess() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { clearCart } = useAppStore()
  const started = useRef(false)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<ConfirmResult | null>(null)

  const paymentKey = params.get('paymentKey')
  const orderId = params.get('orderId')
  const amount = Number(params.get('amount'))

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!supabase || !paymentKey || !orderId || !Number.isInteger(amount) || amount <= 0) {
      setResult({ approved: false, error: String(t('checkout.tossInvalid')) })
      setState('error')
      return
    }
    void supabase.functions.invoke('confirm-toss-payment', {
      body: { paymentKey, orderId, amount },
    }).then(({ data, error }) => {
      if (error || !data?.approved) {
        setResult({ approved: false, error: data?.error ?? error?.message ?? String(t('checkout.tossFailed')) })
        setState('error')
        return
      }
      setResult(data as ConfirmResult)
      clearCart()
      setState('success')
    })
  }, [amount, clearCart, orderId, paymentKey, t])

  return <main className="payment-result-page"><section>
    <p>TOSS PAYMENTS</p>
    {state === 'loading' ? <><h1>{t('checkout.tossConfirming')}</h1><span>{t('checkout.tossConfirmingHelp')}</span></> : null}
    {state === 'success' ? <><h1>{t('checkout.tossComplete')}</h1><span>{result?.payment?.method ?? 'CARD'} · {formatWon(result?.payment?.totalAmount ?? amount)}</span><div className="payment-result-ticket"><small>ORDER</small><strong>{result?.payment?.orderId ?? orderId}</strong><b>{t('checkout.tossCharge')}</b>{result?.payment?.receiptUrl ? <a href={result.payment.receiptUrl} target="_blank" rel="noreferrer">{t('checkout.receipt')} ↗</a> : null}</div><Link to="/account?tab=orders">{t('nav.orders')} →</Link></> : null}
    {state === 'error' ? <><h1>{t('checkout.tossFailed')}</h1><span>{result?.error}</span><Link to="/checkout">{t('checkout.retry')} →</Link></> : null}
  </section></main>
}

export function TossPaymentFail() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const code = params.get('code')
  const message = params.get('message')
  const cancelled = code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL'

  return <main className="payment-result-page"><section><p>TOSS PAYMENTS</p><h1>{cancelled ? t('checkout.tossCancelled') : t('checkout.tossFailed')}</h1><span>{message || t('checkout.tossFailedHelp')}</span>{code ? <small>{code}</small> : null}<Link to="/checkout">{t('checkout.retry')} →</Link></section></main>
}
