import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

type View = 'reviews' | 'qna' | 'notice'
type Review = { id: string; product_name: string; option_label: string | null; rating: number; title: string; body: string; images: string[]; helpful_count?: number; created_at: string }
type ReviewComment = { id: string; body: string; created_at: string }
type Inquiry = { id: string; category: string; title: string; body: string; status: string; answer: string | null; created_at: string }
type Notice = { id: string; title: string; body: string; pinned: boolean; published_at: string | null; created_at: string }

const sampleReviews: Review[] = [
  { id: 'sample-1', product_name: 'WORK JACKET', option_label: 'FADED / 1', rating: 5, title: '오래 입을수록 좋아질 것 같아요.', body: '원단의 표정과 여유 있는 실루엣이 좋습니다. 플리스 위에도 자연스럽게 맞아요.', images: ['/images/work-jacket.jpg'], created_at: '2026-09-06' },
  { id: 'sample-2', product_name: 'FLEECE', option_label: 'ASH / 2', rating: 5, title: '가볍고 따뜻한 레이어.', body: '재킷 아래 입었을 때 어깨가 편안하고 색감도 차분합니다.', images: ['/images/fleece.jpg'], created_at: '2026-09-03' },
  { id: 'sample-3', product_name: 'BAG', option_label: 'BLACK / ONE', rating: 5, title: '형태가 자연스럽게 잡혀요.', body: '물건을 담을수록 제 가방이 되어가는 느낌이 좋습니다.', images: ['/images/bag.jpg'], created_at: '2026-08-28' },
]

export function Community() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const requested = params.get('view') as View | null
  const view: View = requested && ['reviews', 'qna', 'notice'].includes(requested) ? requested : 'reviews'
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [writing, setWriting] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    void Promise.all([
      client.from('reviews').select('id,product_name,option_label,rating,title,body,images,helpful_count,created_at').eq('published', true).order('created_at', { ascending: false }),
      client.from('inquiries').select('id,category,title,body,status,answer,created_at').eq('is_private', false).order('created_at', { ascending: false }),
      client.from('notices').select('id,title,body,pinned,published_at,created_at').eq('published', true).order('pinned', { ascending: false }).order('published_at', { ascending: false }),
    ]).then(([r, q, n]) => { setReviews((r.data ?? []) as Review[]); setInquiries((q.data ?? []) as Inquiry[]); setNotices((n.data ?? []) as Notice[]) })
  }, [])

  const visibleReviews = reviews.length ? reviews : sampleReviews
  return <main className="community-page"><header className="community-hero"><p>PHILIA COMMUNITY</p><h1>{t('community.title')}</h1><span>{t('community.intro')}</span></header><nav className="community-tabs"><button className={view === 'reviews' ? 'active' : ''} onClick={() => setParams({ view: 'reviews' })}>REVIEWS <em>{t('community.reviews')}</em></button><button className={view === 'qna' ? 'active' : ''} onClick={() => setParams({ view: 'qna' })}>Q&amp;A <em>{t('community.inquiry')}</em></button><button className={view === 'notice' ? 'active' : ''} onClick={() => setParams({ view: 'notice' })}>NOTICE <em>{t('community.notice')}</em></button></nav>
    {view === 'reviews' ? <section className="review-section"><div className="community-section-head"><div><p>WEARING NOTES</p><h2>{t('community.archive')} <span>{visibleReviews.length}</span></h2></div>{user ? <button onClick={() => setWriting(true)}>+ {t('community.writeReview')}</button> : <Link to="/account">{t('community.signToWrite')} →</Link>}</div><div className="review-grid">{visibleReviews.map(review => <button key={review.id} onClick={() => setSelectedReview(review)}><div className="review-photo"><img src={review.images[0] || '/images/hero.jpg'} alt="" /><span>{'★'.repeat(review.rating)}</span></div><p>{review.option_label}</p><h3>{review.title}</h3><div><span>{review.product_name}</span><time>{date(review.created_at)}</time></div></button>)}</div></section> : null}
    {view === 'qna' ? <Board title="Q&A" kicker="QUESTIONS & ANSWERS" action={user ? <button onClick={() => setWriting(true)}>+ {t('community.ask')}</button> : <Link to="/account">{t('community.signToAsk')} →</Link>} headings={['NO', 'CATEGORY', 'SUBJECT', 'STATUS', 'DATE']} rows={inquiries.map((item, i) => [String(inquiries.length - i).padStart(3, '0'), item.category, item.title, item.status === 'answered' ? t('community.answered') : t('community.waiting'), date(item.created_at)])} empty={t('community.noInquiry')} /> : null}
    {view === 'notice' ? <section className="board-section"><Board title={t('community.notice')} kicker="PHILIA NEWS" headings={['TYPE', 'SUBJECT', 'DATE']} rows={notices.map(item => [item.pinned ? 'NOTICE' : 'NEWS', item.title, date(item.published_at || item.created_at)])} empty={t('community.noNotice')} onRow={i => setSelectedNotice(notices[i])} /></section> : null}
    <AnimatePresence>{selectedReview ? <ReviewDetail review={selectedReview} onClose={() => setSelectedReview(null)} /> : null}{selectedNotice ? <NoticeDetail notice={selectedNotice} onClose={() => setSelectedNotice(null)} /> : null}{writing ? <WriteSheet mode={view === 'reviews' ? 'review' : 'inquiry'} onClose={() => setWriting(false)} onDone={() => setWriting(false)} /> : null}</AnimatePresence>
  </main>
}

