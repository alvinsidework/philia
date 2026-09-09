import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { calculateFinance, formatWon } from '../data'
import { useAppStore } from '../store/AppStore'
import type { CostProfile, Product, Variant } from '../types'
import { Brand } from '../components/Brand'
import { supabase } from '../lib/supabase'
import { setLanguage } from '../i18n'

type AdminView = 'dashboard' | 'products' | 'inventory' | 'finance' | 'orders' | 'payments' | 'editorial' | 'content' | 'settings'

const nav: [AdminView, string, string][] = [
  ['dashboard', 'overview', '01'], ['products', 'products', '02'], ['inventory', 'inventory', '03'], ['finance', 'finance', '04'], ['orders', 'orders', '05'], ['payments', 'payments', '06'], ['editorial', 'editorial', '07'], ['content', 'content', '08'], ['settings', 'settings', '09'],
]

const soldOf = (product: Product) => product.variants.reduce((sum, v) => sum + v.sold, 0)
const stockOf = (product: Product) => product.variants.reduce((sum, v) => sum + v.stock, 0)

export function Admin() {
  const { t, i18n } = useTranslation()
  const { products, updateProduct, resetDemo } = useAppStore()
  const [view, setView] = useState<AdminView>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [editor, setEditor] = useState<Product | null>(null)
  const stats = useMemo(() => {
    let sales = 0, operating = 0, net = 0, stock = 0
    products.forEach(product => { const sold = soldOf(product); const finance = calculateFinance(product); sales += product.price * sold; operating += finance.operatingProfit * sold; net += finance.netProfit * sold; stock += stockOf(product) })
    return { sales, operating, net, stock }
  }, [products])
  const titleKey = nav.find(item => item[0] === view)?.[1] ?? 'overview'
  return <div className="admin-shell">
    <aside className={`admin-side ${mobileNav ? 'open' : ''}`}>
      <div className="admin-brand"><Brand light /><button onClick={() => setMobileNav(false)}>×</button></div>
      <p className="admin-label">STORE OFFICE · {t('common.manage')}</p>
      <nav>{nav.map(([key, label, no]) => <button className={view === key ? 'active' : ''} key={key} onClick={() => { setView(key); setMobileNav(false) }}><span>{no}</span>{t(`admin.${label}`)}<b>→</b></button>)}</nav>
      <div className="admin-side-foot"><span><i /> LIVE WORKSPACE</span><Link to="/">← STORE</Link></div>
    </aside>
    <main className="admin-main">
      <header className="admin-top"><button className="admin-menu" onClick={() => setMobileNav(true)}>≡</button><div><p>PHILIA / OFFICE</p><h1>{t(`admin.${titleKey}`)}</h1></div><div className="admin-user"><button className="admin-language" onClick={() => void setLanguage(i18n.language === 'en' ? 'ko' : 'en')}>{i18n.language === 'en' ? 'KO' : 'EN'}</button><span>PH</span><div><b>PHILIA ADMIN</b><small>OWNER</small></div></div></header>
      {view === 'dashboard' ? <Dashboard products={products} stats={stats} setView={setView} /> : null}
      {view === 'products' ? <Products products={products} onEdit={setEditor} /> : null}
      {view === 'inventory' ? <Inventory products={products} onUpdate={updateProduct} /> : null}
      {view === 'finance' ? <Finance products={products} onUpdate={updateProduct} /> : null}
      {view === 'orders' ? <Orders /> : null}
      {view === 'payments' ? <PaymentsAdmin /> : null}
      {view === 'editorial' ? <EditorialAdmin /> : null}
      {view === 'content' ? <Content /> : null}
      {view === 'settings' ? <Settings onReset={resetDemo} /> : null}
    </main>
    {editor ? <ProductEditor product={editor} onClose={() => setEditor(null)} onSave={product => { updateProduct(product); setEditor(null) }} /> : null}
  </div>
}

