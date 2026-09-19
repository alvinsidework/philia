import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, type MemberProfile } from '../auth/AuthProvider'
import { formatWon } from '../data'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AccountTab = 'profile' | 'orders' | 'points' | 'reviews' | 'inquiries'
type PointRow = { id: string; amount: number; description: string; created_at: string; expires_at: string | null }
type OrderRow = { id: string; order_no: string; status: string; total: number; created_at: string }
type ReviewRow = { id: string; title: string; rating: number; product_name: string; created_at: string }
type InquiryRow = { id: string; title: string; category: string; status: string; created_at: string; answer: string | null }

const tabLabels: [AccountTab, string, string][] = [['profile', '회원정보', 'PROFILE'], ['orders', '주문내역', 'ORDERS'], ['points', '적립금', 'POINTS'], ['reviews', '나의 리뷰', 'REVIEWS'], ['inquiries', '나의 문의', 'Q&A']]

export function Account() {
  const { user, loading } = useAuth()
  if (loading) return <main className="account-loading">φ</main>
  return user ? <MemberAccount /> : <AuthScreen />
}

function AuthScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) { setMessage('Supabase 환경 키가 필요합니다.'); return }
    setBusy(true); setMessage('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (error) { setMessage(error.message); return }
      navigate('/', { replace: true })
      return
    }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
    setBusy(false)
    if (error) { setMessage(error.message); return }
    setStep('otp'); setMessage('이메일로 보낸 인증번호를 입력해 주세요.')
  }

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('인증번호를 확인하고 있습니다…')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setBusy(false)
    if (error) { setMessage('인증번호가 올바르지 않거나 만료되었습니다.'); return }
    navigate('/', { replace: true })
  }

  const resend = async () => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setBusy(false); setMessage(error ? error.message : '새 인증번호를 보냈습니다.')
  }

  return <main className="account-page"><section className="account-intro"><p>{t('account.eyebrow')}</p><h1>{String(t('account.introTitle')).split('\n').map(line => <span className="title-line" key={line}>{line}</span>)}</h1><span>{t('account.intro')}</span></section><section className="auth-panel">
    {step === 'form' ? <>
      <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{t('account.login').toUpperCase()}</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>{t('account.join').toUpperCase()}</button></div>
      <form onSubmit={submit}>{mode === 'signup' ? <label>{t('account.name').toUpperCase()}<input value={name} onChange={e => setName(e.target.value)} required /></label> : null}<label>{t('account.email').toUpperCase()}<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@address.com" /></label><label>{t('account.password').toUpperCase()}<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="8+" /></label><button className="ink-button" disabled={busy}>{busy ? t('account.wait') : mode === 'login' ? t('account.login').toUpperCase() : t('account.sendCode').toUpperCase()}</button></form>
    </> : <form className="otp-form" onSubmit={verify}><button type="button" className="text-back" onClick={() => setStep('form')}>← {t('account.backEmail')}</button><p>{t('account.verification').toUpperCase()}</p><h2>{t('account.enterCode')}</h2><span>{t('account.codeSent', { email })}</span><label>VERIFICATION CODE<input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={token} onChange={e => setToken(e.target.value.replace(/\D/g, ''))} placeholder="00000000" required /></label><button className="ink-button" disabled={busy}>{t('account.verify').toUpperCase()}</button><button type="button" className="resend" onClick={resend} disabled={busy}>{t('account.resend')} →</button></form>}
    <p className="auth-message">{message || (isSupabaseConfigured ? t('account.secure') : 'LOCAL DEMO')}</p>
  </section></main>
}