function Board({ title, kicker, headings, rows, empty, action, onRow }: { title: string; kicker: string; headings: string[]; rows: string[][]; empty: string; action?: ReactNode; onRow?: (index: number) => void }) {
  return <section className="board-section"><div className="community-section-head"><div><p>{kicker}</p><h2>{title}</h2></div>{action}</div><div className="community-board"><div className="board-head" style={{ gridTemplateColumns: `repeat(${headings.length},1fr)` }}>{headings.map(h => <span key={h}>{h}</span>)}</div>{rows.length ? rows.map((row, i) => <button key={`${row[0]}-${i}`} style={{ gridTemplateColumns: `repeat(${headings.length},1fr)` }} onClick={() => onRow?.(i)}>{row.map((value, j) => <span key={`${value}-${j}`}>{value}</span>)}</button>) : <p>{empty}</p>}</div></section>
}

function ReviewDetail({ review, onClose }: { review: Review; onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isSample = review.id.startsWith('sample-')
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [comment, setComment] = useState('')
  const [helpful, setHelpful] = useState(review.helpful_count ?? 0)
  useEffect(() => { if (!supabase || isSample) return; void supabase.from('review_comments').select('id,body,created_at').eq('review_id', review.id).order('created_at').then(({ data }) => setComments((data ?? []) as ReviewComment[])) }, [review.id, isSample])
  const addComment = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !user || isSample) return; const { data } = await supabase.from('review_comments').insert({ review_id: review.id, body: comment }).select('id,body,created_at').single(); if (data) { setComments(current => [...current, data as ReviewComment]); setComment('') } }
  const toggleHelpful = async () => { if (!supabase || !user || isSample) return; const { data } = await supabase.rpc('toggle_review_helpful', { target_review_id: review.id }); if (typeof data === 'number') setHelpful(data) }
  return <><motion.button className="drawer-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="review-sheet" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .4, ease: [0.22,1,.36,1] }}><header><div><p>{review.product_name}</p><span>{review.option_label}</span></div><button onClick={onClose}>{t('common.close').toUpperCase()} ×</button></header><img src={review.images[0] || '/images/hero.jpg'} alt="review" /><article><strong>{'★'.repeat(review.rating)}</strong><time>{date(review.created_at)}</time><h2>{review.title}</h2><p>{review.body}</p><div className="review-social"><button onClick={toggleHelpful} disabled={!user || isSample}>♡ {t('community.helpful')} {helpful}</button><span>{t('community.comments')} {comments.length}</span></div><div className="review-comments">{comments.map(item => <p key={item.id}><span>MEMBER</span>{item.body}<time>{date(item.created_at)}</time></p>)}{user && !isSample ? <form onSubmit={addComment}><input value={comment} onChange={e => setComment(e.target.value)} placeholder={`${t('community.comments')}…`} required /><button>POST →</button></form> : null}</div></article></motion.aside></>
}

function NoticeDetail({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const { t } = useTranslation()
  return <><motion.button className="drawer-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="review-sheet notice-sheet" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}><header><div><p>NOTICE · {t('community.notice')}</p><span>{date(notice.published_at || notice.created_at)}</span></div><button onClick={onClose}>{t('common.close').toUpperCase()} ×</button></header><article><h2>{notice.title}</h2><p>{notice.body}</p></article></motion.aside></>
}

function WriteSheet({ mode, onClose, onDone }: { mode: 'review' | 'inquiry'; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [product, setProduct] = useState('Work Jacket'); const [rating, setRating] = useState(5); const [message, setMessage] = useState(''); const [files, setFiles] = useState<File[]>([])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase || !user) return; setMessage('등록 중…')
    let images: string[] = []
    if (mode === 'review' && files.length) {
      const uploads = await Promise.all(files.map(async file => { const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`; const { error } = await supabase!.storage.from('review-images').upload(storagePath, file); return error ? null : supabase!.storage.from('review-images').getPublicUrl(storagePath).data.publicUrl }))
      images = uploads.filter((url): url is string => Boolean(url))
    }
    const result = mode === 'review' ? await supabase.from('reviews').insert({ product_name: product, title, body, rating, images, published: true }) : await supabase.from('inquiries').insert({ category: '상품 문의', title, body, is_private: false }); if (result.error) { setMessage(result.error.message); return }; onDone()
  }
  return <><motion.button className="drawer-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="write-sheet" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}><header><div><p>{mode === 'review' ? 'WRITE A REVIEW' : 'ASK PHILIA'}</p><h2>{mode === 'review' ? t('community.writeReview') : t('community.ask')}</h2></div><button onClick={onClose}>{t('common.close').toUpperCase()} ×</button></header><form onSubmit={submit}>{mode === 'review' ? <><label>PRODUCT<select value={product} onChange={e => setProduct(e.target.value)}><option>Work Jacket</option><option>Field Jacket</option><option>Leather Jacket</option><option>Fleece</option><option>Trousers</option><option>Bag</option></select></label><label>RATING<div className="rating-input">{[1,2,3,4,5].map(n => <button type="button" className={rating >= n ? 'active' : ''} onClick={() => setRating(n)} key={n}>★</button>)}</div></label><label>PHOTOS · 5 MAX<input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} /><small>{files.length ? `${files.length} IMAGES` : 'JPG, PNG, WEBP'}</small></label></> : null}<label>SUBJECT<input value={title} onChange={e => setTitle(e.target.value)} required /></label><label>MESSAGE<textarea value={body} onChange={e => setBody(e.target.value)} required /></label><span>{message}</span><button className="ink-button">{t('common.submit').toUpperCase()}</button></form></motion.aside></>
}

const date = (value: string) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