function Dashboard({ products, stats, setView }: { products: Product[]; stats: { sales: number; operating: number; net: number; stock: number }; setView: (view: AdminView) => void }) {
  const lowStock = products.flatMap(p => p.variants.filter(v => v.stock <= 4).map(v => ({ p, v })))
  const maxSales = Math.max(...products.map(p => p.price * soldOf(p)), 1)
  return <div className="admin-content">
    <section className="admin-welcome"><div><p>WEDNESDAY, 09 SEPTEMBER</p><h2>좋은 아침입니다.<br />Collection 1의 오늘을 확인하세요.</h2></div><button onClick={() => setView('products')}>+ 새 상품 등록</button></section>
    <section className="metric-grid">
      <Metric label="총 매출" value={formatWon(stats.sales)} note="판매 수량 기준" tone="blue" />
      <Metric label="총 영업이익" value={formatWon(stats.operating)} note={`${stats.sales ? (stats.operating / stats.sales * 100).toFixed(1) : 0}% 이익률`} tone="blue" />
      <Metric label="예상 순이익" value={formatWon(stats.net)} note="부가세 · 종소세 반영" tone="red" />
      <Metric label="현재 재고" value={`${stats.stock} PCS`} note={`${lowStock.length}개 옵션 확인 필요`} tone="ink" />
    </section>
    <div className="dashboard-grid">
      <section className="admin-card sales-card"><header><div><p>SALES BY PIECE</p><h3>상품별 매출</h3></div><button onClick={() => setView('finance')}>손익 보기 →</button></header><div className="bars">{products.map(p => { const value = p.price * soldOf(p); return <div key={p.id}><span>{String(p.piece).padStart(2, '0')}</span><div><i style={{ width: `${value / maxSales * 100}%` }} /></div><b>{p.name}</b><em>{formatWon(value)}</em></div> })}</div></section>
      <section className="admin-card stock-card"><header><div><p>STOCK SIGNAL</p><h3>재고 알림</h3></div><button onClick={() => setView('inventory')}>전체 재고 →</button></header>{lowStock.length ? lowStock.slice(0, 5).map(({ p, v }) => <div className="stock-alert" key={v.id}><img src={p.image} alt="" /><div><b>{p.name}</b><span>{v.color} · {v.size}</span></div><strong>{v.stock} <small>LEFT</small></strong></div>) : <p className="all-good">모든 옵션의 재고가 안정적입니다.</p>}</section>
    </div>
    <section className="admin-card quick"><p>QUICK ACTIONS</p><div><button onClick={() => setView('products')}><span>＋</span><b>상품 등록</b><em>새 컬렉션과 옵션 추가</em></button><button onClick={() => setView('inventory')}><span>↕</span><b>입고 기록</b><em>색상 · 사이즈별 수량</em></button><button onClick={() => setView('finance')}><span>₩</span><b>손익 계산</b><em>원가와 세금 시뮬레이션</em></button><button onClick={() => setView('content')}><span>¶</span><b>게시물 작성</b><em>발견과 수선 이야기</em></button></div></section>
  </div>
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article className={`metric ${tone}`}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>
}