function MemberAccount() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as AccountTab | null
  const tab: AccountTab = tabLabels.some(([key]) => key === requested) ? requested! : 'profile'
  const [points, setPoints] = useState<PointRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) { setDataLoading(false); return }
    const client = supabase
    void Promise.all([
      client.from('point_transactions').select('id,amount,description,created_at,expires_at').order('created_at', { ascending: false }),
      client.from('orders').select('id,order_no,status,total,created_at').order('created_at', { ascending: false }),
      client.from('reviews').select('id,title,rating,product_name,created_at').order('created_at', { ascending: false }),
      client.from('inquiries').select('id,title,category,status,created_at,answer').order('created_at', { ascending: false }),
    ]).then(([p, o, r, q]) => {
      setPoints((p.data ?? []) as PointRow[]); setOrders((o.data ?? []) as OrderRow[]); setReviews((r.data ?? []) as ReviewRow[]); setInquiries((q.data ?? []) as InquiryRow[]); setDataLoading(false)
    })
  }, [user])

  const balance = useMemo(() => points.reduce((sum, row) => sum + row.amount, 0), [points])
  const logout = async () => { await signOut(); navigate('/') }
  const labels: Record<AccountTab, string> = { profile: t('account.profile'), orders: t('account.orderHistory'), points: t('account.points'), reviews: t('account.myReviews'), inquiries: t('account.myInquiries') }
  return <main className="member-page"><header className="member-hero"><p>MY PHILIA · {t('account.greeting')}</p><h1>{String(t('account.welcome', { name: profile?.display_name || user?.email?.split('@')[0] })).split('\n').map(line => <span className="title-line" key={line}>{line}</span>)}</h1><span>{user?.email}</span></header><div className="member-shell"><aside><p>ACCOUNT</p>{tabLabels.map(([key, , en]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setParams({ tab: key })}><span>{labels[key]}</span><em>{en}</em></button>)}<button onClick={logout}><span>{t('nav.logout')}</span><em>LOGOUT</em></button></aside><section className="member-content">
    {tab === 'profile' ? <ProfilePanel profile={profile} email={user?.email ?? ''} onSaved={refreshProfile} /> : null}
    {tab === 'orders' ? <OrdersPanel rows={orders} loading={dataLoading} /> : null}
    {tab === 'points' ? <PointsPanel rows={points} balance={balance} loading={dataLoading} /> : null}
    {tab === 'reviews' ? <SimpleRows title={t('account.myReviews')} kicker="MY REVIEWS" empty={t('account.noReviews')} rows={reviews.map(row => [row.created_at, `${'★'.repeat(row.rating)} ${row.product_name}`, row.title])} /> : null}
    {tab === 'inquiries' ? <InquiriesPanel rows={inquiries} loading={dataLoading} onAdded={row => setInquiries(current => [row, ...current])} /> : null}
  </section></div></main>
}

function ProfilePanel({ profile, email, onSaved }: { profile: MemberProfile | null; email: string; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(() => ({ display_name: profile?.display_name ?? '', phone: profile?.phone ?? '', birth_date: profile?.birth_date ?? '', postal_code: profile?.postal_code ?? '', address_line1: profile?.address_line1 ?? '', address_line2: profile?.address_line2 ?? '', newsletter: profile?.newsletter ?? false }))
  const [message, setMessage] = useState('')
  const update = (key: keyof typeof draft, value: string | boolean) => setDraft(current => ({ ...current, [key]: value }))
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase || !profile) return
    setMessage('저장 중…'); const { error } = await supabase.from('profiles').update(draft).eq('id', profile.id)
    if (error) { setMessage(error.message); return }; await onSaved(); setMessage('회원정보가 저장되었습니다.')
  }
  return <div className="account-panel"><header><p>PROFILE · 회원정보</p><h2>기본 정보</h2><span>배송과 수선을 위해 정확한 정보를 입력해 주세요.</span></header><form className="profile-form" onSubmit={save}><label>이메일<input value={email} readOnly /></label><label>이름<input value={draft.display_name} onChange={e => update('display_name', e.target.value)} required /></label><label>생년월일<input type="date" value={draft.birth_date} onChange={e => update('birth_date', e.target.value)} /></label><label>휴대전화<input value={draft.phone} onChange={e => update('phone', e.target.value)} placeholder="010-0000-0000" /></label><fieldset><legend>주소</legend><div><input value={draft.postal_code} onChange={e => update('postal_code', e.target.value)} placeholder="우편번호" /><button type="button">우편번호 찾기</button></div><input value={draft.address_line1} onChange={e => update('address_line1', e.target.value)} placeholder="기본 주소" /><input value={draft.address_line2} onChange={e => update('address_line2', e.target.value)} placeholder="상세 주소" /></fieldset><label className="check-line"><input type="checkbox" checked={draft.newsletter} onChange={e => update('newsletter', e.target.checked)} /><span>새 컬렉션과 수선 데스크 소식을 이메일로 받습니다.</span></label><div className="profile-actions"><span>{message}</span><button className="ink-button">SAVE CHANGES — 저장</button></div></form></div>
}

