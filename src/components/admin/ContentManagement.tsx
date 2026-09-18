import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { SitePage } from '../../hooks/useSitePage'

export function ContentManagement() {
  const [pages, setPages] = useState<SitePage[]>([])
  const [selected, setSelected] = useState<SitePage | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('site_pages').select('*').order('slug')
    if (error) { setMessage(error.message); return }
    const next = (data ?? []) as SitePage[]
    setPages(next)
    setSelected(current => next.find(page => page.id === current?.id) ?? next[0] ?? null)
  }
  useEffect(() => { void load() }, [])
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase || !selected) return
    setBusy(true); setMessage('저장 중…')
    const { error } = await supabase.from('site_pages').update({
      eyebrow_ko: selected.eyebrow_ko, eyebrow_en: selected.eyebrow_en, title_ko: selected.title_ko,
      title_en: selected.title_en, body_ko: selected.body_ko, body_en: selected.body_en,
      secondary_ko: selected.secondary_ko, secondary_en: selected.secondary_en,
      image_url: selected.image_url, published: selected.published,
    }).eq('id', selected.id)
    setMessage(error?.message ?? '사이트 콘텐츠를 반영했습니다.'); setBusy(false)
    if (!error) await load()
  }
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !supabase || !selected) return
    setBusy(true); setMessage('이미지 업로드 중…')
    const path = `site/${selected.slug}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error } = await supabase.storage.from('post-images').upload(path, file, { cacheControl: '31536000' })
    if (error) { setMessage(error.message); setBusy(false); return }
    const imageUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
    setSelected({ ...selected, image_url: imageUrl }); setMessage('이미지를 업로드했습니다. 저장 버튼을 눌러 반영하세요.'); setBusy(false)
  }
  const pageName = (slug: string) => slug === 'landing' ? 'Landing' : slug === 'home' ? 'Home / Editorial' : 'About PHILIA'
  const previewPath = (slug: string) => slug === 'landing' ? '/' : slug === 'home' ? '/home' : '/about'
  return <div className="admin-content">
    <section className="admin-section-head"><div><p>SITE CONTENT · 콘텐츠</p><h2>랜딩과 브랜드 페이지</h2><span>랜딩 이미지와 한글·영문 콘텐츠를 직접 관리합니다.</span></div><span className="admin-feedback">{message}</span></section>
    <div className="content-layout"><section className="admin-card post-list"><header><h3>PAGES</h3><span>{pages.length}</span></header>{pages.map((page, index) => <button className={selected?.id === page.id ? 'active' : ''} key={page.id} onClick={() => setSelected(page)}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{pageName(page.slug)}</b><small>{previewPath(page.slug)}</small></div><em>{page.published ? '공개' : '비공개'}</em></button>)}</section>
      {selected ? <section className="admin-card post-editor site-page-editor"><p>PAGE EDITOR · {selected.slug.toUpperCase()}</p><div className="site-page-image"><img src={selected.image_url ?? '/images/hero.jpg'} alt="" /><label>IMAGE CHANGE<input type="file" accept="image/*" onChange={upload} disabled={busy} /></label></div><form onSubmit={save}>{selected.slug === 'landing' ? <p className="landing-editor-note">랜딩 화면은 위 대표 이미지만 사용합니다. 이미지를 고른 뒤 아래 저장 버튼을 눌러 반영하세요.</p> : <><div className="form-two"><label>한국어 Eyebrow<input value={selected.eyebrow_ko} onChange={event => setSelected({ ...selected, eyebrow_ko: event.target.value })} /></label><label>English Eyebrow<input value={selected.eyebrow_en} onChange={event => setSelected({ ...selected, eyebrow_en: event.target.value })} /></label><label>한국어 제목<input value={selected.title_ko} onChange={event => setSelected({ ...selected, title_ko: event.target.value })} /></label><label>English title<input value={selected.title_en} onChange={event => setSelected({ ...selected, title_en: event.target.value })} /></label></div><label>한국어 본문<textarea value={selected.body_ko} onChange={event => setSelected({ ...selected, body_ko: event.target.value })} /></label><label>English body<textarea value={selected.body_en} onChange={event => setSelected({ ...selected, body_en: event.target.value })} /></label><div className="form-two"><label>한국어 보조 문구<input value={selected.secondary_ko} onChange={event => setSelected({ ...selected, secondary_ko: event.target.value })} /></label><label>English secondary<input value={selected.secondary_en} onChange={event => setSelected({ ...selected, secondary_en: event.target.value })} /></label></div></>}<label className="editor-check"><input type="checkbox" checked={selected.published} onChange={event => setSelected({ ...selected, published: event.target.checked })} /> 공개</label><div className="editor-actions"><a href={previewPath(selected.slug)} target="_blank" rel="noreferrer">미리보기 ↗</a><button className="ink-button" disabled={busy}>{busy ? '저장 중…' : '사이트에 반영'}</button></div></form></section> : null}
    </div>
  </div>
}
