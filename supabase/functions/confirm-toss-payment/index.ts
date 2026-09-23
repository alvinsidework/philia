import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Authentication required' }, 401)

    const { paymentKey, orderId, amount } = await request.json()
    if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || !Number.isInteger(Number(amount))) {
      return json({ error: 'Invalid payment approval payload' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')
    if (!tossSecretKey?.startsWith('live_sk_')) return json({ error: 'Live Toss Payments is not configured' }, 503)

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: order, error: orderError } = await userClient.from('orders')
      .select('id,order_no,total,status,payment_reference,payment_method,payment_receipt_url')
      .eq('order_no', orderId).single()

    if (orderError || !order) return json({ error: 'Order not found' }, 404)
    if (Number(order.total) !== Number(amount)) return json({ error: 'Payment amount does not match the order' }, 400)
    if (order.status === 'paid' && order.payment_reference === paymentKey) {
      return json({ approved: true, duplicate: true, order })
    }
    if (order.status !== 'pending') return json({ error: 'Order is not payable' }, 409)

    const encodedSecret = btoa(`${tossSecretKey}:`)
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedSecret}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': order.id,
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
    const payment = await tossResponse.json()
    if (!tossResponse.ok) {
      return json({ error: payment.message ?? 'Toss payment approval failed', code: payment.code }, tossResponse.status)
    }
    if (payment.orderId !== order.order_no || Number(payment.totalAmount) !== Number(order.total)) {
      return json({ error: 'Approved payment data does not match the order' }, 400)
    }

    const { data: completed, error: completeError } = await adminClient.rpc('complete_toss_payment', {
      target_order_no: order.order_no,
      target_payment_key: payment.paymentKey,
      target_payment_method: String(payment.method ?? ''),
      target_receipt_url: String(payment.receipt?.url ?? ''),
      target_approved_at: payment.approvedAt ?? new Date().toISOString(),
    })

    if (completeError) {
      await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(payment.paymentKey)}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedSecret}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${order.id}-rollback`,
        },
        body: JSON.stringify({ cancelReason: '주문 처리 실패로 인한 자동 취소' }),
      })
      console.error('Payment completion failed and cancellation was requested', completeError)
      return json({ error: 'Order processing failed. The payment was cancelled automatically.' }, 409)
    }

    return json({
      approved: true,
      order: completed,
      payment: {
        orderId: payment.orderId,
        method: payment.method,
        totalAmount: payment.totalAmount,
        approvedAt: payment.approvedAt,
        receiptUrl: payment.receipt?.url ?? null,
      },
    })
  } catch (error) {
    console.error(error)
    return json({ error: 'Unexpected payment confirmation error' }, 500)
  }
})
