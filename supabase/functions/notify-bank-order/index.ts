import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return Response.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { order_id: orderId } = await request.json()
    if (!orderId) return Response.json({ error: 'order_id is required' }, { status: 400, headers: corsHeaders })

    const { data: order, error } = await userClient.from('bank_transfer_orders')
      .select('id,order_no,depositor_name,subtotal,shipping_fee,amount,items,shipping_address,payment_deadline,status,telegram_notified_at')
      .eq('id', orderId).single()
    if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404, headers: corsHeaders })
    if (order.telegram_notified_at) return Response.json({ sent: true, duplicate: true }, { headers: corsHeaders })

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
    if (!botToken || !chatId) return Response.json({ sent: false, reason: 'telegram_not_configured' }, { headers: corsHeaders })

    const items = Array.isArray(order.items) ? order.items : []
    const itemLines = items.map((item: Record<string, unknown>) =>
      `• ${escapeHtml(item.name)} / ${escapeHtml(item.option)} × ${escapeHtml(item.quantity)}`
    ).join('\n')
    const amount = Number(order.amount).toLocaleString('ko-KR')
    const subtotal = Number(order.subtotal).toLocaleString('ko-KR')
    const shippingFee = Number(order.shipping_fee).toLocaleString('ko-KR')
    const shipping = (order.shipping_address ?? {}) as Record<string, unknown>
    const address = [shipping.address_line1, shipping.address_line2].filter(Boolean).join(' ')
    const deadline = new Date(order.payment_deadline).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const message = [
      '<b>PHILIA · 새 계좌이체 주문</b>', '',
      `<b>주문번호</b> ${escapeHtml(order.order_no)}`,
      `<b>입금자명</b> ${escapeHtml(order.depositor_name)}`,
      `<b>입금금액</b> ₩${amount} (상품 ₩${subtotal} + 배송 ₩${shippingFee})`,
      `<b>입금기한</b> ${escapeHtml(deadline)}`,
      `<b>상태</b> ${escapeHtml(order.status)}`, '',
      `<b>수령인</b> ${escapeHtml(shipping.recipient_name)}`,
      `<b>연락처</b> ${escapeHtml(shipping.phone)}`,
      `<b>배송지</b> (${escapeHtml(shipping.postal_code)}) ${escapeHtml(address)}`,
      shipping.delivery_message ? `<b>배송메모</b> ${escapeHtml(shipping.delivery_message)}` : '',
      '', itemLines,
    ].join('\n')

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!telegramResponse.ok) {
      const detail = await telegramResponse.text()
      console.error('Telegram sendMessage failed', telegramResponse.status, detail)
      return Response.json({ sent: false, reason: 'telegram_error' }, { status: 502, headers: corsHeaders })
    }
    await adminClient.from('bank_transfer_orders').update({ telegram_notified_at: new Date().toISOString() }).eq('id', order.id)
    return Response.json({ sent: true }, { headers: corsHeaders })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Unexpected notification error' }, { status: 500, headers: corsHeaders })
  }
})