function Products({ products, onEdit }: { products: Product[]; onEdit: (p: Product) => void }) {
  const [query, setQuery] = useState('')
  const filtered = products.filter(p => `${p.name} ${p.nameKo} ${p.sku}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="admin-content"><section className="admin-section-head"><div><p>CATALOGUE · 상품 관리</p><h2>Collection 1 <span>{products.length}</span></h2></div><button onClick={() => onEdit(products[0])}>+ 상품 등록</button></section><div className="table-tools"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="상품명 또는 SKU 검색" /><span>색상과 사이즈 옵션, 판매 상태를 한 번에 관리합니다.</span></div><div className="admin-table product-table"><div className="table-head"><span>상품</span><span>카테고리</span><span>옵션</span><span>재고</span><span>판매가</span><span>상태</span><span /></div>{filtered.map(p => <div className="table-row" key={p.id}><div className="table-product"><img src={p.image} alt="" /><div><b>{p.name}</b><small>{p.nameKo} · {p.sku}</small></div></div><span>{p.category}</span><span>{new Set(p.variants.map(v => v.color)).size}색 / {new Set(p.variants.map(v => v.size)).size}사이즈</span><strong>{stockOf(p)}</strong><span>{formatWon(p.price)}</span><span className={`status ${p.status}`}>{p.status}</span><button onClick={() => onEdit(p)}>EDIT →</button></div>)}</div></div>
}

function Inventory({ products, onUpdate }: { products: Product[]; onUpdate: (p: Product) => void }) {
  const [selected, setSelected] = useState(products[0].id)
  const product = products.find(p => p.id === selected) ?? products[0]
  const adjust = (variant: Variant, amount: number) => onUpdate({ ...product, variants: product.variants.map(v => v.id === variant.id ? { ...v, received: v.received + Math.max(amount, 0), stock: Math.max(0, v.stock + amount) } : v) })
  return <div className="admin-content"><section className="admin-section-head"><div><p>INVENTORY · 재고</p><h2>옵션별 재고</h2></div><div className="legend"><span><i className="safe" /> 안정</span><span><i className="low" /> 부족</span></div></section><div className="inventory-layout"><aside className="product-select">{products.map(p => <button className={p.id === selected ? 'active' : ''} key={p.id} onClick={() => setSelected(p.id)}><img src={p.image} alt="" /><div><b>{p.name}</b><span>{p.sku}</span></div><strong>{stockOf(p)}</strong></button>)}</aside><section className="variant-panel"><header><div><p>{product.sku}</p><h3>{product.name} <em>{product.nameKo}</em></h3></div><strong>{stockOf(product)} <small>PCS</small></strong></header><div className="variant-table"><div><span>컬러</span><span>사이즈</span><span>기초</span><span>입고</span><span>판매</span><span>현재</span><span>빠른 조정</span></div>{product.variants.map(v => <div key={v.id}><span className="variant-color"><i style={{ background: v.colorHex }} />{v.color}</span><span>{v.size}</span><span>{v.openingStock}</span><span>+{v.received}</span><span>−{v.sold}</span><strong className={v.stock <= 4 ? 'low-number' : ''}>{v.stock}</strong><span className="adjust"><button onClick={() => adjust(v, -1)}>−</button><button onClick={() => adjust(v, 1)}>+</button></span></div>)}</div><p className="formula-note">현재재고 = 기초재고 + 추가입고 − 판매수량 · 모든 조정은 추후 Supabase 재고 이동 기록으로 저장됩니다.</p></section></div></div>
}

function Finance({ products, onUpdate }: { products: Product[]; onUpdate: (p: Product) => void }) {
  const [selected, setSelected] = useState(products[0].id)
  const product = products.find(p => p.id === selected) ?? products[0]
  const f = calculateFinance(product); const sold = soldOf(product)
  const updateCost = (key: keyof CostProfile, value: number) => onUpdate({ ...product, costs: { ...product.costs, [key]: value } })
  const moneyFields: [keyof CostProfile, string][] = [['purchaseCost', '매입가'], ['inboundShipping', '매입 배송비'], ['supplies', '부자재'], ['outboundShipping', '판매 배송비'], ['advertising', '광고비'], ['overhead', '기타 판관비']]
  return <div className="admin-content"><section className="admin-section-head"><div><p>PROFIT · STOCK · TAX</p><h2>간편 손익 · 재고 · 세금 계산기</h2><span>제공된 PHILIA 엑셀의 계산식을 상품 데이터와 연결했습니다.</span></div><select value={selected} onChange={e => setSelected(e.target.value)}>{products.map(p => <option value={p.id} key={p.id}>{p.name} · {p.sku}</option>)}</select></section>
    <div className="finance-summary"><Metric label="판매가" value={formatWon(product.price)} note="VAT 포함" tone="ink" /><Metric label="영업이익 / 개" value={formatWon(f.operatingProfit)} note={`${(f.operatingMargin * 100).toFixed(1)}% 영업이익률`} tone="blue" /><Metric label="순이익 / 개" value={formatWon(f.netProfit)} note={`${(f.netMargin * 100).toFixed(1)}% 순이익률`} tone="blue" /><Metric label="총 순이익" value={formatWon(f.netProfit * sold)} note={`판매 ${sold}개 기준`} tone="red" /></div>
    <div className="finance-layout"><section className="admin-card calculator"><header><div><p>INPUTS · 직접 입력</p><h3>상품 원가와 비용</h3></div><span className="cream-key">크림색 영역을 수정하세요</span></header><div className="cost-form"><label>SKU<input value={product.sku} readOnly /></label><label>상품명<input value={product.name} readOnly /></label><label>판매가<input type="number" value={product.price} onChange={e => onUpdate({ ...product, price: Number(e.target.value) })} /></label>{moneyFields.map(([key, label]) => <label key={key}>{label}<input type="number" value={product.costs[key]} onChange={e => updateCost(key, Number(e.target.value))} /></label>)}<label>결제 수수료율<input type="number" step="0.001" value={product.costs.paymentFeeRate * 100} onChange={e => updateCost('paymentFeeRate', Number(e.target.value) / 100)} /><i>%</i></label></div></section>
      <section className="admin-card result-sheet"><header><div><p>OPERATING PROFIT</p><h3>상품 손익</h3></div><span>자동 계산</span></header><dl><div><dt>원가 합계</dt><dd className="out">− {formatWon(f.unitCost)}</dd></div><div><dt>판매가</dt><dd className="in">+ {formatWon(product.price)}</dd></div><div><dt>결제 수수료</dt><dd className="out">− {formatWon(f.paymentFee)}</dd></div><div><dt>배송 · 광고 · 판관비</dt><dd className="out">− {formatWon(product.costs.outboundShipping + product.costs.advertising + product.costs.overhead)}</dd></div><div className="result"><dt>영업이익 / 개</dt><dd>{formatWon(f.operatingProfit)}</dd></div></dl></section>
    </div>
    <section className="admin-card tax-sheet"><header><div><p>TAX SIMULATION</p><h3>세금 계산</h3></div><span>판매가는 부가세 포함 · 종소세율은 예상 유효세율</span></header><div className="tax-grid"><label>부가세율<input type="number" value={product.costs.vatRate * 100} onChange={e => updateCost('vatRate', Number(e.target.value) / 100)} /><i>%</i></label><div><span>부가세 / 개</span><strong>{formatWon(f.vat)}</strong></div><label>예상 종소세율<input type="number" value={product.costs.incomeTaxRate * 100} onChange={e => updateCost('incomeTaxRate', Number(e.target.value) / 100)} /><i>%</i></label><div><span>종소세 / 개</span><strong>{formatWon(f.incomeTax)}</strong></div><div className="net"><span>순이익 / 개</span><strong>{formatWon(f.netProfit)}</strong><em>{(f.netMargin * 100).toFixed(1)}%</em></div></div></section>
  </div>
}

function Orders() {
  const rows = [['PH-260909-014', '김필리아', 'Work Jacket / FADED / 1', '₩420,000', '결제완료'], ['PH-260908-013', '이은서', 'Bag / BLACK / ONE', '₩760,000', '배송중'], ['PH-260906-012', '박해준', 'Fleece / ASH / 2', '₩290,000', '배송완료']]
  return <div className="admin-content"><section className="admin-section-head"><div><p>ORDERS · 주문</p><h2>주문 관리 <span>3</span></h2></div><button>주문 내보내기 ↓</button></section><div className="admin-table orders-table"><div className="table-head"><span>주문번호</span><span>고객</span><span>상품</span><span>결제금액</span><span>상태</span></div>{rows.map(r => <div className="table-row" key={r[0]}>{r.map((value, index) => <span key={value} className={index === 4 ? 'status 판매중' : ''}>{value}</span>)}</div>)}</div></div>
}

type TransferOrder = { id: string; order_no: string; depositor_name: string; amount: number; items: { name: string; option: string; quantity: number }[]; payment_deadline: string; status: string; telegram_notified_at: string | null; created_at: string }
type PaymentSetting = { id: string; bank_name: string; account_number: string; account_holder: string; deposit_deadline_hours: number; active: boolean }

function PaymentsAdmin() {
  const { t } = useTranslation(); const [orders, setOrders] = useState<TransferOrder[]>([]); const [setting, setSetting] = useState<PaymentSetting | null>(null); const [message, setMessage] = useState('')
  const load = async () => { if (!supabase) return; const [{ data: orderData }, { data: settingData }] = await Promise.all([supabase.from('bank_transfer_orders').select('*').order('created_at', { ascending: false }), supabase.from('payment_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle()]); setOrders((orderData ?? []) as TransferOrder[]); setSetting(settingData as PaymentSetting | null) }
  useEffect(() => { void load() }, [])
  const saveSetting = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !setting) return; const { error } = await supabase.from('payment_settings').update({ bank_name: setting.bank_name, account_number: setting.account_number, account_holder: setting.account_holder, deposit_deadline_hours: setting.deposit_deadline_hours, active: true }).eq('id', setting.id); setMessage(error?.message ?? String(t('common.save'))); if (!error) void load() }
  const confirm = async (id: string) => { if (!supabase) return; const { error } = await supabase.from('bank_transfer_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id); setMessage(error?.message ?? 'OK'); if (!error) void load() }
  return <div className="admin-content"><section className="admin-section-head"><div><p>BANK TRANSFER · {t('admin.payments')}</p><h2>{t('admin.pendingTransfers')} <span>{orders.filter(order => order.status === 'awaiting_deposit').length}</span></h2></div><span>{message}</span></section><div className="payment-admin-layout"><section className="admin-card payment-setting"><h3>{t('admin.paymentSettings')}</h3>{setting ? <form onSubmit={saveSetting}><label>{t('admin.bankName')}<input value={setting.bank_name} onChange={e => setSetting({ ...setting, bank_name: e.target.value })} required /></label><label>{t('admin.accountNumber')}<input value={setting.account_number} onChange={e => setSetting({ ...setting, account_number: e.target.value })} required /></label><label>{t('admin.accountHolder')}<input value={setting.account_holder} onChange={e => setSetting({ ...setting, account_holder: e.target.value })} required /></label><label>{t('admin.deadlineHours')}<input type="number" min="1" max="168" value={setting.deposit_deadline_hours} onChange={e => setSetting({ ...setting, deposit_deadline_hours: Number(e.target.value) })} /></label><button className="ink-button">{t('common.save')}</button></form> : <p>{t('common.loading')}</p>}<p className="telegram-note"><i /> {t('admin.telegram')} · TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID</p></section><section className="transfer-list">{orders.length ? orders.map(order => <article className="admin-card" key={order.id}><header><div><p>{order.order_no}</p><h3>{order.depositor_name}</h3></div><strong>{formatWon(order.amount)}</strong></header><div className="transfer-items">{order.items.map((item, index) => <span key={`${item.name}-${index}`}>{item.name} · {item.option} × {item.quantity}</span>)}</div><footer><span>{new Date(order.payment_deadline).toLocaleString()} · {order.telegram_notified_at ? 'TELEGRAM ✓' : 'TELEGRAM —'}</span><b>{order.status}</b>{order.status === 'awaiting_deposit' ? <button onClick={() => void confirm(order.id)}>{t('admin.confirmPayment')}</button> : null}</footer></article>) : <p>{t('common.empty')}</p>}</section></div></div>
}

type FindStoryAdmin = { id: string; number_label: string; title_ko: string; title_en: string; body_ko: string; body_en: string; image_url: string; product_label: string | null; sort_order: number; published: boolean }
type MendingAdminRow = { id: string; product_name: string; description: string; status: string; admin_note: string | null; created_at: string }

function EditorialAdmin() {
  const { t } = useTranslation(); const [stories, setStories] = useState<FindStoryAdmin[]>([]); const [requests, setRequests] = useState<MendingAdminRow[]>([]); const [selected, setSelected] = useState<FindStoryAdmin | null>(null); const [message, setMessage] = useState('')
  const load = async () => { if (!supabase) return; const [{ data: storyData }, { data: requestData }] = await Promise.all([supabase.from('find_stories').select('*').order('sort_order'), supabase.from('mending_requests').select('*').order('created_at', { ascending: false })]); const nextStories = (storyData ?? []) as FindStoryAdmin[]; setStories(nextStories); setSelected(current => current ?? nextStories[0] ?? null); setRequests((requestData ?? []) as MendingAdminRow[]) }
  useEffect(() => { void load() }, [])
  const saveStory = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !selected) return; const { error } = await supabase.from('find_stories').update(selected).eq('id', selected.id); setMessage(error?.message ?? String(t('common.save'))); if (!error) void load() }
  const updateMending = async (id: string, status: string) => { if (!supabase) return; const { error } = await supabase.from('mending_requests').update({ status }).eq('id', id); setMessage(error?.message ?? 'OK'); if (!error) void load() }
  return <div className="admin-content"><section className="admin-section-head"><div><p>THE FIND · MENDING DESK</p><h2>{t('admin.editorial')}</h2></div><span>{message}</span></section><div className="editorial-admin"><section className="admin-card story-manager"><header><h3>THE FIND</h3><span>{stories.length} STORIES</span></header><div className="story-tabs">{stories.map(story => <button className={selected?.id === story.id ? 'active' : ''} onClick={() => setSelected(story)} key={story.id}>{story.number_label} · {story.title_en}</button>)}</div>{selected ? <form onSubmit={saveStory}><label>한국어 제목<input value={selected.title_ko} onChange={e => setSelected({ ...selected, title_ko: e.target.value })} /></label><label>English title<input value={selected.title_en} onChange={e => setSelected({ ...selected, title_en: e.target.value })} /></label><label>한국어 본문<textarea value={selected.body_ko} onChange={e => setSelected({ ...selected, body_ko: e.target.value })} /></label><label>English body<textarea value={selected.body_en} onChange={e => setSelected({ ...selected, body_en: e.target.value })} /></label><label>Image URL<input value={selected.image_url} onChange={e => setSelected({ ...selected, image_url: e.target.value })} /></label><label className="check-line"><input type="checkbox" checked={selected.published} onChange={e => setSelected({ ...selected, published: e.target.checked })} /> PUBLISHED</label><button className="ink-button">{t('common.save')}</button></form> : null}</section><section className="mending-admin"><header><p>MENDING REQUESTS</p><h3>{requests.length} REQUESTS</h3></header>{requests.length ? requests.map(request => <article className="admin-card" key={request.id}><time>{new Date(request.created_at).toLocaleDateString()}</time><h3>{request.product_name}</h3><p>{request.description}</p><select value={request.status} onChange={e => void updateMending(request.id, e.target.value)}><option value="received">RECEIVED</option><option value="reviewing">REVIEWING</option><option value="accepted">ACCEPTED</option><option value="shipping">SHIPPING</option><option value="completed">COMPLETED</option><option value="declined">DECLINED</option></select></article>) : <p>{t('common.empty')}</p>}</section></div></div>
}

function Content() {
  const [published, setPublished] = useState(true)
  return <div className="admin-content"><section className="admin-section-head"><div><p>JOURNAL · 콘텐츠</p><h2>게시물과 홈 컬렉션</h2></div><button onClick={() => setPublished(false)}>+ 새 게시물</button></section><div className="content-layout"><section className="admin-card post-list"><header><h3>게시물</h3><span>3 POSTS</span></header>{[['The love stitch', '발견', '2026.09.01'], ['A desk for mending', '수선', '2026.08.24'], ['Collection 1 notes', '컬렉션', '2026.08.12']].map((p, i) => <button className={!published && i === 0 ? 'active' : ''} key={p[0]} onClick={() => setPublished(true)}><span>0{i + 1}</span><div><b>{p[0]}</b><small>{p[1]} · {p[2]}</small></div><em>{i === 0 ? '공개' : '초안'}</em></button>)}</section><section className="admin-card post-editor"><p>EDITOR · 게시물 편집</p><label>제목<input defaultValue="The love stitch" /></label><label>카테고리<select defaultValue="발견"><option>발견</option><option>수선</option><option>컬렉션</option></select></label><label>본문<textarea defaultValue="사랑은 보이지 않는 곳에 오래 남습니다. PHILIA의 러브 스티치는 모든 옷의 뒷목 안쪽에 놓입니다." /></label><div className="editor-actions"><button>미리보기</button><button className="ink-button" onClick={() => setPublished(true)}>{published ? '업데이트' : '게시하기'}</button></div></section></div></div>
}

function Settings({ onReset }: { onReset: () => void }) {
  return <div className="admin-content"><section className="admin-section-head"><div><p>SETTINGS · 설정</p><h2>스토어 설정</h2></div></section><div className="settings-grid"><section className="admin-card"><h3>스토어 정보</h3><label>브랜드명<input defaultValue="PHILIA" /></label><label>고객 이메일<input defaultValue="hello@philia.kr" /></label><label>기본 배송비<input defaultValue="3,500" /></label><button className="ink-button">설정 저장</button></section><section className="admin-card"><h3>Supabase 연결</h3><p>Authentication · Database · Storage</p><span className="connection"><i /> 마이그레이션 준비됨</span><code>bmsgqkyunhockhxgpfsv</code><p className="muted">프로젝트 권한 확인 후 환경 키를 설정하고 마이그레이션을 푸시하세요.</p></section><section className="admin-card danger"><h3>데모 데이터</h3><p>브라우저에서 수정한 상품, 재고, 손익 데이터를 초기 상태로 되돌립니다.</p><button onClick={onReset}>데모 데이터 초기화</button></section></div></div>
}

function ProductEditor({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (product: Product) => void }) {
  const [draft, setDraft] = useState<Product>(() => structuredClone(product))
  const colors = draft.variants.filter((v, i, list) => list.findIndex(item => item.color === v.color) === i)
  return <div className="editor-layer"><button className="editor-backdrop" onClick={onClose} aria-label="닫기" /><aside className="product-editor"><header><div><p>PRODUCT EDITOR</p><h2>{draft.name}</h2></div><button onClick={onClose}>CLOSE ×</button></header><form onSubmit={e => { e.preventDefault(); onSave(draft) }}><div className="editor-image"><img src={draft.image} alt="" /><span>대표 이미지 · Storage 업로드 연결 준비</span></div><div className="form-two"><label>영문 상품명<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>한글 상품명<input value={draft.nameKo} onChange={e => setDraft({ ...draft, nameKo: e.target.value })} /></label><label>SKU<input value={draft.sku} onChange={e => setDraft({ ...draft, sku: e.target.value })} /></label><label>판매가<input type="number" value={draft.price} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} /></label><label>카테고리<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as Product['category'] })}><option>OUTER</option><option>KNIT</option><option>BOTTOM</option><option>BAG</option></select></label><label>상태<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Product['status'] })}><option>판매중</option><option>초안</option><option>품절</option></select></label></div><label>상품 설명<textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label><label>소재<input value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} /></label><section className="option-editor"><header><h3>색상 · 사이즈 옵션</h3><button type="button">+ 옵션 추가</button></header>{colors.map(color => <div className="option-color" key={color.color}><div><i style={{ background: color.colorHex }} /><b>{color.color}</b></div><div>{draft.variants.filter(v => v.color === color.color).map(v => <span key={v.id}>{v.size}<small>{v.stock} PCS</small></span>)}</div></div>)}</section><div className="editor-save"><button type="button" onClick={onClose}>취소</button><button className="ink-button">변경사항 저장</button></div></form></aside></div>
}