function OrdersPanel({ rows, loading }: { rows: OrderRow[]; loading: boolean }) {
  const { t } = useTranslation()
  return <SimpleRows title={t('account.orderHistory')} kicker="ORDERS" empty={loading ? t('account.loading') : t('account.noOrders')} rows={rows.map(row => [row.created_at, row.order_no, `${formatWon(row.total)} · ${row.status}`])} />
}

function PointsPanel({ rows, balance, loading }: { rows: PointRow[]; balance: number; loading: boolean }) {
  return <div className="account-panel"><header><p>POINTS · 적립금</p><h2>적립금 내역</h2></header><div className="point-summary"><div><span>사용 가능 적립금</span><strong>{balance.toLocaleString()}원</strong></div><div><span>사용된 적립금</span><strong>{Math.abs(rows.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)).toLocaleString()}원</strong></div><div><span>미가용 적립금</span><strong>0원</strong></div></div><SimpleTable rows={rows.map(row => [date(row.created_at), `${row.amount > 0 ? '+' : ''}${row.amount.toLocaleString()}원`, row.description, row.expires_at ? date(row.expires_at) : '—'])} empty={loading ? '불러오는 중…' : '적립금 내역이 없습니다.'} headings={['날짜', '적립금', '내용', '소멸 예정']} /></div>
}

function InquiriesPanel({ rows, loading, onAdded }: { rows: InquiryRow[]; loading: boolean; onAdded: (row: InquiryRow) => void }) {
  const [writing, setWriting] = useState(false); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [category, setCategory] = useState('상품 문의')
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; const { data, error } = await supabase.from('inquiries').insert({ title, body, category, is_private: true }).select('id,title,category,status,created_at,answer').single(); if (!error && data) { onAdded(data as InquiryRow); setWriting(false); setTitle(''); setBody('') } }
  return <div className="account-panel"><header className="with-action"><div><p>Q&amp;A · 문의</p><h2>나의 문의</h2></div><button onClick={() => setWriting(value => !value)}>{writing ? 'CLOSE ×' : '+ 문의하기'}</button></header>{writing ? <form className="inquiry-form" onSubmit={submit}><select value={category} onChange={e => setCategory(e.target.value)}><option>상품 문의</option><option>배송 문의</option><option>교환 · 반품</option><option>수선 문의</option><option>기타 문의</option></select><input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" required /><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="문의 내용을 입력해 주세요." required /><button className="ink-button">SUBMIT — 등록</button></form> : null}<SimpleTable rows={rows.map(row => [date(row.created_at), row.category, row.title, row.status === 'answered' ? '답변완료' : '답변대기'])} empty={loading ? '불러오는 중…' : '등록한 문의가 없습니다.'} headings={['날짜', '분류', '제목', '상태']} /></div>
}

function SimpleRows({ title, kicker, rows, empty }: { title: string; kicker: string; rows: string[][]; empty: string }) {
  return <div className="account-panel"><header><p>{kicker}</p><h2>{title}</h2></header><SimpleTable headings={['날짜', '대상', '내용']} rows={rows.map(([d, ...rest]) => [date(d), ...rest])} empty={empty} /></div>
}

function SimpleTable({ headings, rows, empty }: { headings: string[]; rows: string[][]; empty: string }) {
  return <div className="member-table"><div className="member-table-head" style={{ gridTemplateColumns: `repeat(${headings.length}, 1fr)` }}>{headings.map(h => <span key={h}>{h}</span>)}</div>{rows.length ? rows.map((row, i) => <div className="member-table-row" style={{ gridTemplateColumns: `repeat(${headings.length}, 1fr)` }} key={`${row[0]}-${i}`}>{row.map((value, j) => <span key={`${value}-${j}`}>{value}</span>)}</div>) : <p>{empty}</p>}</div>
}

const date = (value: string) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
